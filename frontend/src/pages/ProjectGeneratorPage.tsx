import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Backlog } from '../types/backlog';
import { Send, FileText, ChevronDown, ChevronUp, Box, Layers, Calculator, Bot, X, Cloud, ArrowRight, CheckCircle2, Settings, ToggleLeft, ToggleRight, SlidersHorizontal, Key, Zap, RefreshCcw, Cpu } from 'lucide-react';
import { generateProjectBacklogStream, fetchModels, fetchFilteredModels, apiCall, updateApiKeys } from '../services/api';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';

type ChatMessage = {
  id: string;
  role: 'user' | 'agent';
  content?: string;
  isGenerating?: boolean;
  logs?: string[];
  projectData?: {
    id: string;
    title: string;
    backlog: Backlog;
  };
  error?: string;
};

const renderLog = (log: string, t: any) => {
  let text = log;
  let Icon = <div className="w-3.5 h-3.5 mr-2 rounded-full border border-gray-400 bg-gray-100 dark:bg-gray-800" />;
  
  if (log.includes("Initialisation")) {
     text = t('generator.log_init');
     Icon = <Cpu className="w-3.5 h-3.5 mr-2 animate-pulse text-cyan-600 dark:text-cyan-500 shrink-0" />;
  } else if (log.includes("Génération du Rapport")) {
     text = t('generator.log_report');
     Icon = <FileText className="w-3.5 h-3.5 mr-2 text-blue-600 dark:text-blue-500 shrink-0" />;
  } else if (log.includes("Génération de l'Outli") || log.includes("Génération de l'Outline")) {
     text = t('generator.log_outline');
     Icon = <Layers className="w-3.5 h-3.5 mr-2 text-indigo-600 dark:text-indigo-500 shrink-0" />;
  } else if (log.includes("Génération des tâches pour la US :")) {
     const usName = log.replace("🔄 Génération des tâches pour la US :", "").replace("Génération des tâches pour la US :", "").trim();
     text = `${t('generator.log_tasks_us')} ${usName}`;
     Icon = <RefreshCcw className="w-3.5 h-3.5 mr-2 animate-spin text-amber-600 dark:text-amber-500 shrink-0" />;
  } else if (log.includes("[GPTCache] Tâches pour US")) {
     const usName = log.replace("⚡ [GPTCache] Tâches pour US", "").replace("récupérées depuis le cache !", "").replace(/'/g, "").trim();
     text = `${t('generator.log_cache_us')} ${usName}`;
     Icon = <Zap className="w-3.5 h-3.5 mr-2 text-purple-600 dark:text-purple-500 shrink-0" />;
  } else if (log.includes("Génération parallèle")) {
     text = t('generator.log_parallel');
     Icon = <Layers className="w-3.5 h-3.5 mr-2 text-indigo-600 dark:text-indigo-500 shrink-0" />;
  }
  
  return (
    <div className="flex items-center text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1e1e20] px-3 py-2 rounded-lg border border-gray-200 dark:border-[#27272a] shadow-sm mb-2 w-max max-w-[95%]">
      {Icon}
      <span className="truncate">{text}</span>
    </div>
  );
};

export const ProjectGeneratorPage: React.FC = () => {
  const [idea, setIdea] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedModel, setSelectedModel] = useState('qwen2.5:14b');
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const { user, token } = useAuth();
  const { t } = useLanguage();
  
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  
  // Models State
  const [allModels, setAllModels] = useState<any[]>([]);
  const [displayModels, setDisplayModels] = useState<any[]>([
    { id: 'qwen2.5:14b', name: 'Qwen 2.5 (14B)', badge: 'Balanced', color: 'bg-emerald-500', text: 'text-emerald-500' }
  ]);
  const navigate = useNavigate();
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [idea]);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Click outside to close model menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
        setIsModelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (token) {
      apiCall('/projects/', 'GET', null, token)
        .then((data: any) => {
          if (Array.isArray(data)) {
            setRecentProjects(data.slice(0, 3));
          }
        })
        .catch(console.error);
    }
  }, [token]);

  const loadModels = async () => {
    try {
      // Pour ProjectGeneratorPage, nous voulons stocker tous les modèles mais n'afficher que les filtrés
      const all = await fetchModels();
      if (all && all.length > 0) {
        setAllModels(all);
        
        const filtered = await fetchFilteredModels();
        const modelsToDisplay = filtered.length > 0 ? filtered : [{ id: 'qwen2.5:14b', name: 'Qwen 2.5 (14B)', badge: 'Balanced', color: 'bg-emerald-500', text: 'text-emerald-500' }];
        setDisplayModels(modelsToDisplay);
        
        // Ensure selected model is still valid
        if (!modelsToDisplay.find(m => m.id === selectedModel)) {
          setSelectedModel(modelsToDisplay[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load models:", err);
    }
  };

  useEffect(() => {
    loadModels();
    
    const handleUpdates = () => loadModels();
    window.addEventListener('modelFiltersChanged', handleUpdates);
    window.addEventListener('apiKeysChanged', handleUpdates);
    
    return () => {
      window.removeEventListener('modelFiltersChanged', handleUpdates);
      window.removeEventListener('apiKeysChanged', handleUpdates);
    };
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim() || loading) return;

    const userPrompt = idea.trim();
    setIdea('');
    
    // Add User Message
    const userMessageId = Date.now().toString();
    const newMessages = [...messages, { id: userMessageId, role: 'user' as const, content: userPrompt }];
    setMessages(newMessages);

    // Add Initial Agent Message (Generating State)
    const agentMessageId = (Date.now() + 1).toString();
    setMessages([...newMessages, { id: agentMessageId, role: 'agent' as const, isGenerating: true, logs: ["Initialisation de l'Agent Architecte..."] }]);
    
    setLoading(true);
    
    try {
      const result = await generateProjectBacklogStream(userPrompt, selectedModel, (message: string) => {
        setMessages(prev => prev.map(msg => 
          msg.id === agentMessageId 
            ? { ...msg, logs: [...(msg.logs || []), message] }
            : msg
        ));
      });

      // Save to DB
      let savedProjectId = '';
      if (token) {
        try {
          const saveResponse = await apiCall('/projects/save', 'POST', result, token);
          savedProjectId = saveResponse.project_id;
        } catch (dbErr) {
          console.error("Failed to save project to DB:", dbErr);
        }
      }

      // Update Agent Message to Success State
      setMessages(prev => prev.map(msg => 
        msg.id === agentMessageId 
          ? { 
              ...msg, 
              isGenerating: false, 
              projectData: { id: savedProjectId, title: result.project_title || "Nouveau Projet", backlog: result } 
            }
          : msg
      ));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur de génération inconnue.";
      setMessages(prev => prev.map(msg => 
        msg.id === agentMessageId 
          ? { ...msg, isGenerating: false, error: errorMessage }
          : msg
      ));
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setIdea(suggestion);
  };

  const inputFormElement = (
    <form onSubmit={handleGenerate} className="w-full relative shadow-lg dark:shadow-[0_0_30px_rgba(0,0,0,0.3)] bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-3xl p-2 transition-all">
      {/* Model Selector Top Bar */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <div className="relative z-50" ref={modelMenuRef}>
          <button 
            type="button"
            onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
            className="flex items-center space-x-1.5 hover:bg-gray-100 dark:hover:bg-[#27272a] px-2 py-1 rounded-lg transition-colors"
          >
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center">
              {displayModels.find(m => m.id === selectedModel)?.name || selectedModel}
              <ChevronDown className="w-3 h-3 ml-1" />
            </span>
          </button>

          {isModelMenuOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] rounded-xl shadow-2xl z-[100] max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95">
              {displayModels.map(model => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    setSelectedModel(model.id);
                    setIsModelMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#27272a] transition-colors text-left ${selectedModel === model.id ? 'bg-cyan-50 dark:bg-cyan-900/10' : ''}`}
                >
                  <span className={`text-sm font-medium ${selectedModel === model.id ? 'text-cyan-600 dark:text-cyan-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {model.name}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 bg-gray-100 dark:bg-[#121214] px-2 py-0.5 rounded">
                    {model.badge}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Right side Actions (Restored Settings Button) */}
        <div className="flex items-center space-x-2">
          <button 
            type="button" 
            onClick={() => navigate('/providers')}
            className="p-1.5 text-gray-400 hover:text-cyan-500 rounded-md transition-colors flex items-center space-x-1" 
            title="Configurer les clés API"
          >
            <Settings className="w-4 h-4" />
            <span className="text-[10px] font-medium uppercase tracking-wider hidden sm:block">{t('generator.api_keys')}</span>
          </button>
        </div>
      </div>

      {/* Input Box */}
      <div className="flex items-end px-3 pb-2 pt-1">
        <textarea
          ref={textareaRef}
          className="flex-1 bg-transparent outline-none text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 text-sm resize-none overflow-y-auto"
          style={{ minHeight: '44px' }}
          placeholder={t('generator.placeholder')}
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleGenerate(e as any);
            }
          }}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !idea.trim()}
          className="ml-2 w-10 h-10 shrink-0 bg-gray-900 dark:bg-gray-100 hover:bg-black dark:hover:bg-white text-white dark:text-black rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </form>
  );

  return (
    <div className="flex flex-col absolute inset-0 font-sans bg-[#fcfcfc] dark:bg-transparent transition-colors duration-300">
      
      {messages.length === 0 ? (
        // --- EMPTY STATE (ChatGPT Style) ---
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-20 animate-in fade-in duration-700">
          <div className="w-full max-w-3xl flex flex-col items-center">
            
            <div className="relative w-16 h-16 mb-6 flex items-center justify-center group">
              <div className="absolute inset-0 rounded-full border border-gray-200 dark:border-cyan-500/30 bg-white dark:bg-gradient-to-tr dark:from-[#000] dark:to-[#121214] shadow-lg dark:shadow-[0_0_40px_rgba(6,182,212,0.2),inset_0_0_20px_rgba(6,182,212,0.1)] transition-all duration-700"></div>
              <Bot className="w-7 h-7 text-cyan-600 dark:text-cyan-400 opacity-80" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-200 mb-8 text-center tracking-tight">
              {t('generator.hello')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-500">{user?.name ? user.name.split(' ')[0] : t('generator.operator')}</span>
            </h1>

            {/* Input Form Centered */}
            <div className="w-full mb-8">
              {inputFormElement}
            </div>
            
            {/* Suggestions */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentProjects.length > 0 ? (
                recentProjects.map((project) => (
                  <button 
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)} 
                    className="flex flex-col p-4 bg-white dark:bg-[#121214]/60 rounded-2xl border border-gray-200 dark:border-[#27272a] hover:border-cyan-500/50 hover:bg-gray-50 dark:hover:bg-[#1a1a1f] transition-all text-left group shadow-sm"
                  >
                    <Layers className="w-5 h-5 text-cyan-600 dark:text-cyan-500 mb-2" />
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-200 truncate w-full" title={project.title}>
                      {project.title}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-2">{t('generator.last_project')}</p>
                  </button>
                ))
              ) : (
                <>
                  <button onClick={() => handleSuggestionClick(t('generator.suggestion1'))} className="p-4 bg-white dark:bg-[#121214]/60 rounded-2xl border border-gray-200 dark:border-[#27272a] hover:border-cyan-500/50 hover:bg-gray-50 dark:hover:bg-[#1a1a1f] transition-all text-left shadow-sm">
                    <p className="text-sm text-gray-600 dark:text-gray-300">"{t('generator.suggestion1')}"</p>
                  </button>
                  <button onClick={() => handleSuggestionClick(t('generator.suggestion2'))} className="p-4 bg-white dark:bg-[#121214]/60 rounded-2xl border border-gray-200 dark:border-[#27272a] hover:border-cyan-500/50 hover:bg-gray-50 dark:hover:bg-[#1a1a1f] transition-all text-left shadow-sm">
                    <p className="text-sm text-gray-600 dark:text-gray-300">"{t('generator.suggestion2')}"</p>
                  </button>
                </>
              )}
            </div>
            
          </div>
        </div>
      ) : (
        // --- CHAT STATE ---
        <>
          <section className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-40 pt-8">
            <div className="max-w-3xl mx-auto space-y-8 flex flex-col items-center">
              
              {/* Messages */}
              {messages.map((msg) => (
                <div key={msg.id} className={`w-full flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                  
                  {/* User Bubble */}
                  {msg.role === 'user' && (
                    <div className="max-w-[80%] bg-gray-100 dark:bg-[#27272a] text-gray-900 dark:text-gray-100 px-5 py-3 rounded-2xl rounded-tr-sm shadow-sm text-sm leading-relaxed">
                      {msg.content}
                    </div>
                  )}

                  {/* Agent Bubble */}
                  {msg.role === 'agent' && (
                    <div className="max-w-full md:max-w-[90%] flex space-x-4 w-full">
                      <div className="w-8 h-8 rounded-full border border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#121214] flex items-center justify-center shrink-0 mt-1">
                        <Bot className="w-5 h-5 text-cyan-600 dark:text-cyan-500" />
                      </div>
                      
                      <div className="flex-1 pt-1.5">
                        {/* Error State */}
                        {msg.error && (
                          <div className="text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-4 rounded-xl text-sm">
                            <p className="font-bold mb-1">{t('generator.agent_error')}</p>
                            <p>{msg.error}</p>
                          </div>
                        )}

                        {/* Generating / Streaming State */}
                        {msg.isGenerating && (
                          <div className="w-full">
                            <div className="flex items-center space-x-3 mb-2 text-gray-500 dark:text-gray-400">
                              <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-sm font-medium">{t('generator.agent_thinking')}</span>
                            </div>
                            {msg.logs && msg.logs.length > 0 && (
                              <div className="pl-7 border-l-2 border-gray-200 dark:border-[#27272a] ml-2 space-y-2 mt-3 flex flex-col items-start">
                                {msg.logs.map((log, i) => (
                                  <div key={i} className="animate-in fade-in slide-in-from-left-1">
                                    {renderLog(log, t)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Success Project Card State */}
                        {!msg.isGenerating && !msg.error && msg.projectData && (
                          <div className="w-full animate-in zoom-in-95 duration-300">
                            <div className="prose dark:prose-invert prose-sm max-w-none mb-6">
                              <p>{t('generator.success_title')} <strong>{msg.projectData.title}</strong>.</p>
                              <p>{t('generator.success_epics')} <strong>{msg.projectData.backlog.epics.length} Epics</strong> {t('generator.success_and')} <strong>{msg.projectData.backlog.epics.reduce((acc, epic) => acc + epic.user_stories.length, 0)} {t('generator.success_us')}</strong></p>
                              <p>{t('generator.success_desc')}</p>
                            </div>
                            
                            <button 
                              onClick={() => {
                                if (msg.projectData?.id) {
                                  navigate(`/projects/${msg.projectData.id}`);
                                }
                              }}
                              className="group inline-flex items-center justify-center bg-transparent border border-cyan-600 dark:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 font-semibold px-6 py-2.5 rounded-full transition-all text-sm"
                            >
                              <span>{t('generator.open_kanban')}</span>
                              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {/* Padding at the bottom so the last message doesn't touch the input box */}
              <div ref={messagesEndRef} className="h-8 w-full shrink-0" />
            </div>
          </section>

          {/* 2. Input Area (Chat Mode Only) */}
          <section className="absolute bottom-0 left-0 right-0 z-50 flex flex-col items-center pb-6 px-4 pointer-events-none pt-12">
            <div className="max-w-3xl mx-auto w-full pointer-events-auto">
              {inputFormElement}
              <div className="text-center mt-3 bg-white/50 dark:bg-black/30 rounded-full px-4 py-1 backdrop-blur-md inline-block">
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium tracking-wide">{t('generator.disclaimer')}</p>
              </div>
            </div>
          </section>
        </>
      )}


    </div>
  );
};
