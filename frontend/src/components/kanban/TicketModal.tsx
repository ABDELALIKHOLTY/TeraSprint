import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import type { Task } from '../../types/backlog';
import { X, Send, Bot, User, CheckSquare, Square, Trash2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface Props {
  task: Task | null;
  onClose: () => void;
  onNegotiate?: (taskId: string, message: string, model: string, history: ChatMessage[]) => Promise<string | void>;
  chatHistory?: ChatMessage[];
  onUpdateChat?: (messages: ChatMessage[]) => void;
  completedSubtasks?: string[];
  onToggleSubtask?: (subtask: string) => void;
  onDeleteSubtask?: (subtask: string) => void;
  onUpdateTask?: (task: Task) => void;
}

export const TicketModal: React.FC<Props> = ({ 
  task, 
  onClose, 
  onNegotiate,
  chatHistory = [],
  onUpdateChat,
  completedSubtasks = [],
  onToggleSubtask,
  onDeleteSubtask,
  onUpdateTask
}) => {
  const [chatMessage, setChatMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const navigate = useNavigate();
  
  const [displayModels, setDisplayModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState('groq:llama-3.1-70b-versatile');
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const modelMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
        setIsModelMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    const loadModels = async () => {
      try {
        const { fetchFilteredModels } = await import('../../services/api');
        const models = await fetchFilteredModels();
        if (models && models.length > 0) {
          setDisplayModels(models);
          if (!models.find(m => m.id === selectedModel)) {
            setSelectedModel(models[0].id);
          }
        }
      } catch (err) {}
    };
    loadModels();
  }, []);

  if (!task) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !onNegotiate || !onUpdateChat) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: chatMessage,
      timestamp: new Date()
    };
    
    onUpdateChat([...chatHistory, userMsg]);
    setChatMessage('');
    setIsSending(true);

    try {
      const response = await onNegotiate(task.id, userMsg.text, selectedModel, chatHistory);
      if (response) {
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: response,
          timestamp: new Date()
        };
        onUpdateChat([...chatHistory, userMsg, aiMsg]);
      }
    } catch (error: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `Erreur : ${error.message || "Connexion à l'assistant IA échouée."}`,
        timestamp: new Date()
      };
      onUpdateChat([...chatHistory, userMsg, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-gray-900/70 dark:bg-black/80 backdrop-blur-md transition-colors duration-300" onClick={onClose}></div>
      
      <div className="relative bg-white dark:bg-[#121214] w-full max-w-6xl h-[85vh] flex flex-col md:flex-row border border-gray-200 dark:border-[#27272a] shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200 transition-colors duration-300">
        
        {/* Lueur arrière-plan */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 dark:bg-cyan-500/10 blur-[100px] pointer-events-none"></div>

        {/* COL 1: TASK DETAILS */}
        <div className="w-full md:w-1/2 flex flex-col h-full border-r border-gray-200 dark:border-[#27272a] bg-white/80 dark:bg-[#121214]/80 transition-colors duration-300">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-[#27272a] flex items-center justify-between sticky top-0 bg-white/90 dark:bg-[#121214] z-10 transition-colors duration-300">
            <div className="flex items-center space-x-3">

              <select
                value={task.priority}
                onChange={(e) => onUpdateTask?.({ ...task, priority: e.target.value })}
                className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase border font-bold cursor-pointer outline-none appearance-none
                ${task.priority === 'High' ? 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-900 dark:bg-red-400/10' : 
                  task.priority === 'Medium' ? 'text-amber-600 border-amber-200 bg-amber-50 dark:text-amber-400 dark:border-amber-900 dark:bg-amber-400/10' : 
                  'text-emerald-600 border-emerald-200 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-900 dark:bg-emerald-400/10'}`}
              >
                <option value="High">HIGH PRIORITY</option>
                <option value="Medium">MEDIUM PRIORITY</option>
                <option value="Low">LOW PRIORITY</option>
              </select>
            </div>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#27272a] rounded-full transition-colors md:hidden">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
            <div>
              <input 
                value={task.title}
                onChange={(e) => onUpdateTask?.({ ...task, title: e.target.value })}
                className="w-full bg-transparent text-xl font-semibold text-gray-900 dark:text-gray-100 leading-tight mb-1.5 outline-none border-b border-transparent hover:border-gray-300 focus:border-cyan-500 transition-colors duration-300 break-words"
                placeholder="Task Title..."
              />
              {task.us_title && (
                <p className="text-sm text-cyan-700 dark:text-cyan-400 flex items-center space-x-2 font-medium">
                  <span>↳</span>
                  <span className="opacity-80">{task.us_title}</span>
                </p>
              )}
            </div>
            
            <div className="space-y-2 group">
              <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold flex justify-between items-center">
                <span>Description</span>
              </h4>
              <textarea 
                value={task.description}
                onChange={(e) => onUpdateTask?.({ ...task, description: e.target.value })}
                className="w-full text-gray-700 dark:text-gray-300 text-xs leading-relaxed p-4 bg-gray-50 dark:bg-[#1a1a1f] rounded-xl border border-transparent hover:border-gray-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:hover:border-gray-600 dark:focus:border-cyan-500 outline-none resize-none min-h-[100px] transition-all duration-300"
                placeholder="Description of the task..."
              />
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold mb-3 flex items-center justify-between">
                <span>SOUS-TÂCHES TERASPRINT</span>
                <span className="text-cyan-600 dark:text-cyan-500">
                  {task.subtasks?.filter(s => typeof s === 'object' && s.completed).length || 0} / {task.subtasks?.length || 0}
                </span>
              </h4>
              <div className="space-y-2">
                {task.subtasks?.map((sub, idx) => {
                  const title = typeof sub === 'string' ? sub : sub.title;
                  const isCompleted = typeof sub === 'object' ? sub.completed : false;
                  
                  return (         
                    <div key={idx} className={`flex items-start p-3 border rounded-xl transition-colors group ${
                      isCompleted ? 'bg-cyan-50 dark:bg-cyan-900/10 border-cyan-200 dark:border-cyan-900/30' : 'bg-gray-50 dark:bg-[#1a1a1f] border-gray-200 dark:border-[#27272a] hover:border-gray-400 dark:hover:border-gray-600'
                    }`}>
                      <button 
                        onClick={() => {
                          const newSubtasks = [...(task.subtasks || [])].map((s, i) => {
                            if (i === idx) {
                              return { title: typeof s === 'string' ? s : s.title, completed: !(typeof s === 'object' ? s.completed : false) };
                            }
                            return typeof s === 'string' ? { title: s, completed: false } : s;
                          });
                          onUpdateTask?.({ ...task, subtasks: newSubtasks });
                        }}
                        className={`mt-0.5 w-4 h-4 rounded-sm flex items-center justify-center transition-colors ${isCompleted ? 'text-cyan-500' : 'text-gray-300 dark:text-gray-600 hover:text-cyan-400'}`}
                      >
                        {isCompleted ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                      <textarea 
                        value={title}
                        rows={2}
                        onChange={(e) => {
                          const newSubtasks = [...(task.subtasks || [])].map((s, i) => {
                            if (i === idx) return { title: e.target.value, completed: typeof s === 'object' ? s.completed : false };
                            return typeof s === 'string' ? { title: s, completed: false } : s;
                          });
                          onUpdateTask?.({ ...task, subtasks: newSubtasks });
                        }}
                        className={`ml-3 text-[11px] leading-tight flex-1 bg-transparent border-none outline-none resize-none ${isCompleted ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-300'}`}
                      />
                      <button 
                        onClick={() => {
                          const newSubtasks = [...(task.subtasks || [])];
                          newSubtasks.splice(idx, 1);
                          onUpdateTask?.({ ...task, subtasks: newSubtasks });
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-all ml-2 rounded hover:bg-gray-200 dark:hover:bg-[#27272a]"
                        title="Delete subtask"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                <button 
                  onClick={() => {
                    const newSubtasks = [...(task.subtasks || [])].map(s => typeof s === 'string' ? {title: s, completed: false} : s);
                    newSubtasks.push({ title: "Nouvelle sous-tâche...", completed: false });
                    onUpdateTask?.({ ...task, subtasks: newSubtasks });
                  }}
                  className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 hover:underline uppercase font-bold"
                >
                  + Ajouter une sous-tâche
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold">Acceptance Protocol</h4>
              <ul className="space-y-2">
                {task.acceptance_criteria?.map((criteria, idx) => (
                  <li key={idx} className="flex items-start p-3 bg-gray-50 dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] rounded-xl transition-colors duration-300">
                    <span className="text-cyan-600 dark:text-cyan-500 font-mono text-xs font-bold mr-3 mt-0.5">{(idx+1).toString().padStart(2,'0')}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{criteria}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold">Paramètres</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] rounded-lg flex flex-col space-y-2 transition-colors duration-300">
                  <div className="text-[10px] font-mono text-gray-500 uppercase font-bold">Points d'effort</div>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 5, 8, 13].map(pt => (
                      <button
                        key={pt}
                        onClick={() => onUpdateTask?.({ ...task, story_points: pt })}
                        className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold transition-colors ${
                          task.story_points === pt
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white dark:bg-[#121214] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#3f3f46] hover:bg-gray-100 dark:hover:bg-[#27272a]'
                        }`}
                      >
                        {pt}
                      </button>
                    ))}
                  </div>
                  <div className="text-[10px] font-mono text-gray-500 uppercase font-bold mt-2">Heures estimées</div>
                  <input 
                    type="number" 
                    min="0" 
                    value={task.estimated_hours || 0} 
                    onChange={(e) => onUpdateTask?.({ ...task, estimated_hours: parseInt(e.target.value) || 0 })}
                    className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#3f3f46] text-xs px-2 py-1 rounded w-full outline-none text-gray-900 dark:text-gray-200" 
                  />
                </div>
                
                <div className="p-3 bg-gray-50 dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] rounded-lg flex flex-col space-y-1.5 transition-colors duration-300">
                  <div className="text-[10px] font-mono text-gray-500 uppercase font-bold">Dates</div>
                  <div className="flex flex-col space-y-2 text-xs text-gray-600 dark:text-gray-400 mt-1">
                    <div className="flex justify-between items-center">
                      <span className="mr-2">Début</span>
                      <input 
                        type="date" 
                        value={task.start_date ? task.start_date.split('T')[0] : ''}
                        onChange={(e) => onUpdateTask?.({ ...task, start_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                        className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#3f3f46] rounded px-1 outline-none text-gray-900 dark:text-gray-200 cursor-pointer text-[10px]" 
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="mr-2">Fin</span>
                      <input 
                        type="date" 
                        value={task.end_date ? task.end_date.split('T')[0] : ''}
                        onChange={(e) => onUpdateTask?.({ ...task, end_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                        className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#3f3f46] rounded px-1 outline-none text-gray-900 dark:text-gray-200 cursor-pointer text-[10px]" 
                      />
                    </div>
                  </div>
                </div>

                <div className="col-span-2 p-3 bg-gray-50 dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] rounded-lg flex items-center justify-between transition-colors duration-300">
                  <div className="text-[10px] font-mono text-gray-500 uppercase font-bold">Status</div>
                  <select 
                    value={task.status.toUpperCase()}
                    onChange={(e) => onUpdateTask?.({ ...task, status: e.target.value })}
                    className="bg-transparent text-xs font-bold text-gray-900 dark:text-gray-200 outline-none cursor-pointer"
                  >
                    <option value="TO DO">TO DO</option>
                    <option value="IN PROGRESS">IN PROGRESS</option>
                    <option value="IN REVIEW">IN REVIEW</option>
                    <option value="DONE">DONE</option>
                  </select>
                </div>
              </div>
            </div>


          </div>
        </div>

        {/* COL 2: NEGOTIATION CHAT */}
        <div className="w-full md:w-1/2 flex flex-col h-full bg-[#f9fafb] dark:bg-[#0a0a0c] transition-colors duration-300">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-[#27272a] flex items-center justify-between sticky top-0 bg-[#f9fafb] dark:bg-[#0a0a0c] z-10 transition-colors duration-300">
            <h3 className="font-mono text-sm font-bold text-cyan-700 dark:text-cyan-400 flex items-center">
              <Bot className="w-4 h-4 mr-2" />
              TeraSprint AI
            </h3>
            
            <div className="flex items-center space-x-3">
              {/* Sélecteur de Modèle IA */}
              <div className="relative" ref={modelMenuRef}>
                <button 
                  type="button"
                  onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                  className="flex items-center space-x-2 bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] hover:border-cyan-500/50 px-2 py-1 rounded-md transition-all duration-300"
                >
                  <div className={`w-4 h-4 rounded-full ${displayModels.find(m => m.id === selectedModel)?.color || 'bg-cyan-500'}/20 flex items-center justify-center`}>
                    <span className={`${displayModels.find(m => m.id === selectedModel)?.text || 'text-cyan-500'} text-[8px] font-bold`}>AI</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-gray-700 dark:text-gray-300 flex items-center space-x-1">
                    <span className="truncate max-w-[100px]">{displayModels.find(m => m.id === selectedModel)?.name || selectedModel}</span>
                  </span>
                </button>

                {isModelMenuOpen && (
                  <div className="absolute top-full right-0 mt-1 w-56 bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
                    {displayModels.map(model => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => {
                          setSelectedModel(model.id);
                          setIsModelMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#27272a] transition-colors text-left ${selectedModel === model.id ? 'bg-cyan-50/50 dark:bg-cyan-900/10' : ''}`}
                      >
                        <span className={`text-xs font-medium truncate ${selectedModel === model.id ? 'text-cyan-600 dark:text-cyan-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {model.name}
                        </span>
                        <span className="text-[8px] uppercase tracking-wider font-bold text-gray-400 bg-gray-100 dark:bg-[#121214] px-1.5 py-0.5 rounded ml-2 shrink-0">
                          {model.badge}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={onClose} className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#27272a] rounded-full transition-colors hidden md:block">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 text-center px-4">
                <Bot className="w-12 h-12 mb-4 text-gray-300 dark:text-[#27272a]" />
                <p className="text-sm font-mono max-w-xs font-medium">
                  Discutez avec l'IA pour modifier la description, les sous-tâches ou re-estimer l'effort de cette tâche.
                </p>
              </div>
            ) : (
              chatHistory.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    {msg.sender === 'ai' && <Bot className="w-3 h-3 text-cyan-600 dark:text-cyan-500" />}
                    <span className="text-[10px] font-mono text-gray-500 dark:text-gray-600 uppercase font-semibold">
                      {msg.sender === 'user' ? 'Operator' : 'System'} • {msg.timestamp.toLocaleTimeString()}
                    </span>
                    {msg.sender === 'user' && <User className="w-3 h-3 text-gray-400" />}
                  </div>
                  <div className={`px-4 py-3 rounded-2xl max-w-[85%] text-sm ${
                    msg.sender === 'user' 
                      ? 'bg-cyan-600 text-white rounded-tr-sm shadow-md dark:shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                      : 'bg-white dark:bg-[#1a1a1f] text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-[#27272a] rounded-tl-sm shadow-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            {isSending && (
              <div className="flex flex-col items-start">
                <div className="flex items-center space-x-2 mb-1">
                  <Bot className="w-3 h-3 text-cyan-600 dark:text-cyan-500" />
                  <span className="text-[10px] font-mono text-gray-500 dark:text-gray-600 uppercase font-semibold">System</span>
                </div>
                <div className="px-4 py-3 rounded-2xl bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] rounded-tl-sm shadow-sm">
                  <div className="flex space-x-1.5">
                    <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-white dark:bg-[#121214] border-t border-gray-200 dark:border-[#27272a] transition-colors duration-300">
            <form onSubmit={handleSendMessage} className="relative flex items-center">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Message à l'IA..."
                className="w-full bg-gray-50 dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 rounded-full py-3 pl-4 pr-12 focus:outline-none focus:border-cyan-500/50 transition-colors shadow-inner text-sm"
                disabled={isSending || !onNegotiate}
              />
              <button 
                type="submit" 
                disabled={isSending || !chatMessage.trim() || !onNegotiate}
                className="absolute right-2 p-2 bg-cyan-600 dark:bg-cyan-500 hover:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-black rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(6,182,212,0.2)] dark:shadow-[0_0_10px_rgba(6,182,212,0.3)]"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
