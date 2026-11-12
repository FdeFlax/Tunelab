"""Comprobaciones de arranque de solo lectura, sin exponer credenciales."""
import hashlib
import json
import os
from pathlib import Path
import sys

from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.pool import NullPool


BACKEND = Path(__file__).resolve().parents[1]
PROTOCOLO = "tunelab-local-v1"


def identidad_instalacion():
    ruta = BACKEND.parent.as_posix()
    if os.name == "nt":
        ruta = ruta.lower()
    return hashlib.sha256(ruta.encode("utf-8")).hexdigest()[:16]


def informacion_configuracion(configuracion):
    url = make_url(configuracion.database_url)
    return {
        "estado": "ok", "protocolo": PROTOCOLO,
        "instalacion": identidad_instalacion(),
        "motor": url.get_backend_name(), "host": url.host,
        "puerto": url.port or 3306,
        "acceso_local": configuracion.entorno == "desarrollo"
        and configuracion.autenticacion_modo == "demo",
        "origen_local": "http://127.0.0.1:5173" in configuracion.cors_origins_lista,
    }


def comprobar_base_datos(database_url):
    url = make_url(database_url)
    opciones = {"connect_timeout": 3, "read_timeout": 3, "write_timeout": 3}
    motor = create_engine(url, poolclass=NullPool,
                         connect_args=opciones if url.drivername == "mysql+pymysql" else {})
    try:
        config = Config()
        config.set_main_option("script_location", str(BACKEND / "alembic"))
        esperadas = set(ScriptDirectory.from_config(config).get_heads())
        with motor.connect() as conexion:
            conexion.execute(text("SELECT 1"))
            actuales = set(MigrationContext.configure(conexion).get_current_heads())
        actualizado = actuales == esperadas
        return {"estado": "ok", "esquema": "actualizado" if actualizado else "pendiente"}
    except OperationalError as error:
        codigo = getattr(error.orig, "args", [None])[0]
        if codigo in (1044, 1045, 1698):
            detalle = "MySQL rechaza las credenciales o permisos de DATABASE_URL en backend/.env."
        elif codigo == 1049:
            detalle = "La base de datos indicada en backend/.env no existe."
        else:
            detalle = "No se puede consultar MySQL. Comprueba que este iniciado y revisa host y puerto en backend/.env."
        return {"estado": "error", "detalle": detalle}
    except SQLAlchemyError:
        return {"estado": "error", "detalle": "No se puede comprobar el esquema de la base de datos."}
    finally:
        motor.dispose()


def comprobar_servidor(configuracion, capturador):
    base = comprobar_base_datos(configuracion.database_url)
    hilo = getattr(capturador, "hilo", None)
    controlador_listo = bool(hilo and hilo.is_alive())
    listo = base["estado"] == "ok" and base.get("esquema") == "actualizado" and controlador_listo
    return {
        "protocolo": PROTOCOLO, "instalacion": identidad_instalacion(),
        "estado": "listo" if listo else "no_disponible",
        "base_datos": base,
        "controlador": "listo" if controlador_listo else "no_disponible",
        "origen_local": "http://127.0.0.1:5173" in configuracion.cors_origins_lista,
        "acceso_local": configuracion.entorno == "desarrollo"
        and configuracion.autenticacion_modo == "demo",
    }


def main():
    try:
        from app.configuracion import configuracion
        resultado = (informacion_configuracion(configuracion) if "--configuracion" in sys.argv
                     else comprobar_base_datos(configuracion.database_url))
    except Exception:
        # Pydantic y los drivers pueden incluir la URL completa en sus excepciones.
        resultado = {"estado": "error", "detalle": "Configuracion no valida. Revisa backend/.env y las dependencias de backend/requirements.txt."}
    print(json.dumps(resultado, ensure_ascii=True))
    return 0 if resultado["estado"] == "ok" else 1


if __name__ == "__main__":
    sys.exit(main())
