"""Ejecución por etapas, propiedad, interrupciones y muestras persistentes."""
from datetime import datetime, timedelta
from unittest.mock import patch
from uuid import uuid4
import unittest

import test_autenticacion as base
from sqlalchemy import event, select
from app.capturas import CapturadorTunel, obtener_capturador
from app.control_tunel import ControladorTunelSimulado
from app.tablas import EventoMedicion, Medicion, MuestraMedicion, ProgramaEtapas


class Reloj:
    actual = datetime(2026, 9, 22)

    @classmethod
    def utcnow(cls):
        return cls.actual


class ProgramasTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.base = base.AutenticacionTests()
        self.base.setUp()
        self.base.demo()
        self.base.sessions.configure(autoflush=False)
        Reloj.actual = datetime(2026, 9, 22)
        for modulo in ("control_tunel", "capturas", "datos_programa", "programador_etapas"):
            reemplazo = patch(f"app.{modulo}.datetime", Reloj)
            reemplazo.start()
            self.addCleanup(reemplazo.stop)
        self.capturador = CapturadorTunel(ControladorTunelSimulado(), self.base.sessions)
        base.app.dependency_overrides[obtener_capturador] = lambda: self.capturador

    def tearDown(self):
        self.base.tearDown()

    async def pedir(self, metodo, ruta, datos=None, usuario="alu_demo"):
        return await base.peticion(metodo, "/api" + ruta, {"X-Usuario-Uacloud": usuario}, datos)

    async def preparar(self, etapas=None, inicio_directo=False):
        _, ensayo = await self.pedir("POST", "/ensayos", {"nombre": "Etapas"})
        self.ensayo_id = ensayo["id"]
        self.config = {"nombre": "Barrido", "etapas": etapas or [
            {"consigna": 25, "duracion_segundos": 2}, {"consigna": 75, "duracion_segundos": 3}]}
        self.orden = {"ensayo_id": self.ensayo_id, "clave": str(uuid4())}
        status, _ = await self.pedir("PUT", f"/tunel/programas/{self.ensayo_id}", self.config)
        self.assertEqual(status, 200)
        await self.pedir("POST", "/tunel/conectar")
        if inicio_directo:
            self.orden["encender"] = True
        else:
            await self.pedir("POST", "/tunel/encender", {"potencia_porcentaje": 10})
        status, estado = await self.pedir("POST", "/tunel/programa/iniciar", self.orden)
        self.assertEqual(status, 200, estado)
        return estado

    def avanzar(self, segundos=1):
        for _ in range(segundos):
            Reloj.actual += timedelta(seconds=1)
            self.capturador.tick()

    async def programa(self):
        return (await self.pedir("GET", f"/tunel/programas/{self.ensayo_id}"))[1]

    async def test_inicio_directo_enciende_a_cero_y_ejecuta_la_primera_etapa_una_vez(self):
        controlador = self.capturador.controlador
        controlador.aplicar_consigna(100)
        with patch.object(controlador, "encender", wraps=controlador.encender) as encender:
            estado = await self.preparar(inicio_directo=True)
            encender.assert_called_once_with(0)
            self.assertTrue(estado["encendido"])
            self.assertEqual(estado["potencia_objetivo"], 25)
            captura_id = estado["captura"]["id"]
            repetido = await self.pedir("POST", "/tunel/programa/iniciar", self.orden)
            self.assertEqual(repetido[0], 200)
            self.assertEqual(repetido[1]["captura"]["id"], captura_id)
            self.avanzar(30)
            self.assertFalse(controlador.leer_estado()["encendido"])
            await self.pedir("POST", "/tunel/programa/iniciar", self.orden)
            encender.assert_called_once_with(0)
            self.assertFalse(controlador.leer_estado()["encendido"])

    async def test_inicio_directo_rechazado_no_enciende_ni_crea_medicion(self):
        await self.preparar(inicio_directo=True)
        self.avanzar(30)
        orden = {**self.orden, "clave": str(uuid4())}
        controlador = self.capturador.controlador
        with patch.object(controlador, "encender", wraps=controlador.encender) as encender:
            status, error = await self.pedir("POST", "/tunel/programa/iniciar", orden)
            self.assertEqual(status, 409)
            self.assertIn("ese nombre", error["detail"])
            await self.pedir("PUT", f"/tunel/programas/{self.ensayo_id}", {**self.config, "nombre": "Otro"})
            with patch.object(base.configuracion, "limite_mediciones_por_ensayo", 1):
                self.assertEqual((await self.pedir("POST", "/tunel/programa/iniciar", orden))[0], 409)
            self.assertEqual((await self.pedir("POST", "/tunel/programa/iniciar", orden, usuario="prof_demo"))[0], 404)
            await self.pedir("POST", "/tunel/desconectar")
            self.assertEqual((await self.pedir("POST", "/tunel/programa/iniciar", orden))[0], 409)
            encender.assert_not_called()
        self.assertFalse(controlador.leer_estado()["encendido"])
        self.assertIsNone(self.capturador.activa_id)
        with self.base.sessions() as sesion:
            self.assertEqual(len(sesion.scalars(select(Medicion)).all()), 1)

    async def test_fallo_de_captura_en_inicio_directo_apaga_el_tunel(self):
        await self.preparar(inicio_directo=True)
        self.avanzar(30)
        await self.pedir("PUT", f"/tunel/programas/{self.ensayo_id}", {**self.config, "nombre": "Otro"})
        with patch.object(self.capturador, "iniciar", side_effect=RuntimeError("Fallo de captura")):
            with self.assertRaisesRegex(RuntimeError, "Fallo de captura"):
                await self.pedir("POST", "/tunel/programa/iniciar", {**self.orden, "clave": str(uuid4())})
        self.assertFalse(self.capturador.controlador.leer_estado()["encendido"])
        self.assertIsNone(self.capturador.programador.activo_id)

    async def test_una_etapa_guarda_una_medicion_con_su_nombre_y_ensayo(self):
        await self.preparar(etapas=[{"consigna": 50, "duracion_segundos": 3}])
        self.avanzar(30)
        programa = await self.programa()
        self.assertEqual(programa["estado"], "completado")
        self.assertEqual(len(programa["mediciones"]), 1)
        with self.base.sessions() as sesion:
            medicion = sesion.get(Medicion, programa["mediciones"][0])
            self.assertEqual(medicion.nombre, self.config["nombre"])
            self.assertEqual(medicion.ensayo_id, self.ensayo_id)
            self.assertEqual(len(medicion.programa["etapas"]), 1)
            self.assertEqual(medicion.programa["etapas"][0]["estado"], "completada")
            muestras = sesion.scalars(select(MuestraMedicion).where(MuestraMedicion.medicion_id == medicion.id)).all()
            self.assertGreaterEqual(len(muestras), 3)
        self.assertFalse(self.capturador.controlador.leer_estado()["encendido"])

    async def test_nombre_duplicado_no_arranca_programa_ni_aplica_consigna(self):
        await self.preparar()
        self.avanzar(30)
        anterior = await self.programa()
        await self.pedir("POST", "/tunel/encender", {"potencia_porcentaje": 0})
        status, error = await self.pedir("POST", "/tunel/programa/iniciar", {**self.orden, "clave": str(uuid4())})
        self.assertEqual(status, 409)
        self.assertIn("ese nombre", error["detail"])
        self.assertEqual(self.capturador.controlador.leer_estado()["potencia_objetivo"], 0)
        self.assertIsNone(self.capturador.activa_id)
        self.assertIsNone(self.capturador.programador.activo_id)
        self.assertEqual((await self.programa())["mediciones"], anterior["mediciones"])
        self.assertEqual((await self.programa())["estado"], "completado")

    async def test_ejecuta_sin_navegador_guarda_una_medicion_con_todas_las_etapas(self):
        await self.preparar()
        self.avanzar(30)  # Solo el hilo del capturador avanza; no hay peticiones HTTP.
        programa = await self.programa()
        self.assertEqual(programa["estado"], "completado")
        self.assertEqual(len(programa["mediciones"]), 1)
        self.assertFalse(self.capturador.controlador.leer_estado()["encendido"])
        with self.base.sessions() as sesion:
            mediciones = sesion.scalars(select(Medicion).order_by(Medicion.id)).all()
            self.assertEqual(len(mediciones), 1)
            medicion = mediciones[0]
            self.assertEqual(medicion.id, programa["mediciones"][0])
            self.assertEqual(medicion.estado.value, "finalizada")
            self.assertEqual(medicion.nombre, "Barrido")
            self.assertEqual(medicion.programa["nombre"], "Barrido")
            etapas = medicion.programa["etapas"]
            self.assertEqual([e["estado"] for e in etapas], ["completada", "completada"])
            self.assertEqual(etapas[0]["cambio_segundo"], 0)
            self.assertGreater(etapas[0]["inicio_segundo"], 0)
            self.assertGreater(etapas[1]["inicio_segundo"], etapas[0]["fin_segundo"])
            for etapa in etapas:
                self.assertAlmostEqual(etapa["fin_segundo"] - etapa["inicio_segundo"], etapa["duracion_segundos"])
            copia = medicion.programa
            muestras = sesion.scalars(select(MuestraMedicion).where(MuestraMedicion.medicion_id == medicion.id)).all()
            velocidades = [float(m.velocidad_ms) for m in muestras]
            self.assertGreaterEqual(sum(abs(v - 2.561) < 0.001 for v in velocidades), 2)
            self.assertGreaterEqual(sum(abs(v - 8.18) < 0.001 for v in velocidades), 3)
            self.assertTrue(any(2.561 < v < 8.18 for v in velocidades))
            self.assertTrue(any(not m.flujo_estable for m in muestras))
            self.assertTrue(any(m.flujo_estable for m in muestras))
            self.assertEqual(medicion.programa["version"], 2)
            self.assertTrue(all((b.instante - a.instante).total_seconds() == 1 for a, b in zip(muestras, muestras[1:])))
            eventos = sesion.scalars(select(EventoMedicion).where(EventoMedicion.medicion_id == medicion.id)).all()
            self.assertTrue(any("Etapa 1/2 iniciada" in evento.mensaje for evento in eventos))
            self.assertTrue(any("Etapa 2/2 finalizada" in evento.mensaje for evento in eventos))
        status, _ = await self.pedir("POST", "/tunel/programa/iniciar", self.orden)
        self.assertEqual(status, 200)  # Repetir la misma orden no crea nuevas mediciones.
        self.assertEqual((await self.programa())["mediciones"], programa["mediciones"])
        status, listado = await self.pedir("GET", "/ensayos")
        self.assertEqual(status, 200)
        self.assertEqual(listado[0]["total_mediciones"], 1)
        await self.pedir("PUT", f"/tunel/programas/{self.ensayo_id}", {"nombre": "Editado", "etapas": [{"consigna": 50, "duracion_segundos": 20}]})
        with self.base.sessions() as sesion:
            self.assertEqual(sesion.get(Medicion, programa["mediciones"][0]).programa, copia)

    async def test_bloquea_ordenes_edicion_y_borrado_tambien_al_estabilizar(self):
        await self.preparar()
        for metodo, ruta, datos in [
            ("POST", "/tunel/consigna", {"potencia_porcentaje": 50}),
            ("POST", "/tunel/medicion/iniciar", {"ensayo_id": self.ensayo_id, "clave": str(uuid4()), "nombre": "Manual"}),
            ("PUT", f"/tunel/programas/{self.ensayo_id}", self.config),
            ("PUT", f"/ensayos/{self.ensayo_id}", {"nombre": "Cambio durante ejecución"}),
            ("DELETE", f"/ensayos/{self.ensayo_id}", None),
        ]:
            self.assertEqual((await self.pedir(metodo, ruta, datos))[0], 409, ruta)
        self.assertEqual((await self.pedir("POST", "/tunel/programa/iniciar", {**self.orden, "clave": str(uuid4())}))[0], 409)

    async def test_detener_durante_primera_rampa_conserva_medicion_parcial(self):
        estado = await self.preparar()
        self.assertEqual(estado["total_muestras"], 1)
        self.assertEqual(estado["captura"]["estado"], "en_curso")
        self.avanzar()
        await self.pedir("POST", "/tunel/programa/detener", self.orden)
        programa = await self.programa()
        with self.base.sessions() as sesion:
            medicion = sesion.get(Medicion, programa["mediciones"][0])
            etapa = medicion.programa["etapas"][0]
            self.assertEqual(etapa["estado"], "parcial")
            self.assertIsNone(etapa["inicio_segundo"])
            self.assertEqual(etapa["tramos_estables"], [])
            self.assertEqual(etapa["fin_segundo"], 1)

    async def test_perder_estabilidad_sigue_guardando_y_reinicia_tiempo_estable(self):
        await self.preparar(etapas=[{"consigna": 25, "duracion_segundos": 5}])
        self.avanzar(7)
        self.assertEqual((await self.programa())["estado"], "registrando")
        self.capturador.controlador._estable_desde = None
        self.avanzar()
        self.assertEqual((await self.programa())["estado"], "estabilizando")
        self.assertTrue(self.capturador.controlador.leer_estado()["encendido"])
        self.avanzar(15)
        programa = await self.programa()
        self.assertEqual(programa["estado"], "completado")
        with self.base.sessions() as sesion:
            medicion = sesion.get(Medicion, programa["mediciones"][0])
            tramos = medicion.programa["etapas"][0]["tramos_estables"]
            self.assertEqual(len(tramos), 2)
            self.assertGreater(tramos[1]["inicio"], tramos[0]["fin"])
            self.assertEqual(tramos[1]["fin"] - tramos[1]["inicio"], 5)
            muestras = sesion.scalars(select(MuestraMedicion).where(MuestraMedicion.medicion_id == medicion.id)).all()
            self.assertTrue(any(not m.flujo_estable and m.instante > medicion.fecha_inicio + timedelta(seconds=7) for m in muestras))

    async def test_espera_excesiva_detiene_y_conserva_transicion(self):
        await self.preparar()
        with patch.dict("app.control_tunel.CALIBRACION", {"segundosEstabilidadRequeridos": 1000}):
            with self.assertLogs("app.capturas", level="ERROR"):
                self.avanzar(130)
        programa = await self.programa()
        self.assertEqual(programa["estado"], "error")
        self.assertFalse(self.capturador.controlador.leer_estado()["encendido"])
        with self.base.sessions() as sesion:
            medicion = sesion.get(Medicion, programa["mediciones"][0])
            self.assertEqual(medicion.estado.value, "error")
            self.assertEqual(medicion.programa["etapas"][0]["estado"], "parcial")

    async def test_otro_usuario_no_accede_ni_detiene(self):
        await self.preparar()
        for metodo, ruta, datos in [
            ("GET", f"/tunel/programas/{self.ensayo_id}", None),
            ("PUT", f"/tunel/programas/{self.ensayo_id}", self.config),
            ("POST", "/tunel/programa/iniciar", self.orden),
            ("POST", "/tunel/programa/detener", self.orden),
        ]:
            self.assertEqual((await self.pedir(metodo, ruta, datos, usuario="prof_demo"))[0], 404)
        self.assertIsNone((await self.pedir("GET", "/tunel/estado", usuario="prof_demo"))[1]["programa"])

    async def test_detener_conserva_etapa_parcial_y_reintento_no_cancela_otra_ejecucion(self):
        await self.preparar()
        self.avanzar(6)
        self.assertEqual((await self.programa())["estado"], "registrando")
        self.assertEqual((await self.pedir("POST", "/tunel/programa/detener", self.orden))[0], 200)
        programa = await self.programa()
        self.assertEqual(programa["estado"], "detenido")
        with self.base.sessions() as sesion:
            etapas = sesion.get(Medicion, programa["mediciones"][0]).programa["etapas"]
            self.assertEqual(etapas[0]["estado"], "parcial")
            self.assertGreaterEqual(etapas[0]["fin_segundo"], etapas[0]["inicio_segundo"])
            self.assertEqual(etapas[1]["estado"], "pendiente")
        self.assertEqual(len(programa["mediciones"]), 1)
        self.avanzar(20)
        self.assertEqual((await self.programa())["mediciones"], programa["mediciones"])
        await self.pedir("POST", "/tunel/encender", {"potencia_porcentaje": 10})
        nueva = {**self.orden, "clave": str(uuid4())}
        await self.pedir("PUT", f"/tunel/programas/{self.ensayo_id}", {**self.config, "nombre": "Barrido 2"})
        self.assertEqual((await self.pedir("POST", "/tunel/programa/iniciar", nueva))[0], 200)
        self.assertEqual((await self.pedir("POST", "/tunel/programa/detener", self.orden))[0], 409)
        self.assertTrue((await self.programa())["activo"])

    async def test_reinicio_interrumpe_y_recupera_muestras(self):
        await self.preparar()
        self.avanzar(6)
        self.capturador = CapturadorTunel(ControladorTunelSimulado(), self.base.sessions)
        self.capturador.recuperar_interrumpidas()
        programa = await self.programa()
        self.assertEqual(programa["estado"], "error")
        self.assertEqual(len(programa["mediciones"]), 1)
        with self.base.sessions() as sesion:
            medicion = sesion.get(Medicion, programa["mediciones"][0])
            self.assertEqual(medicion.estado.value, "error")
            self.assertEqual(medicion.programa["etapas"][0]["estado"], "parcial")

    async def test_apagado_docente_cancela_programa(self):
        await self.preparar()
        self.assertEqual((await self.pedir("POST", "/tunel/docente/desconectar", usuario="prof_demo"))[0], 200)
        self.avanzar(20)
        self.assertEqual((await self.programa())["estado"], "detenido")
        self.assertIsNone(self.capturador.activa_id)

    async def test_fallo_guardado_interrumpe_sin_pasar_de_etapa(self):
        await self.preparar()
        self.avanzar(6)
        def fallar(conn, cursor, statement, parameters, context, executemany):
            if statement.startswith("INSERT INTO muestras_medicion"):
                raise RuntimeError("Fallo de escritura inyectado")
        event.listen(self.base.engine, "before_cursor_execute", fallar)
        try:
            with self.assertLogs("app.capturas", level="ERROR"):
                self.avanzar()
        finally:
            event.remove(self.base.engine, "before_cursor_execute", fallar)
        self.avanzar()
        self.assertEqual((await self.programa())["estado"], "error")
        self.assertFalse(self.capturador.controlador.leer_estado()["encendido"])

    async def test_valida_limites_y_espacio_antes_de_ejecutar(self):
        await self.preparar()
        await self.pedir("POST", "/tunel/programa/detener", self.orden)
        for etapas in [[], [{"consigna": 0, "duracion_segundos": 1}],
                       [{"consigna": 101, "duracion_segundos": 1}],
                       [{"consigna": 50, "duracion_segundos": 1.5}],
                       [{"consigna": 50, "duracion_segundos": 3601}]]:
            self.assertEqual((await self.pedir("PUT", f"/tunel/programas/{self.ensayo_id}", {"nombre": "Prueba", "etapas": etapas}))[0], 422)
        await self.pedir("POST", "/tunel/encender", {"potencia_porcentaje": 10})
        await self.pedir("PUT", f"/tunel/programas/{self.ensayo_id}", {**self.config, "nombre": "Barrido 2"})
        with patch.object(base.configuracion, "limite_mediciones_por_ensayo", 2):
            self.assertEqual((await self.pedir("POST", "/tunel/programa/iniciar", {**self.orden, "clave": str(uuid4())}))[0], 200)
        self.avanzar(30)
        self.assertEqual(len((await self.programa())["mediciones"]), 1)
        await self.pedir("POST", "/tunel/encender", {"potencia_porcentaje": 10})
        await self.pedir("PUT", f"/tunel/programas/{self.ensayo_id}", {**self.config, "nombre": "Barrido 3"})
        with patch.object(base.configuracion, "limite_mediciones_por_ensayo", 2):
            self.assertEqual((await self.pedir("POST", "/tunel/programa/iniciar", {**self.orden, "clave": str(uuid4())}))[0], 409)
