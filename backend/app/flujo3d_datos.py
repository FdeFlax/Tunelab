"""Contrato acotado del flujo docente: triángulos float32 LE, ya orientados, en cm."""
import math
import sys
import base64
import binascii
import hashlib
import json
from array import array
from app.configuracion_tunel import TUNEL, parametros_flujo

FLUJO = parametros_flujo(TUNEL)

def identificar_modelo(parametros=FLUJO):
    return "xlb-031-smagorinsky-v6-" + hashlib.sha256(json.dumps(parametros, sort_keys=True).encode()).hexdigest()[:16]


MODELO = identificar_modelo()
MAX_BYTES = 200_000 * 9 * 4
PASOS = FLUJO['pasos']
MALLA = tuple(FLUJO['malla'])
PASO_CM = FLUJO['pasoCm']
SECCION_CM = FLUJO['seccionCm']
ORIGEN_CM = FLUJO['origenCm']
VELOCIDAD_RED_BASE = FLUJO['velocidadRedBase']
AIRE = FLUJO['aire']
# Viscosidad estimada con T, p y humedad, convertida a unidades de red.
VISCOSIDAD = FLUJO['viscosidadRed']
FORMATO_CAMPO = "rapidez-f32le-xyz-v1"
BYTES_CAMPO = math.prod(MALLA) * 4
MAX_RESULTADO_BYTES = 4 * ((BYTES_CAMPO + 2) // 3) + 300_000


def validar_geometria(datos):
    if not 4 * 9 * 4 <= len(datos) <= MAX_BYTES or len(datos) % 36:
        raise ValueError("Envía una superficie triangulada de hasta 200.000 triángulos.")
    valores = array("f")
    valores.frombytes(datos)
    if sys.byteorder != "little":
        valores.byteswap()
    if not all(math.isfinite(v) for v in valores):
        raise ValueError("El objeto tiene coordenadas no válidas.")
    limites = [(min(valores[i::3]), max(valores[i::3])) for i in range(3)]
    if any(abs(a + b) > 0.001 for a, b in limites):
        raise ValueError("El objeto debe estar centrado en la sección de ensayo.")
    medidas = [b - a for a, b in limites]
    minimo, maximos = FLUJO['minimoObjetoCm'], FLUJO['maximosObjetoCm']
    if any(d < minimo or d > maximo for d, maximo in zip(medidas, maximos)):
        limites = ', '.join(f'{eje}: entre {minimo:g} y {maximo:g} cm' for eje, maximo in zip(('longitud', 'altura', 'ancho'), maximos))
        raise ValueError(f"Para esta malla, {limites}. Ajusta el tamaño o el giro.")
    return medidas


def validar_resultado(datos, parametros=FLUJO):
    """No publicar campos parciales, no finitos o de un contrato diferente."""
    if datos.get("modelo") != identificar_modelo(parametros) or datos.get("pasos") != parametros['pasos']:
        raise ValueError("El motor no ha devuelto un resultado completo.")
    campo = datos.get("volumen", {})
    if (campo.get("formato") != FORMATO_CAMPO or campo.get("malla") != list(MALLA)
            or campo.get("origen_cm") != ORIGEN_CM or campo.get("paso_cm") != PASO_CM):
        raise ValueError("El volumen no tiene las dimensiones o el formato esperados.")
    codificado = campo.get("datos")
    if not isinstance(codificado, str) or len(codificado) != 4 * ((BYTES_CAMPO + 2) // 3):
        raise ValueError("El volumen está incompleto.")
    try:
        raw = base64.b64decode(codificado, validate=True)
    except (ValueError, binascii.Error) as error:
        raise ValueError("El volumen no está bien codificado.") from error
    if len(raw) != BYTES_CAMPO:
        raise ValueError("El volumen está incompleto.")
    valores = array("f")
    valores.frombytes(raw)
    if sys.byteorder != "little":
        valores.byteswap()
    if any(not math.isfinite(v) or (v != -1 and not 0 <= v <= 15) for v in valores):
        raise ValueError("El volumen contiene valores inválidos.")
    return datos
