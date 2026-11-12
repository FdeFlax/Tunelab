"""Copia del programa y de sus intervalos en cada medición."""
from alembic import op
import sqlalchemy as sa

revision = "c901bd278f04"
down_revision = "b672af184e03"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("mediciones", sa.Column("programa", sa.JSON(), nullable=True))


def downgrade():
    op.drop_column("mediciones", "programa")
