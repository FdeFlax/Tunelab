"""Secuencias ejecutadas por el capturador, independientes del navegador."""
from datetime import datetime
from uuid import uuid5

from fastapi import HTTPException
from sqlalchemy import func, select

from app.configuracion import configuracion
from app.control_tunel import CALIBRACION
from app.datos_api import CapturaIniciar
from app.datos_programa import ESTADOS_ACTIVOS, describir_programa
from app.ensayos import exigir_nombre_medicion_disponible
from app.tablas import Ensayo, Medicion, ProgramaEtapas


class ProgramadorEtapas:
    def __init__(self, capturador):
        self.capturador = capturador
        self.activo_id = None
        self.error_pendiente = None

    def exigir_control_manual(self):
        if self.activo_id or self.error_pendiente:
            raise HTTPException(409, "Detén el programa por etapas antes de operar manualmente.")

    @staticmethod
    def ensayo_propio(sesion, usuario_id, ensayo_id):
        ensayo = sesion.get(Ensayo, ensayo_id)
        if not ensayo or ensayo.usuario_id != usuario_id:
            raise HTTPException(404, "Ensayo no encontrado")
        return ensayo

    def consultar(self, usuario_id, ensayo_id):
        with self.capturador.bloqueo, self.capturador.sesiones() as sesion:
            self.ensayo_propio(sesion, usuario_id, ensayo_id)
            programa = sesion.scalar(select(ProgramaEtapas).where(ProgramaEtapas.ensayo_id == ensayo_id))
            return describir_programa(programa) if programa else None

    def estado_usuario(self, sesion, usuario_id):
        programa = sesion.scalar(select(ProgramaEtapas).join(Ensayo).where(
            Ensayo.usuario_id == usuario_id, ProgramaEtapas.clave.is_not(None)
        ).order_by(ProgramaEtapas.iniciado_en.desc()).limit(1))
        return describir_programa(programa) if programa else None

    def guardar(self, usuario_id, ensayo_id, datos):
        with self.capturador.bloqueo, self.capturador.sesiones.begin() as sesion:
            self.ensayo_propio(sesion, usuario_id, ensayo_id)
            programa = sesion.scalar(select(ProgramaEtapas).where(ProgramaEtapas.ensayo_id == ensayo_id))
            if programa and (programa.estado in ESTADOS_ACTIVOS or programa.id == self.error_pendiente):
                raise HTTPException(409, "El programa está en curso; detén la secuencia antes de editarla.")
            if not programa:
                programa = ProgramaEtapas(ensayo_id=ensayo_id)
                sesion.add(programa)
            for campo, valor in datos.model_dump().items():
                setattr(programa, campo, valor)
            programa.estado, programa.clave = "borrador", None
            programa.indice_etapa, programa.mediciones = 0, []
            programa.fase_desde = programa.iniciado_en = programa.finalizado_en = None
            programa.mensaje = None
            sesion.flush()
            return describir_programa(programa)

    def iniciar(self, usuario_id, datos):
        capturador = self.capturador
        with capturador.bloqueo:
            with capturador.sesiones.begin() as sesion:
                self.ensayo_propio(sesion, usuario_id, datos.ensayo_id)
                programa = sesion.scalar(select(ProgramaEtapas).where(ProgramaEtapas.ensayo_id == datos.ensayo_id))
                if not programa:
                    raise HTTPException(409, "Guarda las etapas antes de iniciar el programa.")
                # Un reintento de la misma orden nunca vuelve a ejecutar la secuencia.
                if programa.clave == str(datos.clave):
                    return describir_programa(programa)
                self.exigir_control_manual()
                capturador.propietario(sesion, usuario_id)
                if capturador.activa_id or capturador.error_pendiente:
                    raise HTTPException(409, "Finaliza la medición actual antes de iniciar el programa.")
                exigir_nombre_medicion_disponible(sesion, datos.ensayo_id, programa.nombre)
                estado = capturador.controlador.leer_estado()
                if not estado["encendido"] and not datos.encender:
                    raise HTTPException(409, "Enciende el túnel antes de iniciar el programa.")
                if estado["fuente"] != "simulado":
                    raise HTTPException(409, "La programación está disponible para el simulador del servidor.")
                total = sesion.scalar(select(func.count(Medicion.id)).where(Medicion.ensayo_id == datos.ensayo_id))
                if total + 1 > configuracion.limite_mediciones_por_ensayo:
                    raise HTTPException(409, "No queda espacio para la medición del programa en este ensayo. Crea otro ensayo.")
                programa.clave, programa.estado = str(datos.clave), "estabilizando"
                programa.indice_etapa, programa.mediciones = 0, []
                programa.iniciado_en = programa.fase_desde = datetime.utcnow()
                programa.finalizado_en, programa.mensaje = None, None
                identificador, consigna = programa.id, programa.etapas[0]["consigna"]
                snapshot = {
                    "nombre": programa.nombre, "version": 2,
                    "criterio_estabilidad": {
                        "tolerancia_ms": CALIBRACION["toleranciaEstabilidadMs"],
                        "segundos": CALIBRACION["segundosEstabilidadRequeridos"],
                    },
                    "etapas": [{**e, "estado": "estabilizando" if i == 0 else "pendiente",
                                "cambio_segundo": 0 if i == 0 else None,
                                "inicio_segundo": None, "fin_segundo": None, "tramos_estables": []}
                               for i, e in enumerate(programa.etapas)],
                }
            self.activo_id = identificador
            try:
                if not estado["encendido"]:
                    capturador.controlador.encender(0)
                capturador.controlador.aplicar_consigna(consigna)
                captura = CapturaIniciar(ensayo_id=datos.ensayo_id,
                    clave=uuid5(datos.clave, "medicion"), nombre=snapshot["nombre"])
                respuesta = capturador.iniciar(usuario_id, captura, interno=True, programa=snapshot)
                self._actualizar(identificador, mediciones=[respuesta["captura"]["id"]])
            except Exception:
                self.fallar()
                raise
            return self.consultar(usuario_id, datos.ensayo_id)

    def _actualizar(self, identificador, **cambios):
        with self.capturador.sesiones.begin() as sesion:
            programa = sesion.get(ProgramaEtapas, identificador)
            if not programa:
                raise RuntimeError("El programa en ejecución ya no existe.")
            for campo, valor in cambios.items():
                setattr(programa, campo, valor)

    def detener(self, usuario_id, datos):
        with self.capturador.bloqueo:
            programa = self.consultar(usuario_id, datos.ensayo_id)
            if not programa or programa["clave"] != str(datos.clave):
                raise HTTPException(409, "La ejecución ha cambiado; actualiza su estado antes de detenerla.")
            if programa["activo"]:
                with self.capturador.sesiones() as sesion:
                    self.capturador.propietario(sesion, usuario_id)
                if programa["id"] != self.activo_id:
                    raise HTTPException(409, "El programa está pendiente de recuperación.")
                self.cancelar(usuario_id)
            return self.consultar(usuario_id, datos.ensayo_id)

    def cancelar(self, usuario_id):
        if not self.activo_id:
            return
        capturador = self.capturador
        capturador.controlador.apagar()
        try:
            hay_medicion = bool(capturador.activa_id)
            if capturador.activa_id:
                capturador.detener(usuario_id, capturador.activa_id, interno=True)
            self._actualizar(self.activo_id, estado="detenido", finalizado_en=datetime.utcnow(),
                             mensaje="Programa detenido. La medición parcial se conserva en Registro."
                             if hay_medicion else "Programa detenido antes de iniciar la medición.")
            self.activo_id = None
        except Exception:
            self.fallar()
            raise

    def fallar(self):
        self.error_pendiente = self.activo_id or self.error_pendiente
        self.activo_id = None
        if self.capturador.activa_id:
            self.capturador.error_pendiente = self.capturador.activa_id
            self.capturador.activa_id = None
        self.capturador.controlador.apagar()

    def recuperar_interrumpidos(self, sesion):
        for programa in sesion.scalars(select(ProgramaEtapas).where(ProgramaEtapas.estado.in_(ESTADOS_ACTIVOS))):
            programa.estado, programa.finalizado_en = "error", datetime.utcnow()
            programa.mensaje = "Programa interrumpido por parada o reinicio del servidor. Revisa la medición conservada."
        self.activo_id = self.error_pendiente = None

    def tick(self):
        capturador = self.capturador
        if self.error_pendiente:
            self._actualizar(self.error_pendiente, estado="error", finalizado_en=datetime.utcnow(),
                mensaje="Programa interrumpido: no se pudo completar una etapa. Revisa la medición conservada.")
            self.error_pendiente = None
        if not self.activo_id:
            return
        with capturador.sesiones() as sesion:
            programa = sesion.get(ProgramaEtapas, self.activo_id)
            datos = describir_programa(programa)
            usuario_id = sesion.get(Ensayo, programa.ensayo_id).usuario_id
            capturador.propietario(sesion, usuario_id)
        estado = capturador.controlador.leer_estado()
        if not estado["encendido"]:
            raise RuntimeError("El túnel se ha apagado durante el programa.")
        indice = datos["indice_etapa"]
        etapa = datos["etapas"][indice]
        identificador = datos["mediciones"][0]
        if capturador.activa_id != identificador:
            raise RuntimeError("La medición del programa ya no está activa.")
        with capturador.sesiones() as sesion:
            medicion = sesion.get(Medicion, identificador)
            segundo = max(0, (datetime.utcnow() - medicion.fecha_inicio).total_seconds())
            cambio = medicion.programa["etapas"][indice]["cambio_segundo"]
        if segundo - cambio > etapa["duracion_segundos"] + 120:
            raise RuntimeError("No se ha completado el tramo estable en el tiempo previsto.")
        if datos["estado"] == "estabilizando":
            if not estado["flujo_estable"]:
                return
            self._actualizar(self.activo_id, estado="registrando", fase_desde=datetime.utcnow())
            with capturador.sesiones.begin() as sesion:
                medicion = sesion.get(Medicion, identificador)
                snapshot = medicion.programa
                etapas = [dict(e) for e in snapshot["etapas"]]
                etapas[indice].update(estado="registrando",
                    inicio_segundo=etapas[indice]["inicio_segundo"] if etapas[indice]["inicio_segundo"] is not None else segundo,
                    tramos_estables=[*etapas[indice]["tramos_estables"], {"inicio": segundo, "fin": None}])
                medicion.programa = {**snapshot, "etapas": etapas}
                capturador.evento(sesion, medicion,
                    f'Etapa {indice + 1}/{len(datos["etapas"])} iniciada: {etapa["consigna"]:g}%, registro de {etapa["duracion_segundos"]} s tras estabilizar.')
        elif datos["estado"] == "registrando":
            if not estado["flujo_estable"]:
                with capturador.sesiones.begin() as sesion:
                    medicion = sesion.get(Medicion, identificador)
                    etapas = [dict(e) for e in medicion.programa["etapas"]]
                    tramos = [dict(t) for t in etapas[indice]["tramos_estables"]]
                    tramos[-1]["fin"] = segundo
                    etapas[indice].update(estado="estabilizando", tramos_estables=tramos)
                    medicion.programa = {**medicion.programa, "etapas": etapas}
                self._actualizar(self.activo_id, estado="estabilizando", fase_desde=datetime.utcnow())
                return
            if datos["segundos_etapa"] < etapa["duracion_segundos"]:
                return
            with capturador.sesiones.begin() as sesion:
                medicion = sesion.get(Medicion, capturador.activa_id)
                etapas = [dict(e) for e in medicion.programa["etapas"]]
                etapas[indice].update(estado="completada",
                    fin_segundo=segundo,
                    tramos_estables=[{**t, "fin": segundo} if t["fin"] is None else t
                                    for t in etapas[indice]["tramos_estables"]])
                if indice + 1 < len(etapas):
                    etapas[indice + 1].update(estado="estabilizando", cambio_segundo=segundo)
                medicion.programa = {**medicion.programa, "etapas": etapas}
                capturador.evento(sesion, medicion,
                    f'Etapa {indice + 1}/{len(datos["etapas"])} finalizada: {etapa["consigna"]:g}%.')
            if indice + 1 == len(datos["etapas"]):
                capturador.detener(usuario_id, capturador.activa_id, interno=True)
                capturador.controlador.apagar()
                self._actualizar(self.activo_id, estado="completado", finalizado_en=datetime.utcnow(),
                    mensaje="Todas las etapas están en una medición de Registro. Túnel apagado.")
                self.activo_id = None
            else:
                capturador.controlador.aplicar_consigna(datos["etapas"][indice + 1]["consigna"])
                self._actualizar(self.activo_id, estado="estabilizando", indice_etapa=indice + 1,
                                 fase_desde=datetime.utcnow())
