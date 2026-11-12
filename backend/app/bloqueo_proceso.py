"""Evita dos controladores en una misma instalacion, tambien con varios workers."""
import os
from contextlib import contextmanager
from pathlib import Path


@contextmanager
def propietario_controlador(ruta=None):
    ruta = ruta or Path(__file__).resolve().parents[1] / ".tunel.lock"
    with open(ruta, "a+b") as archivo:
        archivo.seek(0, os.SEEK_END)
        if archivo.tell() == 0:
            archivo.write(b"0")
            archivo.flush()
        archivo.seek(0)
        if os.name == "nt":
            import msvcrt
            bloquear = lambda: msvcrt.locking(archivo.fileno(), msvcrt.LK_NBLCK, 1)
            liberar = lambda: msvcrt.locking(archivo.fileno(), msvcrt.LK_UNLCK, 1)
        else:
            import fcntl
            bloquear = lambda: fcntl.flock(archivo.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            liberar = lambda: fcntl.flock(archivo.fileno(), fcntl.LOCK_UN)
        try:
            bloquear()
        except OSError as error:
            raise RuntimeError("Ya existe un controlador del tunel. Ejecuta un solo worker por instalacion.") from error
        try:
            yield
        finally:
            archivo.seek(0)
            liberar()
