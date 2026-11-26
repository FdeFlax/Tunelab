from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.base_datos import obtener_sesion
from app.ensayos import crear_ensayo_guardado
from app.rutas_tunel import router as router_tunel
from app.datos_api import (
    EnsayoActualizar,
    EnsayoCrear,
    EnsayoDocenteRespuesta,
    EnsayoRespuesta,
    EventoRespuesta,
    MedicionRespuesta,
    MuestraRespuesta,
    UltimaMedicionUsuarioRespuesta,
    UsuarioCrear,
    UsuarioRespuesta,
)
from app.tablas import (
    Ensayo,
    EstadoMedicion,
    EventoMedicion,
    Medicion,
    MuestraMedicion,
    Usuario,
)
from app.websocket_tunel import gestor_websocket_tunel
from app.usuario_actual import (
    obtener_ensayo_del_usuario,
    obtener_medicion_del_usuario,
    obtener_usuario_docente,
    obtener_usuario_actual,
    obtener_usuario_demo,
)

router = APIRouter()
router.include_router(router_tunel)


@router.websocket("/ws/tunel")
async def websocket_tunel(websocket: WebSocket, sesion: Session = Depends(obtener_sesion)):
    # Este parametro identifica solo un perfil DEMO, nunca una credencial real.
    try:
        if not websocket.headers.get("origin"):
            raise HTTPException(status_code=403, detail="Origen requerido")
        obtener_usuario_demo(websocket, websocket.query_params.get("perfil_demo"), sesion)
    except HTTPException:
        await websocket.close(code=1008)
        return
    finally:
        sesion.close()
    await gestor_websocket_tunel.conectar(websocket)

    try:
        await websocket.send_json({"tipo": "conexion_tunel_actualizada"})

        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        gestor_websocket_tunel.desconectar(websocket)


@router.get("/salud")
def salud():
    return {"estado": "ok"}


def guardar_evento(
    sesion: Session,
    mensaje: str,
    tipo: str = "info",
    ensayo_id: int | None = None,
    medicion_id: int | None = None,
):
    # No hace commit aqui: cada ruta confirma todo junto al final.
    sesion.add(
        EventoMedicion(
            tipo=tipo,
            mensaje=mensaje,
            ensayo_id=ensayo_id,
            medicion_id=medicion_id,
        )
    )


def borrar_medicion_contenido(sesion: Session, medicion: Medicion):
    if medicion.estado == EstadoMedicion.en_curso:
        raise HTTPException(409, "Deten la captura antes de borrar la medicion")
    sesion.execute(delete(EventoMedicion).where(EventoMedicion.medicion_id == medicion.id))
    sesion.execute(delete(MuestraMedicion).where(MuestraMedicion.medicion_id == medicion.id))
    sesion.delete(medicion)


def borrar_ensayo_contenido(sesion: Session, ensayo: Ensayo):
    if sesion.scalar(select(Medicion.id).where(Medicion.ensayo_id == ensayo.id, Medicion.estado == EstadoMedicion.en_curso).limit(1)):
        raise HTTPException(409, "Deten la captura antes de borrar el ensayo")
    ids_mediciones = sesion.scalars(
        select(Medicion.id).where(Medicion.ensayo_id == ensayo.id)
    ).all()

    if ids_mediciones:
        sesion.execute(delete(EventoMedicion).where(EventoMedicion.medicion_id.in_(ids_mediciones)))
        sesion.execute(delete(MuestraMedicion).where(MuestraMedicion.medicion_id.in_(ids_mediciones)))
        sesion.execute(delete(Medicion).where(Medicion.id.in_(ids_mediciones)))

    sesion.execute(delete(EventoMedicion).where(EventoMedicion.ensayo_id == ensayo.id))
    sesion.delete(ensayo)


@router.get("/usuarios", response_model=list[UsuarioRespuesta])
def listar_usuarios(usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    return [usuario_actual]


@router.post("/usuarios/asegurar", response_model=UsuarioRespuesta)
def asegurar_usuario(
    datos: UsuarioCrear,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    # El cuerpo no autentica ni modifica al usuario. La dependencia valida
    # el acceso y obtiene el perfil definido por el servidor.
    _ = datos
    return usuario_actual


@router.get("/ensayos", response_model=list[EnsayoRespuesta])
def listar_ensayos(
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    filas = sesion.execute(
        select(Ensayo, func.count(Medicion.id))
        .outerjoin(Medicion, Medicion.ensayo_id == Ensayo.id)
        .where(Ensayo.usuario_id == usuario_actual.id)
        .group_by(Ensayo.id)
        .order_by(Ensayo.creado_en.desc())
    ).all()
    return [{**EnsayoRespuesta.model_validate(ensayo).model_dump(), "total_mediciones": total}
            for ensayo, total in filas]


@router.post("/ensayos", response_model=EnsayoRespuesta)
def crear_ensayo(
    datos: EnsayoCrear,
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    return crear_ensayo_guardado(datos, sesion, usuario_actual)


@router.put("/ensayos/{ensayo_id}", response_model=EnsayoRespuesta)
def actualizar_ensayo(
    ensayo_id: int,
    datos: EnsayoActualizar,
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    ensayo = obtener_ensayo_del_usuario(ensayo_id, usuario_actual, sesion)

    medicion_activa = sesion.scalar(
        select(Medicion).where(
            Medicion.ensayo_id == ensayo.id,
            Medicion.estado == EstadoMedicion.en_curso,
        )
    )

    if medicion_activa:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede editar el ensayo mientras hay una medicion activa.",
        )
    ensayo.nombre = datos.nombre.strip()
    ensayo.objetivo = (datos.objetivo or "").strip() or None
    ensayo.descripcion = (datos.descripcion or "").strip() or None
    guardar_evento(
        sesion,
        f"Ensayo {ensayo.nombre} actualizado por {usuario_actual.identificador_uacloud}.",
        ensayo_id=ensayo.id,
    )

    sesion.commit()
    sesion.refresh(ensayo)
    return ensayo

@router.delete("/ensayos/{ensayo_id}")
def borrar_ensayo_usuario(
    ensayo_id: int,
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    ensayo = obtener_ensayo_del_usuario(ensayo_id, usuario_actual, sesion)
    nombre = ensayo.nombre
    borrar_ensayo_contenido(sesion, ensayo)
    guardar_evento(
        sesion,
        f"Ensayo {nombre} borrado por {usuario_actual.identificador_uacloud}.",
        tipo="advertencia",
    )
    sesion.commit()

    return {"estado": "ensayo borrado", "id": ensayo_id}


@router.get("/ensayos/{ensayo_id}/mediciones", response_model=list[MedicionRespuesta])
def listar_mediciones_ensayo(
    ensayo_id: int,
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    obtener_ensayo_del_usuario(ensayo_id, usuario_actual, sesion)

    return sesion.scalars(
        select(Medicion)
        .where(Medicion.ensayo_id == ensayo_id)
        .order_by(Medicion.creado_en.desc())
    ).all()


@router.get("/docente/ensayos", response_model=list[EnsayoDocenteRespuesta])
def listar_ensayos_docente(
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_docente),
):
    resumen_mediciones = (
        select(
            Medicion.ensayo_id.label("ensayo_id"),
            func.count(Medicion.id).label("total_mediciones"),
            func.max(Medicion.creado_en).label("ultima_medicion_en"),
        )
        .group_by(Medicion.ensayo_id)
        .subquery()
    )

    # outerjoin permite que tambien salgan ensayos sin ninguna medicion.
    filas = sesion.execute(
        select(
            Ensayo,
            resumen_mediciones.c.total_mediciones,
            resumen_mediciones.c.ultima_medicion_en,
        )
        .outerjoin(resumen_mediciones, resumen_mediciones.c.ensayo_id == Ensayo.id)
        .order_by(Ensayo.creado_en.desc())
    ).all()

    return [
        {
            "id": ensayo.id,
            "nombre": ensayo.nombre,
            "objetivo": ensayo.objetivo,
            "descripcion": ensayo.descripcion,
            "usuario_id": ensayo.usuario_id,
            "estado": ensayo.estado,
            "creado_en": ensayo.creado_en,
            "usuario": ensayo.usuario,
            "total_mediciones": int(total_mediciones or 0),
            "ultima_medicion_en": ultima_medicion_en,
        }
        for ensayo, total_mediciones, ultima_medicion_en in filas
    ]


@router.get("/docente/eventos", response_model=list[EventoRespuesta])
def listar_eventos_docente(
    limite: int = Query(default=30, ge=1, le=100),
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_docente),
):
    _ = usuario_actual
    return sesion.scalars(
        select(EventoMedicion)
        .order_by(EventoMedicion.creado_en.desc())
        .limit(limite)
    ).all()


@router.get("/docente/ensayos/{ensayo_id}/mediciones", response_model=list[MedicionRespuesta])
def listar_mediciones_docente(
    ensayo_id: int,
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_docente),
):

    return sesion.scalars(
        select(Medicion)
        .where(Medicion.ensayo_id == ensayo_id)
        .order_by(Medicion.creado_en.desc())
    ).all()


@router.delete("/docente/mediciones/{medicion_id}")
def borrar_medicion_docente(
    medicion_id: int,
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_docente),
):
    _ = usuario_actual
    medicion = sesion.get(Medicion, medicion_id)

    if not medicion:
        return {"estado": "no encontrada"}

    ensayo_id = medicion.ensayo_id
    nombre_medicion = medicion.nombre
    borrar_medicion_contenido(sesion, medicion)
    guardar_evento(
        sesion,
        f"Medicion {nombre_medicion} borrada por docente {usuario_actual.identificador_uacloud}.",
        tipo="advertencia",
        ensayo_id=ensayo_id,
    )
    sesion.commit()

    return {"estado": "medicion borrada", "id": medicion_id}


@router.delete("/docente/ensayos/{ensayo_id}")
def borrar_ensayo_docente(
    ensayo_id: int,
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_docente),
):
    _ = usuario_actual
    ensayo = sesion.get(Ensayo, ensayo_id)

    if not ensayo:
        return {"estado": "no encontrado"}

    nombre_ensayo = ensayo.nombre
    borrar_ensayo_contenido(sesion, ensayo)
    guardar_evento(
        sesion,
        f"Ensayo {nombre_ensayo} borrado por docente {usuario_actual.identificador_uacloud}.",
        tipo="advertencia",
    )
    sesion.commit()

    return {"estado": "ensayo borrado", "id": ensayo_id}

@router.get("/mediciones/ultima", response_model=UltimaMedicionUsuarioRespuesta | None)
def obtener_ultima_medicion_usuario(
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    fila = sesion.execute(
        select(Medicion, Ensayo)
        .join(Ensayo, Medicion.ensayo_id == Ensayo.id)
        .where(Ensayo.usuario_id == usuario_actual.id)
        .order_by(Medicion.creado_en.desc())
        .limit(1)
    ).first()

    if not fila:
        return None

    medicion, ensayo = fila
    return {"ensayo": ensayo, "medicion": medicion}


@router.delete("/mediciones/{medicion_id}")
def borrar_medicion_usuario(
    medicion_id: int,
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    medicion = obtener_medicion_del_usuario(medicion_id, usuario_actual, sesion)
    ensayo_id = medicion.ensayo_id
    nombre_medicion = medicion.nombre

    borrar_medicion_contenido(sesion, medicion)
    guardar_evento(
        sesion,
        f"Medicion {nombre_medicion} borrada por {usuario_actual.identificador_uacloud}.",
        tipo="advertencia",
        ensayo_id=ensayo_id,
    )
    sesion.commit()

    return {"estado": "medicion borrada", "id": medicion_id}

@router.get("/mediciones/{medicion_id}/muestras", response_model=list[MuestraRespuesta])
def listar_muestras_medicion(
    medicion_id: int,
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    obtener_medicion_del_usuario(medicion_id, usuario_actual, sesion)

    # Este orden es importante para poder dibujar graficas correctamente.
    return sesion.scalars(
        select(MuestraMedicion)
        .where(MuestraMedicion.medicion_id == medicion_id)
        .order_by(MuestraMedicion.instante.asc())
    ).all()


@router.get("/mediciones/{medicion_id}/eventos", response_model=list[EventoRespuesta])
def listar_eventos_medicion(
    medicion_id: int,
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    obtener_medicion_del_usuario(medicion_id, usuario_actual, sesion)

    return sesion.scalars(
        select(EventoMedicion)
        .where(EventoMedicion.medicion_id == medicion_id)
        .order_by(EventoMedicion.creado_en.asc())
    ).all()

@router.get("/docente/mediciones/{medicion_id}/muestras", response_model=list[MuestraRespuesta])
def listar_muestras_medicion_docente(
    medicion_id: int,
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_docente),
):
    _ = usuario_actual
    medicion = sesion.get(Medicion, medicion_id)
    if not medicion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicion no encontrada",
        )

    return sesion.scalars(
        select(MuestraMedicion)
        .where(MuestraMedicion.medicion_id == medicion_id)
        .order_by(MuestraMedicion.instante.asc())
    ).all()


@router.get("/docente/mediciones/{medicion_id}/eventos", response_model=list[EventoRespuesta])
def listar_eventos_medicion_docente(
    medicion_id: int,
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_docente),
):
    _ = usuario_actual
    medicion = sesion.get(Medicion, medicion_id)
    if not medicion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicion no encontrada",
        )

    return sesion.scalars(
        select(EventoMedicion)
        .where(EventoMedicion.medicion_id == medicion_id)
        .order_by(EventoMedicion.creado_en.asc())
    ).all()
