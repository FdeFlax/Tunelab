"""crear tablas iniciales

Revision ID: c524f6e69280
Revises:
Create Date: 2026-07-09 12:10:42.088479

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c524f6e69280"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("identificador_uacloud", sa.String(length=100), nullable=False),
        sa.Column("nombre", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=160), nullable=True),
        sa.Column("rol", sa.Enum("alumno", "profesor", "tecnico", "admin", name="rolusuario"), nullable=False),
        sa.Column("activo", sa.Boolean(), nullable=False),
        sa.Column("creado_en", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("identificador_uacloud"),
    )

    op.create_table(
        "ensayos",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("codigo", sa.String(length=30), nullable=False),
        sa.Column("nombre", sa.String(length=80), nullable=False),
        sa.Column("objetivo", sa.String(length=160), nullable=True),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("estado", sa.Enum("preparado", "activo", "cerrado", "archivado", name="estadoensayo"), nullable=False),
        sa.Column("creado_en", sa.DateTime(), nullable=False),
        sa.Column("actualizado_en", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("codigo"),
    )

    op.create_table(
        "uso_tunel",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=True),
        sa.Column("conectado", sa.Boolean(), nullable=False),
        sa.Column("conectado_en", sa.DateTime(), nullable=True),
        sa.Column("actualizado_en", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "mediciones",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("ensayo_id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=80), nullable=False),
        sa.Column("estado", sa.Enum("preparada", "en_curso", "finalizada", "cancelada", "error", name="estadomedicion"), nullable=False),
        sa.Column("velocidad_objetivo", sa.DECIMAL(precision=6, scale=2), nullable=True),
        sa.Column("potencia_objetivo", sa.DECIMAL(precision=5, scale=2), nullable=True),
        sa.Column("temperatura_objetivo", sa.DECIMAL(precision=5, scale=2), nullable=True),
        sa.Column("fecha_inicio", sa.DateTime(), nullable=True),
        sa.Column("fecha_fin", sa.DateTime(), nullable=True),
        sa.Column("duracion_segundos", sa.Integer(), nullable=True),
        sa.Column("velocidad_media", sa.DECIMAL(precision=6, scale=2), nullable=True),
        sa.Column("velocidad_maxima", sa.DECIMAL(precision=6, scale=2), nullable=True),
        sa.Column("velocidad_minima", sa.DECIMAL(precision=6, scale=2), nullable=True),
        sa.Column("temperatura_media", sa.DECIMAL(precision=6, scale=2), nullable=True),
        sa.Column("potencia_media", sa.DECIMAL(precision=6, scale=2), nullable=True),
        sa.Column("creado_en", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["ensayo_id"], ["ensayos.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "eventos_medicion",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("medicion_id", sa.Integer(), nullable=True),
        sa.Column("ensayo_id", sa.Integer(), nullable=True),
        sa.Column("tipo", sa.String(length=30), nullable=False),
        sa.Column("mensaje", sa.Text(), nullable=False),
        sa.Column("creado_en", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["ensayo_id"], ["ensayos.id"]),
        sa.ForeignKeyConstraint(["medicion_id"], ["mediciones.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "muestras_medicion",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("medicion_id", sa.Integer(), nullable=False),
        sa.Column("instante", sa.DateTime(), nullable=False),
        sa.Column("velocidad_ms", sa.DECIMAL(precision=8, scale=3), nullable=True),
        sa.Column("temperatura_c", sa.DECIMAL(precision=6, scale=2), nullable=True),
        sa.Column("potencia_porcentaje", sa.DECIMAL(precision=5, scale=2), nullable=True),
        sa.Column("frecuencia_hz", sa.DECIMAL(precision=6, scale=2), nullable=True),
        sa.Column("corriente_a", sa.DECIMAL(precision=6, scale=2), nullable=True),
        sa.Column("rpm", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["medicion_id"], ["mediciones.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("muestras_medicion")
    op.drop_table("eventos_medicion")
    op.drop_table("mediciones")
    op.drop_table("uso_tunel")
    op.drop_table("ensayos")
    op.drop_table("usuarios")


