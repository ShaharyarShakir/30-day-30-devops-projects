from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship, Column
from pgvector.sqlalchemy import Vector
from sqlalchemy import Numeric
from sqlalchemy.dialects.postgresql import JSONB

class User(SQLModel, table=True):
    __tablename__ = "users"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True, nullable=False)
    password_hash: str = Field(nullable=False)
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )

class Resume(SQLModel, table=True):
    __tablename__ = "resumes"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(nullable=False)
    filename: str = Field(max_length=255, nullable=False)
    object_key: str = Field(max_length=255, nullable=False)
    status: str = Field(max_length=50, nullable=False, default="uploaded")
    error_message: Optional[str] = Field(default=None, nullable=True)
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
    
    # Relationship to features
    features: Optional["ResumeFeature"] = Relationship(
        back_populates="resume", 
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "uselist": False}
    )

class ResumeFeature(SQLModel, table=True):
    __tablename__ = "resume_features"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    resume_id: int = Field(
        foreign_key="resumes.id",
        unique=True,
        nullable=False
    )
    # JSONB fields using PostgreSQL specific dialect
    skills: Optional[List[str]] = Field(default=None, sa_column=Column(JSONB, nullable=True))
    experience_years: Optional[float] = Field(default=None, sa_column=Column(Numeric(4, 1), nullable=True))
    education: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB, nullable=True))
    # pgvector embedding
    embedding: Optional[List[float]] = Field(default=None, sa_column=Column(Vector(768), nullable=True))
    processed_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
    
    # Relationship back to resume
    resume: Optional[Resume] = Relationship(back_populates="features")
