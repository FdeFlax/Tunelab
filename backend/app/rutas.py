from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.base_datos import obtener_sesion
from app.control_tunel import controlador_tunel
from app.configuracion import configuracion
from app.datos_api import (
    EnsayoActualizar,
    EnsayoCrear,
    EnsayoDocenteRespuesta,
    EnsayoRespuesta,
    EventoCrear,
    EventoRespuesta,
    MedicionCrear,
    MedicionRespuesta,
    MuestraCrear,
    MuestraRespuesta,
    UsuarioCrear,
    UsuarioRespuesta,
    TunelConexionRespuesta,
    TunelConsignaCrear,
    TunelEstadoRespuesta,
    TunelMuestraRespuesta,
)
from app.tablas import (
    Ensayo,
    EstadoMedicion,
    EventoMedicion,
    Medicion,
    MuestraMedicion,
    Usuario,
    UsoTunel,
)
from app.websocket_tunel import gestor_websocket_tunel
from app.usuario_actual import (
    obtener_ensayo_del_usuario,
    obtener_medicion_del_usuario,
    obtener_usuario_docente,
    obtener_usuario_actual,
)

# Este router agrupa todas las rutas de la API.
# En main.py se conectara a FastAPI, normalmente con el prefijo /api.
# Por ejemplo: aqui escribimos /salud, pero en el navegador se usa /api/salud.
router = APIRouter()


@router.websocket("/ws/tunel")
async def websocket_tunel(websocket: WebSocket):
    # Canal en tiempo real para avisar a las pantallas de cambios del tunel.
    # No manda datos privados: solo avisa de que deben refrescar su estado.
    await gestor_websocket_tunel.conectar(websocket)

    try:
        await websocket.send_json({"tipo": "conexion_tunel_actualizada"})

        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        gestor_websocket_tunel.desconectar(websocket)


@router.get("/salud")
def salud():
    # Ruta simple para comprobar que el backend esta encendido.
    # No guarda nada ni consulta ensayos; solo responde "ok".
    return {"estado": "ok"}


def generar_codigo_ensayo(sesion: Session) -> str:
    # Genera codigos automaticos tipo A-001, A-002, A-003...
    # Lee los codigos ya guardados y busca el numero mas alto.
    codigos = sesion.scalars(select(Ensayo.codigo)).all()
    mayor = 0

    for codigo in codigos:
        partes = str(codigo).split("-")

        # Solo cuenta codigos con la forma exacta A-numero.
        # Si aparece otro tipo de codigo, lo ignora.
        if len(partes) == 2 and partes[0] == "A" and partes[1].isdigit():
            mayor = max(mayor, int(partes[1]))

    # :03d significa que el numero se escribe con 3 digitos.
    # Ejemplo: 1 -> 001, 12 -> 012.
    return f"A-{mayor + 1:03d}"



def guardar_evento(
    sesion: Session,
    mensaje: str,
    tipo: str = "info",
    ensayo_id: int | None = None,
    medicion_id: int | None = None,
):
    # Guarda una accion importante para dejar trazabilidad.
    # No hace commit aqui: cada ruta confirma todo junto al final.
    sesion.add(
        EventoMedicion(
            tipo=tipo,
            mensaje=mensaje,
            ensayo_id=ensayo_id,
            medicion_id=medicion_id,
        )
    )



def preparar_respuesta_conexion(uso: UsoTunel | None, usuario_actual: Usuario):
    if not uso or not uso.conectado:
        return {
            "conectado": False,
            "ocupado": False,
            "es_propietario": False,
            "mensaje": "Tunel libre",
            "usuario": None,
            "conectado_en": None,
        }

    es_propietario = uso.usuario_id == usuario_actual.id
    return {
        "conectado": es_propietario,
        "ocupado": not es_propietario,
        "es_propietario": es_propietario,
        "mensaje": "Conectado a tu sesion" if es_propietario else "Tunel ocupado por otro usuario",
        "usuario": uso.usuario,
        "conectado_en": uso.conectado_en,
    }



def comprobar_usuario_controla_tunel(sesion: Session, usuario_actual: Usuario) -> UsoTunel:
    # Comprueba que el usuario actual es quien tiene reservado el tunel.
    # Asi evitamos que otra pantalla pueda encender, apagar o cambiar consignas.
    uso = sesion.scalar(select(UsoTunel).where(UsoTunel.id == 1))

    if not uso or not uso.conectado:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conecta el tunel antes de operar.",
        )

    if uso.usuario_id != usuario_actual.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El tunel esta ocupado por otro usuario.",
        )

    return uso
@router.get("/tunel/conexion", response_model=TunelConexionRespuesta)
def ver_conexion_tunel(
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    # Comprueba si el tunel esta libre u ocupado por algun usuario.
    uso = sesion.scalar(select(UsoTunel).where(UsoTunel.id == 1))
    return preparar_respuesta_conexion(uso, usuario_actual)



@router.get("/tunel/estado", response_model=TunelEstadoRespuesta)
def ver_estado_operativo_tunel():
    # Devuelve el estado operativo del controlador del tunel.
    # Ahora responde el simulador; en el tunel real respondera la capa de hardware.
    return controlador_tunel.leer_estado()


@router.post("/tunel/consigna", response_model=TunelEstadoRespuesta)
def aplicar_consigna_tunel(
    datos: TunelConsignaCrear,
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    comprobar_usuario_controla_tunel(sesion, usuario_actual)
    estado = controlador_tunel.aplicar_consigna(datos.potencia_porcentaje)
    guardar_evento(sesion, f"Consigna aplicada al tunel: {datos.potencia_porcentaje}%.")
    sesion.commit()
    return estado


@router.post("/tunel/encender", response_model=TunelEstadoRespuesta)
async def encender_tunel_operativo(
    datos: TunelConsignaCrear,
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    comprobar_usuario_controla_tunel(sesion, usuario_actual)
    estado = controlador_tunel.encender(datos.potencia_porcentaje)
    guardar_evento(sesion, f"Tunel encendido con consigna {datos.potencia_porcentaje}%.")
    sesion.commit()
    await gestor_websocket_tunel.avisar_cambio_conexion()
    return estado


@router.post("/tunel/apagar", response_model=TunelEstadoRespuesta)
async def apagar_tunel_operativo(
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    uso = comprobar_usuario_controla_tunel(sesion, usuario_actual)
    estado = controlador_tunel.apagar()
    guardar_evento(sesion, f"{usuario_actual.identificador_uacloud} apago y libero el tunel.")
    uso.conectado = False
    uso.usuario_id = None
    uso.conectado_en = None
    uso.actualizado_en = datetime.utcnow()
    sesion.commit()
    await gestor_websocket_tunel.avisar_cambio_conexion()
    return estado


@router.post("/tunel/medicion/iniciar", response_model=TunelEstadoRespuesta)
def iniciar_medicion_tunel_operativo(
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    comprobar_usuario_controla_tunel(sesion, usuario_actual)

    try:
        estado = controlador_tunel.iniciar_medicion()
    except RuntimeError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error

    guardar_evento(sesion, f"Medicion operativa iniciada por {usuario_actual.identificador_uacloud}.")
    sesion.commit()
    return estado


@router.post("/tunel/medicion/detener", response_model=TunelEstadoRespuesta)
def detener_medicion_tunel_operativo(
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    comprobar_usuario_controla_tunel(sesion, usuario_actual)
    estado = controlador_tunel.detener_medicion()
    guardar_evento(sesion, f"Medicion operativa detenida por {usuario_actual.identificador_uacloud}.")
    sesion.commit()
    return estado


@router.get("/tunel/muestra", response_model=TunelMuestraRespuesta)
def leer_muestra_tunel(
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    comprobar_usuario_controla_tunel(sesion, usuario_actual)
    return controlador_tunel.leer_muestra()

@router.post("/tunel/conectar", response_model=TunelConexionRespuesta)
async def conectar_tunel(
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    # Este es el bloqueo central: solo un usuario puede quedar conectado al tunel.
    uso = sesion.scalar(select(UsoTunel).where(UsoTunel.id == 1))

    if not uso:
        uso = UsoTunel(id=1)
        sesion.add(uso)

    if uso.conectado and uso.usuario_id != usuario_actual.id:
        guardar_evento(
            sesion,
            f"Intento de conexion rechazado para {usuario_actual.identificador_uacloud}. Tunel ocupado.",
            tipo="advertencia",
        )
        sesion.commit()
        return preparar_respuesta_conexion(uso, usuario_actual)

    uso.usuario_id = usuario_actual.id
    uso.conectado = True
    uso.conectado_en = uso.conectado_en or datetime.utcnow()
    uso.actualizado_en = datetime.utcnow()
    guardar_evento(sesion, f"{usuario_actual.identificador_uacloud} conectado al tunel.")
    sesion.commit()
    sesion.refresh(uso)
    await gestor_websocket_tunel.avisar_cambio_conexion()

    return preparar_respuesta_conexion(uso, usuario_actual)


@router.post("/tunel/desconectar", response_model=TunelConexionRespuesta)
async def desconectar_tunel(
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    # Solo libera la conexion si la tenia el usuario actual.
    uso = sesion.scalar(select(UsoTunel).where(UsoTunel.id == 1))

    if not uso:
        return preparar_respuesta_conexion(None, usuario_actual)

    if uso.conectado and uso.usuario_id != usuario_actual.id:
        return preparar_respuesta_conexion(uso, usuario_actual)

    controlador_tunel.apagar()
    guardar_evento(sesion, f"{usuario_actual.identificador_uacloud} desconectado del tunel.")
    uso.conectado = False
    uso.usuario_id = None
    uso.conectado_en = None
    uso.actualizado_en = datetime.utcnow()
    sesion.commit()
    sesion.refresh(uso)
    await gestor_websocket_tunel.avisar_cambio_conexion()

    return preparar_respuesta_conexion(uso, usuario_actual)


@router.post("/tunel/docente/desconectar", response_model=TunelConexionRespuesta)
async def desconectar_tunel_docente(
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_docente),
):
    # Permite a un docente liberar el control del tunel si otro usuario lo dejo ocupado.
    uso = sesion.scalar(select(UsoTunel).where(UsoTunel.id == 1))

    if not uso:
        return preparar_respuesta_conexion(None, usuario_actual)

    usuario_liberado = uso.usuario.identificador_uacloud if uso.usuario else "usuario desconocido"
    usuario_liberado_id = uso.usuario.identificador_uacloud if uso.usuario else None

    if uso.usuario_id:
        mediciones_activas = sesion.scalars(
            select(Medicion)
            .join(Ensayo)
            .where(
                Ensayo.usuario_id == uso.usuario_id,
                Medicion.estado == EstadoMedicion.en_curso,
            )
        ).all()

        for medicion in mediciones_activas:
            medicion.estado = EstadoMedicion.finalizada
            medicion.fecha_fin = medicion.fecha_fin or datetime.utcnow()
            guardar_evento(
                sesion,
                f"Medicion {medicion.nombre} detenida porque el docente libero el tunel.",
                tipo="advertencia",
                ensayo_id=medicion.ensayo_id,
                medicion_id=medicion.id,
            )

    controlador_tunel.apagar()
    guardar_evento(
        sesion,
        f"{usuario_actual.identificador_uacloud} libero el tunel ocupado por {usuario_liberado}.",
        tipo="advertencia",
    )
    uso.conectado = False
    uso.usuario_id = None
    uso.conectado_en = None
    uso.actualizado_en = datetime.utcnow()
    sesion.commit()
    sesion.refresh(uso)
    await gestor_websocket_tunel.avisar_liberacion_docente(usuario_liberado_id)
    await gestor_websocket_tunel.avisar_cambio_conexion()
    return preparar_respuesta_conexion(uso, usuario_actual)

@router.get("/usuarios", response_model=list[UsuarioRespuesta])
def listar_usuarios(usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    # Ahora mismo esta ruta no lista todos los usuarios.
    # Devuelve solamente el usuario que esta usando la aplicacion.
    # Esto ayuda a comprobar que la API reconoce al usuario actual.
    return [usuario_actual]


@router.post("/usuarios/asegurar", response_model=UsuarioRespuesta)
def asegurar_usuario(
    datos: UsuarioCrear,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    # Esta ruta asegura que existe un usuario en la base de datos.
    # En local, obtener_usuario_actual crea o recupera el usuario usando cabeceras HTTP.
    # En eServices, esta parte debera adaptarse al usuario real de UACloud.
    _ = datos
    return usuario_actual


@router.get("/ensayos", response_model=list[EnsayoRespuesta])
def listar_ensayos(
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    # Devuelve solo los ensayos del usuario actual.
    # Esto evita que un alumno vea ensayos de otro alumno en la vista normal.
    return sesion.scalars(
        select(Ensayo)
        .where(Ensayo.usuario_id == usuario_actual.id)
        .order_by(Ensayo.creado_en.desc())
    ).all()


@router.post("/ensayos", response_model=EnsayoRespuesta)
def crear_ensayo(
    datos: EnsayoCrear,
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    total_ensayos = sesion.scalar(
        select(func.count(Ensayo.id)).where(Ensayo.usuario_id == usuario_actual.id)
    ) or 0

    if total_ensayos >= configuracion.limite_ensayos_por_usuario:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Has alcanzado el limite de {configuracion.limite_ensayos_por_usuario} ensayos.",
        )

    # Convierte los datos validados por Pydantic en un diccionario normal.
    valores = datos.model_dump()

    # El backend es quien asigna el codigo. Asi no se repite si dos usuarios
    # preparan una ficha al mismo tiempo desde equipos distintos.
    valores["codigo"] = generar_codigo_ensayo(sesion)

    # El ensayo queda asociado al usuario que ha hecho la peticion.
    valores["usuario_id"] = usuario_actual.id

    # Crea el objeto Ensayo, lo guarda en MySQL y devuelve el resultado.
    ensayo = Ensayo(**valores)
    sesion.add(ensayo)
    sesion.flush()
    guardar_evento(
        sesion,
        f"Ensayo {ensayo.codigo} creado por {usuario_actual.identificador_uacloud}.",
        ensayo_id=ensayo.id,
    )
    sesion.commit()

    # refresh actualiza el objeto con datos generados por MySQL, como el id.
    sesion.refresh(ensayo)
    return ensayo



@router.put("/ensayos/{ensayo_id}", response_model=EnsayoRespuesta)
def actualizar_ensayo(
    ensayo_id: int,
    datos: EnsayoActualizar,
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    # Solo se permite editar ensayos del usuario actual.
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
        f"Ensayo {ensayo.codigo} actualizado por {usuario_actual.identificador_uacloud}.",
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
    # Borra un ensayo completo del usuario actual.
    # Tambien elimina sus mediciones, muestras y eventos asociados.
    ensayo = obtener_ensayo_del_usuario(ensayo_id, usuario_actual, sesion)
    codigo = ensayo.codigo
    nombre = ensayo.nombre
    ids_mediciones = sesion.scalars(
        select(Medicion.id).where(Medicion.ensayo_id == ensayo_id)
    ).all()

    if ids_mediciones:
        sesion.execute(delete(EventoMedicion).where(EventoMedicion.medicion_id.in_(ids_mediciones)))
        sesion.execute(delete(MuestraMedicion).where(MuestraMedicion.medicion_id.in_(ids_mediciones)))
        sesion.execute(delete(Medicion).where(Medicion.id.in_(ids_mediciones)))

    sesion.execute(delete(EventoMedicion).where(EventoMedicion.ensayo_id == ensayo_id))
    sesion.delete(ensayo)
    guardar_evento(
        sesion,
        f"Ensayo {codigo} ({nombre}) borrado por {usuario_actual.identificador_uacloud}.",
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
    # Antes de listar mediciones, se comprueba que el ensayo pertenece al usuario.
    # Si no pertenece, se corta con error y no se devuelven datos.
    obtener_ensayo_del_usuario(ensayo_id, usuario_actual, sesion)

    # Devuelve las mediciones del ensayo, de mas reciente a mas antigua.
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
    # Esta ruta es para la vista docente.
    # A diferencia de /ensayos, aqui se consultan todos los ensayos.
    # Subconsulta: calcula cuantas mediciones tiene cada ensayo
    # y cual fue la ultima medicion registrada.
    resumen_mediciones = (
        select(
            Medicion.ensayo_id.label("ensayo_id"),
            func.count(Medicion.id).label("total_mediciones"),
            func.max(Medicion.creado_en).label("ultima_medicion_en"),
        )
        .group_by(Medicion.ensayo_id)
        .subquery()
    )

    # Consulta principal:
    # obtiene los ensayos y les une el resumen de mediciones.
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

    # FastAPI devolvera estos diccionarios como JSON.
    # Incluyen datos del ensayo, del usuario creador y el resumen docente.
    return [
        {
            "id": ensayo.id,
            "codigo": ensayo.codigo,
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
    # Historial general para la pagina docente.
    # Devuelve los ultimos eventos registrados en la aplicacion.
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
    # Ruta para que la vista docente vea mediciones de cualquier ensayo.
    # Igual que arriba, aun falta restringirla a profesores cuando eServices de el rol real.

    # Lista las mediciones del ensayo seleccionado.
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
    # Ruta docente para borrar una medicion completa.
    # Primero se borran sus muestras y eventos para no dejar datos sueltos.
    _ = usuario_actual
    medicion = sesion.get(Medicion, medicion_id)

    if not medicion:
        return {"estado": "no encontrada"}

    ensayo_id = medicion.ensayo_id
    nombre_medicion = medicion.nombre
    sesion.execute(delete(EventoMedicion).where(EventoMedicion.medicion_id == medicion_id))
    sesion.execute(delete(MuestraMedicion).where(MuestraMedicion.medicion_id == medicion_id))
    sesion.delete(medicion)
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
    # Ruta docente para borrar un ensayo completo.
    # Borra tambien mediciones, muestras y eventos relacionados.
    _ = usuario_actual
    ensayo = sesion.get(Ensayo, ensayo_id)

    if not ensayo:
        return {"estado": "no encontrado"}

    codigo_ensayo = ensayo.codigo
    nombre_ensayo = ensayo.nombre
    ids_mediciones = sesion.scalars(
        select(Medicion.id).where(Medicion.ensayo_id == ensayo_id)
    ).all()

    if ids_mediciones:
        sesion.execute(delete(EventoMedicion).where(EventoMedicion.medicion_id.in_(ids_mediciones)))
        sesion.execute(delete(MuestraMedicion).where(MuestraMedicion.medicion_id.in_(ids_mediciones)))
        sesion.execute(delete(Medicion).where(Medicion.id.in_(ids_mediciones)))

    sesion.execute(delete(EventoMedicion).where(EventoMedicion.ensayo_id == ensayo_id))
    sesion.delete(ensayo)
    guardar_evento(
        sesion,
        f"Ensayo {codigo_ensayo} ({nombre_ensayo}) borrado por docente {usuario_actual.identificador_uacloud}.",
        tipo="advertencia",
    )
    sesion.commit()

    return {"estado": "ensayo borrado", "id": ensayo_id}

@router.post("/ensayos/{ensayo_id}/mediciones", response_model=MedicionRespuesta)
def crear_medicion(
    ensayo_id: int,
    datos: MedicionCrear,
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    # Solo se puede crear una medicion en un ensayo propio.
    obtener_ensayo_del_usuario(ensayo_id, usuario_actual, sesion)

    total_mediciones = sesion.scalar(
        select(func.count(Medicion.id)).where(Medicion.ensayo_id == ensayo_id)
    ) or 0

    if total_mediciones >= configuracion.limite_mediciones_por_ensayo:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Este ensayo ya tiene el limite de {configuracion.limite_mediciones_por_ensayo} mediciones.",
        )

    # La app guarda la medicion cuando ya ha terminado la captura,
    # por eso se crea directamente como finalizada.
    medicion = Medicion(
        ensayo_id=ensayo_id,
        estado=EstadoMedicion.finalizada,
        **datos.model_dump(),
    )

    # Guarda la medicion principal en MySQL.
    sesion.add(medicion)
    sesion.flush()
    guardar_evento(
        sesion,
        f"Medicion {medicion.nombre} finalizada y registrada por {usuario_actual.identificador_uacloud}.",
        ensayo_id=ensayo_id,
        medicion_id=medicion.id,
    )
    sesion.commit()
    sesion.refresh(medicion)
    return medicion


@router.post("/mediciones/{medicion_id}/muestras")
def guardar_muestras_medicion(
    medicion_id: int,
    muestras: list[MuestraCrear],
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    # Comprueba que la medicion pertenece al usuario antes de guardar muestras.
    obtener_medicion_del_usuario(medicion_id, usuario_actual, sesion)

    # Cada muestra es una fila con valores de velocidad, temperatura,
    # potencia, frecuencia, corriente, rpm e instante.
    registros = [
        MuestraMedicion(medicion_id=medicion_id, **muestra.model_dump())
        for muestra in muestras
    ]

    # add_all guarda muchas filas de golpe.
    sesion.add_all(registros)
    sesion.commit()

    # Respuesta sencilla para saber cuantas muestras se guardaron.
    return {"estado": "muestras guardadas", "total": len(registros)}

#@ indica que esta ruta responde a GET y la URL tiene un parametro dinamico medicion_id.
#devuelve Esta ruta devuelve una lista de objetos tipo MuestraRespuesta, que esta definido en datos_api.

@router.delete("/mediciones/{medicion_id}")
def borrar_medicion_usuario(
    medicion_id: int,
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    # Borra una medicion del usuario actual.
    # La comprobacion evita que un alumno borre mediciones de otro alumno.
    medicion = obtener_medicion_del_usuario(medicion_id, usuario_actual, sesion)
    ensayo_id = medicion.ensayo_id
    nombre_medicion = medicion.nombre

    sesion.execute(delete(EventoMedicion).where(EventoMedicion.medicion_id == medicion_id))
    sesion.execute(delete(MuestraMedicion).where(MuestraMedicion.medicion_id == medicion_id))
    sesion.delete(medicion)
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
    # Comprueba que el usuario tiene acceso a esa medicion.
    obtener_medicion_del_usuario(medicion_id, usuario_actual, sesion)

    # Devuelve las muestras ordenadas por tiempo.
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
    # Comprueba que la medicion pertenece al usuario.
    obtener_medicion_del_usuario(medicion_id, usuario_actual, sesion)

    # Devuelve avisos, incidencias o mensajes asociados a la medicion.
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


@router.post("/eventos")
def registrar_evento(
    datos: EventoCrear,
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    # Un evento puede estar asociado a un ensayo, a una medicion o a ambos.
    # Si viene ensayo_id, comprobamos que ese ensayo sea del usuario.
    if datos.ensayo_id:
        obtener_ensayo_del_usuario(datos.ensayo_id, usuario_actual, sesion)

    # Si viene medicion_id, comprobamos que esa medicion sea del usuario.
    if datos.medicion_id:
        obtener_medicion_del_usuario(datos.medicion_id, usuario_actual, sesion)

    # Crea y guarda el evento en la tabla eventos_medicion.
    evento = EventoMedicion(**datos.model_dump())
    sesion.add(evento)
    sesion.commit()
    sesion.refresh(evento)

    # Devuelve el id del evento creado para que el frontend pueda saber que se guardo.
    return {"id": evento.id, "estado": "evento registrado"}













