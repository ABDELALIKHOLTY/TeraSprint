# 🎨 TeraSprint - Frontend

Bienvenue dans la section Frontend de TeraSprint.

Ce projet est construit avec **React**, **TypeScript**, et **Vite**, offrant une expérience de développement ultra-rapide et un typage strict pour éviter les erreurs. Le style est géré par **TailwindCSS**.

## 📁 Architecture du Dossier

- **`src/`** : Le cœur de l'application React.
  - **`components/`** : Composants réutilisables de l'interface (Boutons, Modals, Cartes, etc.).
  - **`pages/`** : Les vues principales de l'application (Dashboard, Vue Kanban, Workspace de génération de code).
  - **`services/`** : Les fonctions d'appels API vers le backend FastAPI (REST et connexions WebSockets).
  - **`hooks/`** : Custom React Hooks pour la gestion d'état complexe.
  - **`assets/`** : Images, icônes, et fichiers statiques globaux.
- **`public/`** : Fichiers statiques accessibles directement.
- **`vite.config.ts`** : Configuration du bundler Vite.
- **`tailwind.config.js`** : Configuration du design system et des classes utilitaires de Tailwind.

## 🚀 Installation & Démarrage

Assurez-vous d'avoir [Node.js](https://nodejs.org/) installé sur votre machine.

1. **Installer les dépendances** :
   Dans ce dossier `frontend/`, exécutez la commande suivante :
   ```bash
   npm install
   ```

2. **Démarrer le serveur de développement** :
   ```bash
   npm run dev
   ```

Le Frontend sera accessible généralement sur `http://localhost:5173`. 
*(Vérifiez bien que votre backend tourne sur le port `8000` pour que l'API et les WebSockets communiquent correctement).*

## 🔌 Connexion au Backend

Les appels API (pour créer un projet, s'authentifier, etc.) se font via des requêtes HTTP (fetch ou axios). 
Pour l'espace de travail collaboratif et de génération de code (le `Workspace`), le frontend utilise des **WebSockets** pour recevoir le code généré en temps réel, caractère par caractère, depuis les agents d'IA du Backend.
