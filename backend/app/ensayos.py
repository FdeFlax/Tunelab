from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.configuracion import configuracion
from app.datos_api import EnsayoCrear
from app.tablas import Ensayo, EventoMedicion, Medicion, Usuario


def exigir_nombre_medicion_disponible(sesion: Session, ensayo_id: int, nombre: str):
    # Bloquear el ensayo serializa altas simultáneas también por la ruta de importación.
    sesion.execute(select(Ensayo.id).where(Ensayo.id == ensayo_id).with_for_update()).scalar_one()
    nombres = sesion.scalars(select(Medicion.nombre).where(
        Medicion.ensayo_id == ensayo_id).with_for_update()).all()
    normalizado = " ".join(nombre.split()).casefold()
    if any(" ".join(existente.split()).casefold() == normalizado for existente in nombres):
        raise HTTPException(409, "Ya existe una medición con ese nombre en este ensayo. Elige otro nombre.")


def generar_codigo_ensayo(sesion: Session) -> str:
    codigos = sesion.scalars(select(Ensayo.codigo)).all()
    mayor = 0
    for codigo in codigos:
        partes = codigo.split('-')
        if len(partes) == 2 and partes[0] == 'A' and partes[1].isdigit():
            mayor = max(mayor, int(partes[1]))
    return f'A-{mayor + 1:03d}'


def codigo_duplicado(error: IntegrityError) -> bool:
    original = error.orig
    codigo = original.args[0] if original.args else None
    return 'codigo' in str(original).lower() and (
        codigo == 1062 or getattr(original, 'sqlite_errorcode', None) == 2067
    )


def crear_ensayo_guardado(datos: EnsayoCrear, sesion: Session, usuario: Usuario) -> Ensayo:
    usuario_id = usuario.id
    identificador = usuario.identificador_uacloud
    for intento in range(5):
        try:
            # En MySQL serializa la comprobación del cupo de un mismo usuario.
            sesion.execute(select(Usuario.id).where(Usuario.id == usuario_id).with_for_update()).scalar_one()
            existentes = sesion.scalars(select(Ensayo.id).where(Ensayo.usuario_id == usuario_id).with_for_update()).all()
            total = len(existentes)
            if total >= configuracion.limite_ensayos_por_usuario:
                raise HTTPException(409, f'Has alcanzado el limite de {configuracion.limite_ensayos_por_usuario} ensayos.')

            ensayo = Ensayo(**datos.model_dump(), usuario_id=usuario_id, codigo=generar_codigo_ensayo(sesion))
            sesion.add(ensayo)
            sesion.flush()
            sesion.add(EventoMedicion(
                mensaje=f'Ensayo {ensayo.codigo} creado por {identificador}.',
                tipo='info',
                ensayo_id=ensayo.id,
            ))
            sesion.commit()
        except IntegrityError as error:
            sesion.rollback()
            if not codigo_duplicado(error):
                raise
            # Otro usuario puede haber reservado el código entre la lectura y el INSERT.
            if intento == 4:
                raise HTTPException(409, 'No se pudo asignar un código de ensayo. Vuelve a intentarlo.') from error
            continue
        except Exception:
            sesion.rollback()
            raise
        sesion.refresh(ensayo)
        return ensayo
