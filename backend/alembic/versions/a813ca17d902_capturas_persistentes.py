"""Identidad y magnitudes originales de las capturas del servidor."""
from alembic import op
import sqlalchemy as sa

revision = "a813ca17d902"
down_revision = "c524f6e69280"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("mediciones") as batch:
        batch.add_column(sa.Column("captura_clave", sa.String(36), nullable=True))
        batch.add_column(sa.Column("fuente", sa.String(30), nullable=True))
        batch.add_column(sa.Column("calibracion_version", sa.Integer(), nullable=True))
        batch.create_unique_constraint("uq_mediciones_captura_clave", ["captura_clave"])
    with op.batch_alter_table("muestras_medicion") as batch:
        batch.add_column(sa.Column("presion_pa", sa.DECIMAL(10, 4), nullable=True))
        batch.add_column(sa.Column("caudal_m3s", sa.DECIMAL(10, 4), nullable=True))


def downgrade():
    with op.batch_alter_table("muestras_medicion") as batch:
        batch.drop_column("caudal_m3s")
        batch.drop_column("presion_pa")
    with op.batch_alter_table("mediciones") as batch:
        batch.drop_constraint("uq_mediciones_captura_clave", type_="unique")
        batch.drop_column("calibracion_version")
        batch.drop_column("fuente")
        batch.drop_column("captura_clave")
