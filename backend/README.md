# 🧠 TeraSprint - Backend

Bienvenue dans la section **Backend** de TeraSprint. Ce service est le cerveau de l'application, gérant à la fois la logique métier traditionnelle, la base de données, et l'orchestration des agents d'intelligence artificielle.

## 🛠️ Technologies Utilisées

- **Framework Web** : [FastAPI](https://fastapi.tiangolo.com/) (Python) pour sa rapidité et sa gestion native de l'asynchrone.
- **Base de données** : PostgreSQL via **SQLAlchemy** (ORM).
- **IA & Agents** : 
  - **LangChain & LangGraph** : Pour l'orchestration des workflows complexes (Code Agent).
  - **GPTCache** : Pour optimiser les coûts et le temps de réponse en mettant en cache les réponses des modèles.
- **Modèles LLM Supportés** : Ollama (Local), Groq (Llama 3), OpenRouter, Google Gemini.
- **Exécution Sécurisée** : [E2B Sandbox](https://e2b.dev/) pour exécuter le code généré par l'IA de façon isolée et sécurisée.

---

## 🏗️ Architecture et Flux de Travail (Workflows)

Voici comment les différents composants interagissent lorsqu'un utilisateur interagit avec l'IA.

### 1. Génération Agile (PO Agent)

L'Agent Product Owner (PO) prend une simple idée en entrée et génère un rapport d'architecture complet ainsi qu'un backlog structuré.

```mermaid
sequenceDiagram
    participant User as Utilisateur
    participant API as FastAPI (PO Agent)
    participant Cache as GPTCache
    participant LLM as LLM (Groq/Ollama)
    participant DB as PostgreSQL

    User->>API: Soumet une idée (ex: "App de gestion de tâches")
    API->>Cache: Vérifie si l'idée existe déjà
    alt Cache Hit
        Cache-->>API: Retourne le rapport d'architecture
    else Cache Miss
        API->>LLM: Demande la génération de l'architecture
        LLM-->>API: Retourne le rapport
        API->>Cache: Sauvegarde
    end
    API->>LLM: Génère le Backlog (Epics > User Stories > Tâches)
    LLM-->>API: Retourne le JSON structuré
    API->>DB: Sauvegarde le Projet et les Tâches
    API-->>User: Affiche le Kanban
```

### 2. Orchestrateur de Code (Coding Agent)

Lorsque l'utilisateur demande à coder une tâche depuis le workspace, un workflow LangGraph complexe se met en route.

```mermaid
stateDiagram-v2
    [*] --> Init
    Init --> Agent_Coding : Demande de l'utilisateur
    Agent_Coding --> Parser : L'IA génère le code
    
    Parser --> Validation_AST : Vérifie la syntaxe
    Validation_AST --> Sweep : Erreur de syntaxe détectée
    Validation_AST --> Exécution_Sandbox : Syntaxe OK
    
    Exécution_Sandbox --> Sweep : Erreur d'exécution (dépendances, logique)
    Sweep --> Agent_Coding : Analyse l'erreur et regénère
    
    Exécution_Sandbox --> Succès : Code fonctionnel
    Succès --> [*]
```

---

## 🗄️ Schéma de Base de Données (Database Schema)

Le backend gère une base de données **PostgreSQL** relationnelle. Voici le schéma Entité-Relation :

```mermaid
erDiagram
    USER ||--o{ PROJECT : "crée"
    USER ||--o{ WORKSPACE_SESSION : "participe à"
    
    PROJECT ||--o{ EPIC : "contient"
    EPIC ||--o{ USER_STORY : "se divise en"
    USER_STORY ||--o{ TASK : "est composée de"
    
    TASK ||--o{ WORKSPACE_FILE : "génère (Code)"
    TASK ||--o{ WORKSPACE_MESSAGE : "historique chat IA"

    USER {
        uuid id PK
        string email
        string password_hash
        boolean mfa_enabled
    }
    
    PROJECT {
        uuid id PK
        uuid user_id FK
        string title
        text architecture_report
    }
    
    EPIC {
        string id PK
        uuid project_id FK
        string title
        string description
    }
    
    USER_STORY {
        string id PK
        string epic_id FK
        string role
        string action
        string result
    }
    
    TASK {
        string id PK
        string user_story_id FK
        string title
        string description
        string type
        int estimated_hours
    }
```

---

## 📁 Structure Détaillée des Dossiers

- **`api/routes/`** : Les points d'entrée de l'API.
  - `auth.py` : Gestion SSO (Google, GitHub) et JWT.
  - `projects.py` : Création et récupération des backlogs.
  - `websockets.py` : Connexion temps réel pour streamer la réponse de l'IA vers le frontend (très utilisé par l'orchestrateur).
  - `workspace_persistence.py` : Sauvegarde des fichiers générés.

- **`models/` & `schemas/`** : 
  - `models/` contient la définition SQL (Project, Epic, UserStory, Task, WorkspaceFile).
  - `schemas/` contient la validation Pydantic (vérification stricte des JSON entrants).

- **`services/agents/`** : Le cœur de l'intelligence.
  - **`conception/po_agent.py`** : Générateur de Backlog et Architecture.
  - **`coding/orchestrator.py`** : La machine à état (StateGraph) qui gère l'écriture, le test et la correction de code.
  - **`coding/sandbox.py`** : L'interface avec l'API E2B pour instancier un conteneur Linux éphémère.

---

## ⚙️ Configuration (`.env`)

Pour fonctionner correctement, TeraSprint a besoin d'un fichier `.env` à la racine de `backend/`.

```env
# URL de la base de données PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/terasprint

# Sécurité (Générez une chaîne aléatoire)
JWT_SECRET=votre_cle_secrete_tres_complexe
JWT_ALGORITHM=HS256

# Configuration OAuth (SSO)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Clés IA (Obligatoires pour la génération)
GROQ_API_KEY=...
E2B_API_KEY=...   # Indispensable pour exécuter le code dans la sandbox
HF_TOKEN=...      # Optionnel (HuggingFace)
```

## 🚀 Lancement Rapide

1. **Environnement Virtuel** :
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

2. **Installation** :
   ```bash
   pip install -r requirements.txt
   ```

3. **Migrations & Lancement** :
   *(Assurez-vous que PostgreSQL tourne sur le port spécifié)*
   ```bash
   python migrate.py
   fastapi dev main.py
   ```
   L'API écoute sur `http://localhost:8000`. Documentation Swagger accessible via `http://localhost:8000/docs`.
