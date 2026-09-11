import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Code, GitBranch, Download, PanelLeft, PanelBottom, PanelRight, Search, Key, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { TeraSprintChatWindow } from './components/TeraSprintChatWindow';
import { IDEFileExplorer } from './components/IDEFileExplorer';
import type { FileNode } from './components/IDEFileExplorer';
import { IDECodeEditor } from './components/IDECodeEditor';
import { FileSearchModal } from './components/FileSearchModal';
import { fetchModels, fetchFilteredModels } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// GitHub icon SVG (not available in all lucide-react versions)
const GithubIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

export const CodingWorkspacePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  
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
  const [isPushing, setIsPushing] = useState(false);

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

  const handleGitPushClick = () => {
    setIsGitModalOpen(true);
  };

  const submitGitPush = async () => {
    if (!repoName.trim()) return alert("Veuillez entrer un nom de dépôt");
    setIsPushing(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/workspace/git-push", { 
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ repo_name: repoName })
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
          alert("Git push effectué avec succès !");
          setIsGitModalOpen(false);
      } else {
          alert("Echec du Git push: " + (data.message || "Erreur inconnue"));
      }
    } catch(e) {
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
            <ArrowLeft className="w-4 h-4 mr-1" /> Retour au projet
          </button>
          <div className="flex items-center space-x-2 border-l border-gray-200 dark:border-[#27272a] pl-4">
            <Code className="w-4 h-4 text-cyan-500" />
            <span className="text-xs font-mono bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 px-2 py-1 rounded">
              {taskContext?.project?.title ? `${taskContext.project.title} - IDE` : 'TeraSprint IDE'}
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
            Git Push
          </button>
          <button 
            onClick={handleExportZip} 
            className="flex items-center px-3 py-1.5 bg-gray-200 dark:bg-[#27272a] hover:bg-gray-300 dark:hover:bg-[#323236] text-gray-800 dark:text-gray-200 rounded text-xs font-medium transition-colors border border-gray-300 dark:border-[#3f3f46]"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export ZIP
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#27272a] rounded-xl shadow-2xl w-[450px] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-[#27272a] bg-gray-50/50 dark:bg-[#1a1a1f]">
              <div className="flex items-center text-gray-800 dark:text-gray-200 font-semibold">
                <GithubIcon className="w-5 h-5 mr-2" />
                Pousser vers GitHub
              </div>
              <button 
                onClick={() => setIsGitModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-5">
              {!user?.has_github_token ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-[#27272a] rounded-full flex items-center justify-center mx-auto mb-4">
                    <GithubIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Compte non connecté</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 px-4">
                    Vous devez vous connecter avec GitHub pour pouvoir créer des dépôts et pousser votre code automatiquement.
                  </p>
                  <a 
                    href="http://localhost:8000/api/v1/auth/github/login"
                    className="inline-flex items-center justify-center px-4 py-2.5 bg-[#24292F] hover:bg-[#24292F]/90 text-white rounded-lg font-medium transition-colors w-full"
                  >
                    <GithubIcon className="w-4 h-4 mr-2" />
                    Se connecter avec GitHub
                  </a>
                </div>
              ) : (
                <div className="py-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nom du nouveau dépôt GitHub
                  </label>
                  <input
                    type="text"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    placeholder="ex: mon-super-projet"
                    className="w-full bg-white dark:bg-[#121214] border border-gray-300 dark:border-[#3f3f46] text-gray-900 dark:text-gray-100 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block p-2.5 outline-none"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Le dépôt sera créé en mode <strong>privé</strong> sur votre compte.
                  </p>
                  
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => setIsGitModalOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#27272a] rounded-lg transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={submitGitPush}
                      disabled={isPushing}
                      className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors flex items-center disabled:opacity-50"
                    >
                      {isPushing ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Création...
                        </>
                      ) : (
                        <>
                          <GitBranch className="w-4 h-4 mr-2" />
                          Créer et Pousser
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
