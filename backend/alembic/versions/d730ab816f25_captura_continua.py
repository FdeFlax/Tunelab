"""Consigna y estabilidad de cada muestra; desconocidas en registros antiguos."""
from alembic import op
import sqlalchemy as sa

revision = "d730ab816f25"
down_revision = "c901bd278f04"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("muestras_medicion", sa.Column("consigna_objetivo", sa.Numeric(5, 2), nullable=True))
    op.add_column("muestras_medicion", sa.Column("flujo_estable", sa.Boolean(), nullable=True))


def downgrade():
    op.drop_column("muestras_medicion", "flujo_estable")
    op.drop_column("muestras_medicion", "consigna_objetivo")
