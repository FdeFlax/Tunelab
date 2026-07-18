from dataclasses import asdict, dataclass
from datetime import datetime
from threading import Lock

ANCHO_SECCION_ENSAYO_M = 0.70
ALTO_SECCION_ENSAYO_M = 0.70
AREA_SECCION_ENSAYO_M2 = ANCHO_SECCION_ENSAYO_M * ALTO_SECCION_ENSAYO_M
VELOCIDAD_MAXIMA_MEDIDA_MS = 11.119
CAUDAL_MAXIMO_CAPADO_M3S = AREA_SECCION_ENSAYO_M2 * VELOCIDAD_MAXIMA_MEDIDA_MS
EXPONENTE_CAUDAL_VARIADOR = 1.111


def calcular_velocidad_por_potencia(potencia: float) -> float:
    # En la app, potencia representa la consigna del variador/frecuencia.
    # Por leyes de ventiladores, el caudal es aproximadamente proporcional a las RPM.
    consigna = max(0.0, min(100.0, float(potencia or 0)))
    factor_variador = consigna / 100.0
    factor_caudal = factor_variador ** EXPONENTE_CAUDAL_VARIADOR
    caudal_m3s = CAUDAL_MAXIMO_CAPADO_M3S * factor_caudal
    return caudal_m3s / AREA_SECCION_ENSAYO_M2 if AREA_SECCION_ENSAYO_M2 > 0 else 0.0


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


class ControladorTunelSimulado:
    def __init__(self):
        self._bloqueo = Lock()
        self._estado = EstadoTunel(
            conectado_fisico=True,
            encendido=False,
            midiendo=False,
            potencia_objetivo=10,
            potencia_aplicada=0,
            velocidad_ms=0,
            temperatura_c=21.2,
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
            self._estado.potencia_objetivo = potencia

            # En simulacion no saltamos directamente a la potencia objetivo:
            # se aproxima con una rampa para parecerse al arranque del variador.
            self._actualizar_lecturas()
            return asdict(self._estado)

    def encender(self, potencia_porcentaje: float | None = None) -> dict:
        with self._bloqueo:
            if potencia_porcentaje is not None:
                self._estado.potencia_objetivo = self._limitar_potencia(potencia_porcentaje)

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
                "frecuencia_hz": self._estado.frecuencia_hz,
                "corriente_a": self._estado.corriente_a,
                "rpm": self._estado.rpm,
                "fuente": self._estado.fuente,
            }

    def _actualizar_lecturas(self) -> None:
        ahora = datetime.utcnow()
        delta_seg = max(0.0, (ahora - self._estado.actualizado_en).total_seconds())
        objetivo = self._estado.potencia_objetivo if self._estado.encendido else 0
        paso_maximo = 20.0 * delta_seg  # 0 a 100% en unos 5 segundos.

        if self._estado.potencia_aplicada < objetivo:
            self._estado.potencia_aplicada = min(objetivo, self._estado.potencia_aplicada + paso_maximo)
        elif self._estado.potencia_aplicada > objetivo:
            self._estado.potencia_aplicada = max(objetivo, self._estado.potencia_aplicada - paso_maximo)

        potencia = self._estado.potencia_aplicada
        self._estado.frecuencia_hz = round((potencia / 100) * 50, 1)
        self._estado.velocidad_ms = round(calcular_velocidad_por_potencia(potencia), 3)
        self._estado.temperatura_c = round(21.2 + potencia * 0.035, 1)
        self._estado.corriente_a = round((self._estado.frecuencia_hz / 50) * 12, 1)
        self._estado.rpm = round((self._estado.frecuencia_hz / 50) * 3000)
        self._estado.actualizado_en = ahora

    @staticmethod
    def _limitar_potencia(valor: float) -> float:
        return max(0, min(100, round(float(valor), 1)))


controlador_tunel = ControladorTunelSimulado()
