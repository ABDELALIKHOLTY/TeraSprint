# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field

class Task(BaseModel):
    id: str = Field(description="ID façon Jira (ex: TERA-23)")
    title: str = Field(description="Titre de la tâche technique")
    description: str = Field(description="Description détaillée. Expliquer l'architecture, les technos, le but exact et le détail des sous-tâches.")
    status: str = Field(description="Statut : DOIT TOUJOURS ÊTRE 'TO DO'")
    priority: str = Field(description="Priorité : 'Highest', 'High', 'Medium', 'Low'")
    story_points: int = Field(description="Estimation (Fibonacci: 1, 2, 3, 5, 8...)")
    subtasks: list[str] = Field(default=[], description="Liste de sous-tâches LONGUES (minimum 15-20 mots par sous-tâche) détaillant l'implémentation technique.")

class TasksList(BaseModel):
    tasks: list[Task] = Field(description="Liste des Tâches techniques pour une User Story")

class UserStory(BaseModel):
    id: str = Field(description="ID façon Jira (ex: TERA-12)")
    title: str = Field(description="Titre de la User Story")
    description: str = Field(description="Format : En tant que... Je veux... Afin de...")
    status: str = Field(description="Statut : DOIT TOUJOURS ÊTRE 'TO DO'")
    priority: str = Field(description="Priorité : 'Highest', 'High', 'Medium', 'Low'")
    story_points: int = Field(description="Estimation globale (Fibonacci: 1, 2, 3, 5, 8...)")
    acceptance_criteria: list[str] = Field(description="Critères d'acceptation")
    tasks: list[Task] = Field(default=[], description="Tâches techniques de cette US")

class Epic(BaseModel):
    id: str = Field(description="ID façon Jira (ex: EPIC-1)")
    title: str = Field(description="Titre du thème/Epic")
    user_stories: list[UserStory] = Field(description="Liste des User Stories")

class Backlog(BaseModel):
    project_title: str = Field(description="Titre accrocheur du projet")
    architecture_report: str = Field(default="", description="Le rapport complet d'architecture technique")
    epics: list[Epic] = Field(description="Le backlog complet divisé en Epics")

# Modèles pour la Phase 1 (Génération Squelette)
class UserStoryOutline(BaseModel):
    id: str = Field(description="ID façon Jira")
    title: str = Field(description="Titre de la User Story")
    description: str = Field(description="Format: En tant que...")
    status: str = Field(description="TO DO")
    priority: str = Field(description="Priorité")
    story_points: int = Field(description="Estimation")
    acceptance_criteria: list[str] = Field(description="Critères d'acceptation")

class EpicOutline(BaseModel):
    id: str = Field(description="ID façon Jira")
    title: str = Field(description="Titre du thème/Epic")
    user_stories: list[UserStoryOutline] = Field(description="Liste des User Stories")

class BacklogOutline(BaseModel):
    project_title: str = Field(description="Titre du projet")
    epics: list[EpicOutline] = Field(description="Epics sans les tâches")
