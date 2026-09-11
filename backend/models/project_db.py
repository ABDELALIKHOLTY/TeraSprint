from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
# pyrefly: ignore [missing-import]
from db.postgres import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    architecture_report = Column(Text, nullable=True)
    columns = Column(JSON, default=lambda: ["TO DO", "IN PROGRESS", "IN REVIEW", "DONE"])
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relations
    user = relationship("User", backref="projects")
    epics = relationship("EpicDB", back_populates="project", cascade="all, delete-orphan")

class EpicDB(Base):
    __tablename__ = "epics"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    
    project = relationship("Project", back_populates="epics")
    user_stories = relationship("UserStoryDB", back_populates="epic", cascade="all, delete-orphan")

class UserStoryDB(Base):
    __tablename__ = "user_stories"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String, default="TO DO")
    priority = Column(String, default="Medium")
    story_points = Column(Integer, default=0)
    acceptance_criteria = Column(JSON, default=list)
    
    epic_id = Column(String, ForeignKey("epics.id"), nullable=False)
    epic = relationship("EpicDB", back_populates="user_stories")
    tasks = relationship("TaskDB", back_populates="user_story", cascade="all, delete-orphan")

class TaskDB(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String, default="TO DO")
    priority = Column(String, default="Medium")
    story_points = Column(Integer, default=0)
    subtasks = Column(JSON, default=list)
    estimated_hours = Column(Integer, default=0)
    
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    
    user_story_id = Column(String, ForeignKey("user_stories.id"), nullable=False)
    user_story = relationship("UserStoryDB", back_populates="tasks")
