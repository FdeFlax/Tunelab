from app.configuracion_tunel import TUNEL

from dataclasses import asdict, dataclass
from datetime import datetime
from threading import Lock

SECCION = TUNEL["geometria"]["seccionEnsayo"]
SIMULADOR = TUNEL["simulador"]
AMBIENTE = TUNEL["ambiente"]
AREA_SECCION_ENSAYO_M2 = SECCION["anchoM"] * SECCION["altoM"]
CALIBRACION = TUNEL["calibracion"]
DENSIDAD_AIRE = (AMBIENTE["densidadReferenciaKgM3"] if AMBIENTE["usarDensidadConstante"] else
                AMBIENTE["presionAtmosfericaPa"] / (AMBIENTE["constanteGasAireJKgK"] * (AMBIENTE["temperaturaC"] + 273.15)))


def calcular_velocidad_por_potencia(potencia: float) -> float:
    consigna = max(0.0, min(100.0, float(potencia or 0)))
    puntos = CALIBRACION["velocidad"]["puntos"]
    if consigna <= puntos[0]["consignaPct"]:
        return puntos[0]["velocidadMs"]
    for izquierda, derecha in zip(puntos, puntos[1:]):
        if consigna <= derecha["consignaPct"]:
            factor = (consigna - izquierda["consignaPct"]) / (derecha["consignaPct"] - izquierda["consignaPct"])
            return izquierda["velocidadMs"] + factor * (derecha["velocidadMs"] - izquierda["velocidadMs"])
    return puntos[-1]["velocidadMs"]


@dataclass
class EstadoTunel:
    conectado_fisico: bool
    encendido: bool
    midiendo: bool
    potencia_objetivo: float
    potencia_aplicada: float
    velocidad_ms: float
    temperatura_c: float
    frecuencia_hz: float
    corriente_a: float
    rpm: int
    fuente: str
    actualizado_en: datetime
    velocidad_objetivo_ms: float = 0
    estabilidad_segundos: float = 0
    flujo_estable: bool = False
    tiempo_funcionamiento_segundos: int = 0


class ControladorTunelSimulado:
    def __init__(self):
        self._bloqueo = Lock()
        self._estable_desde = None
        self._inicio_marcha = None
        self._estado = EstadoTunel(
            conectado_fisico=True,
            encendido=False,
            midiendo=False,
            potencia_objetivo=SIMULADOR["consignaInicialPct"],
            potencia_aplicada=0,
            velocidad_ms=0,
            temperatura_c=SIMULADOR["temperaturaInicialC"],
            frecuencia_hz=0,
            corriente_a=0,
            rpm=0,
            fuente="simulado",
            actualizado_en=datetime.utcnow(),
        )

    def leer_estado(self) -> dict:
        with self._bloqueo:
            self._actualizar_lecturas()
            return asdict(self._estado)

    def aplicar_consigna(self, potencia_porcentaje: float) -> dict:
        with self._bloqueo:
            potencia = self._limitar_potencia(potencia_porcentaje)
            if potencia != self._estado.potencia_objetivo:
                self._estable_desde = None
            self._estado.potencia_objetivo = potencia

            # En simulacion no saltamos directamente a la potencia objetivo:
            # se aproxima con una rampa para parecerse al arranque del variador.
            self._actualizar_lecturas()
            return asdict(self._estado)

    def encender(self, potencia_porcentaje: float | None = None) -> dict:
        with self._bloqueo:
            if not self._estado.encendido:
                self._inicio_marcha = datetime.utcnow()
            if potencia_porcentaje is not None:
                self._estado.potencia_objetivo = self._limitar_potencia(potencia_porcentaje)

            self._estable_desde = None
            self._estado.encendido = True
            self._actualizar_lecturas()
            return asdict(self._estado)

    def apagar(self) -> dict:
        with self._bloqueo:
            self._estado.encendido = False
            self._estado.midiendo = False
            # No forzamos la potencia aplicada a cero: el variador simulado
            # la reduce con la misma rampa que usa al acelerar.
            self._actualizar_lecturas()
            return asdict(self._estado)

    def iniciar_medicion(self) -> dict:
        with self._bloqueo:
            if not self._estado.encendido:
                raise RuntimeError("El tunel debe estar encendido antes de medir")

            self._estado.midiendo = True
            self._actualizar_lecturas()
            return asdict(self._estado)

    def detener_medicion(self) -> dict:
        with self._bloqueo:
            self._estado.midiendo = False
            self._actualizar_lecturas()
            return asdict(self._estado)

    def leer_muestra(self) -> dict:
        with self._bloqueo:
            self._actualizar_lecturas()
            return {
                "instante": self._estado.actualizado_en,
                "velocidad_ms": self._estado.velocidad_ms,
                "temperatura_c": self._estado.temperatura_c,
                "potencia_porcentaje": self._estado.potencia_aplicada,
                "consigna_objetivo": self._estado.potencia_objetivo,
                "flujo_estable": self._estado.flujo_estable,
                "frecuencia_hz": self._estado.frecuencia_hz,
                "corriente_a": self._estado.corriente_a,
                "rpm": self._estado.rpm,
                "fuente": self._estado.fuente,
                "presion_pa": round(0.5 * DENSIDAD_AIRE * self._estado.velocidad_ms ** 2, 4),
                "caudal_m3s": round(AREA_SECCION_ENSAYO_M2 * self._estado.velocidad_ms, 4),
            }

    def _actualizar_lecturas(self) -> None:
        ahora = datetime.utcnow()
        delta_seg = max(0.0, (ahora - self._estado.actualizado_en).total_seconds())
        objetivo = self._estado.potencia_objetivo if self._estado.encendido else 0
        paso_maximo = SIMULADOR["rampaPctPorSegundo"] * delta_seg

        if self._estado.potencia_aplicada < objetivo:
            self._estado.potencia_aplicada = min(objetivo, self._estado.potencia_aplicada + paso_maximo)
        elif self._estado.potencia_aplicada > objetivo:
            self._estado.potencia_aplicada = max(objetivo, self._estado.potencia_aplicada - paso_maximo)

        potencia = self._estado.potencia_aplicada
        self._estado.frecuencia_hz = round((potencia / 100) * SIMULADOR["frecuenciaMaximaHz"], 1)
        self._estado.velocidad_ms = round(calcular_velocidad_por_potencia(potencia), 3)
        self._estado.temperatura_c = round(SIMULADOR["temperaturaInicialC"] + potencia * SIMULADOR["aumentoTemperaturaPorPct"], 1)
        self._estado.corriente_a = round((self._estado.frecuencia_hz / SIMULADOR["frecuenciaMaximaHz"]) * SIMULADOR["corrienteMaximaA"], 1)
        self._estado.rpm = round((self._estado.frecuencia_hz / SIMULADOR["frecuenciaMaximaHz"]) * SIMULADOR["rpmMaximas"])
        self._estado.velocidad_objetivo_ms = calcular_velocidad_por_potencia(self._estado.potencia_objetivo)
        estable = self._estado.encendido and self._estado.velocidad_objetivo_ms > 0 and abs(
            self._estado.velocidad_ms - self._estado.velocidad_objetivo_ms
        ) <= CALIBRACION["toleranciaEstabilidadMs"]
        self._estable_desde = (self._estable_desde or ahora) if estable else None
        self._estado.estabilidad_segundos = max(0, (ahora - self._estable_desde).total_seconds()) if estable else 0
        self._estado.flujo_estable = self._estado.estabilidad_segundos >= CALIBRACION["segundosEstabilidadRequeridos"]
        if self._estado.encendido and self._inicio_marcha:
            self._estado.tiempo_funcionamiento_segundos = max(0, int((ahora - self._inicio_marcha).total_seconds()))
        self._estado.actualizado_en = ahora

    @staticmethod
    def _limitar_potencia(valor: float) -> float:
        return max(0, min(100, round(float(valor), 1)))


controlador_tunel = ControladorTunelSimulado()
