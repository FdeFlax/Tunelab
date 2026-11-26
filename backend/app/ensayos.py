from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.configuracion import configuracion
from app.datos_api import EnsayoCrear
from app.tablas import Ensayo, EventoMedicion, Medicion, Usuario


def exigir_nombre_medicion_disponible(sesion: Session, ensayo_id: int, nombre: str):
    # Bloquear el ensayo evita nombres duplicados en altas simultáneas.
    sesion.execute(select(Ensayo.id).where(Ensayo.id == ensayo_id).with_for_update()).scalar_one()
    nombres = sesion.scalars(select(Medicion.nombre).where(
        Medicion.ensayo_id == ensayo_id).with_for_update()).all()
    normalizado = " ".join(nombre.split()).casefold()
    if any(" ".join(existente.split()).casefold() == normalizado for existente in nombres):
        raise HTTPException(409, "Ya existe una medición con ese nombre en este ensayo. Elige otro nombre.")


def crear_ensayo_guardado(datos: EnsayoCrear, sesion: Session, usuario: Usuario) -> Ensayo:
    usuario_id = usuario.id
    identificador = usuario.identificador_uacloud
    try:
        # En MySQL serializa la comprobación del cupo de un mismo usuario.
        sesion.execute(select(Usuario.id).where(Usuario.id == usuario_id).with_for_update()).scalar_one()
        existentes = sesion.scalars(select(Ensayo.id).where(Ensayo.usuario_id == usuario_id).with_for_update()).all()
        if len(existentes) >= configuracion.limite_ensayos_por_usuario:
            raise HTTPException(409, f'Has alcanzado el limite de {configuracion.limite_ensayos_por_usuario} ensayos.')

        ensayo = Ensayo(**datos.model_dump(), usuario_id=usuario_id)
        sesion.add(ensayo)
        sesion.flush()
        sesion.add(EventoMedicion(
            mensaje=f'Ensayo {ensayo.nombre} creado por {identificador}.',
            tipo='info',
            ensayo_id=ensayo.id,
        ))
        sesion.commit()
    except Exception:
        sesion.rollback()
        raise
    sesion.refresh(ensayo)
    return ensayo
