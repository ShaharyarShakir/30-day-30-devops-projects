"""initial migration

Revision ID: e45b8ad28cb5
Revises: 
Create Date: 2026-07-05 12:33:46.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'e45b8ad28cb5'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    # 2. Create users table if not exists
    if 'users' not in tables:
        op.create_table(
            'users',
            sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
            sa.Column('email', sa.String(length=255), nullable=False),
            sa.Column('password_hash', sa.String(length=255), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # 3. Create resumes table if not exists
    if 'resumes' not in tables:
        op.create_table(
            'resumes',
            sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('filename', sa.String(length=255), nullable=False),
            sa.Column('object_key', sa.String(length=255), nullable=False),
            sa.Column('status', sa.String(length=50), nullable=False),
            sa.Column('error_message', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )

    # 4. Create resume_features table if not exists
    if 'resume_features' not in tables:
        op.create_table(
            'resume_features',
            sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
            sa.Column('resume_id', sa.Integer(), nullable=False),
            sa.Column('skills', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column('experience_years', sa.Numeric(precision=4, scale=1), nullable=True),
            sa.Column('education', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column('embedding', Vector(dim=768), nullable=True),
            sa.Column('processed_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
            sa.ForeignKeyConstraint(['resume_id'], ['resumes.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('resume_id')
        )


def downgrade() -> None:
    op.drop_table('resume_features')
    op.drop_table('resumes')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
