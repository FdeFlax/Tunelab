import asyncio
import os
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from starlette.concurrency import run_in_threadpool

from app.configuracion import configuracion
from app.flujo3d_datos import MAX_BYTES, MODELO, PASOS, FLUJO, validar_geometria
from app.flujo3d_trabajos import FlujoOcupado
from app.usuario_actual import obtener_usuario_actual

router = APIRouter(prefix="/flujo3d")
ROOT = Path(__file__).resolve().parents[2]


def python_motor():
    if configuracion.flujo3d_python:
        return Path(configuracion.flujo3d_python)
    return ROOT / "tmp/evaluacion-xlb/.venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


def obtener_gestor(request: Request):
    gestor = getattr(request.app.state, "flujo3d", None)
    if gestor is None:
        raise HTTPException(503, "El servicio de flujo 3D no está iniciado.")
    return gestor


@router.get("/capacidad")
def capacidad(usuario=Depends(obtener_usuario_actual), gestor=Depends(obtener_gestor)):
    return {"configurado": configuracion.flujo3d_habilitado and python_motor().is_file(),
            "ocupado": gestor.ocupado(), "modelo": MODELO, "pasos": PASOS, "parametros": FLUJO,
            "mensaje": "El cálculo se ejecuta en el servidor; el navegador solo recibe los mapas."}


@router.post("/calculos", status_code=202)
async def calcular(request: Request, modelo: str | None = Query(None),
                   usuario=Depends(obtener_usuario_actual), gestor=Depends(obtener_gestor)):
    if modelo is not None and modelo != MODELO:
        raise HTTPException(409, "La configuración ha cambiado. Recarga la página antes de calcular.")
    if not configuracion.flujo3d_habilitado or not python_motor().is_file():
        raise HTTPException(503, "El motor 3D no está configurado en el servidor.")
    if request.headers.get("content-type", "").split(";")[0] != "application/octet-stream":
        raise HTTPException(415, "Se requiere la geometría binaria del objeto.")
    length = request.headers.get("content-length")
    if length is not None and (not length.isdecimal() or int(length) > MAX_BYTES):
        raise HTTPException(413, "La geometría supera el límite de 200.000 triángulos.")
    try:
        id = gestor.reservar(usuario.id)
    except FlujoOcupado as error:
        raise HTTPException(409, str(error)) from error
    try:
        chunks, size = [], 0
        async with asyncio.timeout(20):
            async for chunk in request.stream():
                size += len(chunk)
                if size > MAX_BYTES:
                    raise HTTPException(413, "La geometría supera el límite de tamaño.")
                chunks.append(chunk)
        data = b"".join(chunks)
        await run_in_threadpool(validar_geometria, data)
        return gestor.enviar(id, data, python_motor())
    except (ValueError, TimeoutError) as error:
        gestor.abandonar(id)
        raise HTTPException(422, str(error) or "La recepción del objeto ha tardado demasiado.") from error
    except BaseException:
        gestor.abandonar(id)
        raise


@router.get("/calculos/{id}")
def consultar(id: str, usuario=Depends(obtener_usuario_actual), gestor=Depends(obtener_gestor)):
    try:
        return gestor.consultar(id, usuario.id)
    except KeyError as error:
        raise HTTPException(404, "Cálculo no encontrado o caducado.") from error


@router.delete("/calculos/{id}")
def cancelar(id: str, usuario=Depends(obtener_usuario_actual), gestor=Depends(obtener_gestor)):
    try:
        return gestor.cancelar(id, usuario.id)
    except KeyError as error:
        raise HTTPException(404, "Cálculo no encontrado o caducado.") from error
