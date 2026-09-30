import re

path = r'c:\Users\abdel\OneDrive\Desktop\projetETE\TeraSprint\backend\api\routes\projects.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update 1: add JSON fields in get_project
old1 = '''                "start_date": t.start_date.isoformat() if t.start_date else None,
                "end_date": t.end_date.isoformat() if t.end_date else None,
                "assignee_id": str(t.assignee_id) if t.assignee_id else None,
                "assignee": user_dict.get(str(t.assignee_id)) if t.assignee_id else None
            } for t in tasks]'''

new1 = '''                "start_date": t.start_date.isoformat() if t.start_date else None,
                "end_date": t.end_date.isoformat() if t.end_date else None,
                "assignee_id": str(t.assignee_id) if t.assignee_id else None,
                "assignee": user_dict.get(str(t.assignee_id)) if t.assignee_id else None,
                "chat_history": t.chat_history,
                "attachments": t.attachments,
                "history": t.history,
                "links": t.links,
                "time_logs": t.time_logs
            } for t in tasks]'''

if old1 in content:
    content = content.replace(old1, new1)
    print("Replaced old1")

# Update 2: update_task to save JSON fields
old2 = '''        if "assignee_id" in task_data:
            try:
                import uuid
                db_task.assignee_id = uuid.UUID(task_data["assignee_id"]) if task_data["assignee_id"] else None
            except ValueError:
                pass
        
        from dateutil import parser'''

new2 = '''        if "assignee_id" in task_data:
            try:
                import uuid
                db_task.assignee_id = uuid.UUID(task_data["assignee_id"]) if task_data["assignee_id"] else None
            except ValueError:
                pass
        
        if "chat_history" in task_data: db_task.chat_history = task_data["chat_history"]
        if "attachments" in task_data: db_task.attachments = task_data["attachments"]
        if "history" in task_data: db_task.history = task_data["history"]
        if "links" in task_data: db_task.links = task_data["links"]
        if "time_logs" in task_data: db_task.time_logs = task_data["time_logs"]

        from dateutil import parser'''

if old2 in content:
    content = content.replace(old2, new2)
    print("Replaced old2")
    
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
