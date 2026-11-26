from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.base_datos import obtener_sesion
from app.capturas import CapturadorTunel, obtener_capturador
from app.datos_api import CapturaIniciar, MuestraRespuesta, TunelConexionRespuesta, TunelEstadoRespuesta
from app.tablas import EventoMedicion, UsoTunel, Usuario
from app.usuario_actual import obtener_usuario_actual, obtener_usuario_docente
from app.websocket_tunel import gestor_websocket_tunel

router = APIRouter(prefix="/tunel")


def respuesta_conexion(uso, usuario):
    ocupado = bool(uso and uso.conectado)
    propio = ocupado and uso.usuario_id == usuario.id
    return dict(conectado=propio, ocupado=ocupado and not propio, es_propietario=propio,
        mensaje="Conectado a tu sesion" if propio else "Tunel ocupado por otro usuario" if ocupado else "Tunel libre",
        usuario=uso.usuario if ocupado else None, conectado_en=uso.conectado_en if ocupado else None)


@router.get("/conexion", response_model=TunelConexionRespuesta)
def conexion(usuario: Usuario = Depends(obtener_usuario_actual), sesion: Session = Depends(obtener_sesion)):
    return respuesta_conexion(sesion.get(UsoTunel, 1), usuario)


@router.get("/estado", response_model=TunelEstadoRespuesta)
def estado(usuario: Usuario = Depends(obtener_usuario_actual), capturador: CapturadorTunel = Depends(obtener_capturador)):
    return capturador.estado(usuario.id)


@router.post("/conectar", response_model=TunelConexionRespuesta)
async def conectar(usuario: Usuario = Depends(obtener_usuario_actual),
                   capturador: CapturadorTunel = Depends(obtener_capturador), sesion: Session = Depends(obtener_sesion)):
    with capturador.bloqueo:
        uso = sesion.get(UsoTunel, 1)
        if not uso:
            uso = UsoTunel(id=1)
            sesion.add(uso)
        if uso.conectado and uso.usuario_id != usuario.id:
            return respuesta_conexion(uso, usuario)
        uso.usuario_id, uso.conectado = usuario.id, True
        uso.conectado_en = uso.conectado_en or datetime.utcnow()
        sesion.add(EventoMedicion(tipo="info", mensaje=f"{usuario.identificador_uacloud} conectado al tunel."))
        sesion.commit()
        sesion.refresh(uso)
        respuesta = respuesta_conexion(uso, usuario)
    await gestor_websocket_tunel.avisar_cambio_conexion()
    return respuesta


@router.post("/capturas", response_model=TunelEstadoRespuesta)
def iniciar_captura(datos: CapturaIniciar, usuario: Usuario = Depends(obtener_usuario_actual),
                     capturador: CapturadorTunel = Depends(obtener_capturador)):
    return capturador.iniciar(usuario.id, datos)


@router.post("/capturas/{medicion_id}/detener", response_model=TunelEstadoRespuesta)
def detener_captura(medicion_id: int, usuario: Usuario = Depends(obtener_usuario_actual),
                     capturador: CapturadorTunel = Depends(obtener_capturador)):
    return capturador.detener(usuario.id, medicion_id)


@router.get("/capturas/{medicion_id}/muestras", response_model=list[MuestraRespuesta])
def muestras(medicion_id: int, despues_de: int = Query(default=0, ge=0),
             usuario: Usuario = Depends(obtener_usuario_actual), capturador: CapturadorTunel = Depends(obtener_capturador)):
    return capturador.muestras(usuario.id, medicion_id, despues_de)


@router.post("/apagar", response_model=TunelEstadoRespuesta)
async def apagar(usuario: Usuario = Depends(obtener_usuario_actual), capturador: CapturadorTunel = Depends(obtener_capturador)):
    respuesta = capturador.apagar(usuario.id)
    await gestor_websocket_tunel.avisar_cambio_conexion()
    return respuesta


@router.post("/desconectar", response_model=TunelConexionRespuesta)
async def desconectar(usuario: Usuario = Depends(obtener_usuario_actual), capturador: CapturadorTunel = Depends(obtener_capturador)):
    capturador.apagar(usuario.id)
    await gestor_websocket_tunel.avisar_cambio_conexion()
    return respuesta_conexion(None, usuario)


@router.post("/docente/desconectar", response_model=TunelConexionRespuesta)
async def desconectar_docente(usuario: Usuario = Depends(obtener_usuario_docente),
                             capturador: CapturadorTunel = Depends(obtener_capturador)):
    capturador.apagar(usuario.id, forzar=True)
    await gestor_websocket_tunel.avisar_liberacion_docente(None)
    await gestor_websocket_tunel.avisar_cambio_conexion()
    return respuesta_conexion(None, usuario)
