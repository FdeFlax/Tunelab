"""Conservar fracciones de segundo al asignar muestras a etapas en MySQL."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.mysql import DATETIME

revision = "e841bc927036"
down_revision = "d730ab816f25"
branch_labels = None
depends_on = None

CAMPOS = (
    ("mediciones", "fecha_inicio", True),
    ("mediciones", "fecha_fin", True),
    ("muestras_medicion", "instante", False),
    ("programas_etapas", "fase_desde", True),
)


def upgrade():
    if op.get_bind().dialect.name in ("mysql", "mariadb"):
        for tabla, campo, nullable in CAMPOS:
            op.alter_column(tabla, campo, existing_type=sa.DateTime(),
                            type_=DATETIME(fsp=6), existing_nullable=nullable)


def downgrade():
    if op.get_bind().dialect.name in ("mysql", "mariadb"):
        for tabla, campo, nullable in CAMPOS:
            op.alter_column(tabla, campo, existing_type=DATETIME(fsp=6),
                            type_=sa.DateTime(), existing_nullable=nullable)
