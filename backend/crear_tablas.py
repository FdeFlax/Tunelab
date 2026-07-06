from app.base_datos import Base, engine
from app import tablas  # noqa: F401


def main():
    Base.metadata.create_all(bind=engine)
    print("Tablas creadas o ya existentes.")


if __name__ == "__main__":
    main()
