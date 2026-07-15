from dataclasses import asdict, dataclass
from datetime import datetime
from threading import Lock


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
            potencia_objetivo=0,
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

            # En simulacion aplicamos la potencia directamente.
            # En el tunel real aqui se enviaria la consigna al variador.
            if self._estado.encendido:
                self._estado.potencia_aplicada = potencia

            self._actualizar_lecturas()
            return asdict(self._estado)

    def encender(self, potencia_porcentaje: float | None = None) -> dict:
        with self._bloqueo:
            if potencia_porcentaje is not None:
                self._estado.potencia_objetivo = self._limitar_potencia(potencia_porcentaje)

            self._estado.encendido = True
            self._estado.potencia_aplicada = self._estado.potencia_objetivo
            self._actualizar_lecturas()
            return asdict(self._estado)

    def apagar(self) -> dict:
        with self._bloqueo:
            self._estado.encendido = False
            self._estado.midiendo = False
            self._estado.potencia_aplicada = 0
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
        potencia = self._estado.potencia_aplicada if self._estado.encendido else 0
        self._estado.velocidad_ms = round(potencia * 0.23, 2)
        self._estado.temperatura_c = round(21.2 + potencia * 0.035, 1)
        self._estado.frecuencia_hz = round(potencia * 0.5, 1)
        self._estado.corriente_a = round(potencia * 0.12, 1)
        self._estado.rpm = round(potencia * 30)
        self._estado.actualizado_en = datetime.utcnow()

    @staticmethod
    def _limitar_potencia(valor: float) -> float:
        return max(0, min(100, round(float(valor), 1)))


controlador_tunel = ControladorTunelSimulado()
