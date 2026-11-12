from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from starlette.concurrency import run_in_threadpool

from app.rutas import router
from app.configuracion import configuracion
from app.base_datos import SesionLocal
from app.control_tunel import controlador_tunel
from app.capturas import CapturadorTunel
from app.bloqueo_proceso import propietario_controlador
from app.diagnostico import comprobar_servidor
from pathlib import Path
from app.flujo3d_trabajos import GestorFlujo3D
from app.rutas_flujo3d import router as router_flujo3d


@asynccontextmanager
async def vida_servidor(app):
    with propietario_controlador():
        capturador = CapturadorTunel(controlador_tunel, SesionLocal)
        await run_in_threadpool(capturador.arrancar)
        app.state.capturador = capturador
        app.state.flujo3d = GestorFlujo3D(Path(__file__).resolve().parents[2])
        try:
            yield
        finally:
            await run_in_threadpool(app.state.flujo3d.cerrar)
            await run_in_threadpool(capturador.cerrar)
            app.state.capturador = None

app = FastAPI(title=configuracion.app_nombre, lifespan=vida_servidor)

app.add_middleware(
    CORSMiddleware,
    allow_origins=configuracion.cors_origins_lista,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
app.include_router(router_flujo3d, prefix="/api")


@app.get("/api/listo", include_in_schema=False)
def listo(request: Request):
    resultado = comprobar_servidor(configuracion, getattr(request.app.state, "capturador", None))
    return JSONResponse(resultado, status_code=200 if resultado["estado"] == "listo" else 503,
                        headers={"Cache-Control": "no-store"})


@app.get("/")
def raiz():
    return {"estado": "ok", "servicio": configuracion.app_nombre}
