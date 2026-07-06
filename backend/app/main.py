from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.rutas import router
from app.configuracion import configuracion

# Aqui se crea la aplicacion principal de FastAPI.
# Es el objeto que arranca Uvicorn cuando ejecutamos app.main:app.
app = FastAPI(title=configuracion.app_nombre)

# CORS controla desde que paginas web se puede llamar a esta API.
# En local permitimos los puertos de Vite, por ejemplo localhost:5173 o 5174.
# En produccion esto debera limitarse al dominio real de eServices/UACloud.
app.add_middleware(
    CORSMiddleware,
    allow_origins=configuracion.cors_origins_lista,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Aqui se conectan todas las rutas definidas en rutas.py.
# Al poner prefix="/api", una ruta como /salud pasa a ser /api/salud.
app.include_router(router, prefix="/api")


@app.get("/")
def raiz():
    # Ruta sencilla para comprobar que el backend esta encendido.
    return {"estado": "ok", "servicio": configuracion.app_nombre}
