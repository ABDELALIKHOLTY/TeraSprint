import os
import json
import asyncio
import time
from dotenv import load_dotenv
from groq import AsyncGroq

load_dotenv()

client = AsyncGroq(
    api_key=os.getenv("GROQ_API_KEY"),
)

EPICS_TO_GENERATE = [
    "Architecture Sécurisée & Authentification Avancée (RBAC, 2FA)",
    "Moteur de Réservation & Concurrence Transactionnelle (Pessimistic Locking)",
    "Intégration Paiements (Stripe, Webhooks, Facturation)",
    "Module de Recherche Élastique (Filtres Avancés, Géolocalisation)",
    "Dashboard Analytique & Reporting (Graphiques, Exports CSV/PDF)",
    "Notifications Temps Réel & WebSockets (Email, SMS, Push)"
]

SCHEMA = """
{
  "id": "EPIC-X",
  "title": "...",
  "user_stories": [
    {
      "id": "US-X",
      "title": "...",
      "description": "...",
      "status": "TO DO",
      "priority": "Highest|High|Medium|Low",
      "story_points": 8,
      "acceptance_criteria": ["...", "..."],
      "tasks": [
        {
          "id": "TASK-X",
          "title": "...",
          "status": "TO DO",
          "priority": "Highest|High",
          "story_points": 5,
          "subtasks": ["...", "..."]
        }
      ]
    }
  ]
}
"""

async def generate_epic(index, epic_theme):
    print(f"Génération de l'Epic {index+1}/6: {epic_theme}...")
    prompt = f"""
Tu es un Architecte Logiciel Senior.
Génère UN objet JSON strict pour un Epic intitulé: "{epic_theme}".
Règles strictes :
1. L'Epic doit contenir EXACTEMENT 3 User Stories.
2. Chaque User Story doit avoir une description technique extrêmement poussée.
3. Chaque User Story doit contenir EXACTEMENT 4 Tâches (tasks) ultra-techniques (Base de données, Endpoints API, React, DevOps).
4. Ne renvoie QUE le JSON valide respectant ce schéma exact :
{SCHEMA}
"""
    try:
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.2
        )
        content = response.choices[0].message.content.strip()
        return json.loads(content)
    except Exception as e:
        print(f"Erreur sur {epic_theme}: {e}")
        return None

async def main():
    print("Démarrage de la génération massive du template expert...")
    valid_epics = []
    for i, theme in enumerate(EPICS_TO_GENERATE):
        epic = await generate_epic(i, theme)
        if epic:
            valid_epics.append(epic)
        await asyncio.sleep(2) # Eviter le Rate Limit Groq
    
    # Réparer les IDs pour qu'ils soient séquentiels
    for i, epic in enumerate(valid_epics):
        epic["id"] = f"EPIC-{i+1}"
        for j, us in enumerate(epic.get("user_stories", [])):
            us["id"] = f"US-{i+1}0{j+1}"
            for k, task in enumerate(us.get("tasks", [])):
                task["id"] = f"TASK-{i+1}0{j+1}{k+1}"

    final_json = {
        "expert_examples": [
            {
                "project_title": "SaaS B2B Ultimate : ERP & Réservation Premium",
                "epics": valid_epics
            }
        ]
    }
    
    os.makedirs("data", exist_ok=True)
    with open("data/expert_templates.json", "w", encoding="utf-8") as f:
        json.dump(final_json, f, ensure_ascii=False, indent=2)
        
    print("Génération terminée ! Fichier expert_templates.json mis à jour.")

if __name__ == "__main__":
    asyncio.run(main())
