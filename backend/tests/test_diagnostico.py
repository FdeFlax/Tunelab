"""El diagnostico nunca crea tablas, usuarios ni capturas."""
import json
import os
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["ENTORNO"] = "produccion"
os.environ["AUTENTICACION_MODO"] = "bloqueada"

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.pool import StaticPool
from alembic.config import Config
from alembic.script import ScriptDirectory

from app.diagnostico import BACKEND, comprobar_base_datos, comprobar_servidor, informacion_configuracion
from app.main import app, listo


class DiagnosticoTests(unittest.TestCase):
    def test_base_vacia_se_detecta_sin_crear_tablas(self):
        motor = create_engine("sqlite://", poolclass=StaticPool)
        try:
            with patch("app.diagnostico.create_engine", return_value=motor), patch.object(motor, "dispose"):
                self.assertEqual(comprobar_base_datos("sqlite://"), {"estado": "ok", "esquema": "pendiente"})
                self.assertEqual(inspect(motor).get_table_names(), [])
        finally:
            motor.dispose()

    def test_revision_actual_y_antigua(self):
        config = Config()
        config.set_main_option("script_location", str(BACKEND / "alembic"))
        actual = ScriptDirectory.from_config(config).get_current_head()
        motor = create_engine("sqlite://", poolclass=StaticPool)
        try:
            with motor.begin() as conexion:
                conexion.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32))"))
                conexion.execute(text("INSERT INTO alembic_version VALUES (:revision)"), {"revision": actual})
            with patch("app.diagnostico.create_engine", return_value=motor), patch.object(motor, "dispose"):
                self.assertEqual(comprobar_base_datos("sqlite://")["esquema"], "actualizado")
                with motor.begin() as conexion:
                    conexion.execute(text("UPDATE alembic_version SET version_num = 'antigua'"))
                self.assertEqual(comprobar_base_datos("sqlite://")["esquema"], "pendiente")
        finally:
            motor.dispose()

    def test_errores_mysql_no_filtran_credenciales(self):
        for codigo, mensaje in ((1045, "credenciales"), (1049, "no existe"), (2003, "No se puede consultar")):
            with self.subTest(codigo=codigo), patch("app.diagnostico.create_engine") as crear:
                crear.return_value.connect.side_effect = OperationalError(
                    "URL PRIVADA", {}, Exception(codigo, "mysql://usuario:SECRETO@servidor"))
                resultado = comprobar_base_datos("sqlite://")
                self.assertEqual(resultado["estado"], "error")
                self.assertIn(mensaje, resultado["detalle"])
                self.assertNotIn("SECRETO", json.dumps(resultado))
                crear.return_value.dispose.assert_called_once()

    def test_configuracion_publica_no_incluye_url_ni_usuario(self):
        configuracion = SimpleNamespace(database_url="mysql+pymysql://privado:SECRETO@127.0.0.1:3307/db",
            entorno="desarrollo", autenticacion_modo="demo", cors_origins_lista=["http://127.0.0.1:5173"])
        datos = informacion_configuracion(configuracion)
        self.assertEqual(datos["puerto"], 3307)
        self.assertTrue(datos["acceso_local"])
        self.assertNotIn("SECRETO", json.dumps(datos))
        self.assertNotIn("privado", json.dumps(datos))

    def test_http_503_si_falla_bd_esquema_o_capturador(self):
        request = SimpleNamespace(app=app)
        hilo = Mock()
        configuracion = SimpleNamespace(database_url="sqlite://", entorno="produccion", autenticacion_modo="bloqueada", cors_origins_lista=[])
        with patch("app.main.configuracion", configuracion), patch.object(app.state, "capturador", SimpleNamespace(hilo=hilo), create=True):
            for base, activo, codigo in (
                ({"estado": "ok", "esquema": "actualizado"}, True, 200),
                ({"estado": "error", "detalle": "No disponible"}, True, 503),
                ({"estado": "ok", "esquema": "pendiente"}, True, 503),
                ({"estado": "ok", "esquema": "actualizado"}, False, 503),
            ):
                with self.subTest(base=base, activo=activo), patch("app.diagnostico.comprobar_base_datos", return_value=base):
                    hilo.is_alive.return_value = activo
                    respuesta = listo(request)
                    self.assertEqual(respuesta.status_code, codigo)
                    self.assertEqual(respuesta.headers["cache-control"], "no-store")
                    self.assertFalse(json.loads(respuesta.body)["acceso_local"])
            with patch("app.diagnostico.comprobar_base_datos", return_value={"estado": "ok", "esquema": "actualizado"}):
                self.assertEqual(comprobar_servidor(configuracion, None)["estado"], "no_disponible")
