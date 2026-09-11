import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { Board } from '../../components/kanban/Board';
import type { Backlog } from '../../types/backlog';
import { apiCall } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Bot, FileText, ChevronDown, ChevronUp, ArrowLeft, X, Play } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export const ProjectDashboardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [backlog, setBacklog] = useState<Backlog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      if (!token || !id) return;
      try {
        setLoading(true);
        const data = await apiCall(`/projects/${id}`, 'GET', null, token);
        setBacklog(data as Backlog);
      } catch (err: any) {
        setError(err.message || "Failed to load project");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id, token]);

  if (loading) {
    return (
      <div className="absolute inset-0 bg-white/80 dark:bg-[#09090b]/80 flex flex-col items-center justify-center transition-colors duration-300">
        <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-[#27272a]"></div>
          <div className="absolute inset-0 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin"></div>
          <Bot className="w-8 h-8 text-cyan-600 dark:text-cyan-400 animate-pulse" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-200">LOADING PROJECT</h3>
      </div>
    );
  }

  if (error || !backlog) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500">
        <p className="mb-4">{error || "Project not found"}</p>
        <button onClick={() => navigate('/projects')} className="bg-gray-200 dark:bg-[#27272a] px-4 py-2 rounded-xl text-gray-800 dark:text-gray-200">
          Return to My Projects
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#fafafa] dark:bg-transparent transition-colors duration-300">
      <section className="w-full bg-white/80 dark:bg-[#121214]/80 backdrop-blur-md border-b border-gray-200 dark:border-[#27272a] p-4 shrink-0 flex items-center justify-between z-10 transition-colors duration-300">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/projects')} className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-[#27272a] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate max-w-xl">{backlog.project_title}</h1>
        </div>
        
        {backlog?.architecture_report && (
          <div className="relative ml-4 flex items-center space-x-2">
            <button
              onClick={() => navigate(`/workspace/${id}?mode=project`)}
              className="bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 text-xs font-semibold flex items-center space-x-2 rounded-xl transition-all shadow-sm"
              title="Lancer l'IA sur tout le projet"
            >
              <Play className="w-3.5 h-3.5" />
              <span>START DEV</span>
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('kanban:add-column'))}
              className="bg-white/50 dark:bg-[#1a1a1f]/50 border border-dashed border-gray-300 dark:border-[#27272a] hover:border-cyan-500/50 hover:text-cyan-600 dark:hover:text-cyan-400 px-3 py-2 text-xs font-bold text-gray-500 flex items-center space-x-1 rounded-xl transition-all"
              title="Ajouter une colonne"
            >
              <span>+ COLONNE</span>
            </button>
            <button
              onClick={() => setShowReport(!showReport)}
              className="bg-gray-50 dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] hover:border-cyan-500/50 px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center space-x-2 rounded-xl transition-all"
            >
              <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-500" />
              <span>REPORT</span>
              {showReport ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {showReport && createPortal(
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
                <div className="absolute inset-0 bg-gray-900/70 dark:bg-black/80 backdrop-blur-md transition-colors duration-300" onClick={() => setShowReport(false)}></div>
                <div className="relative bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-2xl w-full max-w-4xl max-h-[85vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-[#27272a] flex items-center justify-between shrink-0">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center">
                      <FileText className="w-5 h-5 text-cyan-500 mr-2" />
                      Rapport d'Architecture
                    </h3>
                    <button onClick={() => setShowReport(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6 overflow-y-auto custom-scrollbar">
                    <div className="prose dark:prose-invert prose-cyan max-w-none">
                      <ReactMarkdown>
                        {backlog.architecture_report || ''}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>
        )}
      </section>

      <section className="flex-1 overflow-hidden relative">
        <Board initialBacklog={backlog} />
      </section>
    </div>
  );
};
