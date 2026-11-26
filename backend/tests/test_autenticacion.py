"""Regresion del acceso: ejecutar desde backend con unittest discover -s tests."""
from datetime import datetime
import json
import os
import unittest
from unittest.mock import patch

# Nunca se conectan estas pruebas a la base de datos del laboratorio.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["ENTORNO"] = "produccion"
os.environ["AUTENTICACION_MODO"] = "bloqueada"

from pydantic import ValidationError
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.base_datos import Base, obtener_sesion
from app.configuracion import Configuracion, configuracion
from app.main import app
from app.tablas import Ensayo, EstadoMedicion, EventoMedicion, Medicion, MuestraMedicion, RolUsuario, Usuario
from app.websocket_tunel import gestor_websocket_tunel


async def peticion(method, path, headers=None, body=None, client="127.0.0.1"):
    messages = []
    raw = json.dumps(body).encode() if body is not None else b""
    async def receive():
        return {"type": "http.request", "body": raw, "more_body": False}
    async def send(message):
        messages.append(message)
    scope = {
        "type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1",
        "method": method, "scheme": "http", "path": path, "raw_path": path.encode(),
        "query_string": b"", "root_path": "", "server": ("localhost", 8010),
        "client": (client, 1234) if client else None,
        "headers": [(k.lower().encode(), v.encode()) for k, v in
                    {"Content-Type": "application/json", **(headers or {})}.items()],
    }
    await app(scope, receive, send)
    status = next(m["status"] for m in messages if m["type"] == "http.response.start")
    data = b"".join(m.get("body", b"") for m in messages if m["type"] == "http.response.body")
    return status, json.loads(data) if data else None


async def websocket(perfil="alu_demo", origin="http://localhost:5173", client="127.0.0.1"):
    messages = []
    incoming = iter([{"type": "websocket.connect"}, {"type": "websocket.disconnect", "code": 1000}])
    async def receive():
        return next(incoming)
    async def send(message):
        messages.append(message)
    scope = {
        "type": "websocket", "asgi": {"version": "3.0"}, "http_version": "1.1",
        "scheme": "ws", "path": "/api/ws/tunel", "raw_path": b"/api/ws/tunel",
        "query_string": f"perfil_demo={perfil}".encode() if perfil else b"",
        "root_path": "", "server": ("localhost", 8010), "client": (client, 1234),
        "headers": [(b"origin", origin.encode())] if origin else [], "subprotocols": [],
    }
    await app(scope, receive, send)
    return messages


class AutenticacionTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", poolclass=StaticPool,
                                    connect_args={"check_same_thread": False})
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine)
        def sesion_prueba():
            with self.sessions() as session:
                yield session
        app.dependency_overrides[obtener_sesion] = sesion_prueba
        self.settings = patch.multiple(configuracion, entorno="produccion",
                                       autenticacion_modo="bloqueada",
                                       cors_origins="http://localhost:5173,http://127.0.0.1:5173")
        self.settings.start()

    def tearDown(self):
        self.settings.stop()
        app.dependency_overrides.clear()
        self.engine.dispose()

    def demo(self):
        configuracion.entorno = "desarrollo"
        configuracion.autenticacion_modo = "demo"

    def sin_usuarios(self):
        with self.sessions() as session:
            self.assertEqual(session.scalar(select(func.count(Usuario.id))), 0)

    async def test_produccion_no_acepta_identidad_ni_admin_falsos(self):
        for headers in ({}, {"X-Usuario-Uacloud": "prof_demo", "X-Usuario-Rol": "admin"}):
            for path in ("/api/usuarios", "/api/ensayos", "/api/docente/ensayos", "/api/tunel/estado"):
                with self.subTest(path=path, headers=headers):
                    status, _ = await peticion("GET", path, headers)
                    self.assertEqual(status, 401)
        self.sin_usuarios()

    async def test_salud_sigue_siendo_publica(self):
        self.assertEqual((await peticion("GET", "/api/salud"))[0], 200)

    async def test_demo_exige_identificador_conocido(self):
        self.demo()
        for identifier in (None, "", "usuario-local", "admin", "audit-admin", " prof_demo "):
            headers = {"X-Usuario-Rol": "admin"}
            if identifier is not None:
                headers["X-Usuario-Uacloud"] = identifier
            self.assertEqual((await peticion("GET", "/api/usuarios", headers))[0], 401)
        self.sin_usuarios()

    async def test_rol_nombre_y_email_son_del_servidor(self):
        self.demo()
        headers = {"X-Usuario-Uacloud": "alu_demo", "X-Usuario-Rol": "admin",
                   "X-Usuario-Nombre": "Administrador", "X-Usuario-Email": "falso@example.com"}
        status, users = await peticion("GET", "/api/usuarios", headers)
        self.assertEqual(status, 200)
        self.assertEqual((users[0]["rol"], users[0]["nombre"], users[0]["email"]),
                         ("alumno", "Alumno Demo", "alu_demo@alu.ua.es"))
        self.assertEqual((await peticion("GET", "/api/docente/ensayos", headers))[0], 403)
        self.assertEqual((await peticion("POST", "/api/tunel/docente/desconectar", headers))[0], 403)

    async def test_cuerpo_asegurar_no_eleva_privilegios(self):
        self.demo()
        status, user = await peticion("POST", "/api/usuarios/asegurar",
            {"X-Usuario-Uacloud": "alu_demo"},
            {"identificador_uacloud": "prof_demo", "nombre": "Admin", "rol": "admin"})
        self.assertEqual(status, 200)
        self.assertEqual((user["identificador_uacloud"], user["rol"]), ("alu_demo", "alumno"))

    async def test_docente_local_y_pertenencia_funcionan(self):
        self.demo()
        alumno = {"X-Usuario-Uacloud": "alu_demo"}
        docente = {"X-Usuario-Uacloud": "prof_demo"}
        status, trial = await peticion("POST", "/api/ensayos", alumno, {"nombre": "Prueba"})
        self.assertEqual(status, 200)
        self.assertIsInstance(trial['id'], int)
        self.assertNotIn('codigo', trial)
        self.assertEqual((await peticion("GET", f'/api/ensayos/{trial["id"]}/mediciones', docente))[0], 404)
        status, trials = await peticion("GET", "/api/docente/ensayos", docente)
        self.assertEqual(status, 200)
        self.assertEqual(len(trials), 1)

    async def test_borrar_ensayo_elimina_mediciones_muestras_y_eventos_asociados(self):
        self.demo()
        headers = {"X-Usuario-Uacloud": "alu_demo"}
        _, ensayo = await peticion("POST", "/api/ensayos", headers, {"nombre": "Para borrar"})
        with self.sessions.begin() as session:
            medicion = Medicion(ensayo_id=ensayo["id"], nombre="Medición temporal",
                                estado=EstadoMedicion.finalizada)
            session.add(medicion)
            session.flush()
            medicion_id = medicion.id
            session.add(MuestraMedicion(medicion_id=medicion_id, instante=datetime.utcnow(), velocidad_ms=4.5))
            session.add(EventoMedicion(ensayo_id=ensayo["id"], medicion_id=medicion_id,
                                      tipo="info", mensaje="Captura finalizada"))
        self.assertEqual((await peticion("DELETE", f'/api/ensayos/{ensayo["id"]}', headers))[0], 200)

        with self.sessions() as session:
            self.assertEqual(session.scalar(select(func.count(Ensayo.id))), 0)
            self.assertEqual(session.scalar(select(func.count(Medicion.id))), 0)
            self.assertEqual(session.scalar(select(func.count(MuestraMedicion.id))), 0)
            self.assertEqual(
                session.scalar(select(func.count(EventoMedicion.id)).where(
                    (EventoMedicion.ensayo_id == ensayo["id"])
                    | (EventoMedicion.medicion_id == medicion_id)
                )),
                0,
            )

    async def test_demo_rechaza_cliente_remoto_y_sin_cliente(self):
        self.demo()
        for client in ("192.0.2.10", "::ffff:192.0.2.10", None):
            self.assertEqual((await peticion("GET", "/api/usuarios",
                {"X-Usuario-Uacloud": "prof_demo"}, client=client))[0], 403)
        self.sin_usuarios()

    async def test_cabeceras_proxy_y_origen_ajeno_no_habilitan_demo(self):
        self.demo()
        for forged in ({"X-Forwarded-For": "127.0.0.1"}, {"Forwarded": "for=127.0.0.1"},
                       {"X-Real-IP": "127.0.0.1"}, {"X-Forwarded-Proto": "https"},
                       {"Origin": "https://ajeno.example"}, {"Origin": "null"}):
            self.assertEqual((await peticion("GET", "/api/usuarios",
                {"X-Usuario-Uacloud": "prof_demo", **forged}))[0], 403)
        self.sin_usuarios()

    async def test_usuario_inactivo_o_rol_alterado_no_entra(self):
        self.demo()
        with self.sessions() as session:
            session.add_all([
                Usuario(identificador_uacloud="alu_demo", nombre="Alumno", rol=RolUsuario.admin),
                Usuario(identificador_uacloud="prof_demo", nombre="Profesor", rol=RolUsuario.profesor, activo=False),
            ])
            session.commit()
        for identifier in ("alu_demo", "prof_demo"):
            self.assertEqual((await peticion("GET", "/api/usuarios",
                {"X-Usuario-Uacloud": identifier}))[0], 403)

    def test_configuracion_segura_por_defecto_y_demo_solo_desarrollo(self):
        config = Configuracion(_env_file=None, database_url="sqlite://")
        self.assertEqual(config.autenticacion_modo, "bloqueada")
        with self.assertRaises(ValidationError):
            Configuracion(_env_file=None, database_url="sqlite://",
                          entorno="produccion", autenticacion_modo="demo")

    async def test_websocket_bloqueado_en_produccion(self):
        messages = await websocket(perfil="prof_demo")
        self.assertEqual(messages[0], {"type": "websocket.close", "code": 1008, "reason": ""})
        self.sin_usuarios()

    async def test_websocket_demo_requiere_perfil_origen_y_cliente_local(self):
        self.demo()
        for params in ({"perfil": None}, {"perfil": "admin"}, {"origin": None},
                       {"origin": "https://ajeno.example"}, {"client": "192.0.2.10"}):
            self.assertEqual((await websocket(**params))[0]["type"], "websocket.close")
        self.sin_usuarios()
        messages = await websocket()
        self.assertEqual(messages[0]["type"], "websocket.accept")
        self.assertTrue(any(m["type"] == "websocket.send" for m in messages))
        self.assertEqual(gestor_websocket_tunel.conexiones, [])


if __name__ == "__main__":
    unittest.main()
