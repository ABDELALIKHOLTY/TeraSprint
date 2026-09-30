import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import type { Task } from '../../types/backlog';
import { X, Send, Bot, User, CheckSquare, Square, Trash2, Paperclip, Download, Save, Link2 } from 'lucide-react';
import { FileUploader } from '../files/FileUploader';

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
  projectId?: string;
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
  onUpdateTask,
  projectId
}) => {
  const [chatMessage, setChatMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const navigate = useNavigate();
  
  const [displayModels, setDisplayModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState('groq:llama-3.1-70b-versatile');
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  
  // New States for Buttons and Tabs
  const [activeTab, setActiveTab] = useState('details');
  const [isCopied, setIsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Time Logs Form State
  const [timeHours, setTimeHours] = useState('');
  const [timeDate, setTimeDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeDesc, setTimeDesc] = useState('');
  
  // Time Logs Filter State
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  const handleAddLink = () => {
    if (!newLinkTitle || !newLinkUrl) return;
    const newLink = {
      id: Date.now().toString(),
      title: newLinkTitle,
      url: newLinkUrl,
      created_at: new Date().toISOString()
    };
    const updatedLinks = [...(task.links || []), newLink];
    onUpdateTask?.({ ...task, links: updatedLinks });
    setNewLinkTitle('');
    setNewLinkUrl('');
  };

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
    const loadData = async () => {
      try {
        const { fetchFilteredModels, apiCall } = await import('../../services/api');
        
        // Load Models
        const models = await fetchFilteredModels();
        if (models && models.length > 0) {
          setDisplayModels(models);
          if (!models.find(m => m.id === selectedModel)) {
            setSelectedModel(models[0].id);
          }
        }
        
        // Load Users
        const token = localStorage.getItem('token');
        if (token) {
          const endpoint = projectId ? `/projects/${projectId}/members` : '/auth/users';
          const fetchedUsers = await apiCall(endpoint, 'GET', null, token);
          setUsers(fetchedUsers || []);
        }
      } catch (err) {
        console.error("Failed to load data for TicketModal", err);
      }
    };
    loadData();
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

  const statusColor = task.status.toUpperCase() === 'DONE' || task.status.toUpperCase() === 'CLOSED' ? 'bg-green-500' :
                      task.status.toUpperCase() === 'IN PROGRESS' || task.status.toUpperCase() === 'ACTIVE' ? 'bg-blue-500' : 'bg-gray-400';
  const handleFileUpload = async (file: File) => {
    try {
      setIsUploadingAttachment(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_id', projectId || 'unknown');
      formData.append('task_id', task.id);
      
      const res = await fetch(`http://localhost:8000/api/v1/files/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText);
      }
      const data = await res.json();
      
      const newAttachment = {
        id: data.id,
        filename: data.filename,
        file_url: data.file_url
      };
      
      onUpdateTask?.({
        ...task,
        attachments: [...(task.attachments || []), newAttachment]
      });
    } catch (err: any) {
      console.error(err);
      alert(`Failed to upload file: ${err.message}`);
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="absolute inset-0 bg-gray-900/60 dark:bg-black/70 backdrop-blur-sm transition-colors duration-300" onClick={onClose}></div>
      
      {/* Full Azure DevOps Style Work Item Form */}
      <div className="relative bg-white dark:bg-[#1a1a1f] w-full max-w-6xl h-[90vh] flex flex-col border border-gray-200 dark:border-[#27272a] shadow-2xl rounded-lg overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="flex flex-col border-b border-gray-200 dark:border-[#27272a] bg-gray-50 dark:bg-[#121214]">
          <div className="flex items-center justify-between p-2 px-4 border-b border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#1a1a1f]">
            <div className="flex items-center space-x-3 text-sm">
              <span className="flex items-center text-gray-500 font-semibold"><div className="w-4 h-4 bg-cyan-600 rounded-sm mr-2 flex items-center justify-center text-[10px] text-white">❖</div> Task {task.id.substring(0,6)}</span>
              {task.us_title && (
                <>
                  <span className="text-gray-400">/</span>
                  <span className="text-gray-500 truncate max-w-sm">{task.us_title}</span>
                </>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={handleCopyLink} className="flex items-center px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#27272a] rounded transition-colors w-24 justify-center">
                {isCopied ? <span className="text-green-500">Copied!</span> : <><Link2 className="w-3.5 h-3.5 mr-1"/> Copy link</>}
              </button>
              <button onClick={handleSave} className="flex items-center px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#27272a] rounded transition-colors w-20 justify-center">
                {isSaved ? <span className="text-green-500">Saved!</span> : <><Save className="w-3.5 h-3.5 mr-1"/> Save</>}
              </button>
              <div className="h-4 w-px bg-gray-300 dark:bg-[#27272a] mx-1"></div>
              <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#27272a] rounded transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-4 px-6 bg-white dark:bg-[#1a1a1f]">
            <input 
              value={task.title}
              onChange={(e) => onUpdateTask?.({ ...task, title: e.target.value })}
              className="w-full bg-transparent text-2xl font-semibold text-gray-900 dark:text-gray-100 outline-none border border-transparent hover:border-gray-300 dark:hover:border-gray-700 focus:border-cyan-500 px-2 py-1 -ml-2 rounded transition-colors"
              placeholder="Enter title"
            />
          </div>
          
          {/* TABS */}
          <div className="px-6 flex space-x-6 text-sm font-semibold mt-2">
            <div onClick={() => setActiveTab('details')} className={`pb-2 cursor-pointer transition-colors ${activeTab === 'details' ? 'border-b-2 border-cyan-600 text-cyan-700 dark:text-cyan-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Details</div>
            <div onClick={() => setActiveTab('history')} className={`pb-2 cursor-pointer transition-colors ${activeTab === 'history' ? 'border-b-2 border-cyan-600 text-cyan-700 dark:text-cyan-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>History</div>
            <div onClick={() => setActiveTab('links')} className={`pb-2 cursor-pointer transition-colors ${activeTab === 'links' ? 'border-b-2 border-cyan-600 text-cyan-700 dark:text-cyan-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Links</div>
            <div onClick={() => setActiveTab('time')} className={`pb-2 cursor-pointer transition-colors ${activeTab === 'time' ? 'border-b-2 border-cyan-600 text-cyan-700 dark:text-cyan-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Time Logs</div>
            <div onClick={() => setActiveTab('attachments')} className={`pb-2 cursor-pointer transition-colors ${activeTab === 'attachments' ? 'border-b-2 border-cyan-600 text-cyan-700 dark:text-cyan-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Attachments ({task.attachments?.length || 0})</div>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 flex overflow-hidden bg-white dark:bg-[#1a1a1f]">
          
          {activeTab === 'details' && (
            <>
              {/* LEFT COLUMN: Main Content */}
              <div className="w-2/3 h-full overflow-y-auto custom-scrollbar p-6 space-y-8 border-r border-gray-200 dark:border-[#27272a]">
            
            {/* Description */}
            <div className="space-y-2 group">
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Description</h4>
              <textarea 
                value={task.description}
                onChange={(e) => onUpdateTask?.({ ...task, description: e.target.value })}
                className="w-full text-gray-700 dark:text-gray-300 text-sm leading-relaxed p-3 bg-white dark:bg-[#121214] rounded border border-gray-300 dark:border-gray-700 focus:border-cyan-500 outline-none resize-y min-h-[120px] transition-colors"
                placeholder="Click to add description..."
              />
            </div>

            {/* Acceptance Criteria */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Acceptance Criteria</h4>
              {task.acceptance_criteria && task.acceptance_criteria.length > 0 ? (
                <ul className="list-decimal pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  {task.acceptance_criteria.map((criteria, idx) => (
                    <li key={idx}>{criteria}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 italic">No acceptance criteria defined.</p>
              )}
            </div>

            {/* Tasks / Subtasks */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                <span>Tasks</span>
                <span className="text-xs font-normal text-gray-500">
                  {task.subtasks?.filter(s => typeof s === 'object' && s.completed).length || 0} / {task.subtasks?.length || 0} completed
                </span>
              </h4>
              <div className="space-y-2">
                {task.subtasks?.map((sub, idx) => {
                  const title = typeof sub === 'string' ? sub : sub.title;
                  const isCompleted = typeof sub === 'object' ? sub.completed : false;
                  return (         
                    <div key={idx} className={`flex items-start p-2 border rounded transition-colors group ${
                      isCompleted ? 'bg-gray-50 dark:bg-[#121214] border-gray-200 dark:border-[#27272a]' : 'bg-white dark:bg-[#1a1a1f] border-gray-300 dark:border-[#3f3f46]'
                    }`}>
                      <button 
                        onClick={() => {
                          const newSubtasks = [...(task.subtasks || [])].map((s, i) => {
                            if (i === idx) return { title: typeof s === 'string' ? s : s.title, completed: !(typeof s === 'object' ? s.completed : false) };
                            return typeof s === 'string' ? { title: s, completed: false } : s;
                          });
                          onUpdateTask?.({ ...task, subtasks: newSubtasks });
                        }}
                        className={`mt-0.5 w-4 h-4 flex items-center justify-center transition-colors ${isCompleted ? 'text-green-500' : 'text-gray-400 hover:text-cyan-500'}`}
                      >
                        {isCompleted ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                      <input 
                        value={title}
                        onChange={(e) => {
                          const newSubtasks = [...(task.subtasks || [])].map((s, i) => {
                            if (i === idx) return { title: e.target.value, completed: typeof s === 'object' ? s.completed : false };
                            return typeof s === 'string' ? { title: s, completed: false } : s;
                          });
                          onUpdateTask?.({ ...task, subtasks: newSubtasks });
                        }}
                        className={`ml-3 text-sm flex-1 bg-transparent border-none outline-none ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200'}`}
                      />
                      <button 
                        onClick={() => {
                          const newSubtasks = [...(task.subtasks || [])];
                          newSubtasks.splice(idx, 1);
                          onUpdateTask?.({ ...task, subtasks: newSubtasks });
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all rounded hover:bg-gray-100 dark:hover:bg-[#27272a]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                <button 
                  onClick={() => {
                    const newSubtasks = [...(task.subtasks || [])].map(s => typeof s === 'string' ? {title: s, completed: false} : s);
                    newSubtasks.push({ title: "New Task...", completed: false });
                    onUpdateTask?.({ ...task, subtasks: newSubtasks });
                  }}
                  className="text-xs font-semibold text-cyan-600 hover:underline flex items-center"
                >
                  + Add task
                </button>
              </div>
            </div>



            {/* Discussion (AI Chat & Comments) */}
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-[#27272a]">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Discussion</h4>
                {/* AI Model Selector */}
                <div className="relative" ref={modelMenuRef}>
                  <button onClick={() => setIsModelMenuOpen(!isModelMenuOpen)} className="flex items-center space-x-1 text-xs text-gray-500 hover:text-cyan-600 border border-gray-200 dark:border-[#27272a] rounded px-2 py-1">
                    <Bot className="w-3 h-3" />
                    <span className="truncate max-w-[100px]">{displayModels.find(m => m.id === selectedModel)?.name || 'AI Assistant'}</span>
                  </button>
                  {isModelMenuOpen && (
                    <div className="absolute top-full right-0 mt-1 w-56 bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto">
                      {displayModels.map(model => (
                        <button key={model.id} onClick={() => { setSelectedModel(model.id); setIsModelMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-[#27272a]">
                          {model.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Thread */}
              <div className="space-y-4">
                {chatHistory.length === 0 && (
                  <div className="p-4 bg-gray-50 dark:bg-[#121214] rounded border border-dashed border-gray-300 dark:border-gray-700 text-center text-sm text-gray-500">
                    No comments yet. Start a discussion with the PO or TeraSprint AI.
                  </div>
                )}
                {chatHistory.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''} space-x-3`}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gray-200 dark:bg-gray-800">
                      {msg.sender === 'ai' ? <Bot className="w-4 h-4 text-cyan-600" /> : <User className="w-4 h-4 text-gray-500" />}
                    </div>
                    <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center space-x-2 text-xs">
                        {msg.sender !== 'user' && <span className="font-semibold text-gray-800 dark:text-gray-200">TeraSprint AI</span>}
                        <span className="text-gray-400">{msg.timestamp.toLocaleTimeString()}</span>
                        {msg.sender === 'user' && <span className="font-semibold text-gray-800 dark:text-gray-200">Operator</span>}
                      </div>
                      <div className={`mt-1 text-sm p-3 rounded-lg border ${
                        msg.sender === 'user' 
                          ? 'bg-cyan-600 text-white border-cyan-700 rounded-tr-none' 
                          : 'bg-gray-50 dark:bg-[#121214] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#27272a] rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}
                {isSending && (
                  <div className="flex space-x-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gray-200 dark:bg-gray-800"><Bot className="w-4 h-4 text-cyan-600" /></div>
                    <div className="flex flex-col items-start">
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">TeraSprint AI</span>
                      </div>
                      <div className="mt-1 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#121214] p-3 rounded-lg rounded-tl-none border border-gray-200 dark:border-[#27272a] flex space-x-1">
                        <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="relative mt-2">
                <textarea
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Add a comment or talk to AI..."
                  className="w-full bg-white dark:bg-[#121214] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 rounded-lg p-3 pr-12 focus:outline-none focus:border-cyan-500 transition-colors shadow-sm text-sm resize-y min-h-[80px]"
                />
                <button 
                  type="submit" 
                  disabled={isSending || !chatMessage.trim() || !onNegotiate}
                  className="absolute right-3 bottom-3 p-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT COLUMN: Metadata Pane */}
          <div className="w-1/3 h-full overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-[#121214] border-l border-gray-200 dark:border-[#27272a] p-6 space-y-6">
            
            {/* Deployment / Status */}
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">State</label>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${statusColor}`}></div>
                <select 
                  value={task.status.toUpperCase()}
                  onChange={(e) => onUpdateTask?.({ ...task, status: e.target.value })}
                  className="bg-transparent text-sm font-semibold text-gray-900 dark:text-gray-100 outline-none cursor-pointer w-full hover:bg-gray-200 dark:hover:bg-[#27272a] p-1 rounded transition-colors"
                >
                  <option value="NEW">New</option>
                  <option value="ACTIVE">Active</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            </div>

            {/* Assignment */}
            <div className="pt-4 border-t border-gray-200 dark:border-[#27272a]">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block">Assigned To</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                  {task.assignee_id ? (
                    users.find(u => u.id === task.assignee_id)?.avatar_url ? (
                      <img src={users.find(u => u.id === task.assignee_id)?.avatar_url} className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-[10px] font-bold">
                        {(users.find(u => u.id === task.assignee_id)?.first_name?.charAt(0) || users.find(u => u.id === task.assignee_id)?.name?.charAt(0))?.toUpperCase()}
                      </div>
                    )
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"><User className="w-3 h-3 text-gray-500" /></div>
                  )}
                </div>
                <select
                  value={task.assignee_id || ''}
                  onChange={(e) => onUpdateTask?.({ ...task, assignee_id: e.target.value || null })}
                  className="w-full text-sm pl-9 py-1.5 rounded border border-transparent hover:border-gray-300 dark:hover:border-[#3f3f46] bg-transparent focus:bg-white dark:focus:bg-[#1a1a1f] text-gray-900 dark:text-gray-200 cursor-pointer outline-none appearance-none transition-colors"
                >
                  <option value="">Unassigned</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Planning */}
            <div className="pt-4 border-t border-gray-200 dark:border-[#27272a]">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block">Planning</label>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Priority</span>
                  <select
                    value={task.priority}
                    onChange={(e) => onUpdateTask?.({ ...task, priority: e.target.value })}
                    className="text-sm rounded border border-gray-300 dark:border-[#3f3f46] bg-white dark:bg-[#1a1a1f] px-2 py-1 outline-none text-gray-900 dark:text-gray-200"
                  >
                    <option value="High">1 - High</option>
                    <option value="Medium">2 - Medium</option>
                    <option value="Low">3 - Low</option>
                  </select>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Story Points</span>
                  <input 
                    type="number" 
                    value={task.story_points || ''} 
                    onChange={(e) => onUpdateTask?.({ ...task, story_points: parseInt(e.target.value) || 0 })}
                    className="w-16 text-sm rounded border border-gray-300 dark:border-[#3f3f46] bg-white dark:bg-[#1a1a1f] px-2 py-1 outline-none text-right text-gray-900 dark:text-gray-200" 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Effort (Hours)</span>
                  <input 
                    type="number" 
                    value={task.estimated_hours || ''} 
                    onChange={(e) => onUpdateTask?.({ ...task, estimated_hours: parseFloat(e.target.value) || 0 })}
                    className="w-16 text-sm rounded border border-gray-300 dark:border-[#3f3f46] bg-white dark:bg-[#1a1a1f] px-2 py-1 outline-none text-right text-gray-900 dark:text-gray-200" 
                  />
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="pt-4 border-t border-gray-200 dark:border-[#27272a]">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block">Dates</label>
              <div className="space-y-2">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 mb-1">Start Date</span>
                  <input 
                    type="date" 
                    value={task.start_date ? task.start_date.split('T')[0] : ''}
                    onChange={(e) => onUpdateTask?.({ ...task, start_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                    className="text-sm rounded border border-gray-300 dark:border-[#3f3f46] bg-white dark:bg-[#1a1a1f] px-2 py-1 outline-none text-gray-900 dark:text-gray-200" 
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 mb-1">Target Date</span>
                  <input 
                    type="date" 
                    value={task.end_date ? task.end_date.split('T')[0] : ''}
                    onChange={(e) => onUpdateTask?.({ ...task, end_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                    className="text-sm rounded border border-gray-300 dark:border-[#3f3f46] bg-white dark:bg-[#1a1a1f] px-2 py-1 outline-none text-gray-900 dark:text-gray-200" 
                  />
                </div>
              </div>
            </div>

            {/* Attachments Dropzone */}
            <div className="pt-4 border-t border-gray-200 dark:border-[#27272a]">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center justify-between">
                <span>Attachments</span>
                <span className="bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">{task.attachments?.length || 0}</span>
              </label>
              <div className="space-y-2 mb-3">
                {task.attachments?.map((att, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] rounded">
                    <div className="flex items-center space-x-2 overflow-hidden">
                      <Paperclip className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[150px]">{att.filename}</span>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-400 hover:text-cyan-500 rounded transition-colors"><Download className="w-3.5 h-3.5" /></a>
                      <button 
                        onClick={() => {
                          const newAtt = [...(task.attachments || [])];
                          newAtt.splice(idx, 1);
                          onUpdateTask?.({ ...task, attachments: newAtt });
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <FileUploader 
                onUpload={handleFileUpload} 
                isUploading={isUploadingAttachment} 
              />
            </div>

              </div>
            </>
          )}

          {activeTab === 'time' && (() => {
            const filteredLogs = (task.time_logs || []).filter((log: any) => {
              if (filterStartDate && log.date < filterStartDate) return false;
              if (filterEndDate && log.date > filterEndDate) return false;
              return true;
            });
            const totalHours = filteredLogs.reduce((acc: any, log: any) => acc + (parseFloat(log.hours) || 0), 0);

            return (
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar max-w-4xl mx-auto w-full">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-6 flex items-center justify-between">
                <span>Time Logs (Completed Work)</span>
                <span className="text-sm font-normal bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-300 px-3 py-1 rounded-full border border-cyan-200 dark:border-cyan-800">
                  Total: {totalHours} h
                </span>
              </h3>
              
              <div className="bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-xl p-5 mb-8">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Log New Time</h4>
                <div className="flex space-x-4">
                  <div className="w-1/4">
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Hours</label>
                    <input type="number" step="0.5" value={timeHours} onChange={e => setTimeHours(e.target.value)} className="w-full bg-white dark:bg-[#1a1a1f] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 rounded p-2 focus:border-cyan-500 outline-none text-sm" placeholder="e.g. 2.5" />
                  </div>
                  <div className="w-1/4">
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Date</label>
                    <input type="date" value={timeDate} onChange={e => setTimeDate(e.target.value)} className="w-full bg-white dark:bg-[#1a1a1f] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 rounded p-2 focus:border-cyan-500 outline-none text-sm" />
                  </div>
                  <div className="w-2/4">
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
                    <div className="flex space-x-2">
                      <input type="text" value={timeDesc} onChange={e => setTimeDesc(e.target.value)} className="flex-1 bg-white dark:bg-[#1a1a1f] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 rounded p-2 focus:border-cyan-500 outline-none text-sm" placeholder="What did you work on?" />
                      <button 
                        onClick={() => {
                          if (!timeHours) return;
                          const userStr = localStorage.getItem('user');
                          const user = userStr ? JSON.parse(userStr) : null;
                          const newLog = {
                            id: Date.now().toString(),
                            user_id: user?.id,
                            user_name: user?.first_name || user?.name || "User",
                            hours: parseFloat(timeHours),
                            date: timeDate,
                            description: timeDesc
                          };
                          onUpdateTask?.({
                            ...task,
                            time_logs: [...(task.time_logs || []), newLog]
                          });
                          setTimeHours('');
                          setTimeDesc('');
                        }}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-4 py-2 rounded text-sm transition-colors"
                      >
                        Log
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] rounded-xl p-4 mb-4 flex items-center space-x-4">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filter By Date:</span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">From</span>
                  <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="bg-gray-50 dark:bg-[#121214] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 rounded p-1 text-xs outline-none focus:border-cyan-500" />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">To</span>
                  <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="bg-gray-50 dark:bg-[#121214] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 rounded p-1 text-xs outline-none focus:border-cyan-500" />
                </div>
                {(filterStartDate || filterEndDate) && (
                  <button onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }} className="text-xs text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 font-semibold transition-colors">Clear</button>
                )}
              </div>

              <div className="space-y-4">
                {(!filteredLogs || filteredLogs.length === 0) ? (
                  <p className="text-sm text-gray-500 italic text-center py-8">No time logged in this period.</p>
                ) : (
                  [...filteredLogs].reverse().map((log: any) => (
                    <div key={log.id} className="flex justify-between items-start bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] rounded-lg p-4">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{log.user_name}</span>
                          <span className="text-xs text-gray-500">• {log.date}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{log.description || "No description provided."}</p>
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 px-3 py-1 rounded font-mono text-sm font-semibold border border-gray-200 dark:border-gray-700">
                        {log.hours} h
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            );
          })()}

          {activeTab === 'history' && (
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar max-w-4xl mx-auto w-full">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-6">Task History</h3>
              
              {(!task.history || task.history.length === 0) ? (
                <div className="text-gray-500 dark:text-gray-400 italic flex items-center justify-center h-40 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                  No history available for this task yet.
                </div>
              ) : (
                <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-4 space-y-6 pb-4">
                  {task.history.slice().reverse().map((event: any, idx: number) => (
                    <div key={idx} className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white dark:bg-[#121214] border-2 border-cyan-500"></div>
                      <div className="flex items-start space-x-3">
                        {event.by_avatar ? (
                          <img src={event.by_avatar} className="w-8 h-8 rounded-full object-cover shrink-0 mt-1 shadow-sm" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold shrink-0 mt-1 shadow-sm text-xs">
                            {event.by ? event.by.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="text-sm">
                            <span className="font-semibold text-gray-900 dark:text-gray-100">{event.by || 'Unknown User'}</span>
                            <span className="text-gray-500 dark:text-gray-400 mx-1">
                              {event.action === 'status_change' && 'changed status'}
                              {event.action === 'title_change' && 'changed title'}
                              {event.action === 'reassigned' && 'reassigned the task'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5 mb-2">
                            {new Date(event.timestamp).toLocaleString()}
                          </div>
                          <div className="bg-gray-50 dark:bg-[#1a1a1f] border border-gray-100 dark:border-[#27272a] rounded p-3 text-sm flex items-center space-x-3">
                            <div className="line-through text-gray-400 max-w-[200px] truncate">{event.old || 'None'}</div>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                            <div className="font-medium text-gray-900 dark:text-gray-100 max-w-[200px] truncate">
                              {event.action === 'reassigned' ? (event.new_display || 'Unassigned') : event.new}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'links' && (
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar max-w-4xl mx-auto w-full">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-6 flex items-center justify-between">
                <span>Linked Items</span>
                <span className="bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 px-3 py-1 rounded-full text-sm">{task.links?.length || 0}</span>
              </h3>
              
              <div className="flex flex-col md:flex-row md:items-end space-y-3 md:space-y-0 md:space-x-3 mb-8 bg-gray-50 dark:bg-[#121214] p-4 rounded-lg border border-gray-200 dark:border-[#27272a]">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Title</label>
                  <input 
                    type="text" 
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    placeholder="e.g., GitHub PR, Figma Design" 
                    className="w-full bg-white dark:bg-[#1a1a1f] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 rounded p-2 focus:outline-none focus:border-cyan-500 text-sm transition-colors"
                  />
                </div>
                <div className="flex-[2]">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">URL</label>
                  <input 
                    type="url" 
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://..." 
                    className="w-full bg-white dark:bg-[#1a1a1f] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 rounded p-2 focus:outline-none focus:border-cyan-500 text-sm transition-colors"
                  />
                </div>
                <button 
                  onClick={handleAddLink}
                  disabled={!newLinkTitle || !newLinkUrl}
                  className="px-4 py-2 bg-cyan-600 text-white font-semibold rounded hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Add Link
                </button>
              </div>

              {(!task.links || task.links.length === 0) ? (
                <div className="text-gray-500 dark:text-gray-400 italic flex items-center justify-center h-40 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                  No external links or related items found.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {task.links.map((link: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] rounded-lg shadow-sm hover:shadow-md transition-shadow group">
                      <div className="flex items-center space-x-3 overflow-hidden flex-1">
                        <div className="w-10 h-10 bg-cyan-50 dark:bg-cyan-900/10 rounded flex items-center justify-center shrink-0">
                          <Link2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <div className="flex flex-col truncate">
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 hover:underline truncate">
                            {link.title}
                          </a>
                          <span className="text-xs text-gray-500 truncate">{link.url}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          const newLinks = [...(task.links || [])];
                          newLinks.splice(idx, 1);
                          onUpdateTask?.({ ...task, links: newLinks });
                        }}
                        className="p-2 bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-red-500 rounded transition-colors ml-2 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar max-w-4xl mx-auto w-full">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-6 flex items-center justify-between">
                <span>Attachments</span>
                <span className="bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 px-3 py-1 rounded-full text-sm">{task.attachments?.length || 0}</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {task.attachments?.map((att, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-lg shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-[#27272a] rounded flex items-center justify-center shrink-0">
                        <Paperclip className="w-5 h-5 text-gray-500" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{att.filename}</span>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-cyan-500 rounded transition-colors"><Download className="w-4 h-4" /></a>
                      <button 
                        onClick={() => {
                          const newAtt = [...(task.attachments || [])];
                          newAtt.splice(idx, 1);
                          onUpdateTask?.({ ...task, attachments: newAtt });
                        }}
                        className="p-2 bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-red-500 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="max-w-xl">
                <FileUploader 
                  onUpload={handleFileUpload} 
                  isUploading={isUploadingAttachment} 
                />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
};
