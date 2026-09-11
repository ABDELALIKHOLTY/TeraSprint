import hashlib
# pyrefly: ignore [missing-import]
import httpx

async def is_password_pwned(password: str) -> bool:
    sha1_password = hashlib.sha1(password.encode('utf-8')).hexdigest().upper()
    prefix, suffix = sha1_password[:5], sha1_password[5:]
    
    url = f"https://api.pwnedpasswords.com/range/{prefix}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        
    if response.status_code != 200:
        return False
        
    hashes = (line.split(':') for line in response.text.splitlines())
    return any(h == suffix for h, count in hashes)
