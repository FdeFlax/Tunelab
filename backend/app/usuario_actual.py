from ipaddress import ip_address
from urllib.parse import urlsplit

from fastapi import Depends, HTTPException, Request, status
from starlette.requests import HTTPConnection
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.base_datos import obtener_sesion
from app.configuracion import configuracion
from app.tablas import Ensayo, Medicion, RolUsuario, Usuario


PERFILES_DEMO = {
    "alu_demo": {"nombre": "Alumno Demo", "email": "alu_demo@alu.ua.es", "rol": RolUsuario.alumno},
    "prof_demo": {"nombre": "Profesor Demo", "email": "prof_demo@ua.es", "rol": RolUsuario.profesor},
}


def obtener_usuario_demo(conexion: HTTPConnection, identificador: str | None, sesion: Session) -> Usuario:
    # Selector exclusivo de desarrollo local directo; no autentica en produccion.
    if configuracion.autenticacion_modo != "demo" or configuracion.entorno != "desarrollo":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Acceso bloqueado hasta configurar la autenticacion de UACloud.")
    try:
        es_local = conexion.client is not None and ip_address(conexion.client.host).is_loopback
    except ValueError:
        es_local = False
    tiene_proxy = any(nombre == "forwarded" or nombre.startswith("x-forwarded-")
                      or nombre == "x-real-ip" for nombre in conexion.headers)
    origen = conexion.headers.get("origin")
    try:
        origen_local = not origen or (
            origen in configuracion.cors_origins_lista
            and urlsplit(origen).hostname in {"localhost", "127.0.0.1", "::1"}
        )
    except ValueError:
        origen_local = False
    if not es_local or tiene_proxy or not origen_local:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Los perfiles demo solo admiten acceso local directo.")
    perfil = PERFILES_DEMO.get(identificador)
    if perfil is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Selecciona un perfil de pruebas valido.")

    usuario = sesion.scalar(
        select(Usuario).where(Usuario.identificador_uacloud == identificador)
    )
    if usuario:
        # Si el usuario esta desactivado, no se le permite usar la API.
        if not usuario.activo:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario deshabilitado",
            )

        if usuario.rol != perfil["rol"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="El rol del perfil demo no coincide con el configurado en el servidor.")
        return usuario

    # No se aceptan nombres, correos ni roles elegidos por el cliente.
    usuario = Usuario(identificador_uacloud=identificador, **perfil)
    sesion.add(usuario)
    sesion.commit()

    # Refrescamos para obtener datos generados por MySQL, como el id.
    sesion.refresh(usuario)
    return usuario


def obtener_usuario_actual(
    request: Request,
    sesion: Session = Depends(obtener_sesion),
) -> Usuario:
    return obtener_usuario_demo(request, request.headers.get("X-Usuario-Uacloud"), sesion)


def obtener_ensayo_del_usuario(
    ensayo_id: int,
    usuario: Usuario,
    sesion: Session,
) -> Ensayo:
    # Esta funcion comprueba que un ensayo pertenece al usuario actual.
    # Es una medida de seguridad basica:
    # un alumno no deberia poder acceder al ensayo de otro alumno.
    ensayo = sesion.scalar(
        select(Ensayo).where(
            Ensayo.id == ensayo_id,
            Ensayo.usuario_id == usuario.id,
        )
    )

    # Si no encuentra el ensayo, puede ser porque no existe
    # o porque existe pero pertenece a otro usuario.
    # En ambos casos devolvemos "no encontrado".
    if not ensayo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ensayo no encontrado",
        )

    # Si llega aqui, el ensayo existe y pertenece al usuario.
    return ensayo


def obtener_medicion_del_usuario(
    medicion_id: int,
    usuario: Usuario,
    sesion: Session,
) -> Medicion:
    # Esta funcion comprueba que una medicion pertenece al usuario actual.
    # La medicion no tiene usuario directamente, sino que pertenece a un ensayo.
    # Por eso se hace join con Ensayo.
    medicion = sesion.scalar(
        select(Medicion)
        .join(Ensayo)
        .where(
            Medicion.id == medicion_id,
            Ensayo.usuario_id == usuario.id,
        )
    )

    # Si no se encuentra, la medicion no existe o pertenece a otro usuario.
    if not medicion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicion no encontrada",
        )

    # Si llega aqui, la medicion existe y esta dentro de un ensayo del usuario.
    return medicion

# Solo estos roles pueden consultar o modificar datos de otros usuarios.
ROLES_DOCENTES = {RolUsuario.profesor, RolUsuario.tecnico, RolUsuario.admin}


def obtener_usuario_docente(
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
) -> Usuario:
    # Esta dependencia se usa en todas las rutas /docente.
    # Si el usuario es alumno, FastAPI corta la peticion con 403 antes de
    # leer, modificar o borrar cualquier ensayo ajeno.
    if usuario_actual.rol not in ROLES_DOCENTES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso reservado a profesorado y personal tecnico",
        )

    return usuario_actual
