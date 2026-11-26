"""Datos comunes al simulador, XLB y la web. Se leen una vez al arrancar."""
import json
import math
from pathlib import Path
from functools import lru_cache
from typing import Annotated
from pydantic import BaseModel, Field, TypeAdapter, ValidationError

RUTA_TUNEL = Path(__file__).resolve().parents[2] / "shared/tunel.json"


class MedicionAire(BaseModel):
    id: str = Field(min_length=1)
    velocidadMs: float = Field(ge=0, allow_inf_nan=False)
    velocidadMediaMs: float = Field(ge=0, allow_inf_nan=False)
    temperaturaC: float = Field(ge=0, le=60)
    presionAbsolutaPa: float = Field(ge=30000, le=120000)
    humedadRelativaPct: float = Field(ge=0, le=100)
    consignaPct: float = Field(ge=0, le=100, allow_inf_nan=False)


@lru_cache(maxsize=64)
def esquema_numero(minimo, maximo, entero):
    return TypeAdapter(Annotated[float, Field(strict=True, allow_inf_nan=False,
        ge=minimo, le=maximo, multiple_of=1 if entero else None)])


def validar_configuracion(c, incluir_aerodinamica=False):
    def numero(ruta, minimo=0, maximo=math.inf, entero=False):
        try:
            n = c
            for key in ruta.split('.'):
                n = n[int(key)] if isinstance(n, list) else n[key]
            esquema_numero(minimo, maximo, entero).validate_python(n)
        except (KeyError, IndexError, TypeError, ValueError):
            raise ValueError(f"shared/tunel.json: revisa {ruta}.") from None
        return n

    def positivo(ruta):
        return numero(ruta, minimo=1e-300)

    numero('version', 1, entero=True)
    for tramo in ('seccionEnsayo', 'camaraEstabilizacion'):
        for eje in ('longitudM', 'altoM', 'anchoM'):
            positivo(f'geometria.{tramo}.{eje}')
    positivo('geometria.contraccion.longitudM')
    for eje in ('longitudM', 'altoM', 'anchoM'):
        positivo(f'geometria.difusor.envolvente.{eje}')
    numero('ambiente.temperaturaC', -273.149)
    for key in ('presionAtmosfericaPa', 'constanteGasAireJKgK', 'viscosidadDinamicaPaS', 'densidadReferenciaKgM3'):
        positivo(f'ambiente.{key}')
    if type(c['ambiente']['usarDensidadConstante']) is not bool:
        raise ValueError('shared/tunel.json: usarDensidadConstante debe ser true o false.')
    numero('sensor.visualizacion.decimalesCaudal', 0, 10, entero=True)
    numero('sensor.intervaloCapturaSegundos', 0.1, 10)
    for key in ('toleranciaVelocidadDetenidoMs', 'toleranciaConsignaDetenidoPct'):
        numero(f'modelo.{key}')
    numero('calibracion.version', 1, entero=True)
    positivo('calibracion.toleranciaEstabilidadMs')
    positivo('calibracion.segundosEstabilidadRequeridos')
    curva = c['calibracion'].get('velocidad', {})
    puntos = curva.get('puntos')
    if (curva.get('metodo') != 'interpolacion_lineal_por_tramos' or curva.get('extrapolacion') != 'limitar_a_extremos'
            or not isinstance(puntos, list) or len(puntos) < 2):
        raise ValueError('shared/tunel.json: curva de calibración no compatible.')
    for i, p in enumerate(puntos):
        numero(f'calibracion.velocidad.puntos.{i}.consignaPct', 0, 100)
        numero(f'calibracion.velocidad.puntos.{i}.velocidadMs')
        if i and p['consignaPct'] <= puntos[i - 1]['consignaPct']:
            raise ValueError('shared/tunel.json: ordena las consignas de menor a mayor, sin repetirlas.')
    numero('simulador.temperaturaInicialC', -273.149)
    numero('simulador.consignaInicialPct', 0, 100)
    rapidas = c['simulador'].get('consignasRapidasPct')
    if not isinstance(rapidas, list) or not 1 <= len(rapidas) <= 8:
        raise ValueError('shared/tunel.json: revisa simulador.consignasRapidasPct.')
    for i in range(len(rapidas)):
        numero(f'simulador.consignasRapidasPct.{i}', 0, 100)
    if len(set(rapidas)) != len(rapidas):
        raise ValueError('shared/tunel.json: no repitas consignas rapidas.')
    numero('simulador.aumentoTemperaturaPorPct')
    for key in ('rampaPctPorSegundo', 'frecuenciaMaximaHz', 'corrienteMaximaA', 'rpmMaximas'):
        positivo(f'simulador.{key}')
    if not incluir_aerodinamica:
        return c
    a = c['aerodinamica']
    positivo('aerodinamica.pasoCm')
    numero('aerodinamica.pasos', 1, 100000, entero=True)
    numero('aerodinamica.velocidadRedBase', 1e-300, 0.299)
    lecturas = a.get('mediciones')
    if not isinstance(lecturas, list) or not lecturas:
        raise ValueError('shared/tunel.json: faltan las mediciones de la sección.')
    try:
        TypeAdapter(list[MedicionAire]).validate_python(lecturas, strict=True)
    except ValidationError as error:
        raise ValueError(f"shared/tunel.json: mediciones inválidas: {error}") from error
    ids = {lectura['id'] for lectura in lecturas}
    if len(ids) != len(lecturas):
        raise ValueError('shared/tunel.json: cada medición debe tener un id distinto.')
    if a.get('medicionActiva') not in ids:
        raise ValueError('shared/tunel.json: medicionActiva debe identificar una lectura existente.')
    curva = sorted(lecturas, key=lambda m: m['consignaPct'])
    if len(curva) < 2 or any(d['consignaPct'] <= i['consignaPct'] or d['velocidadMs'] < i['velocidadMs']
                             for i, d in zip(curva, curva[1:])):
        raise ValueError('shared/tunel.json: revisa la curva de velocidad de Aerodinámica; las consignas deben ser únicas y la velocidad no decreciente.')
    numero('aerodinamica.objeto.minimoCeldas', 2, entero=True)
    numero('aerodinamica.objeto.separacionParedCeldas', 2, entero=True)
    positivo('aerodinamica.objeto.maximoCm')
    numero('aerodinamica.bloqueoMaximo', 1e-300, 0.25)
    return c


def propiedades_aire(lectura):
    """Mezcla ideal húmeda y Sutherland para μ del aire. Referencias en docs/FLUJO_3D.md."""
    t, p = lectura['temperaturaC'], lectura['presionAbsolutaPa']
    kelvin = t + 273.15
    presion_hpa = p / 100
    factor = 1.0016 + 3.15e-6 * presion_hpa - 0.074 / presion_hpa
    vapor = lectura['humedadRelativaPct'] / 100 * factor * 611.2 * math.exp(17.62 * t / (243.12 + t))
    densidad = ((p - vapor) / 287.05 + vapor / 461.5) / kelvin
    viscosidad = 1.458e-6 * kelvin ** 1.5 / (kelvin + 110.4)
    return dict(densidadKgM3=densidad, viscosidadDinamicaPaS=viscosidad,
                viscosidadCinematicaM2s=viscosidad / densidad)


def interpolar_velocidad(consigna, puntos):
    """Interpolación por tramos; fuera de la curva se conserva el extremo más cercano."""
    if consigna <= puntos[0]['consignaPct']:
        return puntos[0]['velocidadMs']
    for izquierda, derecha in zip(puntos, puntos[1:]):
        if consigna <= derecha['consignaPct']:
            factor = (consigna - izquierda['consignaPct']) / (derecha['consignaPct'] - izquierda['consignaPct'])
            return izquierda['velocidadMs'] + factor * (derecha['velocidadMs'] - izquierda['velocidadMs'])
    return puntos[-1]['velocidadMs']


def parametros_flujo(c, consigna=None):
    validar_configuracion(c, incluir_aerodinamica=True)
    a, s = c['aerodinamica'], c['geometria']['seccionEnsayo']
    seccion = [round(s[key] * 100, 8) for key in ('longitudM', 'altoM', 'anchoM')]
    celdas = [n / a['pasoCm'] for n in seccion]
    if any(abs(n - round(n)) > 1e-7 for n in celdas):
        raise ValueError('shared/tunel.json: las dimensiones deben ser múltiplos de pasoCm.')
    malla = [round(n) + 1 for n in celdas]
    if min(malla) < 9 or math.prod(malla) > 2_000_000:
        raise ValueError('shared/tunel.json: la malla admite al menos 9 nodos por eje y como máximo 2.000.000 de nodos en total.')
    minimo = a['objeto']['minimoCeldas'] * a['pasoCm']
    maximos = [min(a['objeto']['maximoCm'], n - 2 * (a['objeto']['separacionParedCeldas'] + 1) * a['pasoCm']) for n in seccion]
    if min(maximos) <= minimo:
        raise ValueError('shared/tunel.json: no queda espacio para el objeto con estos límites.')
    lectura = next(m for m in a['mediciones'] if m['id'] == a['medicionActiva'])
    curva = sorted([dict(consignaPct=m['consignaPct'], velocidadMs=m['velocidadMs'])
                    for m in a['mediciones']], key=lambda m: m['consignaPct'])
    if consigna is None:
        consigna = lectura['consignaPct']
    if (isinstance(consigna, bool) or not isinstance(consigna, (int, float)) or not math.isfinite(consigna)
            or not curva[0]['consignaPct'] <= consigna <= curva[-1]['consignaPct']):
        raise ValueError('Selecciona una consigna dentro del intervalo medido de Aerodinámica.')
    consigna = float(consigna)
    velocidad = interpolar_velocidad(consigna, curva)
    # La curva modifica la velocidad; T, p y HR siguen siendo las de la referencia ambiental.
    aire = {key: lectura[key] for key in ('temperaturaC', 'presionAbsolutaPa', 'humedadRelativaPct')}
    aire.update(propiedades_aire(lectura), referenciaAmbiental=lectura['id'], velocidadMs=velocidad)
    # Ured = Ufisica·dt/dx; νred = νfisica·dt/dx².
    paso_m = a['pasoCm'] / 100
    segundos_por_paso = a['velocidadRedBase'] * paso_m / velocidad if velocidad > 0 else None
    viscosidad = aire['viscosidadCinematicaM2s'] * segundos_por_paso / paso_m ** 2 if velocidad > 0 else None
    aire['segundosPorPaso'] = segundos_por_paso
    if viscosidad is not None and (not math.isfinite(viscosidad) or viscosidad <= 0):
        raise ValueError('shared/tunel.json: la viscosidad de red calculada no es válida.')
    return dict(seccionCm=seccion, malla=malla, origenCm=[-n / 2 for n in seccion], pasoCm=a['pasoCm'], pasos=a['pasos'],
                velocidadRedBase=a['velocidadRedBase'], viscosidadRed=viscosidad, aire=aire,
                consignaPct=consigna, curvaVelocidad=curva,
                minimoObjetoCm=minimo, maximosObjetoCm=maximos,
                separacionParedCeldas=a['objeto']['separacionParedCeldas'], bloqueoMaximo=a['bloqueoMaximo'])


TUNEL = validar_configuracion(json.loads(RUTA_TUNEL.read_text(encoding='utf-8')))
