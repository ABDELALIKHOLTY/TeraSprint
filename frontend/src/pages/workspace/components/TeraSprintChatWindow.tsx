import React, { useEffect, useRef, useState } from "react";
import { Send, GitBranch, Download, Terminal, Database } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface Props {
  taskId?: string;
  theme?: string;
  model?: string;
  onCodeUpdate?: (files: Record<string, string>) => void;
  onCodeDelete?: (files: string[]) => void;
  onPlanRestored?: () => void;
  taskContext?: any; // Full task context loaded from DB
}

export const TeraSprintChatWindow = React.memo(function TeraSprintChatWindow({ taskId, theme, model, onCodeUpdate, onCodeDelete, onPlanRestored, taskContext }: Props) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isRestored, setIsRestored] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const taskContextRef = useRef<any>(null); // Keep ref so onopen can access latest value

  // Update ref whenever taskContext changes
  useEffect(() => {
    taskContextRef.current = taskContext;
    // If WS is already open and we now have context, re-send init with context
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && taskContext) {
      wsRef.current.send(JSON.stringify({ 
        type: "init", 
        task_id: taskId,
        task_context: taskContext,
        token: localStorage.getItem("token"),
        model: model
      }));
    }
  }, [taskContext]);

  useEffect(() => {
    // Connect to TeraSprint backend
    const ws = new WebSocket("ws://localhost:8000/api/v1/workspace/chat");
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ 
        type: "init", 
        task_id: taskId,
        task_context: taskContextRef.current, // may be null initially, will be re-sent when loaded
        token: localStorage.getItem("token"),
        model: model
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Restore persisted session from DB
        if (data.type === "session_restore") {
          const restored = (data.messages || []).map((m: any) => ({
            id: m.id || Date.now().toString(),
            sender: m.sender,
            text: m.text,
            timestamp: new Date(m.timestamp)
          }));
          if (restored.length > 0) {
            setMessages(restored);
            setIsRestored(true);
          }
          if (onCodeUpdate && data.files && Object.keys(data.files).length > 0) {
            onCodeUpdate(data.files);
          }
          if (data.plan_generated && onPlanRestored) {
            onPlanRestored();
          }
          return;
        }

        if (data.type === "ai_message" || data.type === "plan") {
          setIsLoading(false);
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            sender: "ai",
            text: data.text,
            timestamp: new Date()
          }]);
        }
        
        if (data.type === "code_update") {
          setIsLoading(false);
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            sender: "system",
            text: "Fichiers mis a jour: " + Object.keys(data.files || {}).join(", "),
            timestamp: new Date()
          }]);
          if (onCodeUpdate && data.files) {
            onCodeUpdate(data.files);
          }
        }
        
        if (data.type === "code_delete") {
          setIsLoading(false);
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            sender: "system",
            text: "Fichiers supprimes: " + (data.files || []).join(", "),
            timestamp: new Date()
          }]);
          if (onCodeDelete && data.files) {
            onCodeDelete(data.files);
          }
        }
        
        if (data.type === "system_message") {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            sender: "system",
            text: data.text,
            timestamp: new Date()
          }]);
        }
        
        if (data.type === "error") {
          setIsLoading(false);
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            sender: "system",
            text: `Erreur: ${data.text}`,
            timestamp: new Date()
          }]);
        }
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    return () => {
      ws.close();
    };
  }, [taskId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (text: string) => {
    if (!text.trim() || !wsRef.current) return;

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: "user",
      text: text,
      timestamp: new Date()
    }]);

    setIsLoading(true);

    wsRef.current.send(JSON.stringify({ 
      user_input: text,
      token: localStorage.getItem("token"),
      model: model
    }));
  };

  const handleQuickAction = (actionText: string) => {
    if (!wsRef.current) return;
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: "user",
      text: actionText,
      timestamp: new Date()
    }]);

    setIsLoading(true);

    wsRef.current.send(JSON.stringify({ 
      user_input: actionText,
      token: localStorage.getItem("token"),
      model: model
    }));
  };



  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#121214] text-gray-900 dark:text-gray-100 font-sans relative overflow-hidden min-h-0">
      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 mt-10">
            <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900/30 rounded-full flex items-center justify-center mb-2">
              <Terminal className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
              Agent prêt pour l'implémentation
            </h3>
            <p className="text-sm text-gray-500 max-w-xs">
              Décrivez ce que vous souhaitez implémenter. L'agent analysera, proposera une architecture, et codera pour vous de manière conversationnelle.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
            {msg.sender === 'system' ? (
              <div className="w-fit max-w-[85%] my-1 font-mono text-[11px] text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-[#1a1a1f] px-3 py-2 rounded-lg rounded-tl-sm border border-gray-200 dark:border-[#27272a] shadow-sm overflow-x-hidden break-words">
                <span className="opacity-50 mr-2">[{msg.timestamp.toLocaleTimeString()}]</span>
                <div className="block mt-1 prose-sm dark:prose-invert prose-p:my-0 prose-pre:my-0 prose-pre:bg-transparent prose-pre:p-0 max-w-full overflow-hidden">
                  <MarkdownRenderer content={msg.text} />
                </div>
              </div>
            ) : (
              <div className={`
                max-w-[85%] p-3 rounded-2xl shadow-sm
                ${msg.sender === 'user' 
                  ? 'bg-cyan-600 text-white rounded-tr-sm' 
                  : 'bg-gray-100 dark:bg-[#27272a] text-gray-800 dark:text-gray-200 rounded-tl-sm border border-gray-200 dark:border-[#3f3f46]'
                }
              `}>
                <div className="text-[10px] font-bold opacity-60 uppercase mb-1 tracking-wider">
                  {msg.sender === 'user' ? 'Vous' : 'TeraSprint'}
                </div>
                <div className="text-sm leading-relaxed overflow-hidden">
                  {msg.sender === 'user' ? (
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  ) : (
                    <div className="prose dark:prose-invert prose-sm max-w-none prose-pre:bg-gray-800 prose-pre:text-gray-100 break-words">
                      <MarkdownRenderer content={msg.text} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        
        <div ref={messagesEndRef} className="h-10" />
      </div>
      
      {isLoading && (
        <div className="absolute bottom-20 left-0 right-0 flex justify-center z-10 pointer-events-none">
          <div className="flex items-center space-x-3 bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-3 rounded-full shadow-lg shadow-cyan-500/30 border border-cyan-400/30 backdrop-blur-sm animate-pulse">
            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-white font-medium text-sm tracking-wide">L'Agent IA travaille en cours... Veuillez patienter</span>
          </div>
        </div>
      )}
      


      {/* Input Form extracted to avoid re-renders on every keystroke */}
      <ChatInput onSend={handleSend} isLoading={isLoading} />
    </div>
  );
});

const ChatInput = ({ onSend, isLoading }: { onSend: (text: string) => void, isLoading: boolean }) => {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#121214]">
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Envoyer un message à TeraSprint..."
          disabled={isLoading}
          className="w-full py-3 pl-4 pr-12 bg-gray-50 dark:bg-[#1a1a1f] border border-gray-300 dark:border-[#27272a] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-shadow text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
        />
        <button 
          type="submit" 
          disabled={!input.trim() || isLoading}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 disabled:dark:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};
