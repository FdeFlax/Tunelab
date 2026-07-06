from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


# Esta clase guarda la configuracion general del backend.
# Pydantic puede leer estos valores desde el archivo .env.

class Configuracion(BaseSettings):
    # Nombre que aparece en la API y en la documentacion automatica.
    app_nombre: str = "Tunelab API"

    # Cadena de conexion a la base de datos.
    # Si no hay .env, usa este valor por defecto de SQLite para pruebas.
    database_url: str = "sqlite:///./tunelab_local.db"

    # Lista de webs que pueden llamar al backend.
    # Se guarda como texto separado por comas porque asi es facil ponerlo en .env.
    cors_origins: str = "http://localhost:5173,http://localhost:5174"

    # Limites de uso para evitar que un usuario llene la base de datos sin control.
    limite_ensayos_por_usuario: int = 20
    limite_mediciones_por_ensayo: int = 20

    # Indica que la configuracion tambien se puede leer desde un archivo .env.
    # Esto evita poner contrasenas o rutas reales directamente en el codigo.
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origins_lista(self) -> list[str]:
        # Convierte el texto "url1,url2" en una lista ["url1", "url2"].
        # FastAPI necesita una lista para configurar CORS.
        return [origen.strip() for origen in self.cors_origins.split(",") if origen.strip()]


@lru_cache
def obtener_configuracion() -> Configuracion:
    # Crea la configuracion una sola vez y la reutiliza.
    # Asi no se lee el archivo .env en cada peticion.
    return Configuracion()


# Objeto de configuracion que importan otros archivos del backend.
configuracion = obtener_configuracion()
