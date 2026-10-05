from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
import json
import os
import subprocess
import shutil
import tempfile
from fastapi.responses import FileResponse
from services.agents.coding.orchestrator import DevOrchestrator
from langchain_core.messages import HumanMessage
from db.postgres import get_db
from api.routes.auth import get_current_user
from models.workspace_session import WorkspaceMessage, WorkspaceFile
from models.project_db import TaskDB, UserStoryDB, EpicDB, Project
from models.user import User
from sqlalchemy import and_
from sqlalchemy.orm import Session

from pydantic import BaseModel

router = APIRouter()


def _save_message(db, task_id: str, user_id, sender: str, content: str):
    """Sauvegarde un message en base de donnees."""
    try:
        msg = WorkspaceMessage(task_id=task_id, user_id=user_id, sender=sender, content=content)
        db.add(msg)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[DB] Erreur sauvegarde message: {e}", flush=True)


def _save_files(db, task_id: str, user_id, files: dict):
    """Upsert les fichiers generes en base de donnees (Virtual File System)."""
    try:
        for file_path, content in files.items():
            existing = db.query(WorkspaceFile).filter(and_(
                WorkspaceFile.task_id == task_id,
                WorkspaceFile.user_id == user_id,
                WorkspaceFile.file_path == file_path
            )).first()
            if existing:
                existing.content = content
            else:
                db.add(WorkspaceFile(
                    task_id=task_id, user_id=user_id,
                    file_path=file_path, content=content
                ))
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Echec de la sauvegarde des fichiers: {e}", flush=True)


def _delete_files(db, task_id: str, user_id, files: list):
    """Supprime les fichiers generes en base de donnees."""
    try:
        db.query(WorkspaceFile).filter(and_(
            WorkspaceFile.task_id == task_id,
            WorkspaceFile.user_id == user_id,
            WorkspaceFile.file_path.in_(files)
        )).delete(synchronize_session=False)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[DB] Erreur suppression fichiers: {e}", flush=True)

def _load_history(db, task_id: str, user_id):
    """Charge l historique de conversation depuis la base de donnees."""
    msgs = (
        db.query(WorkspaceMessage)
        .filter(and_(
            WorkspaceMessage.task_id == task_id,
            WorkspaceMessage.user_id == user_id
        ))
        .order_by(WorkspaceMessage.created_at.asc())
        .all()
    )
    return [{"id": str(m.id), "sender": m.sender, "text": m.content,
             "timestamp": m.created_at.isoformat()} for m in msgs]


def _load_files(db, task_id: str, user_id):
    """Charge TOUS les fichiers generes pour le PROJET entier, pas seulement la tache."""
    project_id = None
    
    proj = db.query(Project).filter(Project.id == task_id).first()
    if proj:
        project_id = proj.id
    else:
        task = db.query(TaskDB).filter(TaskDB.id == task_id).first()
        if task:
            us = db.query(UserStoryDB).filter(UserStoryDB.id == task.user_story_id).first()
            if us:
                epic = db.query(EpicDB).filter(EpicDB.id == us.epic_id).first()
                if epic:
                    project_id = epic.project_id
                    
    if not project_id:
        files = db.query(WorkspaceFile).filter(and_(
            WorkspaceFile.task_id == task_id,
            WorkspaceFile.user_id == user_id
        )).all()
        return {f.file_path: f.content for f in files}
        
    epics = db.query(EpicDB).filter(EpicDB.project_id == project_id).all()
    epic_ids = [e.id for e in epics]
    uss = db.query(UserStoryDB).filter(UserStoryDB.epic_id.in_(epic_ids)).all()
    us_ids = [us.id for us in uss]
    tasks = db.query(TaskDB).filter(TaskDB.user_story_id.in_(us_ids)).all()
    
    all_task_ids = [t.id for t in tasks] + [project_id]
    
    files = db.query(WorkspaceFile).filter(and_(
        WorkspaceFile.task_id.in_(all_task_ids),
        WorkspaceFile.user_id == user_id
    )).all()
    
    return {f.file_path: f.content for f in files}



class GitPushRequest(BaseModel):
    repo_name: str
    task_id: str
    branch_name: str = "main"

@router.get("/workspace/github/repos")
async def get_github_repos(current_user: User = Depends(get_current_user)):
    github_token = current_user.github_access_token
    if not github_token:
        return {"status": "error", "message": "Veuillez connecter votre compte GitHub."}
    import httpx
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.github.com/user/repos?sort=updated&per_page=100",
            headers={
                "Authorization": f"token {github_token}",
                "Accept": "application/vnd.github.v3+json"
            }
        )
        if resp.status_code != 200:
            return {"status": "error", "message": f"Erreur GitHub API: {resp.text}"}
        repos = resp.json()
        return {"status": "success", "repos": [repo["name"] for repo in repos]}

@router.get("/workspace/github/repos/{repo_name}/branches")
async def get_github_branches(repo_name: str, current_user: User = Depends(get_current_user)):
    github_token = current_user.github_access_token
    if not github_token:
        return {"status": "error", "message": "Veuillez connecter votre compte GitHub."}
    import httpx
    async with httpx.AsyncClient() as client:
        # Get username
        user_resp = await client.get("https://api.github.com/user", headers={"Authorization": f"token {github_token}"})
        if user_resp.status_code != 200:
            return {"status": "error", "message": "Erreur lors de la récupération de l'utilisateur."}
        username = user_resp.json().get("login")

        resp = await client.get(
            f"https://api.github.com/repos/{username}/{repo_name}/branches",
            headers={
                "Authorization": f"token {github_token}",
                "Accept": "application/vnd.github.v3+json"
            }
        )
        if resp.status_code == 200:
            return {"status": "success", "branches": [b["name"] for b in resp.json()]}
        elif resp.status_code == 404:
            return {"status": "success", "branches": []}
        return {"status": "error", "message": f"Erreur: {resp.text}"}

@router.post("/workspace/git-push")
async def workspace_git_push(req: GitPushRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        github_token = current_user.github_access_token
        if not github_token:
            return {"status": "error", "message": "Veuillez connecter votre compte GitHub."}
            
        import httpx
        # 1. Create the repo on GitHub if it doesn't exist
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.github.com/user/repos",
                json={"name": req.repo_name, "private": True},
                headers={
                    "Authorization": f"token {github_token}",
                    "Accept": "application/vnd.github.v3+json"
                }
            )
            if resp.status_code not in (201, 422):
                return {"status": "error", "message": f"Erreur GitHub API: {resp.text}"}
            
            user_resp = await client.get("https://api.github.com/user", headers={"Authorization": f"token {github_token}"})
            github_username = user_resp.json().get("login")

        repo_url = f"https://{github_username}:{github_token}@github.com/{github_username}/{req.repo_name}.git"

        # 2. Extract files to a temporary directory
        files = _load_files(db, req.task_id, current_user.id)
        if not files:
            return {"status": "error", "message": "Aucun fichier à pousser pour ce projet."}

        with tempfile.TemporaryDirectory() as workspace_dir:
            git_logs = []
            def run_git(args):
                res = subprocess.run(args, cwd=workspace_dir, capture_output=True, text=True)
                cmd_str = " ".join(args)
                git_logs.append(f"$ {cmd_str}\n{res.stdout}{res.stderr}")
                return res

            # A. Configurer Git et récupérer le dépôt existant
            run_git(["git", "init"])
            run_git(["git", "remote", "add", "origin", repo_url])
            run_git(["git", "config", "user.name", "TeraSprint AI"])
            run_git(["git", "config", "user.email", "ai@terasprint.app"])
            run_git(["git", "fetch", "origin"])

            # Essayer de se placer sur la branche existante
            res_checkout = run_git(["git", "checkout", req.branch_name])
            if res_checkout.returncode != 0:
                # La branche n'existe pas encore, on la crée
                run_git(["git", "checkout", "-b", req.branch_name])
            else:
                # Si elle existe, on s'assure d'être à jour (merge)
                run_git(["git", "merge", f"origin/{req.branch_name}", "--allow-unrelated-histories"])

            # B. Écrire les fichiers (ça va écraser les anciens et conserver ceux qui ne sont pas touchés)
            for file_path, content in files.items():
                full_path = os.path.join(workspace_dir, file_path)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, "w", encoding="utf-8") as f:
                    f.write(content)

            # C. Ajouter, commit et Push standard (sans force)
            run_git(["git", "add", "."])
            run_git(["git", "commit", "-m", "Auto-commit from TeraSprint"])
            
            res = run_git(["git", "push", "-u", "origin", req.branch_name])
            
            if res.returncode != 0:
                return {"status": "error", "message": f"Erreur lors du push: {res.stderr}", "logs": "\n".join(git_logs)}

        return {"status": "success", "message": "Code poussé avec succès vers GitHub !", "logs": "\n".join(git_logs)}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/workspace/{task_id}/export-zip")
async def workspace_export_zip(task_id: str, db: Session = Depends(get_db)):
    try:
        from models.workspace_session import WorkspaceFile
        from models.project_db import TaskDB, Project
        import tempfile
        import uuid
        import re
        
        project = db.query(Project).filter(Project.id == task_id).first()
        if project:
            raw_title = project.title
        else:
            task = db.query(TaskDB).filter(TaskDB.id == task_id).first()
            if task and task.user_story and task.user_story.epic and task.user_story.epic.project:
                raw_title = task.user_story.epic.project.title
            else:
                raw_title = "TeraSprintProject"
                
        project_title = re.sub(r'[^a-zA-Z0-9_-]', '_', raw_title)
            
        files = db.query(WorkspaceFile).filter(WorkspaceFile.task_id == task_id).all()
        if not files:
            return {"status": "error", "message": "Aucun fichier a exporter pour cette tache."}
            
        export_id = str(uuid.uuid4())
        base_temp_dir = os.path.join(tempfile.gettempdir(), f"terasprint_export_{export_id}")
        
        project_dir = os.path.join(base_temp_dir, project_title)
        os.makedirs(project_dir, exist_ok=True)
        
        for f in files:
            full_path = os.path.join(project_dir, f.file_path)
            dir_name = os.path.dirname(full_path)
            
            current_path = project_dir
            for part in f.file_path.split('/')[:-1]:
                current_path = os.path.join(current_path, part)
                if os.path.isfile(current_path):
                    os.remove(current_path) 
                os.makedirs(current_path, exist_ok=True)
                
            if os.path.isdir(full_path):
                continue 
                
            with open(full_path, "w", encoding="utf-8") as out:
                out.write(f.content)
                
        zip_path = os.path.join(tempfile.gettempdir(), f"{project_title}_{export_id}.zip")
        shutil.make_archive(zip_path.replace(".zip", ""), "zip", base_temp_dir)
        
        shutil.rmtree(base_temp_dir)
        
        return FileResponse(zip_path, filename=f"{project_title}.zip", media_type="application/zip")
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.websocket("/workspace/chat")
async def workspace_chat(websocket: WebSocket):
    await websocket.accept()

    orchestrator = DevOrchestrator()
    thread_id = f"session_{id(websocket)}"
    config = {"configurable": {"thread_id": thread_id}}

    session_info = {}
    plan_generated = False
    current_user = None

    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)

            groq_api_key = None
            openrouter_api_key = None
            gemini_api_key = None
            token = payload.get("token")

            db_gen = get_db()
            db = next(db_gen)
            try:
                if token:
                    try:
                        current_user = await get_current_user(token=token, db=db)
                        groq_api_key = current_user.api_key_groq
                        openrouter_api_key = current_user.api_key_openrouter
                        gemini_api_key = current_user.api_key_gemini
                    except Exception:
                        current_user = None

                if payload.get("type") == "init" or "user_input" not in payload:
                    task_id = payload.get("task_id")
                    session_info = {
                        "kanban_context": payload.get("kanban", {}),
                        "task_context": payload.get("task_context"),  
                        "task_id": task_id,
                        "ai_model": payload.get("model", "groq:llama-3.1-70b-versatile"),
                    }
                    plan_generated = False
                    print(f"[WS] Session initialisee: task={task_id}, model={session_info.get('ai_model')}, context_loaded={session_info.get('task_context') is not None}", flush=True)


                    
                    if current_user and task_id:
                        history = _load_history(db, task_id, current_user.id)
                        saved_files = _load_files(db, task_id, current_user.id)

                        if history:
                            plan_generated = True 
                            await websocket.send_json({
                                "type": "session_restore",
                                "messages": history,
                                "files": saved_files,
                                "plan_generated": True
                            })
                            print(f"[WS] Session restauree: {len(history)} messages, {len(saved_files)} fichiers", flush=True)
                    continue

                model = payload.get("model") or session_info.get("ai_model", "groq:llama-3.1-70b-versatile")
                user_text = payload["user_input"]
                task_id = session_info.get("task_id")

                if current_user and task_id:
                    _save_message(db, task_id, current_user.id, "user", user_text)

                try:
                    print(f"[WS] Traitement message avec modele: {model}", flush=True)
                    
                    saved_files_dict = {}
                    if current_user and task_id:
                        saved_files_dict = _load_files(db, task_id, current_user.id)
                    
                    input_state = {
                        "messages": [HumanMessage(content=user_text)],
                        "ai_model": model,
                        "groq_api_key": groq_api_key,
                        "openrouter_api_key": openrouter_api_key,
                        "gemini_api_key": gemini_api_key,
                        "existing_files_dict": saved_files_dict,
                        "error_trace": None,
                        "generated_code": {},
                    }
                    
                    try:
                        current_state = orchestrator.app.get_state(config).values
                        if not current_state:
                            input_state.update({
                                "kanban_context": session_info.get("kanban_context", {}),
                                "task_context": session_info.get("task_context"),
                                "task_id": task_id,
                                "generated_code": {},
                                "deleted_files": [],
                                "current_plan": "",
                                "error_trace": None,
                                "status": "init",
                            })
                    except Exception:
                        pass

                    async for event in orchestrator.app.astream(input_state, config=config):
                        for node_name, node_state in event.items():
                            if node_name == "agent":
                                messages = node_state.get("messages", [])
                                if messages:
                                    last_msg = messages[-1]
                                    ai_text = last_msg.content
                                    print(f"[WS] AI a repondu ({len(ai_text)} chars)", flush=True)
                                    await websocket.send_json({"type": "ai_message", "text": ai_text})
                                    
                                    if current_user and task_id:
                                        _save_message(db, task_id, current_user.id, "ai", ai_text)

                                files = node_state.get("generated_code", {})
                                if files:
                                    print(f"[WS] Code recu: {list(files.keys())}", flush=True)
                                    await websocket.send_json({"type": "code_update", "files": files})
                                    
                                    if current_user and task_id:
                                        _save_files(db, task_id, current_user.id, files)
                                        summary = f"Fichiers generes: {', '.join(files.keys())}"
                                        _save_message(db, task_id, current_user.id, "system", summary)
                                        
                                deleted_files = node_state.get("deleted_files", [])
                                if deleted_files:
                                    print(f"[WS] Suppression de fichiers: {deleted_files}", flush=True)
                                    await websocket.send_json({"type": "code_delete", "files": deleted_files})
                                    
                                    if current_user and task_id:
                                        _delete_files(db, task_id, current_user.id, deleted_files)
                                        summary = f"Fichiers supprimes: {', '.join(deleted_files)}"
                                        _save_message(db, task_id, current_user.id, "system", summary)
                                        
                            elif node_name == "ast":
                                error_trace = node_state.get("error_trace")
                                if error_trace:
                                    msg = f"[AST] Validation echouee: {error_trace}"
                                    await websocket.send_json({"type": "system_message", "text": msg})
                                    if current_user and task_id:
                                        _save_message(db, task_id, current_user.id, "system", msg)
                                else:
                                    msg = "[AST] Validation syntaxique reussie."
                                    await websocket.send_json({"type": "system_message", "text": msg})
                                    if current_user and task_id:
                                        _save_message(db, task_id, current_user.id, "system", msg)
                                        
                            elif node_name == "sandbox":
                                error_trace = node_state.get("error_trace")
                                status = node_state.get("status")
                                if status == "sandbox_success":
                                    msg = "[SANDBOX] Execution reussie dans l'environnement E2B."
                                    await websocket.send_json({"type": "system_message", "text": msg})
                                    if current_user and task_id:
                                        _save_message(db, task_id, current_user.id, "system", msg)
                                elif error_trace:
                                    msg = f"[SANDBOX] Erreur d'execution:\n```\n{error_trace}\n```"
                                    await websocket.send_json({"type": "system_message", "text": msg})
                                    if current_user and task_id:
                                        _save_message(db, task_id, current_user.id, "system", msg)
                                        
                            elif node_name == "sweep":
                                msg = "[SYSTEM] Analyse des erreurs et preparation d'un correctif par l'IA..."
                                await websocket.send_json({"type": "system_message", "text": msg})
                                if current_user and task_id:
                                    _save_message(db, task_id, current_user.id, "system", msg)

                except Exception as graph_e:
                    import traceback
                    traceback.print_exc()
                    error_text = f"L'agent a rencontre une erreur: {str(graph_e)}"
                    await websocket.send_json({"type": "error", "text": error_text})
                    if current_user and task_id:
                        _save_message(db, task_id, current_user.id, "system", f"ERREUR: {str(graph_e)}")

            finally:
                db_gen.close()

    except WebSocketDisconnect:
        print(f"[WS] Client deconnecte: {thread_id}", flush=True)
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "text": str(e)})
        except Exception:
            pass
