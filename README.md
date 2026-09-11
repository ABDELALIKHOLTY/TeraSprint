# 🚀 TeraSprint

**TeraSprint** est une plateforme innovante propulsée par l'Intelligence Artificielle pour la gestion de projets Agile et la génération automatisée de code. Elle permet de passer d'une simple idée à un backlog complet et à du code exécutable via des agents autonomes et un environnement de bac à sable (sandbox) sécurisé.

## 🚧 Phase en cours (Current Phase)

Actuellement, le projet se concentre principalement sur le **Backlog et les Sprints**. Nous développons la génération et l'optimisation des Epics, User Stories et Tâches de manière intelligente via les agents IA.

## 🏗️ Architecture Globale

TeraSprint est divisé en deux parties principales :
- Un **Frontend** moderne (React / TypeScript / Vite / TailwindCSS).
- Un **Backend** robuste et asynchrone (Python / FastAPI) propulsé par des agents d'IA (LangGraph).

Voici l'architecture fonctionnelle sous forme de diagramme Mermaid :

```mermaid
graph TD
    subgraph Frontend [Frontend - React / Vite]
        UI[Interface Utilisateur]
        UI_Kanban[Vue Kanban]
        UI_Code[Workspace Coding WS]
        UI --> UI_Kanban
        UI --> UI_Code
    end

    subgraph Backend [Backend - FastAPI]
        API_Routes[Routes REST & WebSockets]
        DB[(Base de Données PostgreSQL)]
        
        subgraph Agents [Système Multi-Agents]
            PO_Agent[PO Agent - Génération Backlog & Archi]
            Code_Agent[Orchestrateur Code - LangGraph]
            Graph_Agent[Graph Agent - Analyse DB]
            Sandbox[Sandbox E2B - Exécution Code]
        end
        
        API_Routes <--> DB
        API_Routes <--> PO_Agent
        API_Routes <--> Code_Agent
        Code_Agent <--> Sandbox
        API_Routes <--> Graph_Agent
    end
    
    subgraph Services_LLM [Fournisseurs LLM]
        Ollama[Ollama Local]
        Groq[Groq Cloud]
        OpenRouter[OpenRouter]
        Gemini[Google Gemini]
    end

    UI_Kanban -- REST --> API_Routes
    UI_Code -- WebSockets --> API_Routes
    
    PO_Agent -- API --> Services_LLM
    Code_Agent -- API --> Services_LLM
    Graph_Agent -- API --> Services_LLM
```

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
  - `DATABASE_URL` : (ex: `postgresql://admin:password@localhost:5432/terasprint`).
- **Sécurité et Authentification :**
  - `JWT_SECRET` / `JWT_ALGORITHM` : Clés pour la sécurisation des sessions.
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` : (Optionnel) Pour le SSO Google.
  - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` : (Optionnel) Pour le SSO GitHub.
- **Intelligence Artificielle (Le Cœur du Système) :**
  - `GROQ_API_KEY` : (Requis) Pour utiliser les modèles ultra-rapides de Groq (Llama 3).
  - `E2B_API_KEY` : (Requis) Pour exécuter le code généré dans le Sandbox sécurisé cloud.
  - `HF_TOKEN` : (Optionnel) Token HuggingFace.

## 🚀 Démarrer le Projet

1. **Cloner le projet** : 
   ```bash
   git clone https://github.com/votre_profil/TeraSprint.git
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

---

📖 Pour plus de détails spécifiques, veuillez consulter les documentations dédiées :
- 🔗 **[Documentation Backend (FastAPI, IA & Base de données)](./backend/README.md)**
- 🔗 **[Documentation Frontend (React, Vite & Tailwind)](./frontend/README.md)**
