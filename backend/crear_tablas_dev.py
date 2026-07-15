from app.base_datos import Base, engine
from app import tablas  # noqa: F401
# Script auxiliar solo para desarrollo local.
# En despliegue real se deben usar migraciones con Alembic:
# alembic upgrade head

def main():
    Base.metadata.create_all(bind=engine)
    print("Tablas creadas o ya existentes.")


if __name__ == "__main__":
    main()
