from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.configuracion import configuracion


# Este archivo es el "enchufe" entre FastAPI y la base de datos.
engine = create_engine(configuracion.database_url, pool_pre_ping=True)
SesionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def obtener_sesion():
    sesion = SesionLocal()
    try:
        yield sesion
    finally:
        sesion.close()
