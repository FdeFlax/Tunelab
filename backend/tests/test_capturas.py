"""Captura sin navegador, reintentos, fallos y recuperacion del servidor."""
from datetime import datetime, timedelta
from unittest.mock import patch
import asyncio
from uuid import uuid4
import unittest

import test_autenticacion as base
from sqlalchemy import event, func, select
from app.capturas import CapturadorTunel, obtener_capturador
from app.control_tunel import ControladorTunelSimulado
from app.tablas import Ensayo, EventoMedicion, Medicion, MuestraMedicion, EstadoMedicion
from app.configuracion import configuracion


class CapturasTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.base = base.AutenticacionTests()
        self.base.setUp()
        self.base.demo()
        self.base.sessions.configure(autoflush=False)
        self.controlador = ControladorTunelSimulado()
        self.capturador = CapturadorTunel(self.controlador, self.base.sessions, intervalo=0.03)
        base.app.dependency_overrides[obtener_capturador] = lambda: self.capturador
        self.headers = {"X-Usuario-Uacloud": "alu_demo"}

    def tearDown(self):
        self.capturador.parada.set()
        if self.capturador.hilo:
            self.capturador.hilo.join(timeout=2)
        self.base.tearDown()

    async def pedir(self, metodo, ruta, body=None, docente=False):
        return await base.peticion(metodo, "/api" + ruta,
            {"X-Usuario-Uacloud": "prof_demo"} if docente else self.headers, body)

    async def preparar(self, duracion=300):
        _, ensayo = await self.pedir("POST", "/ensayos", {"nombre": "Persistencia"})
        self.datos = {"ensayo_id": ensayo["id"], "clave": str(uuid4()),
                      "nombre": "Captura", "consigna": 75, "duracion_segundos": duracion}
        await self.pedir("POST", "/tunel/conectar")
        status, estado = await self.pedir("POST", "/tunel/capturas", self.datos)
        self.assertEqual(status, 200, estado)
        return estado["captura"]["id"]

    async def test_las_rutas_antiguas_no_permiten_crear_capturas(self):
        await self.pedir("POST", "/tunel/conectar")
        for metodo, ruta, datos in [
            ("POST", "/tunel/encender", {"potencia_porcentaje": 100}),
            ("POST", "/tunel/consigna", {"potencia_porcentaje": 100}),
            ("POST", "/tunel/medicion/iniciar", {"ensayo_id": 1, "nombre": "Manual", "clave": str(uuid4())}),
            ("POST", "/tunel/medicion/detener", {"medicion_id": 1}),
            ("GET", "/tunel/muestra", None),
            ("GET", "/tunel/programas/1", None),
            ("PUT", "/tunel/programas/1", {}),
            ("POST", "/tunel/programa/iniciar", {}),
            ("POST", "/tunel/programa/detener", {}),
            ("POST", "/ensayos/1/mediciones/finalizar", {"nombre": "Importada", "muestras": []}),
            ("POST", "/eventos", {"mensaje": "Captura guardada"}),
        ]:
            with self.subTest(ruta=ruta):
                self.assertEqual((await self.pedir(metodo, ruta, datos))[0], 404)
        self.assertFalse(self.controlador.leer_estado()["encendido"])
        with self.base.sessions() as sesion:
            for tabla in (Ensayo, Medicion, MuestraMedicion):
                self.assertEqual(sesion.scalar(select(func.count()).select_from(tabla)), 0)

    async def test_nombre_unico_por_ensayo_y_reintento_conserva_captura(self):
        identificador = await self.preparar()
        await self.pedir("POST", f"/tunel/capturas/{identificador}/detener")
        status, repetida = await self.pedir("POST", "/tunel/capturas", self.datos)
        self.assertEqual(status, 200)
        self.assertEqual(repetida["captura"]["id"], identificador)
        for nombre in ("Captura", "  CAPTURA  "):
            status, error = await self.pedir("POST", "/tunel/capturas", {**self.datos, "clave": str(uuid4()), "nombre": nombre})
            self.assertEqual(status, 409)
            self.assertIn("ese nombre", error["detail"])
            self.assertIsNone(self.capturador.activa_id)
        otra = await self.preparar()
        self.assertNotEqual(otra, identificador)

    async def test_captura_sin_peticiones_y_recuperacion_de_la_misma_medicion(self):
        self.capturador.arrancar()
        identificador = await self.preparar()
        # Ninguna peticion HTTP durante este intervalo: adquiere el hilo del servidor.
        await asyncio.sleep(0.2)
        self.capturador.parada.set()
        self.capturador.hilo.join(timeout=2)
        _, recuperada = await self.pedir("GET", "/tunel/estado")
        self.assertEqual(recuperada["captura"]["id"], identificador)
        self.assertEqual(recuperada["captura"]["estado"], "en_curso")
        self.assertGreater(recuperada["total_muestras"], 1)
        _, muestras = await self.pedir("GET", f"/tunel/capturas/{identificador}/muestras")
        self.assertEqual(len(muestras), recuperada["total_muestras"])
        self.assertTrue(all(m["instante"] and m["presion_pa"] >= 0 for m in muestras))
        _, repetida = await self.pedir("POST", "/tunel/capturas", self.datos)
        self.assertEqual(repetida["captura"]["id"], identificador)
        for _ in range(2):
            status, final = await self.pedir("POST", f"/tunel/capturas/{identificador}/detener")
            self.assertEqual(status, 200)
            self.assertEqual(final["captura"]["id"], identificador)
            self.assertEqual(final["captura"]["estado"], "cancelada")
        self.assertAlmostEqual(final["captura"]["velocidad_media"],
                               sum(m["velocidad_ms"] for m in muestras) / len(muestras), places=2)
        _, registradas = await self.pedir("GET", f'/ensayos/{self.datos["ensayo_id"]}/mediciones')
        self.assertEqual([m["id"] for m in registradas], [identificador])
        _, informe = await self.pedir("GET", f"/mediciones/{identificador}/muestras")
        self.assertEqual(len(informe), len(muestras))
        with self.base.sessions() as sesion:
            self.assertEqual(sesion.scalar(select(func.count(Medicion.id))), 1)

    async def test_reiniciar_conserva_muestras_y_marca_interrupcion(self):
        identificador = await self.preparar()
        self.capturador.tick()
        self.capturador = CapturadorTunel(ControladorTunelSimulado(), self.base.sessions)
        self.capturador.recuperar_interrumpidas()
        _, recuperada = await self.pedir("GET", "/tunel/estado")
        self.assertEqual(recuperada["captura"]["id"], identificador)
        self.assertEqual(recuperada["captura"]["estado"], "error")
        self.assertEqual(recuperada["total_muestras"], 2)
        self.assertFalse(recuperada["encendido"])

    async def test_fallo_de_escritura_detiene_y_conserva_lo_confirmado(self):
        identificador = await self.preparar()
        def fallar(conn, cursor, statement, parameters, context, executemany):
            if statement.startswith("INSERT INTO muestras_medicion"):
                raise RuntimeError("Fallo inyectado")
        event.listen(self.base.engine, "before_cursor_execute", fallar)
        try:
            with self.assertLogs("app.capturas", level="ERROR"):
                self.capturador.tick()
        finally:
            event.remove(self.base.engine, "before_cursor_execute", fallar)
        self.assertFalse(self.controlador.leer_estado()["midiendo"])
        self.assertEqual(self.capturador.error_pendiente, identificador)
        self.capturador.tick()
        _, estado = await self.pedir("GET", "/tunel/estado")
        self.assertEqual(estado["captura"]["estado"], "error")
        self.assertEqual(estado["total_muestras"], 1)

    async def test_otro_usuario_no_puede_leer_ni_detener_la_captura(self):
        identificador = await self.preparar()
        self.assertEqual((await self.pedir("GET", f"/tunel/capturas/{identificador}/muestras", docente=True))[0], 404)
        self.assertEqual((await self.pedir("POST", f"/tunel/capturas/{identificador}/detener", docente=True))[0], 404)

    async def test_apagado_y_liberacion_docente_finalizan_con_muestras(self):
        for docente in (False, True):
            identificador = await self.preparar()
            ruta = "/tunel/docente/desconectar" if docente else "/tunel/apagar"
            self.assertEqual((await self.pedir("POST", ruta, docente=docente))[0], 200)
            with self.base.sessions() as sesion:
                self.assertEqual(sesion.get(Medicion, identificador).estado, EstadoMedicion.cancelada)
                self.assertEqual(sesion.scalar(select(func.count(MuestraMedicion.id)).where(MuestraMedicion.medicion_id == identificador)), 1)

    async def test_no_borrar_durante_captura(self):
        identificador = await self.preparar()
        self.assertEqual((await self.pedir("DELETE", f"/mediciones/{identificador}"))[0], 409)
        self.assertEqual((await self.pedir("DELETE", f'/ensayos/{self.datos["ensayo_id"]}'))[0], 409)

    async def test_fallo_en_primera_muestra_no_deja_medicion_vacia(self):
        def fallar(conn, cursor, statement, parameters, context, executemany):
            if statement.startswith("INSERT INTO muestras_medicion"):
                raise RuntimeError("Fallo inyectado")
        event.listen(self.base.engine, "before_cursor_execute", fallar)
        try:
            with self.assertRaisesRegex(RuntimeError, "Fallo inyectado"):
                await self.preparar()
        finally:
            event.remove(self.base.engine, "before_cursor_execute", fallar)
        self.assertFalse(self.controlador.leer_estado()["encendido"])
        with self.base.sessions() as sesion:
            self.assertEqual(sesion.scalar(select(func.count(Medicion.id))), 0)
            self.assertEqual(sesion.scalar(select(func.count(MuestraMedicion.id))), 0)
            self.assertEqual(sesion.scalar(select(func.count(EventoMedicion.id)).where(EventoMedicion.medicion_id.is_not(None))), 0)

    async def test_una_consigna_hasta_el_fin_sin_esperar_estabilidad(self):
        class Reloj:
            actual = datetime(2026, 11, 23, 10)
            @classmethod
            def utcnow(cls):
                return cls.actual
        with patch("app.control_tunel.datetime", Reloj), patch("app.capturas.datetime", Reloj):
            self.controlador.aplicar_consigna(100)
            with patch.object(self.controlador, 'encender', wraps=self.controlador.encender) as encender:
                identificador = await self.preparar(duracion=3)
                await self.pedir('POST', '/tunel/capturas', self.datos)
                encender.assert_called_once_with(0)
            for segundo in range(1, 4):
                Reloj.actual += timedelta(seconds=1)
                self.controlador._estable_desde = None
                self.capturador.tick()
                estado = self.controlador.leer_estado()
                self.assertEqual(estado['encendido'], segundo < 3)
            with self.base.sessions() as sesion:
                medicion = sesion.get(Medicion, identificador)
                self.assertEqual(medicion.estado, EstadoMedicion.finalizada)
                self.assertEqual(medicion.duracion_segundos, 3)
                self.assertEqual(medicion.duracion_prevista_segundos, 3)
                self.assertIsNone(medicion.programa)
                muestras = sesion.scalars(select(MuestraMedicion).where(MuestraMedicion.medicion_id == identificador)).all()
                self.assertEqual(len(muestras), 4)
                self.assertTrue(all(m.consigna_objetivo == 75 for m in muestras))
            self.assertIsNone(self.capturador.activa_id)

    async def test_un_ciclo_retrasado_cierra_con_el_tiempo_real(self):
        identificador = await self.preparar(duracion=2)
        with self.base.sessions.begin() as sesion:
            sesion.get(Medicion, identificador).fecha_inicio -= timedelta(seconds=5)
        self.capturador.tick()
        with self.base.sessions() as sesion:
            medicion = sesion.get(Medicion, identificador)
            self.assertEqual(medicion.estado, EstadoMedicion.finalizada)
            self.assertGreaterEqual(medicion.duracion_segundos, 5)
        self.assertFalse(self.controlador.leer_estado()['encendido'])

    async def test_reintentar_parada_antigua_no_detiene_la_nueva(self):
        identificador = await self.preparar()
        await self.pedir('POST', f'/tunel/capturas/{identificador}/detener')
        status, nueva = await self.pedir('POST', '/tunel/capturas', {**self.datos, 'nombre':'Otra', 'clave':str(uuid4())})
        self.assertEqual(status, 200)
        await self.pedir('POST', f'/tunel/capturas/{identificador}/detener')
        self.assertEqual(self.capturador.activa_id, nueva['captura']['id'])
        self.assertTrue(self.controlador.leer_estado()['encendido'])

    async def test_validacion_propiedad_y_cupo_antes_de_encender(self):
        _, ensayo = await self.pedir('POST', '/ensayos', {'nombre':'Límites'})
        datos = {'ensayo_id':ensayo['id'], 'clave':str(uuid4()), 'nombre':'Captura', 'consigna':25, 'duracion_segundos':2}
        self.assertEqual((await self.pedir('POST', '/tunel/capturas', datos))[0], 409)
        await self.pedir('POST', '/tunel/conectar')
        self.assertEqual((await self.pedir('POST', '/tunel/capturas', datos, docente=True))[0], 404)
        for cambios in ({'consigna':0}, {'consigna':101}, {'consigna':25.123}, {'duracion_segundos':0},
                        {'duracion_segundos':301}, {'duracion_segundos':1.5}, {'nombre':' '}, {'etapas':[]}):
            self.assertEqual((await self.pedir('POST', '/tunel/capturas', {**datos, **cambios}))[0], 422, cambios)
        with patch.object(configuracion, 'limite_mediciones_por_ensayo', 0):
            self.assertEqual((await self.pedir('POST', '/tunel/capturas', datos))[0], 409)
        self.assertFalse(self.controlador.leer_estado()['encendido'])
        with self.base.sessions() as sesion:
            self.assertEqual(sesion.scalar(select(func.count(Medicion.id))), 0)

    async def test_no_se_edita_ni_se_inicia_otra_durante_una_captura(self):
        await self.preparar()
        self.assertEqual((await self.pedir('PUT', f'/ensayos/{self.datos["ensayo_id"]}', {'nombre':'Cambio'}))[0], 409)
        self.assertEqual((await self.pedir('POST', '/tunel/capturas', {**self.datos, 'nombre':'Otra', 'clave':str(uuid4())}))[0], 409)
        self.assertEqual((await self.pedir('POST', '/tunel/capturas', {**self.datos, 'consigna':50}))[0], 409)
        self.assertEqual(self.controlador.leer_estado()['potencia_objetivo'], 75)
