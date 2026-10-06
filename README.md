<<<<<<< HEAD
<p align="center">
  <img src="https://res.cloudinary.com/pnj96jym/image/upload/v1791329138/TeraSprint_logo.png" alt="TeraSprint Logo" width="400">
</p>
=======
#  TeraSprint
>>>>>>> a357cea753c594c1491489e4e6b04b90715ff759

<h1 align="center">TeraSprint – AI-Powered Agile Software Generation Platform</h1>

<p align="center">
  <strong>Autonomous AI Agents • Real-Time Code Execution • Intelligent Project Management</strong>
</p>

<p align="center">
  <!-- Frontend -->
  <img src="https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=black">
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white">
  <img src="https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite&logoColor=white">
  <img src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white">
  <br>
  <!-- Backend -->
  <img src="https://img.shields.io/badge/Python-3.10-3776AB?logo=python&logoColor=white">
  <img src="https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi&logoColor=white">
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white">
  <br>
  <!-- AI & Infrastructure -->
  <img src="https://img.shields.io/badge/LangGraph-0.1-FF9900?logo=langchain&logoColor=white">
  <img src="https://img.shields.io/badge/Groq-Llama3-F55036?logo=groq&logoColor=white">
  <img src="https://img.shields.io/badge/E2B_Sandbox-Cloud-000000?logo=e2b&logoColor=white">
  <img src="https://img.shields.io/badge/Arize_Phoenix-Traces-5E35B1?logo=arize&logoColor=white">
  <img src="https://img.shields.io/badge/Docker-24.0-2496ED?logo=docker&logoColor=white">
  <br>
</p>

<<<<<<< HEAD
<p align="center">
  <a href="#the-terasprint-difference">The TeraSprint Difference</a> •
  <a href="#key-features--architecture">Architecture & Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#documentation-suite">Documentation</a>
</p>
=======
## 📐 Architecture Technique et Modélisation

TeraSprint est divisé en deux parties principales :
- Un **Frontend** moderne (React / TypeScript / Vite / TailwindCSS).
- Un **Backend** robuste et asynchrone (Python / FastAPI) propulsé par des agents d'IA (LangGraph).

Cette section détaille la conception technique du projet et les flux de données à travers 6 axes majeurs.

### 1. Architecture Globale du Système
<img src="https://res.cloudinary.com/pnj96jym/image/upload/v1791233744/fig_global.png" alt="Architecture Globale" width="600" />

L'architecture repose sur un couplage lâche entre le Frontend (React) et le Backend (FastAPI). Les requêtes REST standard sont utilisées pour la gestion de projet classique (Kanban), tandis qu'un système d'agents autonomes (PO Agent, Code Agent, Graph Agent) gère la logique complexe en arrière-plan. Ces agents communiquent avec divers fournisseurs LLM via une couche d'abstraction (LangChain/LangGraph) et délèguent l'exécution du code généré à un Sandbox sécurisé (E2B).

### 2. Communication Temps Réel (WebSockets & IDE)
<img src="https://res.cloudinary.com/pnj96jym/image/upload/v1791233744/fig_ws_seq.png" alt="Séquence WebSockets" width="600" />

Pour offrir une expérience de développement collaborative (IDE Web), le système utilise des WebSockets bidirectionnels. Lorsqu'un utilisateur demande une génération de code, le Frontend ouvre une connexion WS avec FastAPI. L'orchestrateur (LangGraph) streame les événements (réflexion du LLM, génération de code, exécution dans le Sandbox) en temps réel. Cela permet un retour visuel instantané et une gestion asynchrone des tâches longues sans bloquer le thread principal.

### 3. Résilience LLM (Stratégie de Fallback)
<img src="https://res.cloudinary.com/pnj96jym/image/upload/v1791233745/fig_fallback.png" alt="Stratégie Fallback" width="600" />

Afin de garantir une haute disponibilité, le backend implémente un pattern de Fallback dynamique pour les LLMs. Si le fournisseur principal (ex: Groq) subit une limite de taux (Rate Limit) ou une panne, l'intercepteur réseau capture l'exception et route automatiquement la requête avec le même contexte vers un fournisseur secondaire (ex: OpenRouter ou Gemini). Le système enregistre l'erreur pour la télémétrie tout en masquant la défaillance à l'utilisateur final.

### 4. Modèle Relationnel (Base de Données)
<img src="https://res.cloudinary.com/pnj96jym/image/upload/v1791233745/Mod%C3%A8leRelationnele.jpg" alt="Modèle Entité Association" width="600" />

La base de données PostgreSQL est structurée pour séparer les domaines métiers : Utilisateurs, Workspaces, Projets, et Backlog (Epics, Sprints, Tâches). Elle intègre l'extension `pgvector` pour stocker les embeddings vectoriels des documents d'architecture, permettant une recherche sémantique rapide (RAG) par les agents IA lors de la phase de conception logicielle.

### 5. Intégration Continue (Push to GitHub)
<img src="https://res.cloudinary.com/pnj96jym/image/upload/v1791233744/fig_github.png" alt="Flux GitHub" width="600" />

Le flux d'intégration GitHub automatise la sauvegarde du travail. L'utilisateur authentifie son compte via OAuth. Lorsque l'agent IA termine une implémentation dans le Sandbox, le Backend package le code, génère un commit détaillé et le pousse (push) via l'API REST de GitHub. Le système gère les résolutions de conflits simples et informe le Frontend du statut de la synchronisation via WebSocket.

### 6. Observabilité et Traces LLM (Arize Phoenix)
<img src="https://res.cloudinary.com/pnj96jym/image/upload/v1791232859/phoenix_trace_details.png" alt="Trace Details" width="600" />

Chaque appel fait par les agents IA est instrumenté via OpenTelemetry et envoyé à Arize Phoenix. La trace technique capture le prompt exact envoyé, la réponse brute du modèle, le temps de latence (TTFT - Time To First Token) et le coût en tokens. Cela permet aux développeurs d'inspecter les étapes de la *Chain of Thought*, d'analyser les erreurs de parsing JSON et d'optimiser les performances des agents sans polluer les logs standards.

## 🐳 Déploiement et Conteneurs (Docker)

Le projet est entièrement "Dockerisé" pour faciliter son déploiement via `docker-compose.yml`. Voici les conteneurs utilisés dans notre infrastructure :

1. **`db` (PostgreSQL / pgvector)** : Le moteur de base de données relationnelle.
2. **`backend` (FastAPI)** : Le cœur logique, tournant sous Python.
3. **`frontend` (React/Vite)** : L'interface utilisateur, servie par un serveur Node.js léger.
4. **`phoenix` (Arize Phoenix)** : Une plateforme d'observabilité LLM (sur les ports `6006`, `4317`) pour tracer, déboguer et surveiller les requêtes faites aux Intelligences Artificielles (LangChain).

## 📋 Prérequis et Exigences (Requirements)

Avant de lancer le projet (en mode développeur ou production), vous devez vous assurer de disposer des éléments suivants :

### 1. Outils Locaux (Local Stack)
- **Git** : Pour cloner et gérer le code source.
- **Docker Desktop** (ou Docker Engine + Docker Compose) : Fortement recommandé pour lancer la BDD et Phoenix d'un seul clic.
- **Python 3.10 ou supérieur** (si exécution du backend hors Docker).
- **Node.js 18 ou supérieur** (si exécution du frontend hors Docker).

### 2. Clés d'API & Environnement (`.env`)
L'application repose sur un fichier `.env` situé dans le dossier `backend/`. Voici ce qu'il doit impérativement contenir :

- **Configuration Base de Données :**
  - `DATABASE_URL` : (ex: `postgresql://admin:password@localhost:5432/terasprint`) - Lien de connexion à PostgreSQL.
- **Sécurité et Authentification :**
  - `JWT_SECRET` / `JWT_ALGORITHM` : Clé secrète et algorithme (ex: `HS256`) pour signer et valider les sessions utilisateurs.
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` : (Optionnel) Nécessaire pour activer la connexion SSO via Google.
  - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` : (Optionnel) Nécessaire pour l'authentification GitHub et le push du code généré.
- **Intelligence Artificielle & Observabilité :**
  - `GROQ_API_KEY` : (Requis) Clé API pour utiliser les modèles ultra-rapides de Groq (Llama 3 / Mixtral).
  - `E2B_API_KEY` : (Requis) Clé d'authentification pour exécuter le code en sécurité dans le Sandbox Cloud E2B.
  - `HF_TOKEN` : (Optionnel) Token HuggingFace pour l'accès aux modèles open-source.
  - `LANGCHAIN_PROJECT` : (Optionnel) Définit le nom du projet dans Arize Phoenix pour regrouper les traces d'appels LLM (ex: `"TeraSprint"`).
- **Service d'E-mailing (SMTP) :**
  - `SMTP_USER` : L'adresse e-mail de l'expéditeur (ex: `contact@terasprint.com`).
  - `SMTP_PASS` : Le mot de passe d'application associé au compte SMTP pour l'envoi de notifications ou réinitialisation de mot de passe.

## 🚀 Démarrer le Projet

1. **Cloner le projet** : 
   ```bash
   git clone https://github.com/ABDELALIKHOLTY/TeraSprint.git
   cd TeraSprint
   ```

2. **Démarrage Ultra-Rapide (Docker)** :
   ```bash
   docker-compose up --build
   ```
   *Cela lancera le Frontend, le Backend, PostgreSQL, et Arize Phoenix en un coup.*

3. **Démarrage Manuel (Mode Développement)** :
   - Lancez uniquement les services externes : `docker-compose up db phoenix -d`
   - **Backend** : `cd backend && pip install -r requirements.txt && fastapi dev main.py`
   - **Frontend** : `cd frontend && npm install && npm run dev`
>>>>>>> a357cea753c594c1491489e4e6b04b90715ff759

---

## ⚡ The TeraSprint Difference

**TeraSprint redefines software development by moving from manual coding to AI-orchestrated generation.**

Most project management tools simply track tasks. TeraSprint takes your raw idea, automatically generates a complete architectural report, builds an entire Agile backlog (Epics, User Stories, Tasks), and then deploys autonomous AI agents to **write, test, and execute the code** in a secure cloud sandbox.

<p align="center">
  <em>From a single sentence to a fully deployed application, powered by LangGraph and E2B</em>
</p>

### 🔬 Core Innovation Pillars

| Pillar | What It Means | Why It Matters |
|--------|---------------|----------------|
| **Autonomous PO Agent** | Transforms ideas into structured JSON backlogs | Eliminates hours of manual Agile planning and task creation |
| **LangGraph Orchestrator** | State-machine driven coding agent with reflection | Synthesizes code, validates AST, and auto-corrects execution errors |
| **Secure E2B Sandbox** | Code is executed in an isolated cloud Linux container | Guarantees safe, real-world testing of generated backend logic |
| **Dynamic LLM Fallback** | Automatic routing to Gemini/OpenRouter if Groq fails | Ensures 99.9% uptime for AI generation despite rate limits |
| **Real-Time IDE Workspace** | Bidirectional WebSockets stream the AI's thought process | Developers watch the code being written and executed live |

> *"Software engineering isn't just about writing code; it's about architecture and testing. TeraSprint automates the entire lifecycle."*

---

## ✨ Key Features & Architecture

### 🌐 1. Global System Architecture
The architecture relies on loose coupling between the Frontend (React) and the Backend (FastAPI). Standard REST requests handle the Kanban board, while a system of autonomous agents handles the complex logic in the background.

<p align="center">
  <img src="https://res.cloudinary.com/pnj96jym/image/upload/v1791233744/fig_global.png" alt="Global Architecture" width="600" />
</p>

### ⚡ 2. Real-Time Communication (WebSockets & IDE)
To offer a collaborative experience, the system uses bidirectional WebSockets. The Frontend opens a connection with FastAPI, and the orchestrator streams events (LLM reflection, generation, execution) in real-time.

<p align="center">
  <img src="https://res.cloudinary.com/pnj96jym/image/upload/v1791233744/fig_ws_seq.png" alt="WebSocket Sequence" width="600" />
</p>

### 🛡️ 3. LLM Resilience (Fallback Strategy)
To guarantee high availability, the network interceptor automatically routes the request to a secondary provider in case the primary fails, in a completely transparent manner for the user.

<p align="center">
  <img src="https://res.cloudinary.com/pnj96jym/image/upload/v1791233745/fig_fallback.png" alt="Fallback Strategy" width="600" />
</p>

### 🗄️ 4. Relational Model (Database)
The PostgreSQL database separates domains (Users, Workspaces, Projects, Backlog) and integrates `pgvector` for storing embeddings and enabling fast semantic search (RAG).

<p align="center">
  <img src="https://res.cloudinary.com/pnj96jym/image/upload/v1791233745/Mod%C3%A8leRelationnele.jpg" alt="Entity Relationship Model" width="600" />
</p>

### 🐙 5. Continuous Integration (Push to GitHub)
When the AI agent completes a task, the Backend packages the code, generates a detailed commit, and pushes it via the GitHub REST API.

<p align="center">
  <img src="https://res.cloudinary.com/pnj96jym/image/upload/v1791233744/fig_github.png" alt="GitHub Flow" width="600" />
</p>

### 👁️ 6. Observability and LLM Traces (Arize Phoenix)
Each AI call is instrumented via OpenTelemetry. The trace captures the exact prompt, latency, and cost, allowing developers to optimize agent performance.

<p align="center">
  <img src="https://res.cloudinary.com/pnj96jym/image/upload/v1791232859/phoenix_trace_details.png" alt="Trace Details" width="600" />
</p>

---

## 🚀 Quick Start

### 1. Configuration (`.env`)
The application requires a `.env` file in the `backend/` folder:

```env
# Database Configuration
DATABASE_URL=postgresql://admin:password@localhost:5432/terasprint

# Security and Authentication
JWT_SECRET=your_very_complex_secret_key
JWT_ALGORITHM=HS256
GOOGLE_CLIENT_ID=...
GITHUB_CLIENT_ID=...

# AI & Observability
GROQ_API_KEY=...
E2B_API_KEY=...
HF_TOKEN=...
LANGCHAIN_PROJECT="TeraSprint"

# E-mailing Service (SMTP)
SMTP_USER=contact@terasprint.com
SMTP_PASS=your_app_password
```

### 2. Startup (Docker)

```bash
# 1. Clone the project
git clone https://github.com/ABDELALIKHOLTY/TeraSprint.git
cd TeraSprint

# 2. Launch the full infrastructure
docker-compose up --build
```
*This will start the Frontend, Backend, PostgreSQL, and Arize Phoenix in a single command.*

---

## 📚 Documentation Suite

| Document | Description |
|----------|-------------|
| **[📘 Backend Documentation](./backend/README.md)** | FastAPI architecture, Agent orchestrators, DB schemas, LLM implementations |
| **[🎨 Frontend Documentation](./frontend/README.md)** | React components, WebSocket streaming, Vite configuration, UI/UX |

---

## 📄 License

MIT License — free for personal and commercial use.

---

<p align="center">
  <strong>Built by Abdelali Kholty with ❤️ for developers, product owners, and AI enthusiasts</strong>
  <br>
  <sub>Version 1.0.0 | Last Updated: October 2026</sub>
</p>
