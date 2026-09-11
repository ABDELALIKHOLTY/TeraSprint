import React, { useState, useEffect, useRef } from 'react';
import { Search, X, FolderKanban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { createPortal } from 'react-dom';
interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setLoading(true);
      if (token) {
        apiCall('/projects/', 'GET', null, token)
          .then(data => {
            setProjects(data);
          })
          .catch(console.error)
          .finally(() => setLoading(false));
      }
      setTimeout(() => inputRef.current?.focus(), 100);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, token, onClose]);

  if (!isOpen) return null;

  const filteredProjects = projects.filter(p => 
    p.title.toLowerCase().includes(query.toLowerCase()) || 
    (p.description && p.description.toLowerCase().includes(query.toLowerCase()))
  );

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed inset-x-0 top-[10%] md:top-[15%] mx-auto w-full max-w-2xl bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] shadow-2xl rounded-2xl z-50 overflow-hidden flex flex-col max-h-[70vh]">
        
        {/* Search Input */}
        <div className="flex items-center px-4 py-4 border-b border-gray-200 dark:border-[#27272a] bg-gray-50/50 dark:bg-[#1a1a1f]/50">
          <Search className="w-5 h-5 text-gray-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher des projets par nom ou description..."
            className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 text-lg placeholder-gray-400"
          />
          <button onClick={onClose} className="p-1.5 rounded-md text-gray-400 hover:bg-gray-200 dark:hover:bg-[#27272a] transition-colors ml-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Recherche en cours...</div>
          ) : filteredProjects.length > 0 ? (
            <div className="space-y-1">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Projets ({filteredProjects.length})</div>
              {filteredProjects.map(project => (
                <button
                  key={project.id}
                  onClick={() => {
                    navigate(`/projects/${project.id}`);
                    onClose();
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-[#1e1e24] transition-colors flex items-start group"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800/30 flex items-center justify-center mr-3 mt-0.5 shrink-0">
                    <FolderKanban className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">{project.title}</h4>
                    {project.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">{project.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : query.length > 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              Aucun résultat pour "{query}"
            </div>
          ) : (
             <div className="p-8 text-center text-gray-500 text-sm flex flex-col items-center justify-center space-y-3">
              <Search className="w-8 h-8 text-gray-400 opacity-50" />
              <p>Commencez à taper pour rechercher...</p>
             </div>
          )}
        </div>

        {/* Footer Shortcut hint */}
        <div className="bg-gray-50 dark:bg-[#151518] px-4 py-2 border-t border-gray-200 dark:border-[#27272a] text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center hidden sm:flex">
          <span>Recherche globale des projets</span>
          <span className="flex items-center space-x-1">
            <span>Appuyez sur</span>
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-[#1e1e24] border border-gray-200 dark:border-[#3f3f46] rounded text-[10px] shadow-sm">Esc</kbd>
            <span>pour fermer</span>
          </span>
        </div>
      </div>
    </>,
    document.body
  );
};
