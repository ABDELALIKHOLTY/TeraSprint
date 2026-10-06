#  TeraSprint

**TeraSprint** est une plateforme innovante propulsée par l'Intelligence Artificielle pour la gestion de projets Agile et la génération automatisée de code. Elle permet de passer d'une simple idée à un backlog complet et à du code exécutable via des agents autonomes et un environnement de bac à sable (sandbox) sécurisé.



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

---

📖 Pour plus de détails spécifiques, veuillez consulter les documentations dédiées :
- 🔗 **[Documentation Backend (FastAPI, IA & Base de données)](./backend/README.md)**
- 🔗 **[Documentation Frontend (React, Vite & Tailwind)](./frontend/README.md)**
