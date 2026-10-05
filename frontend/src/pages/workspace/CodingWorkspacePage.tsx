import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Code, GitBranch, Download, PanelLeft, PanelBottom, PanelRight, Search, Key, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { TeraSprintChatWindow } from './components/TeraSprintChatWindow';
import { IDEFileExplorer } from './components/IDEFileExplorer';
import type { FileNode } from './components/IDEFileExplorer';
import { IDECodeEditor } from './components/IDECodeEditor';
import { FileSearchModal } from './components/FileSearchModal';
import { fetchModels, fetchFilteredModels } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

// GitHub icon SVG (not available in all lucide-react versions)
const GithubIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

export const CodingWorkspacePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-1.5-pro");
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [planGenerated, setPlanGenerated] = useState(false);
  const [taskContext, setTaskContext] = useState<any>(null);

  const [allFiles, setAllFiles] = useState<Record<string, string>>({});
  const [isFileSearchOpen, setIsFileSearchOpen] = useState(false);

  const { user, token } = useAuth();
  const [isGitModalOpen, setIsGitModalOpen] = useState(false);
  const [repoName, setRepoName] = useState("");
  const [branchName, setBranchName] = useState("main");
  const [isPushing, setIsPushing] = useState(false);
  const [githubRepos, setGithubRepos] = useState<string[]>([]);
  const [isFetchingRepos, setIsFetchingRepos] = useState(false);
  const [isCreatingNewRepo, setIsCreatingNewRepo] = useState(false);
  const [isRepoDropdownOpen, setIsRepoDropdownOpen] = useState(false);
  const [githubBranches, setGithubBranches] = useState<string[]>([]);
  const [isFetchingBranches, setIsFetchingBranches] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [gitLog, setGitLog] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<"idle" | "success" | "error">("idle");

  // Global Ctrl+Shift+F shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsFileSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Check URL params for git_push
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('git_push') === 'true') {
      // Remove it from URL so it doesn't reopen on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
      // Wait a tiny bit to ensure user is loaded
      setTimeout(() => {
        handleGitPushClick();
      }, 500);
    }
  }, [location.search, user?.has_github_token]);

  const handleSelectSearchedFile = (path: string, content: string) => {
    const name = path.split('/').pop() || '';
    const language = name.split('.').pop() || '';
    setSelectedFile({
      name,
      type: 'file',
      content,
      language,
      path
    });
  };

  const handleCodeUpdate = React.useCallback((filesDict: Record<string, string>) => {
    // Check if the keys look like file paths (contain / or .) or are section names
    const keys = Object.keys(filesDict);
    const looksLikePaths = keys.some(k => k.includes('/') || (k.includes('.') && k.split('.').pop()!.length <= 4));
    
    const buildTree = (paths: Record<string, string>): FileNode[] => {
      const root: FileNode[] = [];
      Object.entries(paths).forEach(([path, content]) => {
        const parts = path.split('/');
        let currentLevel = root;
        parts.forEach((part, index) => {
          const isFile = index === parts.length - 1;
          let existingNode = currentLevel.find(n => n.name === part);
          if (!existingNode) {
            existingNode = {
              name: part,
              type: isFile ? 'file' : 'folder',
              ...(isFile ? { content, language: part.split('.').pop() } : { children: [] })
            };
            currentLevel.push(existingNode);
          } else if (isFile) {
            existingNode.content = content;
          }
          if (!isFile) {
            if (!existingNode.children) {
              existingNode.type = 'folder';
              existingNode.children = [];
            }
            currentLevel = existingNode.children;
          }
        });
      });
      return root;
    };

    if (looksLikePaths) {
      setAllFiles(prev => {
        const updatedFiles = { ...prev, ...filesDict };
        setFileTree(buildTree(updatedFiles));
        return updatedFiles;
      });
    } else {
      const reportContent = Object.entries(filesDict)
        .map(([key, val]) => `## ${key}\n\n${val}`)
        .join('\n\n---\n\n');
      
      const reportNode: FileNode = {
        name: ' RAPPORT_ARCHITECTURE.md',
        type: 'file',
        content: reportContent,
        language: 'markdown'
      };
      setFileTree([reportNode]);
    }
  }, []);

  const handleCodeDelete = React.useCallback((deletedFiles: string[]) => {
    setAllFiles(prev => {
      const updatedFiles = { ...prev };
      deletedFiles.forEach(f => {
        Object.keys(updatedFiles).forEach(key => {
          if (key === f || key.startsWith(f + '/')) {
            delete updatedFiles[key];
          }
        });
      });
      
      const buildTree = (paths: Record<string, string>): FileNode[] => {
        const root: FileNode[] = [];
        Object.entries(paths).forEach(([path, content]) => {
          const parts = path.split('/');
          let currentLevel = root;
          parts.forEach((part, index) => {
            const isFile = index === parts.length - 1;
            let existingNode = currentLevel.find(n => n.name === part);
            if (!existingNode) {
              existingNode = {
                name: part,
                type: isFile ? 'file' : 'folder',
                ...(isFile ? { content, language: part.split('.').pop() } : { children: [] })
              };
              currentLevel.push(existingNode);
            } else if (isFile) {
              existingNode.content = content;
            }
            if (!isFile) {
              if (!existingNode.children) {
                existingNode.type = 'folder';
                existingNode.children = [];
              }
              currentLevel = existingNode.children;
            }
          });
        });
        return root;
      };

      setFileTree(buildTree(updatedFiles));
      return updatedFiles;
    });
  }, []);

  const handlePlanRestored = React.useCallback(() => {
    setPlanGenerated(true);
  }, []);

  const handleCreateFile = async (path: string, type: 'file' | 'folder') => {
    if (type === 'folder') {
      alert("La creation de dossier vide n'est pas supportee. Creez plutot un fichier avec un chemin, ex: 'dossier/fichier.ts'");
      return;
    }
    
    // API Call
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:8000/api/v1/workspace/${id}/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ file_path: path, content: '' })
      });
      
      setAllFiles(prev => {
        const updated = { ...prev, [path]: '' };
        handleCodeUpdate(updated); // Rebuild tree
        return updated;
      });
    } catch (e) {
      alert('Erreur: ' + e);
    }
  };

  const handleDeleteFileNode = async (path: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:8000/api/v1/workspace/${id}/file?file_path=${encodeURIComponent(path)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      handleCodeDelete([path]);
    } catch (e) {
      alert('Erreur: ' + e);
    }
  };

  const handleRenameFileNode = async (oldPath: string, newPath: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:8000/api/v1/workspace/${id}/file/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ old_path: oldPath, new_path: newPath })
      });
      
      setAllFiles(prev => {
        const updated = { ...prev };
        updated[newPath] = updated[oldPath];
        delete updated[oldPath];
        handleCodeUpdate(updated);
        return updated;
      });
    } catch (e) {
      alert('Erreur: ' + e);
    }
  };


  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleEditorChange = (path: string, newContent: string) => {
    // 1. Update local state immediately for real-time preview
    setAllFiles(prev => {
      const updated = { ...prev, [path]: newContent };
      handleCodeUpdate(updated); 
      return updated;
    });

    // 2. Update selectedFile to keep it in sync
    setSelectedFile(prev => prev ? { ...prev, content: newContent } : null);

    // 3. Debounce API save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        await fetch(`http://localhost:8000/api/v1/workspace/${id}/file`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ file_path: path, content: newContent })
        });
      } catch (e) {
        console.error("Auto-save failed", e);
      }
    }, 1000);
  };

  const [isExplorerOpen, setIsExplorerOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const isDraggingRef = useRef(false);
  const chatPanelRef = useRef<HTMLDivElement>(null);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent text selection while dragging
    isDraggingRef.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDraggingRef.current && chatPanelRef.current) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 300 && newWidth <= 800) {
        chatPanelRef.current.style.width = `${newWidth}px`;
      }
    }
  };

  const stopResizing = () => {
    isDraggingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
  };

  const explorerPanelRef = useRef<HTMLDivElement>(null);
  const isExplorerDraggingRef = useRef(false);

  const startExplorerResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    isExplorerDraggingRef.current = true;
    document.addEventListener('mousemove', handleExplorerMouseMove);
    document.addEventListener('mouseup', stopExplorerResizing);
  };

  const handleExplorerMouseMove = (e: MouseEvent) => {
    if (isExplorerDraggingRef.current && explorerPanelRef.current) {
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 600) {
        explorerPanelRef.current.style.width = `${newWidth}px`;
      }
    }
  };

  const stopExplorerResizing = () => {
    isExplorerDraggingRef.current = false;
    document.removeEventListener('mousemove', handleExplorerMouseMove);
    document.removeEventListener('mouseup', stopExplorerResizing);
  };

  useEffect(() => {
    const loadTaskContext = async () => {
      if (!id) return;
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:8000/api/v1/workspace/task/${id}/context`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setTaskContext(data);
          console.log('[Workspace] Contexte tache charge:', data.task?.title);
        }
      } catch (err) {
        console.warn('[Workspace] Impossible de charger le contexte de la tache:', err);
      }
    };
    loadTaskContext();
  }, [id]);

  React.useEffect(() => {
    const loadModels = async () => {
      try {
        const visibleModels = await fetchFilteredModels();
        if (visibleModels && visibleModels.length > 0) {
          setModels(visibleModels);
          setSelectedModel(visibleModels[0].id);
        }
      } catch (err) {
        console.error("Failed to load models", err);
      } finally {
        setIsLoadingModels(false);
      }
    };
    loadModels();
    
    const handleUpdates = () => loadModels();
    window.addEventListener('modelFiltersChanged', handleUpdates);
    window.addEventListener('apiKeysChanged', handleUpdates);
    
    return () => {
      window.removeEventListener('modelFiltersChanged', handleUpdates);
      window.removeEventListener('apiKeysChanged', handleUpdates);
    };
  }, []);

  useEffect(() => {
    if (isGitModalOpen && repoName && !isCreatingNewRepo && user?.has_github_token) {
      setIsFetchingBranches(true);
      fetch(`http://localhost:8000/api/v1/workspace/github/repos/${repoName}/branches`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.status === "success") {
          setGithubBranches(data.branches || []);
          if (data.branches && data.branches.length > 0 && !data.branches.includes(branchName)) {
            setBranchName(data.branches[0]);
          }
        }
      })
      .catch(console.error)
      .finally(() => setIsFetchingBranches(false));
    }
  }, [repoName, isCreatingNewRepo, isGitModalOpen, user?.has_github_token, token]);

  const handleGitPushClick = async () => {
    setIsGitModalOpen(true);
    setPushStatus("idle");
    setGitLog(null);
    
    // Load saved preferences if any
    const savedPrefs = localStorage.getItem(`github_prefs_${id}`);
    if (savedPrefs) {
      try {
        const prefs = JSON.parse(savedPrefs);
        if (prefs.repoName) setRepoName(prefs.repoName);
        if (prefs.branchName) setBranchName(prefs.branchName);
        if (prefs.isCreatingNewRepo !== undefined) setIsCreatingNewRepo(prefs.isCreatingNewRepo);
      } catch(e) {}
    }

    if (user?.has_github_token) {
      setIsFetchingRepos(true);
      try {
        const res = await fetch("http://localhost:8000/api/v1/workspace/github/repos", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.status === "success") {
          setGithubRepos(data.repos || []);
        }
      } catch(e) {
        console.error(e);
      } finally {
        setIsFetchingRepos(false);
      }
    }
  };

  const submitGitPush = async () => {
    if (!repoName.trim()) return alert("Veuillez entrer un nom de dépôt");
    if (!branchName.trim()) return alert("Veuillez entrer un nom de branche");
    setIsPushing(true);
    setGitLog(null);
    setPushStatus("idle");
    try {
      const res = await fetch("http://localhost:8000/api/v1/workspace/git-push", { 
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ repo_name: repoName, task_id: id, branch_name: branchName })
      });
      const data = await res.json();
      if (data.logs) {
        setGitLog(data.logs);
      }
      if (!res.ok || data.status !== "success") {
          setPushStatus("error");
          alert("Echec du Git push: " + (data.message || "Erreur inconnue"));
      } else {
          setPushStatus("success");
          localStorage.setItem(`github_prefs_${id}`, JSON.stringify({ repoName, branchName, isCreatingNewRepo }));
      }
    } catch(e) {
      setPushStatus("error");
      alert("Erreur: " + e);
    } finally {
      setIsPushing(false);
    }
  };

  const handleExportZip = () => {
    window.location.href = `http://localhost:8000/api/v1/workspace/${id}/export-zip`;
  };

  return (
    <div className="flex flex-col h-screen w-full bg-white dark:bg-[#1e1e1e] overflow-hidden">
      {/* Header bar for navigation */}
      <div className="h-14 border-b border-gray-200 dark:border-[#27272a] flex items-center px-4 justify-between bg-white dark:bg-[#1a1a1f] shrink-0">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-500 hover:text-cyan-600 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> {t('ide.back_to_project')}
          </button>
          <div className="flex items-center space-x-2 border-l border-gray-200 dark:border-[#27272a] pl-4">
            <Code className="w-4 h-4 text-cyan-500" />
            <span className="text-xs font-mono bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 px-2 py-1 rounded">
              {taskContext?.project?.title ? `${taskContext.project.title} - ${t('ide.ide_title')}` : `TeraSprint ${t('ide.ide_title')}`}
            </span>
          </div>
        </div>
        
        {/* Global IDE Toolbar */}
        <div className="flex items-center space-x-3">
          
          {/* Quick Settings */}
          <div className="flex items-center space-x-1 border-r border-gray-200 dark:border-[#27272a] pr-3 mr-1">
            <button 
              onClick={() => navigate('/providers')}
              className="p-1.5 rounded transition-colors text-gray-400 hover:text-amber-500 dark:hover:text-amber-400"
              title="Configuration des Providers"
            >
              <Key className="w-4 h-4" />
            </button>
            <button 
              onClick={toggleTheme}
              className="p-1.5 rounded transition-colors text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400"
              title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Layout & Search Controls */}
          <div className="flex items-center space-x-1 border-r border-gray-200 dark:border-[#27272a] pr-3 mr-1">
            <button 
              onClick={() => setIsExplorerOpen(!isExplorerOpen)}
              className={`p-1.5 rounded transition-colors ${isExplorerOpen ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
              title="Toggle Explorer"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <button 
              className="p-1.5 rounded transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              title="Toggle Bottom Panel (Coming soon)"
            >
              <PanelBottom className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`p-1.5 rounded transition-colors ${isChatOpen ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
              title="Toggle Chat"
            >
              <PanelRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsFileSearchOpen(true)}
              className="p-1.5 rounded transition-colors text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 ml-1"
              title="Search in files (Ctrl+Shift+F)"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center space-x-2 border-r border-gray-200 dark:border-[#27272a] pr-3 mr-1">
            <label htmlFor="model-select" className="text-xs font-medium text-gray-500 dark:text-gray-400">Modèle:</label>
            <select 
              id="model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-gray-50 dark:bg-[#121214] border border-gray-300 dark:border-[#3f3f46] text-gray-900 dark:text-gray-100 text-xs rounded focus:ring-cyan-500 focus:border-cyan-500 block p-1.5 outline-none max-w-[150px] truncate"
            >
              {models.length > 0 ? (
                models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))
              ) : (
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              )}
            </select>
          </div>
          
          <button 
            onClick={handleGitPushClick} 
            className="flex items-center px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-xs font-medium transition-colors"
          >
            <GitBranch className="w-3.5 h-3.5 mr-1.5" />
            {t('ide.push_github')}
          </button>
          <button 
            onClick={handleExportZip} 
            className="flex items-center px-3 py-1.5 bg-gray-200 dark:bg-[#27272a] hover:bg-gray-300 dark:hover:bg-[#323236] text-gray-800 dark:text-gray-200 rounded text-xs font-medium transition-colors border border-gray-300 dark:border-[#3f3f46]"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {t('ide.export_zip')}
          </button>
        </div>
      </div>
      
      {/* Native IDE Window - 3 Panes */}
      <div className="flex-1 w-full min-h-0 relative flex">
        {/* Left Pane: Explorer */}
        {isExplorerOpen && (
          <>
            <div 
              ref={explorerPanelRef}
              className="flex-shrink-0 h-full overflow-hidden"
              style={{ width: '256px' }}
            >
              <IDEFileExplorer 
                onSelectFile={setSelectedFile} 
                selectedFile={selectedFile} 
                fileTree={fileTree} 
                onCreateFile={handleCreateFile}
                onDeleteFile={handleDeleteFileNode}
                onRenameFile={handleRenameFileNode}
              />
            </div>
            {/* Explorer Drag Handle */}
            <div 
              className="w-1 bg-gray-200 dark:bg-[#27272a] cursor-col-resize hover:bg-cyan-500 active:bg-cyan-600 transition-colors z-10"
              onMouseDown={startExplorerResizing}
            />
          </>
        )}
        
        {/* Middle Pane: Editor */}
        <IDECodeEditor file={selectedFile} theme={theme} onChange={handleEditorChange} />
        
        {/* Right Pane: Chat Window */}
        {isChatOpen && !isLoadingModels && (
          <>
            {/* Drag Handle */}
            <div 
              className="w-1 bg-gray-200 dark:bg-[#27272a] cursor-col-resize hover:bg-cyan-500 active:bg-cyan-600 transition-colors z-10"
              onMouseDown={startResizing}
            />
            <div 
              ref={chatPanelRef}
              className="flex-shrink-0 h-full flex flex-col border-l border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#121214] overflow-hidden min-h-0"
              style={{ width: `400px` }}
            >
              <TeraSprintChatWindow 
              taskId={id} 
              theme={theme} 
              model={selectedModel} 
              onCodeUpdate={handleCodeUpdate}
              onCodeDelete={handleCodeDelete}
              onPlanRestored={handlePlanRestored}
              taskContext={taskContext}
            />
            </div>
          </>
        )}
      </div>

      <FileSearchModal
        isOpen={isFileSearchOpen}
        onClose={() => setIsFileSearchOpen(false)}
        allFiles={allFiles}
        onSelectFile={handleSelectSearchedFile}
      />

      {/* Git Push Modal */}
      {isGitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-[#27272a] bg-gray-50/50 dark:bg-[#1a1a1f] shrink-0">
              <div className="flex items-center text-gray-800 dark:text-gray-200 font-semibold">
                <GithubIcon className="w-5 h-5 mr-2" />
                {t('ide.push_github')}
              </div>
              <button 
                onClick={() => setIsGitModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              {!user?.has_github_token ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-[#27272a] rounded-full flex items-center justify-center mx-auto mb-4">
                    <GithubIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{t('ide.not_connected')}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 px-4">
                    {t('ide.github_desc')}
                  </p>
                  <a 
                    href={`http://localhost:8000/api/v1/auth/github/login?returnTo=/workspace/${id}?git_push=true`}
                    className="inline-flex items-center justify-center px-4 py-2.5 bg-[#24292F] hover:bg-[#24292F]/90 text-white rounded-lg font-medium transition-colors w-full"
                  >
                    <GithubIcon className="w-4 h-4 mr-2" />
                    {t('ide.connect_github')}
                  </a>
                </div>
              ) : (
                <div className="py-2">
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      {t('ide.github_repo')}
                    </label>
                    <div className="flex bg-gray-100 dark:bg-[#121214] p-1.5 rounded-lg mb-4">
                      <button
                        onClick={() => { setIsCreatingNewRepo(false); setRepoName(githubRepos[0] || ""); }}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${!isCreatingNewRepo ? 'bg-white dark:bg-[#27272a] shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                      >
                        {t('ide.existing')}
                      </button>
                      <button
                        onClick={() => { setIsCreatingNewRepo(true); setRepoName(""); }}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${isCreatingNewRepo ? 'bg-white dark:bg-[#27272a] shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                      >
                        {t('ide.new')}
                      </button>
                    </div>

                    {!isCreatingNewRepo ? (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsRepoDropdownOpen(!isRepoDropdownOpen)}
                          className="w-full bg-white dark:bg-[#121214] border border-gray-300 dark:border-[#3f3f46] text-gray-900 dark:text-gray-100 rounded-xl focus:ring-cyan-500 focus:border-cyan-500 flex justify-between items-center p-3 outline-none text-left text-sm"
                        >
                          <span className="truncate">{repoName || t('ide.select_repo')}</span>
                          <span className="text-gray-400">▼</span>
                        </button>
                        
                        {isRepoDropdownOpen && (
                          <div className="w-full mt-2 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#3f3f46] rounded-xl shadow-inner max-h-48 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            {githubRepos.length === 0 ? (
                              <div className="p-4 text-sm text-gray-500">{t('ide.no_repo_found')}</div>
                            ) : (
                              githubRepos.map((repo, i) => (
                                <div
                                  key={i}
                                  onClick={() => { setRepoName(repo); setIsRepoDropdownOpen(false); }}
                                  className="p-3 m-2 rounded-lg cursor-pointer hover:bg-cyan-50 dark:hover:bg-[#27272a] hover:ring-1 hover:ring-cyan-500/30 transition-all text-gray-800 dark:text-gray-200 border border-transparent dark:hover:border-[#3f3f46] flex items-center bg-gray-50 dark:bg-[#121214] mb-2 shadow-sm"
                                >
                                  <div className="bg-white dark:bg-[#1e1e1e] p-2.5 rounded-md shadow-sm border border-gray-100 dark:border-[#3f3f46] mr-4 shrink-0">
                                    <GithubIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                                  </div>
                                  <div className="flex flex-col overflow-hidden">
                                    <span className="font-semibold text-sm truncate text-gray-900 dark:text-gray-100">{repo}</span>
                                    <span className="text-xs text-gray-500 mt-1 font-medium flex items-center">
                                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mr-2"></span>
                                      {t('ide.remote_repo')}
                                    </span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={repoName}
                          onChange={(e) => setRepoName(e.target.value)}
                          placeholder="ex: mon-super-projet"
                          className="w-full bg-white dark:bg-[#121214] border border-gray-300 dark:border-[#3f3f46] text-gray-900 dark:text-gray-100 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block p-2.5 outline-none"
                          autoFocus
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          {t('ide.private_repo_notice2')}
                        </p>
                      </>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('ide.branch')}
                    </label>
                    
                    {!isCreatingNewRepo && githubBranches.length > 0 ? (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                          className="w-full bg-white dark:bg-[#121214] border border-gray-300 dark:border-[#3f3f46] text-gray-900 dark:text-gray-100 rounded-xl focus:ring-cyan-500 focus:border-cyan-500 flex justify-between items-center p-3 outline-none text-left text-sm"
                        >
                          <span className="truncate">{branchName || "Sélectionner une branche..."}</span>
                          <span className="text-gray-400">▼</span>
                        </button>
                        
                        {isBranchDropdownOpen && (
                          <div className="w-full mt-2 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#3f3f46] rounded-xl shadow-inner max-h-48 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            {githubBranches.map((branch, i) => (
                              <div
                                key={i}
                                onClick={() => { setBranchName(branch); setIsBranchDropdownOpen(false); }}
                                className="px-4 py-3 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-[#27272a] text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-[#27272a] last:border-0 truncate flex items-center"
                              >
                                <GitBranch className="w-4 h-4 mr-2 text-gray-500" />
                                {branch}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        placeholder="ex: main ou master"
                        className="w-full bg-white dark:bg-[#121214] border border-gray-300 dark:border-[#3f3f46] text-gray-900 dark:text-gray-100 rounded-xl focus:ring-cyan-500 focus:border-cyan-500 block p-3 outline-none"
                      />
                    )}
                  </div>

                  {pushStatus === "success" && (
                    <div className="mt-4 mb-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center text-green-700 dark:text-green-400">
                      <svg className="w-5 h-5 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm font-medium">{t('ide.push_success')}</span>
                    </div>
                  )}

                  {gitLog && (
                    <div className="mt-4 p-3 bg-[#1e1e1e] rounded-lg border border-[#3f3f46] max-h-56 overflow-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                      <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap">
                        {gitLog}
                      </pre>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => setIsGitModalOpen(false)}
                      className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#27272a] rounded-xl transition-colors"
                    >
                      {pushStatus === "success" ? t('ide.close') : t('ide.cancel')}
                    </button>
                    <button
                      onClick={submitGitPush}
                      disabled={isPushing}
                      className="px-4 py-2.5 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl transition-colors flex items-center disabled:opacity-50"
                    >
                      {isPushing ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {t('ide.creating')}
                        </>
                      ) : (
                        <>
                          <GitBranch className="w-4 h-4 mr-2" />
                          {pushStatus === "success" ? t('ide.push_again') : t('ide.create_and_push')}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
