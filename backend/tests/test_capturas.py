"""Captura sin navegador, reintentos, fallos y recuperacion del servidor."""
import asyncio
from datetime import datetime, timedelta
from uuid import uuid4
import unittest

import test_autenticacion as base
from sqlalchemy import event, func, select
from app.capturas import CapturadorTunel, obtener_capturador
from app.control_tunel import ControladorTunelSimulado
from app.datos_api import CapturaIniciar
from app.tablas import Ensayo, EventoMedicion, Medicion, MuestraMedicion, EstadoMedicion


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

    async def test_marcha_manual_sin_ensayo_no_crea_mediciones(self):
        await self.pedir("POST", "/tunel/conectar")
        status, estado = await self.pedir("POST", "/tunel/encender", {"potencia_porcentaje": 100})
        self.assertEqual(status, 200)
        self.assertEqual(estado["potencia_objetivo"], 0)
        status, estado = await self.pedir("POST", "/tunel/consigna", {"potencia_porcentaje": 40})
        self.assertEqual(status, 200)
        self.assertEqual(estado["potencia_objetivo"], 40)
        self.controlador._estado.actualizado_en -= timedelta(seconds=10)
        self.capturador.tick()
        self.assertGreater(self.controlador.leer_estado()["velocidad_ms"], 0)
        status, estado = await self.pedir("POST", "/tunel/apagar")
        self.assertEqual(status, 200)
        self.assertFalse(estado["encendido"])
        with self.base.sessions() as sesion:
            for tabla in (Ensayo, Medicion, MuestraMedicion):
                self.assertEqual(sesion.scalar(select(func.count()).select_from(tabla)), 0)

    async def preparar(self):
        _, ensayo = await self.pedir("POST", "/ensayos", {"nombre": "Persistencia"})
        await self.pedir("POST", "/tunel/conectar")
        await self.pedir("POST", "/tunel/encender", {"potencia_porcentaje": 0})
        await self.pedir("POST", "/tunel/consigna", {"potencia_porcentaje": 75})
        # Adelantar el reloj del simulador sin esperar una rampa real en cada prueba.
        self.controlador._estado.actualizado_en -= timedelta(seconds=10)
        self.controlador.leer_estado()
        self.controlador._estable_desde -= timedelta(seconds=5)
        self.datos = {"ensayo_id": ensayo["id"], "clave": str(uuid4()), "nombre": "Captura"}
        status, estado = await self.pedir("POST", "/tunel/medicion/iniciar", self.datos)
        self.assertEqual(status, 200, estado)
        return estado["captura"]["id"]

    async def test_inicio_exige_ensayo_propietario_y_encendido_pero_no_estabilidad(self):
        self.assertEqual((await self.pedir("POST", "/tunel/medicion/iniciar", {}))[0], 422)
        _, ensayo = await self.pedir("POST", "/ensayos", {"nombre": "Prueba"})
        datos = {"ensayo_id": ensayo["id"], "clave": str(uuid4()), "nombre": "Captura"}
        self.assertEqual((await self.pedir("POST", "/tunel/medicion/iniciar", datos, docente=True))[0], 404)
        self.assertEqual((await self.pedir("POST", "/tunel/medicion/iniciar", datos))[0], 409)
        await self.pedir("POST", "/tunel/conectar")
        self.assertEqual((await self.pedir("POST", "/tunel/medicion/iniciar", datos))[0], 409)
        await self.pedir("POST", "/tunel/encender", {"potencia_porcentaje": 100})
        await self.pedir("POST", "/tunel/consigna", {"potencia_porcentaje": 100})
        status, estado = await self.pedir("POST", "/tunel/medicion/iniciar", datos)
        self.assertEqual(status, 200)
        self.assertFalse(estado["flujo_estable"])
        _, muestras = await self.pedir("GET", f'/tunel/capturas/{estado["captura"]["id"]}/muestras')
        self.assertFalse(muestras[0]["flujo_estable"])
        self.assertEqual(muestras[0]["consigna_objetivo"], 100)

    async def test_encendido_reinicia_consigna_incluso_con_peticion_antigua_al_cien(self):
        await self.pedir("POST", "/tunel/conectar")
        await self.pedir("POST", "/tunel/consigna", {"potencia_porcentaje": 100})
        status, _ = await self.pedir("POST", "/tunel/encender", {"potencia_porcentaje": 100}, docente=True)
        self.assertEqual(status, 409)
        self.assertFalse(self.controlador.leer_estado()["encendido"])
        for _ in range(2):
            status, estado = await self.pedir("POST", "/tunel/encender", {"potencia_porcentaje": 100})
            self.assertEqual(status, 200)
            self.assertTrue(estado["encendido"])
            self.assertEqual(estado["potencia_objetivo"], 0)
            self.controlador._estado.actualizado_en -= timedelta(seconds=10)
            self.assertEqual(self.controlador.leer_estado()["velocidad_ms"], 0)
            _, aplicada = await self.pedir("POST", "/tunel/consigna", {"potencia_porcentaje": 50})
            self.assertEqual(aplicada["potencia_objetivo"], 50)
            await self.pedir("POST", "/tunel/apagar")
            await self.pedir("POST", "/tunel/conectar")
        with self.base.sessions() as sesion:
            encendidos = sesion.scalars(select(EventoMedicion.mensaje).where(
                EventoMedicion.mensaje.like("Encendido:%"))).all()
            self.assertEqual(encendidos, ["Encendido: 0%.", "Encendido: 0%."])

    async def test_nombre_unico_por_ensayo_y_reintento_conserva_captura(self):
        identificador = await self.preparar()
        await self.pedir("POST", "/tunel/medicion/detener", {"medicion_id": identificador})
        for nombre in ("Captura", "  CAPTURA  "):
            status, error = await self.pedir("POST", "/tunel/medicion/iniciar",
                {**self.datos, "clave": str(uuid4()), "nombre": nombre})
            self.assertEqual(status, 409)
            self.assertIn("ese nombre", error["detail"])
            self.assertIsNone(self.capturador.activa_id)
        status, repetida = await self.pedir("POST", "/tunel/medicion/iniciar", self.datos)
        self.assertEqual(status, 200)
        self.assertEqual(repetida["captura"]["id"], identificador)
        _, ensayo = await self.pedir("POST", "/ensayos", {"nombre": "Otro ensayo"})
        status, nueva = await self.pedir("POST", "/tunel/medicion/iniciar",
            {**self.datos, "ensayo_id": ensayo["id"], "clave": str(uuid4())})
        self.assertEqual(status, 200)
        self.assertNotEqual(nueva["captura"]["id"], identificador)

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
        self.assertTrue(all(m["instante"] and m["presion_pa"] > 0 for m in muestras))
        _, repetida = await self.pedir("POST", "/tunel/medicion/iniciar", self.datos)
        self.assertEqual(repetida["captura"]["id"], identificador)
        for _ in range(2):
            status, final = await self.pedir("POST", "/tunel/medicion/detener", {"medicion_id": identificador})
            self.assertEqual(status, 200)
            self.assertEqual(final["captura"]["id"], identificador)
            self.assertEqual(final["captura"]["estado"], "finalizada")
        self.assertAlmostEqual(final["captura"]["velocidad_media"], 8.18, places=2)
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
        self.assertEqual((await self.pedir("POST", "/tunel/medicion/detener", {"medicion_id": identificador}, docente=True))[0], 404)

    async def test_apagado_y_liberacion_docente_finalizan_con_muestras(self):
        for docente in (False, True):
            identificador = await self.preparar()
            ruta = "/tunel/docente/desconectar" if docente else "/tunel/apagar"
            self.assertEqual((await self.pedir("POST", ruta, docente=docente))[0], 200)
            with self.base.sessions() as sesion:
                self.assertEqual(sesion.get(Medicion, identificador).estado, EstadoMedicion.finalizada)
                self.assertEqual(sesion.scalar(select(func.count(MuestraMedicion.id)).where(MuestraMedicion.medicion_id == identificador)), 1)

    async def test_no_borrar_ni_cambiar_consigna_durante_captura(self):
        identificador = await self.preparar()
        self.assertEqual((await self.pedir("DELETE", f"/mediciones/{identificador}"))[0], 409)
        self.assertEqual((await self.pedir("DELETE", f'/ensayos/{self.datos["ensayo_id"]}'))[0], 409)
        self.assertEqual((await self.pedir("POST", "/tunel/consigna", {"potencia_porcentaje": 20}))[0], 409)

    async def test_reintento_antiguo_no_detiene_captura_nueva(self):
        anterior = await self.preparar()
        await self.pedir("POST", "/tunel/medicion/detener", {"medicion_id": anterior})
        nueva = {**self.datos, "clave": str(uuid4()), "nombre": "Captura 2"}
        _, estado = await self.pedir("POST", "/tunel/medicion/iniciar", nueva)
        actual = estado["captura"]["id"]
        _, repetida = await self.pedir("POST", "/tunel/medicion/detener", {"medicion_id": anterior})
        self.assertEqual(repetida["captura"]["id"], anterior)
        self.assertEqual(self.capturador.activa_id, actual)
        self.assertTrue(self.controlador.leer_estado()["midiendo"])
