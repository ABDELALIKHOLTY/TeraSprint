# 🚀 TeraSprint

**TeraSprint** est une plateforme innovante propulsée par l'Intelligence Artificielle pour la gestion de projets Agile et la génération automatisée de code. Elle permet de passer d'une simple idée à un backlog complet et à du code exécutable via des agents autonomes et un environnement de bac à sable (sandbox) sécurisé.

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

## ⚙️ De quoi avez-vous besoin ? (Configuration `.env`)

L'application repose sur un fichier `.env` situé dans le dossier `backend/`. Voici ce qu'il doit contenir (vous devez y mettre vos propres clés pour la sécurité) :

- **Configuration Base de Données :**
  - `DATABASE_URL` : L'URL de connexion à la base de données PostgreSQL (ex: `postgresql://admin:password@localhost:5432/terasprint`).
- **Sécurité et Authentification :**
  - `JWT_SECRET` / `JWT_ALGORITHM` : Clés pour la sécurisation des sessions.
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` : Pour la connexion SSO Google (OAuth).
  - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` : Pour la connexion SSO GitHub et les commits automatiques.
- **Clés API (Intelligence Artificielle et Exécution) :**
  - `GROQ_API_KEY` : Pour utiliser les modèles ultra-rapides de Groq (ex: Llama 3).
  - `E2B_API_KEY` : Indispensable pour exécuter le code généré dans un environnement Sandbox sécurisé dans le cloud.
  - `HF_TOKEN` : Token HuggingFace (si vous utilisez des modèles spécifiques).

## 🚀 Démarrer le Projet

1. **Cloner le projet** : 
   ```bash
   git clone https://github.com/votre_profil/TeraSprint.git
   cd TeraSprint
   ```

2. **Backend** : Allez dans le dossier `backend/`, installez les dépendances (`pip install -r requirements.txt`) et lancez avec `fastapi dev main.py`. (Voir le `README.md` du backend pour les détails).

3. **Frontend** : Allez dans le dossier `frontend/`, installez les dépendances (`npm install`) et lancez avec `npm run dev`. (Voir le `README.md` du frontend pour les détails).

4. **Docker** : Vous pouvez aussi lancer la base de données via le fichier `docker-compose.yml` présent à la racine.

---

📖 Pour plus de détails spécifiques, veuillez consulter les fichiers **`README.md`** situés dans les sous-dossiers `frontend/` et `backend/`.
