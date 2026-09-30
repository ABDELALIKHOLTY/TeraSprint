import re

path = r'c:\Users\abdel\OneDrive\Desktop\projetETE\TeraSprint\backend\api\routes\auth.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import if missing
if "from services.storage_service import storage_service" not in content:
    content = content.replace("import httpx", "import httpx\nfrom services.storage_service import storage_service")

# Function to inject image download logic
google_old = '''            first_name = user_info.first_name or name.split(' ')[0]
            last_name = user_info.last_name or (name.split(' ')[1] if len(name.split(' ')) > 1 else "")
            avatar_url = user_info.picture
            saas_email = f"{first_name.lower()}.{last_name.lower()}@terasprint.com" if last_name else f"{first_name.lower()}@terasprint.com"'''

google_new = '''            first_name = user_info.first_name or name.split(' ')[0]
            last_name = user_info.last_name or (name.split(' ')[1] if len(name.split(' ')) > 1 else "")
            
            avatar_url = user_info.picture
            try:
                if avatar_url:
                    async with httpx.AsyncClient() as client:
                        resp = await client.get(avatar_url)
                        if resp.status_code == 200:
                            ext = avatar_url.split('.')[-1] if '.' in avatar_url.split('/')[-1] else 'png'
                            filename = f"oauth-{uuid.uuid4().hex[:8]}.{ext}"
                            avatar_url = storage_service.upload_avatar(resp.content, filename, resp.headers.get("Content-Type", "image/png"))
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to upload avatar: {e}")
                
            saas_email = f"{first_name.lower()}.{last_name.lower()}@terasprint.com" if last_name else f"{first_name.lower()}@terasprint.com"'''

if google_old in content:
    content = content.replace(google_old, google_new)

github_old = '''        first_name = user_info.first_name or name.split(' ')[0]
        last_name = user_info.last_name or (name.split(' ')[1] if len(name.split(' ')) > 1 else "")
        avatar_url = user_info.picture
        saas_email = f"{first_name.lower()}.{last_name.lower()}@terasprint.com" if last_name else f"{first_name.lower()}@terasprint.com"'''

github_new = '''        first_name = user_info.first_name or name.split(' ')[0]
        last_name = user_info.last_name or (name.split(' ')[1] if len(name.split(' ')) > 1 else "")
        
        avatar_url = user_info.picture
        try:
            if avatar_url:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(avatar_url)
                    if resp.status_code == 200:
                        ext = avatar_url.split('.')[-1] if '.' in avatar_url.split('/')[-1] else 'png'
                        filename = f"oauth-{uuid.uuid4().hex[:8]}.{ext}"
                        avatar_url = storage_service.upload_avatar(resp.content, filename, resp.headers.get("Content-Type", "image/png"))
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to upload avatar: {e}")
            
        saas_email = f"{first_name.lower()}.{last_name.lower()}@terasprint.com" if last_name else f"{first_name.lower()}@terasprint.com"'''

if github_old in content:
    content = content.replace(github_old, github_new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
