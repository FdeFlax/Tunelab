from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, DateTime, DECIMAL, Enum as SqlEnum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.base_datos import Base


# Cada clase de este archivo representa una tabla de MySQL.
class RolUsuario(str, Enum):
    alumno = "alumno"
    profesor = "profesor"
    tecnico = "tecnico"
    admin = "admin"


class EstadoEnsayo(str, Enum):
    preparado = "preparado"
    activo = "activo"
    cerrado = "cerrado"
    archivado = "archivado"


class EstadoMedicion(str, Enum):
    preparada = "preparada"
    en_curso = "en_curso"
    finalizada = "finalizada"
    cancelada = "cancelada"
    error = "error"


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    identificador_uacloud: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str | None] = mapped_column(String(160))
    rol: Mapped[RolUsuario] = mapped_column(SqlEnum(RolUsuario), default=RolUsuario.alumno)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    ensayos: Mapped[list["Ensayo"]] = relationship(back_populates="usuario")


class Ensayo(Base):
    __tablename__ = "ensayos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(80), nullable=False)
    objetivo: Mapped[str | None] = mapped_column(String(160))
    descripcion: Mapped[str | None] = mapped_column(Text)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    estado: Mapped[EstadoEnsayo] = mapped_column(SqlEnum(EstadoEnsayo), default=EstadoEnsayo.preparado)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    actualizado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    usuario: Mapped[Usuario] = relationship(back_populates="ensayos")
    mediciones: Mapped[list["Medicion"]] = relationship(back_populates="ensayo")


class Medicion(Base):
    __tablename__ = "mediciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ensayo_id: Mapped[int] = mapped_column(ForeignKey("ensayos.id"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(80), nullable=False)
    estado: Mapped[EstadoMedicion] = mapped_column(SqlEnum(EstadoMedicion), default=EstadoMedicion.preparada)
    velocidad_objetivo: Mapped[float | None] = mapped_column(DECIMAL(6, 2))
    potencia_objetivo: Mapped[float | None] = mapped_column(DECIMAL(5, 2))
    temperatura_objetivo: Mapped[float | None] = mapped_column(DECIMAL(5, 2))
    fecha_inicio: Mapped[datetime | None] = mapped_column(DateTime)
    fecha_fin: Mapped[datetime | None] = mapped_column(DateTime)
    duracion_segundos: Mapped[int | None] = mapped_column(Integer)
    velocidad_media: Mapped[float | None] = mapped_column(DECIMAL(6, 2))
    velocidad_maxima: Mapped[float | None] = mapped_column(DECIMAL(6, 2))
    velocidad_minima: Mapped[float | None] = mapped_column(DECIMAL(6, 2))
    temperatura_media: Mapped[float | None] = mapped_column(DECIMAL(6, 2))
    potencia_media: Mapped[float | None] = mapped_column(DECIMAL(6, 2))
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    ensayo: Mapped[Ensayo] = relationship(back_populates="mediciones")
    muestras: Mapped[list["MuestraMedicion"]] = relationship(back_populates="medicion")


class MuestraMedicion(Base):
    __tablename__ = "muestras_medicion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    medicion_id: Mapped[int] = mapped_column(ForeignKey("mediciones.id"), nullable=False)
    instante: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    velocidad_ms: Mapped[float | None] = mapped_column(DECIMAL(8, 3))
    temperatura_c: Mapped[float | None] = mapped_column(DECIMAL(6, 2))
    potencia_porcentaje: Mapped[float | None] = mapped_column(DECIMAL(5, 2))
    frecuencia_hz: Mapped[float | None] = mapped_column(DECIMAL(6, 2))
    corriente_a: Mapped[float | None] = mapped_column(DECIMAL(6, 2))
    rpm: Mapped[int | None] = mapped_column(Integer)

    medicion: Mapped[Medicion] = relationship(back_populates="muestras")


class EventoMedicion(Base):
    __tablename__ = "eventos_medicion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    medicion_id: Mapped[int | None] = mapped_column(ForeignKey("mediciones.id"))
    ensayo_id: Mapped[int | None] = mapped_column(ForeignKey("ensayos.id"))
    tipo: Mapped[str] = mapped_column(String(30), default="info")
    mensaje: Mapped[str] = mapped_column(Text, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
class UsoTunel(Base):
    __tablename__ = "uso_tunel"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    conectado: Mapped[bool] = mapped_column(Boolean, default=False)
    conectado_en: Mapped[datetime | None] = mapped_column(DateTime)
    actualizado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    usuario: Mapped[Usuario | None] = relationship()


