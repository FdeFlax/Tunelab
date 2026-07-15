from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.configuracion import configuracion
from app.base_datos import Base
from app import tablas  # noqa: F401  # Importa los modelos para que Alembic conozca las tablas.


# Objeto de configuracion de Alembic, leido desde alembic.ini.
config = context.config

# Alembic necesita usar la misma base de datos que usa FastAPI.
# Por eso sustituimos la URL de alembic.ini por la URL leida desde backend/.env.
config.set_main_option("sqlalchemy.url", configuracion.database_url)

# Configuracion de logs de Alembic.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadatos de SQLAlchemy: aqui estan registradas las tablas del proyecto.
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Ejecuta migraciones sin abrir conexion directa a la base de datos."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Ejecuta migraciones conectando con la base de datos real."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
