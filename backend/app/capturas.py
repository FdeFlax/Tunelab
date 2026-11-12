"""Un capturador por servidor; las peticiones consultan muestras ya confirmadas."""
import logging
from datetime import datetime
from threading import Event, RLock, Thread

from fastapi import HTTPException, Request
from sqlalchemy import func, select

from app.configuracion import configuracion
from app.control_tunel import CALIBRACION
from app.configuracion_tunel import TUNEL
from app.datos_api import MedicionRespuesta, MuestraRespuesta
from app.ensayos import exigir_nombre_medicion_disponible
from app.programador_etapas import ProgramadorEtapas
from app.tablas import Ensayo, EstadoMedicion, EventoMedicion, Medicion, MuestraMedicion, UsoTunel

logger = logging.getLogger(__name__)


class CapturadorTunel:
    def __init__(self, controlador, sesiones, intervalo=None):
        self.controlador = controlador
        self.sesiones = sesiones
        self.intervalo = TUNEL["sensor"]["intervaloCapturaSegundos"] if intervalo is None else intervalo
        self.bloqueo = RLock()
        self.parada = Event()
        self.hilo = None
        self.activa_id = None
        self.error_pendiente = None
        self.programador = ProgramadorEtapas(self)

    @staticmethod
    def propietario(sesion, usuario_id):
        uso = sesion.get(UsoTunel, 1)
        if not uso or not uso.conectado or uso.usuario_id != usuario_id:
            raise HTTPException(409, "Conecta el tunel con tu usuario antes de operar.")
        return uso

    @staticmethod
    def evento(sesion, medicion, mensaje, tipo="info"):
        sesion.add(EventoMedicion(medicion_id=medicion.id, ensayo_id=medicion.ensayo_id,
                                 tipo=tipo, mensaje=mensaje))

    @staticmethod
    def cerrar_registro(sesion, medicion, estado=EstadoMedicion.finalizada):
        agregados = sesion.execute(select(
            func.avg(MuestraMedicion.velocidad_ms), func.max(MuestraMedicion.velocidad_ms),
            func.min(MuestraMedicion.velocidad_ms), func.avg(MuestraMedicion.temperatura_c),
            func.avg(MuestraMedicion.potencia_porcentaje),
        ).where(MuestraMedicion.medicion_id == medicion.id)).one()
        (medicion.velocidad_media, medicion.velocidad_maxima, medicion.velocidad_minima,
         medicion.temperatura_media, medicion.potencia_media) = agregados
        medicion.estado = estado
        ultimo_instante = sesion.scalar(select(func.max(MuestraMedicion.instante)).where(MuestraMedicion.medicion_id == medicion.id))
        medicion.fecha_fin = (ultimo_instante or medicion.fecha_inicio) if estado == EstadoMedicion.error else datetime.utcnow()
        medicion.duracion_segundos = max(0, int((medicion.fecha_fin - medicion.fecha_inicio).total_seconds()))
        if medicion.programa:
            # El JSON se reasigna para que SQLAlchemy persista también los cambios internos.
            etapas = []
            for etapa in medicion.programa["etapas"]:
                if etapa["estado"] in ("registrando", "estabilizando"):
                    fin = max(etapa.get("cambio_segundo") or etapa["inicio_segundo"] or 0,
                              (medicion.fecha_fin - medicion.fecha_inicio).total_seconds())
                    etapa = {**etapa, "estado": "parcial", "fin_segundo": fin}
                    if "tramos_estables" in etapa:
                        etapa["tramos_estables"] = [{**t, "fin": max(t["inicio"], fin)} if t["fin"] is None else t
                                                    for t in etapa["tramos_estables"]]
                etapas.append(etapa)
            medicion.programa = {**medicion.programa, "etapas": etapas}

    def recuperar_interrumpidas(self):
        with self.bloqueo, self.sesiones.begin() as sesion:
            self.programador.recuperar_interrumpidos(sesion)
            for medicion in sesion.scalars(select(Medicion).where(
                Medicion.captura_clave.is_not(None), Medicion.estado == EstadoMedicion.en_curso
            )):
                self.cerrar_registro(sesion, medicion, EstadoMedicion.error)
                self.evento(sesion, medicion, "Captura interrumpida por reinicio del servidor; muestras conservadas.", "error")
            uso = sesion.get(UsoTunel, 1)
            if uso:
                uso.conectado, uso.usuario_id, uso.conectado_en = False, None, None

    def arrancar(self):
        self.recuperar_interrumpidas()
        self.parada.clear()
        self.hilo = Thread(target=self._bucle, name="captura-tunel", daemon=True)
        self.hilo.start()

    def cerrar(self):
        self.parada.set()
        if self.hilo:
            self.hilo.join(timeout=10)
            if self.hilo.is_alive():
                raise RuntimeError("El capturador no ha terminado; no liberar su bloqueo")
        with self.bloqueo:
            self.controlador.apagar()
            self.recuperar_interrumpidas()
            self.activa_id = None

    def _bucle(self):
        while not self.parada.wait(self.intervalo):
            self.tick()

    def tick(self):
        with self.bloqueo:
            try:
                self.controlador.leer_estado()
                if self.error_pendiente:
                    with self.sesiones.begin() as sesion:
                        medicion = sesion.get(Medicion, self.error_pendiente)
                        if medicion and medicion.estado == EstadoMedicion.en_curso:
                            self.cerrar_registro(sesion, medicion, EstadoMedicion.error)
                            self.evento(sesion, medicion, "Captura interrumpida por fallo de almacenamiento; muestras confirmadas conservadas.", "error")
                    self.error_pendiente = None
                if self.activa_id is not None:
                    with self.sesiones.begin() as sesion:
                        medicion = sesion.get(Medicion, self.activa_id)
                        if not medicion or medicion.estado != EstadoMedicion.en_curso:
                            self.controlador.detener_medicion()
                            self.activa_id = None
                        else:
                            muestra = self.controlador.leer_muestra()
                            muestra.pop("fuente", None)
                            sesion.add(MuestraMedicion(medicion_id=medicion.id, **muestra))
                            medicion.duracion_segundos = max(0, int((muestra["instante"] - medicion.fecha_inicio).total_seconds()))
                self.programador.tick()
            except Exception:
                self.programador.fallar()
                self.error_pendiente = self.activa_id or self.error_pendiente
                self.activa_id = None
                self.controlador.apagar()
                logger.exception("Captura detenida: fallo al adquirir o guardar una muestra")

    def _estado(self, sesion, usuario_id, captura_id=None):
        estado = self.controlador.leer_estado()
        medicion = sesion.scalar(select(Medicion).join(Ensayo).where(
            Ensayo.usuario_id == usuario_id, Medicion.captura_clave.is_not(None),
            Medicion.id == captura_id if captura_id is not None else True,
        ).order_by(Medicion.id.desc()).limit(1))
        estado["captura"] = MedicionRespuesta.model_validate(medicion).model_dump() if medicion else None
        estado["total_muestras"] = sesion.scalar(select(func.count(MuestraMedicion.id)).where(
            MuestraMedicion.medicion_id == medicion.id)) if medicion else 0
        estado["error_captura"] = "No se pudo guardar; captura detenida. Recuperando el estado del registro." if self.error_pendiente else None
        estado["programa"] = self.programador.estado_usuario(sesion, usuario_id)
        return estado

    def estado(self, usuario_id, captura_id=None):
        with self.bloqueo, self.sesiones() as sesion:
            return self._estado(sesion, usuario_id, captura_id)

    def iniciar(self, usuario_id, datos, interno=False, programa=None):
        with self.bloqueo:
            if not interno:
                self.programador.exigir_control_manual()
            with self.sesiones.begin() as sesion:
                ensayo = sesion.get(Ensayo, datos.ensayo_id)
                if not ensayo or ensayo.usuario_id != usuario_id:
                    raise HTTPException(404, "Ensayo no encontrado")
                anterior = sesion.scalar(select(Medicion).where(Medicion.captura_clave == str(datos.clave)))
                if anterior:
                    if anterior.ensayo_id != ensayo.id:
                        raise HTTPException(409, "Esta clave pertenece a otra captura")
                    return self._estado(sesion, usuario_id, anterior.id)
                self.propietario(sesion, usuario_id)
                if self.activa_id or self.error_pendiente:
                    raise HTTPException(409, "Ya hay una captura activa o pendiente de recuperar")
                nombre = datos.nombre.strip() or "Medicion"
                exigir_nombre_medicion_disponible(sesion, ensayo.id, nombre)
                if sesion.scalar(select(func.count(Medicion.id)).where(Medicion.ensayo_id == ensayo.id)) >= configuracion.limite_mediciones_por_ensayo:
                    raise HTTPException(409, "Este ensayo ha alcanzado el limite de mediciones")
                estado = self.controlador.leer_estado()
                if not estado["encendido"]:
                    raise HTTPException(409, "Enciende el túnel antes de registrar")
                medicion = Medicion(ensayo_id=ensayo.id, nombre=nombre,
                    captura_clave=str(datos.clave), estado=EstadoMedicion.en_curso,
                    fecha_inicio=datetime.utcnow(), duracion_segundos=0,
                    potencia_objetivo=estado["potencia_objetivo"], velocidad_objetivo=estado["velocidad_objetivo_ms"],
                    fuente=estado["fuente"], calibracion_version=CALIBRACION["version"], programa=programa)
                sesion.add(medicion)
                sesion.flush()
                identificador = medicion.id
                muestra = self.controlador.leer_muestra()
                muestra.pop("fuente", None)
                sesion.add(MuestraMedicion(medicion_id=identificador, **muestra))
                self.evento(sesion, medicion, "Captura iniciada; adquisicion y guardado a cargo del servidor.")
            self.activa_id = identificador
            try:
                self.controlador.iniciar_medicion()
            except Exception:
                self.error_pendiente, self.activa_id = identificador, None
                raise
            return self.estado(usuario_id, identificador)

    def detener(self, usuario_id, medicion_id, interno=False):
        with self.bloqueo:
            if not interno:
                self.programador.exigir_control_manual()
            try:
                with self.sesiones.begin() as sesion:
                    medicion = sesion.scalar(select(Medicion).join(Ensayo).where(
                        Medicion.id == medicion_id, Ensayo.usuario_id == usuario_id,
                        Medicion.captura_clave.is_not(None)))
                    if not medicion:
                        raise HTTPException(404, "Captura no encontrada")
                    if medicion.estado == EstadoMedicion.en_curso:
                        self.propietario(sesion, usuario_id)
                        if self.error_pendiente:
                            raise HTTPException(503, "El guardado esta pendiente de recuperar")
                        if self.activa_id != medicion.id:
                            raise HTTPException(409, "La captura no esta activa en este servidor")
                        self.controlador.detener_medicion()
                        self.cerrar_registro(sesion, medicion)
                        self.evento(sesion, medicion, "Captura finalizada con las muestras confirmadas por el servidor.")
                if self.activa_id == medicion_id:
                    self.activa_id = None
            except HTTPException:
                raise
            except Exception:
                if self.activa_id == medicion_id:
                    self.error_pendiente, self.activa_id = medicion_id, None
                    self.controlador.apagar()
                raise
            return self.estado(usuario_id, medicion_id)

    def apagar(self, usuario_id, forzar=False):
        with self.bloqueo:
            with self.sesiones() as sesion:
                uso = sesion.get(UsoTunel, 1)
                propietario = uso.usuario_id if uso and uso.conectado else None
                if propietario is not None and propietario != usuario_id and not forzar:
                    raise HTTPException(409, "El tunel esta ocupado por otro usuario")
            self.programador.cancelar(propietario)
            self.controlador.apagar()
            if self.activa_id:
                self.detener(propietario, self.activa_id)
            with self.sesiones.begin() as sesion:
                uso = sesion.get(UsoTunel, 1)
                if uso:
                    uso.conectado, uso.usuario_id, uso.conectado_en = False, None, None
            return self.estado(usuario_id)

    def muestras(self, usuario_id, medicion_id, despues_de):
        with self.sesiones() as sesion:
            medicion = sesion.scalar(select(Medicion).join(Ensayo).where(
                Medicion.id == medicion_id, Ensayo.usuario_id == usuario_id))
            if not medicion:
                raise HTTPException(404, "Captura no encontrada")
            return [MuestraRespuesta.model_validate(m).model_dump() for m in sesion.scalars(
                select(MuestraMedicion).where(MuestraMedicion.medicion_id == medicion_id,
                    MuestraMedicion.id > despues_de).order_by(MuestraMedicion.id).limit(1000))]


def obtener_capturador(request: Request):
    capturador = getattr(request.app.state, "capturador", None)
    if capturador is None:
        raise HTTPException(503, "El capturador del servidor no esta disponible")
    return capturador
