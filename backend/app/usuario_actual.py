from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.base_datos import obtener_sesion
from app.tablas import Ensayo, Medicion, RolUsuario, Usuario


# En local simulamos el usuario de UACloud mediante cabeceras HTTP.
# En eServices esta parte debera adaptarse al sistema real de autenticacion.
def obtener_usuario_actual(
    identificador_uacloud: str | None = Header(default=None, alias="X-Usuario-Uacloud"),  # Lee la cabecera HTTP X-Usuario-Uacloud; si no viene, vale None.
    nombre: str | None = Header(default=None, alias="X-Usuario-Nombre"),  # Lee la cabecera HTTP X-Usuario-Nombre; puede venir vacia.
    email: str | None = Header(default=None, alias="X-Usuario-Email"),  # Lee la cabecera HTTP X-Usuario-Email; sirve para guardar el correo del usuario.
    rol: str | None = Header(default=None, alias="X-Usuario-Rol"),  # Lee la cabecera HTTP X-Usuario-Rol; por ejemplo alumno o profesor.
    sesion: Session = Depends(obtener_sesion),  # FastAPI crea/abre una sesion de base de datos usando obtener_sesion.
    ) -> Usuario:  # La funcion devuelve un objeto Usuario.
    # Esta funcion intenta saber quien esta usando la aplicacion.
    # Ahora mismo, como todavia no estamos dentro de eServices real,
    # usamos cabeceras HTTP para simular los datos del usuario.
    #
    # Ejemplo de cabeceras:
    # X-Usuario-Uacloud: jasg25
    # X-Usuario-Nombre: Jose Angel
    # X-Usuario-Email: jasg25@alu.ua.es

    # Si no llega ningun identificador, usamos "usuario-local".
    # Esto permite probar la app en local sin login real.
    identificador = (identificador_uacloud or "usuario-local").strip()

    # Buscamos en MySQL si ya existe un usuario con ese identificador.
    usuario = sesion.scalar(
        select(Usuario).where(Usuario.identificador_uacloud == identificador)
    )

    # Si el usuario ya existe, lo reutilizamos.
    if usuario:
        # Si el usuario esta desactivado, no se le permite usar la API.
        if not usuario.activo:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario deshabilitado",
            )

        return usuario

    # Si el usuario no existe, lo creamos automaticamente.
    # Esto es util en local y tambien puede servir cuando entre un usuario nuevo
    # desde eServices por primera vez.
    usuario = Usuario(
        identificador_uacloud=identificador,
        nombre=(nombre or "Usuario UACloud").strip(),
        email=email or None,
        rol=(rol or "alumno").strip() or "alumno",
    )

    # Guardamos el usuario nuevo en MySQL.
    sesion.add(usuario)
    sesion.commit()

    # Refrescamos para obtener datos generados por MySQL, como el id.
    sesion.refresh(usuario)
    return usuario


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