from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# Estos modelos definen los datos que entran y salen por la API.
# No son tablas: sirven para validar y documentar las peticiones.
class EnsayoCrear(BaseModel):
    nombre: str = Field(min_length=1, max_length=30)
    objetivo: str | None = Field(default=None, max_length=40)
    descripcion: str | None = Field(default=None, max_length=200)


class EnsayoActualizar(EnsayoCrear):
    pass

class EnsayoRespuesta(BaseModel):
    id: int
    nombre: str
    objetivo: str | None
    descripcion: str | None
    usuario_id: int
    estado: str
    creado_en: datetime
    total_mediciones: int = 0

    model_config = {"from_attributes": True}


class MedicionRespuesta(BaseModel):
    id: int
    ensayo_id: int
    nombre: str
    estado: str
    velocidad_objetivo: float | None
    potencia_objetivo: float | None
    temperatura_objetivo: float | None
    duracion_segundos: int | None
    duracion_prevista_segundos: int | None = None
    velocidad_media: float | None
    velocidad_maxima: float | None
    velocidad_minima: float | None
    temperatura_media: float | None
    potencia_media: float | None
    creado_en: datetime
    fecha_inicio: datetime | None = None
    fecha_fin: datetime | None = None
    captura_clave: str | None = None
    fuente: str | None = None
    calibracion_version: int | None = None
    programa: dict | None = None

    model_config = {"from_attributes": True}


class UltimaMedicionUsuarioRespuesta(BaseModel):
    ensayo: EnsayoRespuesta
    medicion: MedicionRespuesta


class UsuarioCrear(BaseModel):
    identificador_uacloud: str = Field(min_length=1, max_length=100)
    nombre: str = Field(min_length=1, max_length=120)
    email: str | None = Field(default=None, max_length=160)
    rol: str = "alumno"


class UsuarioRespuesta(BaseModel):
    id: int
    identificador_uacloud: str
    nombre: str
    email: str | None
    rol: str
    activo: bool
    creado_en: datetime

    model_config = {"from_attributes": True}


class EnsayoDocenteRespuesta(EnsayoRespuesta):
    usuario: UsuarioRespuesta
    total_mediciones: int = 0
    ultima_medicion_en: datetime | None = None


class MuestraRespuesta(BaseModel):
    id: int
    medicion_id: int
    instante: datetime
    velocidad_ms: float | None
    temperatura_c: float | None
    potencia_porcentaje: float | None
    frecuencia_hz: float | None
    corriente_a: float | None
    rpm: int | None
    presion_pa: float | None = None
    caudal_m3s: float | None = None
    consigna_objetivo: float | None = None
    flujo_estable: bool | None = None

    model_config = {"from_attributes": True}


class EventoRespuesta(BaseModel):
    id: int
    tipo: str
    mensaje: str
    ensayo_id: int | None
    medicion_id: int | None
    creado_en: datetime

    model_config = {"from_attributes": True}


class TunelConexionRespuesta(BaseModel):
    conectado: bool
    ocupado: bool
    es_propietario: bool
    mensaje: str
    usuario: UsuarioRespuesta | None = None
    conectado_en: datetime | None = None

    model_config = {"from_attributes": True}

class TunelEstadoRespuesta(BaseModel):
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
    captura: MedicionRespuesta | None = None
    total_muestras: int = 0
    error_captura: str | None = None


class CapturaIniciar(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, allow_inf_nan=False)
    ensayo_id: int = Field(gt=0)
    clave: UUID
    nombre: str = Field(min_length=1, max_length=40)
    consigna: float = Field(ge=1, le=100, multiple_of=0.1)
    duracion_segundos: int = Field(ge=1, le=300, strict=True)
