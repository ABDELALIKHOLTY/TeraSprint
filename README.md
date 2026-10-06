<p align="center">
  <img src="https://res.cloudinary.com/pnj96jym/image/upload/v1791329138/TeraSprint_logo.png" alt="TeraSprint Logo" width="400">
</p>

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

<p align="center">
  <a href="#the-terasprint-difference">The TeraSprint Difference</a> •
  <a href="#key-features--architecture">Architecture & Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#documentation-suite">Documentation</a>
</p>

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
