# 🧠 TeraSprint - Backend

Welcome to the **Backend** section of TeraSprint. This service is the brain of the application, managing traditional business logic, the database, and the orchestration of artificial intelligence agents.

## 🛠️ Technologies Used

- **Web Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python) for its speed and native async support.
- **Database**: PostgreSQL via **SQLAlchemy** (ORM).
- **AI & Agents**: 
  - **LangChain & LangGraph**: For orchestrating complex workflows (Code Agent).
  - **GPTCache**: To optimize costs and response time by caching model responses.
- **Supported LLM Models**: Ollama (Local), Groq (Llama 3), OpenRouter, Google Gemini.
- **Secure Execution**: [E2B Sandbox](https://e2b.dev/) to execute AI-generated code in an isolated and secure environment.

---

## 🏗️ Architecture and Workflows

Here is how the different components interact when a user engages with the AI.

### 1. Agile Generation (PO Agent)

The Product Owner (PO) Agent takes a simple idea as input and generates a complete architecture report along with a structured backlog.

```mermaid
sequenceDiagram
    participant User as User
    participant API as FastAPI (PO Agent)
    participant Cache as GPTCache
    participant LLM as LLM (Groq/Ollama)
    participant DB as PostgreSQL

    User->>API: Submits an idea (e.g., "Task management app")
    API->>Cache: Checks if idea already exists
    alt Cache Hit
        Cache-->>API: Returns architecture report
    else Cache Miss
        API->>LLM: Requests architecture generation
        LLM-->>API: Returns report
        API->>Cache: Saves
    end
    API->>LLM: Generates Backlog (Epics > User Stories > Tasks)
    LLM-->>API: Returns structured JSON
    API->>DB: Saves Project and Tasks
    API-->>User: Displays Kanban
```

### 2. Code Orchestrator (Coding Agent)

When the user requests to code a task from the workspace, a complex LangGraph workflow initiates.

```mermaid
stateDiagram-v2
    [*] --> Init
    Init --> Agent_Coding : User request
    Agent_Coding --> Parser : AI generates code
    
    Parser --> Validation_AST : Syntax check
    Validation_AST --> Sweep : Syntax error detected
    Validation_AST --> Execution_Sandbox : Syntax OK
    
    Execution_Sandbox --> Sweep : Execution error (dependencies, logic)
    Sweep --> Agent_Coding : Analyzes error and regenerates
    
    Execution_Sandbox --> Success : Functional code
    Success --> [*]
```

---

## 🗄️ Database Schema

The backend manages a relational **PostgreSQL** database. Here is the Entity-Relationship schema:

```mermaid
erDiagram
    USER ||--o{ PROJECT : "creates"
    USER ||--o{ WORKSPACE_SESSION : "participates in"
    
    PROJECT ||--o{ EPIC : "contains"
    EPIC ||--o{ USER_STORY : "is divided into"
    USER_STORY ||--o{ TASK : "is composed of"
    
    TASK ||--o{ WORKSPACE_FILE : "generates (Code)"
    TASK ||--o{ WORKSPACE_MESSAGE : "AI chat history"

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

## 📁 Detailed Folder Structure

- **`api/routes/`**: API endpoints.
  - `auth.py`: SSO Management (Google, GitHub) and JWT.
  - `projects.py`: Creation and retrieval of backlogs.
  - `websockets.py`: Real-time connection to stream AI responses to the frontend (heavily used by the orchestrator).
  - `workspace_persistence.py`: Saving generated files.

- **`models/` & `schemas/`**: 
  - `models/` contains the SQL definitions (Project, Epic, UserStory, Task, WorkspaceFile).
  - `schemas/` contains Pydantic validation (strict verification of incoming JSONs).

- **`services/agents/`**: The core of the intelligence.
  - **`conception/po_agent.py`**: Backlog and Architecture generator.
  - **`coding/orchestrator.py`**: The state machine (StateGraph) that manages code writing, testing, and correction.
  - **`coding/sandbox.py`**: Interface with the E2B API to instantiate an ephemeral Linux container.

---

## ⚙️ Configuration (`.env`)

To function correctly, TeraSprint needs a `.env` file at the root of `backend/`.

```env
# PostgreSQL Database URL
DATABASE_URL=postgresql://user:password@localhost:5432/terasprint

# Security (Generate a random string)
JWT_SECRET=your_very_complex_secret_key
JWT_ALGORITHM=HS256

# OAuth Configuration (SSO)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# AI Keys (Mandatory for generation)
GROQ_API_KEY=...
E2B_API_KEY=...   # Essential for executing code in the sandbox
HF_TOKEN=...      # Optional (HuggingFace)
LANGCHAIN_PROJECT="TeraSprint" # Optional (Arize Phoenix)

# E-mailing Configuration (SMTP)
SMTP_USER=contact@terasprint.com
SMTP_PASS=your_app_password
```

## 🚀 Quick Start

1. **Virtual Environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

2. **Installation**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Migrations & Startup**:
   *(Ensure PostgreSQL is running on the specified port)*
   ```bash
   python migrate.py
   fastapi dev main.py
   ```
   The API listens on `http://localhost:8000`. Swagger Documentation is available at `http://localhost:8000/docs`.
