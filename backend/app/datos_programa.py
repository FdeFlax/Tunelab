"""Validación y estado público de los ensayos por etapas."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

ESTADOS_ACTIVOS = ("estabilizando", "registrando")


class EtapaConfig(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    consigna: float = Field(ge=1, le=100)
    duracion_segundos: int = Field(ge=1, le=3600, strict=True)


class ProgramaConfig(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    nombre: str = Field(min_length=1, max_length=40)
    etapas: list[EtapaConfig] = Field(min_length=1, max_length=15)


class ProgramaOrden(BaseModel):
    ensayo_id: int = Field(gt=0)
    clave: UUID
    encender: bool = False


class ProgramaRespuesta(ProgramaConfig):
    model_config = ConfigDict(from_attributes=True)
    id: int
    ensayo_id: int
    estado: str
    clave: str | None
    indice_etapa: int
    mediciones: list[int]
    fase_desde: datetime | None
    iniciado_en: datetime | None
    finalizado_en: datetime | None
    mensaje: str | None
    activo: bool = False
    segundos_etapa: int = 0


def describir_programa(programa):
    datos = ProgramaRespuesta.model_validate(programa).model_dump()
    datos["activo"] = programa.estado in ESTADOS_ACTIVOS
    if datos["activo"] and programa.fase_desde:
        datos["segundos_etapa"] = max(0, int((datetime.utcnow() - programa.fase_desde).total_seconds()))
    return datos
