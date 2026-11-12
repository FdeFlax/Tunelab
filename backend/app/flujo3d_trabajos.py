"""Un proceso de cálculo por instalación; resultados temporales separados por usuario."""
from collections import OrderedDict, deque
from dataclasses import dataclass, field
import hashlib
import json
import logging
import os
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
import threading
from time import monotonic
from uuid import uuid4

from app.flujo3d_datos import MODELO, PASOS, MAX_RESULTADO_BYTES, validar_resultado

log = logging.getLogger(__name__)


class FlujoOcupado(Exception):
    pass


@dataclass
class Trabajo:
    id: str
    usuario: int
    creado: float = field(default_factory=monotonic)
    estado: str = "recibiendo"
    mensaje: str = "Recibiendo la geometría…"
    paso: int = 0
    fin: float | None = None
    firma: str = ""
    resultado: dict | None = None
    error: str = ""
    cancelar: threading.Event = field(default_factory=threading.Event)
    proceso: subprocess.Popen | None = None
    hilo: threading.Thread | None = None


class GestorFlujo3D:
    def __init__(self, raiz, max_seconds=120):
        self.raiz = Path(raiz).resolve()
        self.temporales = self.raiz / "tmp/flujo3d-web"
        self.lock = threading.RLock()
        self.trabajos = OrderedDict()
        self.activo = None
        self.cerrado = False
        self.max_seconds = max_seconds

    def _limpiar(self):
        for id, job in list(self.trabajos.items()):
            if job.fin is not None and (monotonic() - job.fin > 3600 or len(self.trabajos) >= 9):
                del self.trabajos[id]

    def ocupado(self):
        with self.lock:
            self._limpiar()
            return self.activo is not None

    def reservar(self, usuario):
        with self.lock:
            self._limpiar()
            if self.cerrado or self.activo is not None:
                raise FlujoOcupado("Hay otro cálculo en marcha. Espera a que termine antes de iniciar uno nuevo.")
            job = Trabajo(uuid4().hex, usuario)
            self.trabajos[job.id] = job
            self.activo = job.id
            return job.id

    def abandonar(self, id):
        with self.lock:
            job = self.trabajos.get(id)
            if job and job.hilo is None:
                self.trabajos.pop(id)
                if self.activo == id:
                    self.activo = None

    def _publico(self, job, cache=False):
        return {"id": job.id, "estado": job.estado, "mensaje": job.mensaje, "paso": job.paso,
                "pasos": PASOS, "segundos": round((job.fin or monotonic()) - job.creado, 1),
                "cache": cache, "resultado": job.resultado}

    def consultar(self, id, usuario):
        with self.lock:
            self._limpiar()
            job = self.trabajos.get(id)
            if job is None or job.usuario != usuario:
                raise KeyError(id)
            return self._publico(job)

    def cancelar(self, id, usuario):
        with self.lock:
            job = self.trabajos.get(id)
            if job is None or job.usuario != usuario:
                raise KeyError(id)
            if job.fin is None:
                job.cancelar.set()
                job.estado, job.mensaje = "cancelando", "Deteniendo el cálculo…"
            return self._publico(job)

    def enviar(self, id, datos, python):
        with self.lock:
            job = self.trabajos[id]
            job.firma = hashlib.sha256(MODELO.encode() + datos).hexdigest()
            for other in self.trabajos.values():
                if other.id != id and other.usuario == job.usuario and other.firma == job.firma and other.estado == "completado":
                    cached = self._publico(other, cache=True)
                    self.abandonar(id)
                    return cached
            if self.cerrado:
                self.abandonar(id)
                raise FlujoOcupado("El servidor está cerrando. Vuelve a intentarlo cuando esté disponible.")
            job.estado, job.mensaje = "preparando", "Preparando el motor 3D…"
            job.hilo = threading.Thread(target=self._ejecutar, args=(job, datos, str(python)), daemon=True)
            job.hilo.start()
            return self._publico(job)

    def _evento(self, job, event):
        with self.lock:
            if job.cancelar.is_set():
                return
            if event.get("fase") in ("preparando", "geometria", "calculando", "completado", "error"):
                job.mensaje = str(event.get("mensaje", "Procesando…"))[:500]
                if event["fase"] == "error":
                    job.error = job.mensaje
                if event["fase"] not in ("completado", "error"):
                    job.estado = event["fase"]
                step = event.get("paso")
                if isinstance(step, int) and 0 <= step <= PASOS:
                    job.paso = max(job.paso, step)

    def _ejecutar(self, job, datos, python):
        tail = deque(maxlen=60)
        final_state, final_message, result = "error", "El motor no ha podido terminar el cálculo.", None
        try:
            self.temporales.mkdir(parents=True, exist_ok=True)
            # Only server-created paths enter the subprocess. No shell or user filenames.
            with TemporaryDirectory(prefix="caso-", dir=self.temporales) as directory:
                input_path, output_path = Path(directory) / "geometria.bin", Path(directory) / "mapas.json"
                input_path.write_bytes(datos)
                command = [python, str(self.raiz / "scripts/calcular-flujo3d.py"), "--input", str(input_path),
                           "--output", str(output_path), "--modelo-esperado", MODELO]
                environment = {**os.environ, "PYTHONUTF8": "1", "PYTHONUNBUFFERED": "1", "OMP_NUM_THREADS": "2", "OPENBLAS_NUM_THREADS": "2"}
                with subprocess.Popen(command, cwd=self.raiz, env=environment, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                      text=True, encoding="utf-8", errors="replace",
                                      creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0) as process:
                    with self.lock:
                        job.proceso = process
                    def leer():
                        for line in process.stdout:
                            tail.append(line[:1000].rstrip())
                            if line.startswith("TUNELAB_FLOW "):
                                try:
                                    self._evento(job, json.loads(line[len("TUNELAB_FLOW "):]))
                                except (ValueError, TypeError):
                                    pass
                    reader = threading.Thread(target=leer, daemon=True)
                    reader.start()
                    deadline = monotonic() + self.max_seconds
                    timed_out = False
                    while process.poll() is None:
                        if job.cancelar.wait(0.1) or monotonic() > deadline:
                            timed_out = not job.cancelar.is_set()
                            process.terminate()
                            try:
                                process.wait(timeout=3)
                            except subprocess.TimeoutExpired:
                                process.kill()
                                process.wait(timeout=5)
                            break
                    reader.join(timeout=3)
                    if job.cancelar.is_set():
                        final_state, final_message = "cancelado", "Cálculo cancelado. Puedes ajustar el objeto y volver a intentarlo."
                    elif timed_out:
                        final_message = "El cálculo ha superado el límite de 120 segundos y se ha detenido. Prueba una geometría más sencilla."
                    elif process.returncode == 0 and output_path.is_file() and output_path.stat().st_size < MAX_RESULTADO_BYTES:
                        result = validar_resultado(json.loads(output_path.read_text(encoding="utf-8")))
                        final_state, final_message = "completado", "Mapas de flujo calculados."
                    else:
                        final_message = job.error or final_message
                        log.warning("Flujo 3D %s fallido: %s", job.id, "\n".join(tail))
        except Exception:
            log.exception("No se pudo completar el flujo 3D %s. Salida: %s", job.id, "\n".join(tail))
        finally:
            with self.lock:
                job.estado, job.mensaje, job.resultado = final_state, final_message, result
                job.fin = monotonic()
                job.proceso = None
                if self.activo == job.id:
                    self.activo = None
                self._limpiar()

    def cerrar(self):
        with self.lock:
            self.cerrado = True
            jobs = [job for job in self.trabajos.values() if job.fin is None]
            for job in jobs:
                job.cancelar.set()
        for job in jobs:
            if job.hilo:
                job.hilo.join(timeout=6)
