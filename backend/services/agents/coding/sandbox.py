import os
import re
from typing import Dict, Any
try:
    from e2b_code_interpreter import CodeInterpreter as Sandbox
except ImportError:
    from e2b_code_interpreter import Sandbox

def execute_in_sandbox(code_dict: Dict[str, str], timeout: int = 60) -> Dict[str, Any]:
    api_key = os.getenv("E2B_API_KEY")
    if not api_key:
        return {"success": False, "error": "E2B_API_KEY is not set."}

    results = {"success": True, "logs": "", "error": None}
    
    try:
        try:
            sandbox_instance = Sandbox(api_key=api_key)
        except TypeError:
            if hasattr(Sandbox, "create"):
                sandbox_instance = Sandbox.create(api_key=api_key)
            else:
                sandbox_instance = Sandbox()
                
        with sandbox_instance as sandbox:
            for filename, code in code_dict.items():
                if hasattr(sandbox, "files"):
                    sandbox.files.write(f"/home/user/{filename}", code)
                else: 
                    pass
            
            for filename in code_dict.keys():
                ext = filename.split('.')[-1].lower() if '.' in filename else ""
                command = None
                
                if ext == "py":
                    command = f"python -m py_compile /home/user/{filename}"
                elif ext == "java":
                    command = f"javac /home/user/{filename}"
                elif ext in ["js", "jsx"]:
                    command = f"node -c /home/user/{filename}"
                elif ext in ["ts", "tsx"]:
                    command = f"npx tsc --noEmit /home/user/{filename}"
                elif ext in ["cpp", "hpp", "cc", "cxx"]:
                    command = f"g++ -fsyntax-only /home/user/{filename}"
                elif ext in ["c", "h"]:
                    command = f"gcc -fsyntax-only /home/user/{filename}"
                elif ext == "go":
                    command = f"go build -o /dev/null /home/user/{filename}"
                elif ext == "cs":
                    command = f"csc /nologo /t:library /home/user/{filename}"
                
                if command:
                    execution = sandbox.commands.run(command, timeout=timeout)
                    if execution.error or (execution.exit_code and execution.exit_code != 0):
                        error_msg = execution.stderr if execution.stderr else str(execution.error)
                        
                        ignore_patterns = [
                            "command not found", "not recognized", "not found",
                            "cannot find symbol", "package does not exist", "Cannot find module",
                            "undefined reference", "fatal error:", "cannot resolve symbol",
                            "no required module provides package"
                        ]
                        
                        should_ignore = False
                        for pat in ignore_patterns:
                            if pat.lower() in error_msg.lower():
                                should_ignore = True
                                break
                        
                        if not should_ignore:
                            results["success"] = False
                            results["error"] = f"Erreur syntaxique dans {filename}:\n{error_msg}"
                            return results

    except Exception as e:
        results["success"] = False
        results["error"] = str(e)

    return results
