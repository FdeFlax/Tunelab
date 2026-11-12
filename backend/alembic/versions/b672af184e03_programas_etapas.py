"""Configuración y progreso persistente de los ensayos por etapas."""
from alembic import op
import sqlalchemy as sa

revision = "b672af184e03"
down_revision = "a813ca17d902"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("programas_etapas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ensayo_id", sa.Integer(), sa.ForeignKey("ensayos.id"), nullable=False, unique=True),
        sa.Column("nombre", sa.String(40), nullable=False),
        sa.Column("etapas", sa.JSON(), nullable=False),
        sa.Column("estado", sa.String(20), nullable=False),
        sa.Column("clave", sa.String(36)),
        sa.Column("indice_etapa", sa.Integer(), nullable=False),
        sa.Column("mediciones", sa.JSON(), nullable=False),
        sa.Column("fase_desde", sa.DateTime()),
        sa.Column("iniciado_en", sa.DateTime()),
        sa.Column("finalizado_en", sa.DateTime()),
        sa.Column("mensaje", sa.String(250)),
    )


def downgrade():
    op.drop_table("programas_etapas")
