from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.base_datos import obtener_sesion
from app.capturas import CapturadorTunel, obtener_capturador
from app.datos_api import (CapturaIniciar, CapturaDetener, MuestraRespuesta, TunelConexionRespuesta,
                          TunelConsignaCrear, TunelEstadoRespuesta, TunelMuestraRespuesta)
from app.datos_programa import ProgramaConfig, ProgramaOrden, ProgramaRespuesta
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


def aplicar_orden(capturador, sesion, usuario, datos, encender=False):
    with capturador.bloqueo:
        capturador.propietario(sesion, usuario.id)
        capturador.programador.exigir_control_manual()
        if capturador.activa_id or capturador.error_pendiente:
            raise HTTPException(409, "Deten la captura antes de cambiar la consigna")
        potencia = 0 if encender else datos.potencia_porcentaje
        if encender:
            capturador.controlador.encender(potencia)
        else:
            capturador.controlador.aplicar_consigna(potencia)
        sesion.add(EventoMedicion(tipo="info", mensaje=f"{'Encendido' if encender else 'Consigna'}: {potencia}%."))
        sesion.commit()
        return capturador.estado(usuario.id)


@router.post("/consigna", response_model=TunelEstadoRespuesta)
def consigna(datos: TunelConsignaCrear, usuario: Usuario = Depends(obtener_usuario_actual),
             capturador: CapturadorTunel = Depends(obtener_capturador), sesion: Session = Depends(obtener_sesion)):
    return aplicar_orden(capturador, sesion, usuario, datos)


@router.post("/encender", response_model=TunelEstadoRespuesta)
def encender(datos: TunelConsignaCrear, usuario: Usuario = Depends(obtener_usuario_actual),
             capturador: CapturadorTunel = Depends(obtener_capturador), sesion: Session = Depends(obtener_sesion)):
    return aplicar_orden(capturador, sesion, usuario, datos, encender=True)


@router.post("/medicion/iniciar", response_model=TunelEstadoRespuesta)
def iniciar(datos: CapturaIniciar, usuario: Usuario = Depends(obtener_usuario_actual),
            capturador: CapturadorTunel = Depends(obtener_capturador)):
    return capturador.iniciar(usuario.id, datos)


@router.get("/programas/{ensayo_id}", response_model=ProgramaRespuesta | None)
def ver_programa(ensayo_id: int, usuario: Usuario = Depends(obtener_usuario_actual),
                 capturador: CapturadorTunel = Depends(obtener_capturador)):
    return capturador.programador.consultar(usuario.id, ensayo_id)


@router.put("/programas/{ensayo_id}", response_model=ProgramaRespuesta)
def guardar_programa(ensayo_id: int, datos: ProgramaConfig, usuario: Usuario = Depends(obtener_usuario_actual),
                     capturador: CapturadorTunel = Depends(obtener_capturador)):
    return capturador.programador.guardar(usuario.id, ensayo_id, datos)


@router.post("/programa/iniciar", response_model=TunelEstadoRespuesta)
def iniciar_programa(datos: ProgramaOrden, usuario: Usuario = Depends(obtener_usuario_actual),
                     capturador: CapturadorTunel = Depends(obtener_capturador)):
    capturador.programador.iniciar(usuario.id, datos)
    return capturador.estado(usuario.id)


@router.post("/programa/detener", response_model=TunelEstadoRespuesta)
def detener_programa(datos: ProgramaOrden, usuario: Usuario = Depends(obtener_usuario_actual),
                     capturador: CapturadorTunel = Depends(obtener_capturador)):
    capturador.programador.detener(usuario.id, datos)
    return capturador.estado(usuario.id)


@router.post("/medicion/detener", response_model=TunelEstadoRespuesta)
def detener(datos: CapturaDetener, usuario: Usuario = Depends(obtener_usuario_actual),
            capturador: CapturadorTunel = Depends(obtener_capturador)):
    return capturador.detener(usuario.id, datos.medicion_id)


@router.get("/capturas/{medicion_id}/muestras", response_model=list[MuestraRespuesta])
def muestras(medicion_id: int, despues_de: int = Query(default=0, ge=0),
             usuario: Usuario = Depends(obtener_usuario_actual), capturador: CapturadorTunel = Depends(obtener_capturador)):
    return capturador.muestras(usuario.id, medicion_id, despues_de)


@router.get("/muestra", response_model=TunelMuestraRespuesta)
def muestra(usuario: Usuario = Depends(obtener_usuario_actual), capturador: CapturadorTunel = Depends(obtener_capturador),
            sesion: Session = Depends(obtener_sesion)):
    with capturador.bloqueo:
        capturador.propietario(sesion, usuario.id)
        return capturador.controlador.leer_muestra()


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
