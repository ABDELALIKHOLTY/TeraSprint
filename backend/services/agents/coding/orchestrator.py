import os
import json
import operator
import ast
from typing import Dict, List, TypedDict, Annotated, Sequence
from langgraph.graph import StateGraph, END
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage
from langgraph.checkpoint.memory import MemorySaver
from mem0 import Memory

try:
    mem0_config = {
        "llm": {
            "provider": "ollama",
            "config": {
                "model": "llama3.2:1b",
                "temperature": 0
            }
        },
        "embedder": {
            "provider": "huggingface",
            "config": {
                "model": "sentence-transformers/all-MiniLM-L6-v2"
            }
        },
        "vector_store": {
            "provider": "qdrant",
            "config": {
                "collection_name": "terasprint_mem0",
                "embedding_model_dims": 384
            }
        }
    }
    global_semantic_memory = Memory.from_config(mem0_config)
except Exception as e:
    print(f"[DEBUG] Impossible d'initialiser Mem0 globalement : {e}")
    global_semantic_memory = None

from services.agents.coding.sandbox import execute_in_sandbox
from core.config import settings
from services.llm_factory import get_llm_client

class AgentState(TypedDict):
    kanban_context: Dict
    task_id: str | None
    task_context: Dict | None
    ai_model: str
    groq_api_key: str | None
    openrouter_api_key: str | None
    gemini_api_key: str | None
    messages: Annotated[Sequence[BaseMessage], operator.add]
    current_plan: str
    generated_code: Dict[str, str]
    deleted_files: List[str] | None
    existing_files_dict: Dict[str, str] | None
    memory_context: str | None
    error_trace: str | None
    status: str

def _get_workspace_tree(filepaths: List[str]) -> str:
    if not filepaths:
        return "Dossier vide."
    
    # Construction d'un arbre virtuel à partir des chemins
    tree = {}
    for path in filepaths:
        parts = path.split('/')
        current = tree
        for part in parts:
            if part not in current:
                current[part] = {}
            current = current[part]
            
    def render_tree(d, level=0):
        lines = []
        indent = ' ' * 4 * level
        for key, subtree in sorted(d.items()):
            if subtree:  # C'est un dossier
                lines.append(f"{indent}{key}/")
                lines.extend(render_tree(subtree, level + 1))
            else:  # C'est un fichier
                lines.append(f"{indent}{key}")
        return lines
        
    return '\n'.join(render_tree(tree))

class DevOrchestrator:
    def __init__(self):
        self._init_observability()
        self.workflow = StateGraph(AgentState)
        self.memory_saver = MemorySaver()
        self.semantic_memory = global_semantic_memory
        self._build_graph()
        self.app = self.workflow.compile(
            checkpointer=self.memory_saver
        )

    def _init_observability(self):
        os.environ["LANGCHAIN_TRACING_V2"] = "false"

    async def _node_memory(self, state: AgentState) -> dict:
        print("[DEBUG] Entree dans _node_memory", flush=True)
        task_id = state.get("task_id", "general")
        
        memories_text = ""
        if self.semantic_memory:
            try:
                memories = self.semantic_memory.search(query=f"Task {task_id}", filters={"user_id": "terasprint_user"})
                if memories:
                    memories_text = "\n".join([f"- {m['memory']}" for m in memories])
                    print(f"[DEBUG] Mem0 a extrait {len(memories)} souvenirs utiles.", flush=True)
            except Exception as e:
                print(f"[DEBUG] Erreur Mem0 : {e}", flush=True)

        existing_files = state.get("existing_files_dict", {})
        tree_text = _get_workspace_tree(list(existing_files.keys())) if existing_files else "Dossier vide."

        memory_context = f"""
[FICHIERS EXISTANTS DANS LE WORKSPACE]
(Voici la liste des fichiers actuellement dans votre projet. Ne recreez pas ces fichiers s'ils existent deja, modifiez-les)
{tree_text}

[HISTORIQUE & SOUVENIRS (Mem0)]
{memories_text if memories_text else "Aucun souvenir precedent."}
"""
        return {"status": "memory_loaded", "memory_context": memory_context}

    async def _node_agent(self, state: AgentState) -> dict:
        print("[DEBUG] Entree dans _node_agent", flush=True)
        model_id = state.get("ai_model", "groq:llama-3.1-70b-versatile")
        client, actual_model = get_llm_client(model_id, state.get("groq_api_key"), state.get("openrouter_api_key"), state.get("gemini_api_key"), async_client=True)
        
        task_id = state.get("task_id")
        kanban = state.get("kanban_context", {})
        structured_ctx = state.get("task_context")
        
        task_context_str = "Pas de contexte specifique fourni."
        if structured_ctx and structured_ctx.get("task"):
            t = structured_ctx["task"]
            us = structured_ctx.get("user_story") or {}
            epic = structured_ctx.get("epic") or {}
            project = structured_ctx.get("project") or {}
            task_context_str = f"""
PROJET: {project.get('title', 'N/A')}
EPIC: {epic.get('title', 'N/A')}
USER STORY: {us.get('title', 'N/A')} — {us.get('description', '')}

TACHE ACTUELLE:
- Titre: {t.get('title', 'N/A')}
- Description: {t.get('description', 'N/A')}
- Sous-taches: {t.get('subtasks', [])}

ARCHITECTURE EXISTANTE: {project.get('architecture_report', 'Aucun')[:1000] if project.get('architecture_report') else 'Aucun'}
"""
        elif task_id and kanban:
            task_context_str = f"Contexte Kanban partiel: {json.dumps(kanban, ensure_ascii=False)[:2000]}"
            
        memory_ctx = state.get("memory_context")
        if memory_ctx:
            task_context_str += f"\n\n{memory_ctx}"

        messages = list(state.get("messages", []))
        existing_files_dict = state.get("existing_files_dict") or {}
        
        files_str = ""
        if existing_files_dict:
            for filepath, content in existing_files_dict.items():
                truncated_content = content[:3000] + "\n...[TRONQUÉ]" if len(content) > 3000 else content
                files_str += f"\n--- Contenu en mémoire: {filepath} ---\n{truncated_content}\n"
        else:
            files_str = "Aucun fichier généré récemment en base de données."

        file_tree = _get_workspace_tree(list(existing_files_dict.keys()))

        system_prompt = f"""Tu es DevOrchestrator, un assistant expert en Pair-Programming, Architecture Logicielle et Developpement.
Tu discutes avec l'utilisateur pour l'aider a realiser sa tache. 

ATTENTION: Tu AS UN ACCÈS TOTAL ET DIRECT à l'explorateur de fichiers de l'utilisateur via les balises XML décrites ci-dessous. Tu ne dois JAMAIS dire que tu n'as pas accès à son système ou lui demander d'exécuter des commandes `mkdir` dans son terminal. L'IDE s'occupe de créer les dossiers automatiquement quand tu génères un fichier.

Voici le contexte de la tache sur laquelle vous travaillez :
{task_context_str}

ARBORESCENCE PHYSIQUE ACTUELLE DU PROJET (Ce qui existe déjà réellement) :
{file_tree}

CODE DES FICHIERS RÉCEMMENT MODIFIÉS (En mémoire) :
{files_str}

RÈGLES IMPORTANTES (POUR L'EXPLORATEUR DE FICHIERS) :
1. **Dossier Racine (CRITIQUE)** : L'espace de travail actuel EST DÉJÀ le dossier du projet ! NE CRÉE JAMAIS un dossier racine portant le nom du projet (ex: NE FAIS PAS `<file path="LivePoll/backend/...` ou `<file path="MonProjet/frontend/...`). Tous tes chemins DOIVENT commencer directement par les dossiers techniques (ex: `<file path="backend/...` ou `<file path="frontend/...`).
2. **Respect de l'Architecture Existante** : Analyse très attentivement l'ARBORESCENCE PHYSIQUE ci-dessus ! Si des fichiers existent déjà dans `backend/`, modifie-les en utilisant leur chemin EXACT. Ne crée jamais de doublons.
3. **Dossiers vides (Architecture sans code)** : IL EST STRICTEMENT INTERDIT de juste dessiner l'arbre en texte. Pour construire une arborescence, tu DOIS utiliser la balise `<file>` en créant un fichier caché `.gitkeep` dans CHAQUE dossier que tu veux créer.
4. **Génération de l'Architecture Uniquement** : Si l'utilisateur te demande juste l'architecture, NE GÉNÈRE AUCUN FICHIER DE CODE COMPLET (`.ts`, `.js`, etc.). Contente-toi des `.gitkeep`.
5. **Génération de Code** : Ne génère que les fichiers que tu modifies.
6. **Suppression de Fichiers** : Tu peux supprimer un fichier avec la balise `<delete path="NOM_DU_FICHIER_A_SUPPRIMER" />`.

FORMAT POUR MODIFIER L'EXPLORATEUR (OBLIGATOIRE ET STRICT) :
L'UNIQUE moyen de créer ou modifier un fichier est d'utiliser LA BALISE XML `<file>`. Si tu écris du code en dehors de cette balise (ex: dans un bloc markdown ` ``` `), LE CODE SERA PERDU et l'utilisateur ne le verra jamais dans son éditeur.

- Pour Créer/Modifier un fichier, tu DOIS utiliser EXACTEMENT cette syntaxe :
<file path="chemin/complet/vers/fichier.ext">
Le contenu du fichier ici...
</file>
<file path="dossier_reel/MonComposant.tsx">
import React from 'react';

export const MonComposant = () => <div>Hello</div>;
</file>

- Pour Supprimer un fichier (EXEMPLE DE SYNTAXE) :
<delete path="dossier_reel/vieux_fichier.ts" />
"""
        
        formatted_messages = [{"role": "system", "content": system_prompt}]
        for msg in messages:
            role = "user" if msg.type == "human" else "assistant"
            content = str(msg.content) if msg.content else ""
            
            if role == "assistant":
                import re
                try:
                    content = re.sub(r'<file\s+path="[^"]+">.*?</file>', '\n[Fichier généré précédemment]\n', content, flags=re.DOTALL)
                    content = re.sub(r'<delete\s+path="[^"]+"\s*/>', '\n[Fichier supprimé précédemment]\n', content)
                except Exception:
                    pass
                    
            formatted_messages.append({"role": role, "content": content})

        print(f"[DEBUG] Appel LLM Agent avec modele: {actual_model}", flush=True)
        try:
            response = await client.chat.completions.create(
                model=actual_model,
                messages=formatted_messages,
                temperature=0.3
            )
            print("[DEBUG] Reponse LLM Agent recue", flush=True)
        except Exception as e:
            print(f"[ERROR] Echec LLM Agent: {e}", flush=True)
            raise e
            
        ai_response_text = response.choices[0].message.content
        
        generated_code = {}
        if "<file" in ai_response_text:
            import re
            try:
                matches = re.finditer(r'<file\s+path=[\'"]([^\'"]+)[\'"]>\s*(.*?)\s*</file>', ai_response_text, re.DOTALL)
                for match in matches:
                    path = match.group(1).strip()
                    content = match.group(2)
                    generated_code[path] = content
            except Exception as e:
                print(f"[ERROR] Parsing XML file echoue: {e}", flush=True)

        if not generated_code:
            import re
            try:
                fallback_matches = re.finditer(
                    r'(?:Fichier|File|Chemin)\s*:?\s*\*?`?([a-zA-Z0-9_./-]+)`?\*?\s*\n+```[a-zA-Z]*\n(.*?)\n```', 
                    ai_response_text, 
                    re.IGNORECASE | re.DOTALL
                )
                for match in fallback_matches:
                    path = match.group(1).strip()
                    content = match.group(2)
                    if path not in generated_code:
                        generated_code[path] = content
            except Exception as e:
                print(f"[ERROR] Parsing Markdown fallback echoue: {e}", flush=True)

        if not generated_code:
            import re
            try:
                blocks = re.finditer(r'```[a-zA-Z]*\n(.*?)\n```', ai_response_text, re.DOTALL)
                for i, block in enumerate(blocks):
                    code = block.group(1)
                    text_before = ai_response_text[:block.start()].strip()
                    if text_before:
                        last_line_before = text_before.split('\n')[-1]
                        path_match = re.search(r'([a-zA-Z0-9_./-]+\.[a-zA-Z0-9]+)', last_line_before)
                        if path_match:
                            path = path_match.group(1).strip()
                            if path not in generated_code:
                                generated_code[path] = code
            except Exception as e:
                print(f"[ERROR] Ultimate fallback echoue: {e}", flush=True)
                
        deleted_files = []
        if "<delete" in ai_response_text:
            import re
            try:
                matches = re.finditer(r'<delete\s+path=[\'"]([^\'"]+)[\'"]\s*/?>', ai_response_text)
                for match in matches:
                    deleted_files.append(match.group(1).strip())
            except Exception as e:
                print(f"[ERROR] Parsing XML delete echoue: {e}", flush=True)

        clean_response_text = ai_response_text
        if generated_code or deleted_files:
            try:
                import re
                clean_response_text = re.sub(r'<file\s+path="[^"]+">.*?</file>', '', clean_response_text, flags=re.DOTALL)
                clean_response_text = re.sub(r'<file\s+path="[^"]+">.*$', '', clean_response_text, flags=re.DOTALL)
                clean_response_text = re.sub(r'<delete\s+path="[^"]+"\s*/?>', '', clean_response_text)
                clean_response_text = clean_response_text.strip()
                if not clean_response_text:
                    clean_response_text = "J'ai généré les fichiers demandés."
            except Exception as e:
                print(f"[DEBUG] Mem0 erreur: {e}", flush=True)

        new_message = AIMessage(content=clean_response_text)
        
        return {
            "messages": [new_message],
            "generated_code": generated_code,
            "deleted_files": deleted_files,
            "status": "responded",
            "error_trace": None
        }

    async def _node_sandbox(self, state: AgentState) -> dict:
        print("[DEBUG] Entree dans _node_sandbox", flush=True)
        generated_code = state.get("generated_code", {})
        
        if not generated_code:
            return {"status": "sandbox_success", "error_trace": None}
            
        try:
            results = execute_in_sandbox(generated_code)
            if results.get("success"):
                return {"status": "sandbox_success", "error_trace": None}
            else:
                return {"status": "sandbox_failed", "error_trace": results.get("error")}
        except Exception as e:
            return {"status": "sandbox_failed", "error_trace": str(e)}

    async def _node_sweep(self, state: AgentState) -> dict:
        print("[DEBUG] Entree dans _node_sweep", flush=True)
        error_trace = state.get("error_trace")
        if error_trace:
            new_msg = HumanMessage(content=f"L'exécution ou la validation du code a échoué avec l'erreur suivante :\n```\n{error_trace}\n```\nCorrige cette erreur et renvoie uniquement le code corrigé.")
            return {"messages": [new_msg]}
        return {}

    def _build_graph(self):
        self.workflow.add_node("memory", self._node_memory)
        self.workflow.add_node("agent", self._node_agent)
        self.workflow.add_node("sandbox", self._node_sandbox)
        self.workflow.add_node("sweep", self._node_sweep)
        
        self.workflow.set_entry_point("memory")
        self.workflow.add_edge("memory", "agent")
        
        def should_test(state: AgentState):
            if not state.get("generated_code"):
                return "end"
            return "sandbox"
            
        def sandbox_condition(state: AgentState):
            if state.get("error_trace"):
                return "sweep"
            return "end"
            
        self.workflow.add_conditional_edges("agent", should_test, {"end": END, "sandbox": "sandbox"})
        self.workflow.add_conditional_edges("sandbox", sandbox_condition, {"sweep": "sweep", "end": END})
        self.workflow.add_edge("sweep", "agent")

async def start_coding_workflow(task_id: str, kanban_payload: dict, thread_id: str = "1", ai_model: str = "llama-3.1-70b-versatile", gemini_api_key: str = None):
    orchestrator = DevOrchestrator()
    state = {
        "task_id": task_id,
        "kanban_context": kanban_payload,
        "ai_model": ai_model,
        "groq_api_key": kanban_payload.get("groq_api_key"),
        "openrouter_api_key": kanban_payload.get("openrouter_api_key"),
        "gemini_api_key": gemini_api_key,
        "messages": [HumanMessage(content="Bonjour, je suis pret.")],
        "generated_code": {},
        "error_trace": None,
        "status": "init"
    }
    config = {"configurable": {"thread_id": thread_id}}
    async for event in orchestrator.app.astream(state, config=config):
        print(event)
