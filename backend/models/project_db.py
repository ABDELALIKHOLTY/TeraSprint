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
    members = relationship("ProjectMemberDB", back_populates="project", cascade="all, delete-orphan")

class ProjectMemberDB(Base):
    __tablename__ = "project_members"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role = Column(String, default="Member")
    added_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="members")
    user = relationship("User", foreign_keys=[user_id])

class SprintDB(Base):
    __tablename__ = "sprints"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    
    project = relationship("Project", backref="sprints")
    user_stories = relationship("UserStoryDB", back_populates="sprint")
    tasks = relationship("TaskDB", back_populates="sprint")


class EpicDB(Base):
    __tablename__ = "epics"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    assignee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    project = relationship("Project", back_populates="epics")
    assignee = relationship("User", foreign_keys=[assignee_id])
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
    
    sprint_id = Column(String, ForeignKey("sprints.id"), nullable=True)
    sprint = relationship("SprintDB", back_populates="user_stories")
    
    assignee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    assignee = relationship("User", foreign_keys=[assignee_id])
    
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
    
    chat_history = Column(JSON, default=list)
    attachments = Column(JSON, default=list)
    history = Column(JSON, default=list)
    links = Column(JSON, default=list)
    time_logs = Column(JSON, default=list)
    
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    
    user_story_id = Column(String, ForeignKey("user_stories.id"), nullable=False)
    user_story = relationship("UserStoryDB", back_populates="tasks")
    
    sprint_id = Column(String, ForeignKey("sprints.id"), nullable=True)
    sprint = relationship("SprintDB", back_populates="tasks")
    
    assignee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    assignee = relationship("User", foreign_keys=[assignee_id])

class ProjectFileDB(Base):
    __tablename__ = "project_files"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False) # e.g. document, image, code
    file_url = Column(String, nullable=False)
    
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    project = relationship("Project", backref="files")
    
    task_id = Column(String, ForeignKey("tasks.id"), nullable=True)
    task = relationship("TaskDB", backref="file_attachments")
    
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    uploader = relationship("User", foreign_keys=[uploaded_by])
    
    created_at = Column(DateTime, default=datetime.utcnow)
