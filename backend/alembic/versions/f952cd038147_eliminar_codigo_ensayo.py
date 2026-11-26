"""Identificar los ensayos únicamente por su ID interno."""
from alembic import op
import sqlalchemy as sa

revision = "f952cd038147"
down_revision = "e841bc927036"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("ensayos") as tabla:
        tabla.drop_column("codigo")


def downgrade():
    op.add_column("ensayos", sa.Column("codigo", sa.String(30), nullable=True))
    ensayos = sa.table("ensayos", sa.column("id", sa.Integer), sa.column("codigo", sa.String(30)))
    conexion = op.get_bind()
    # Los códigos antiguos no se recuperan: al volver atrás se derivan del ID.
    for ensayo_id in conexion.execute(sa.select(ensayos.c.id)).scalars().all():
        conexion.execute(ensayos.update().where(ensayos.c.id == ensayo_id).values(codigo=f"A-{ensayo_id:03d}"))
    with op.batch_alter_table("ensayos") as tabla:
        tabla.alter_column("codigo", existing_type=sa.String(30), nullable=False)
        tabla.create_unique_constraint("uq_ensayos_codigo", ["codigo"])
