# 🧠 TeraSprint - Backend

Bienvenue dans la section Backend de TeraSprint. 

Ce backend est développé en **Python** avec le framework **FastAPI**. Il est le cœur du système d'intelligence artificielle et de la logique métier.

## 📁 Architecture du Dossier

- **`api/routes/`** : Contient tous les endpoints de l'application (Auth, Projets, WebSockets, etc.).
- **`core/`** : Configuration générale (sécurité, settings).
- **`models/`** : Modèles SQLAlchemy qui définissent la structure de la base de données (User, Project, Epic, Task, etc.).
- **`schemas/`** : Modèles Pydantic pour la validation des données entrantes/sortantes (Typage fort).
- **`services/`** : La logique métier complexe et l'intégration des LLMs.
  - **`agents/`** : Les différents agents autonomes de TeraSprint.
    - **`conception/`** : L'Agent "Product Owner" (PO) qui transforme les idées en Backlog.
    - **`coding/`** : L'Orchestrateur (utilisant LangGraph) qui génère le code, l'analyse via un AST, et l'exécute de façon sécurisée (module Sandbox E2B).
- **`db/`** : Configuration et sessions de la base PostgreSQL.
- **`main.py`** : Point d'entrée de l'application FastAPI.

## 🔑 Variables d'Environnement (`.env`)

Créez un fichier `.env` à la racine de ce dossier `backend/`.
Il doit contenir (entre autres) :

```env
DATABASE_URL=postgresql://user:password@localhost:5432/terasprint
JWT_SECRET=votre_cle_secrete_tres_complexe
JWT_ALGORITHM=HS256

# SSO
GOOGLE_CLIENT_ID=votre_id
GOOGLE_CLIENT_SECRET=votre_secret
GITHUB_CLIENT_ID=votre_id
GITHUB_CLIENT_SECRET=votre_secret

# AI & Exécution
GROQ_API_KEY=votre_cle_groq
E2B_API_KEY=votre_cle_e2b_sandbox
```

## 🚀 Installation & Démarrage

1. **Créer un environnement virtuel (recommandé)** :
   ```bash
   python -m venv venv
   source venv/bin/activate  # Sur Windows: venv\Scripts\activate
   ```

2. **Installer les dépendances** :
   ```bash
   pip install -r requirements.txt
   ```

3. **Lancer le serveur de développement** :
   ```bash
   fastapi dev main.py
   # Ou alternativement : uvicorn main:app --reload
   ```

L'API sera disponible sur `http://localhost:8000`. Vous pouvez consulter la documentation interactive Swagger sur `http://localhost:8000/docs`.

## 🤖 Comment ça marche (Agents IA) ?

- **WebSockets (`api/routes/websockets.py`)** : Permet une communication en temps réel avec le Frontend pour afficher le code généré en streaming.
- **Orchestrateur (`services/agents/coding/orchestrator.py`)** : Utilise un graphe d'états (StateGraph) pour planifier, écrire du code, le tester via la Sandbox (`sandbox.py`), et le corriger (Sweep) en cas d'erreur.
- **Fournisseurs LLMs** : Le fichier `llm_service.py` gère le routing dynamique entre Ollama (local), Groq, Gemini et OpenRouter selon le choix de l'utilisateur.
