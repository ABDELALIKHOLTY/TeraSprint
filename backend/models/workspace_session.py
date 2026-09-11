from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from db.postgres import Base


class WorkspaceMessage(Base):
    """Persiste les messages de conversation (user/ai/system) par tache et par utilisateur."""
    __tablename__ = "workspace_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(String, nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    sender = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="workspace_messages")

    __table_args__ = (
        Index("ix_workspace_messages_task_user", "task_id", "user_id"),
    )


class WorkspaceFile(Base):
    """Persiste les fichiers generes (code, rapports) par tache et par utilisateur."""
    __tablename__ = "workspace_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(String, nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="workspace_files")

    __table_args__ = (
        Index("ix_workspace_files_task_user", "task_id", "user_id"),
    )
