"""Una consigna y una duración por medición, sin programador de etapas."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.mysql import DATETIME

revision = "0a63de149258"
down_revision = "f952cd038147"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("mediciones", sa.Column("duracion_prevista_segundos", sa.Integer(), nullable=True))
    op.drop_table("programas_etapas")


def downgrade():
    # Se recupera la estructura, no los borradores de secuencias eliminados.
    op.create_table("programas_etapas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ensayo_id", sa.Integer(), sa.ForeignKey("ensayos.id"), nullable=False, unique=True),
        sa.Column("nombre", sa.String(40), nullable=False),
        sa.Column("etapas", sa.JSON(), nullable=False),
        sa.Column("estado", sa.String(20), nullable=False),
        sa.Column("clave", sa.String(36)),
        sa.Column("indice_etapa", sa.Integer(), nullable=False),
        sa.Column("mediciones", sa.JSON(), nullable=False),
        sa.Column("fase_desde", sa.DateTime().with_variant(DATETIME(fsp=6), "mysql", "mariadb")),
        sa.Column("iniciado_en", sa.DateTime()),
        sa.Column("finalizado_en", sa.DateTime()),
        sa.Column("mensaje", sa.String(250)),
    )
    op.drop_column("mediciones", "duracion_prevista_segundos")
