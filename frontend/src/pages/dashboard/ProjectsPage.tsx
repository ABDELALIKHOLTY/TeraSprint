import React, { useState, useEffect } from 'react';
import { apiCall } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Plus, Calendar, Search, ArrowRight, Clock } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  created_at: string;
}

export const ProjectsPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/projects/', 'GET', null, token);
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar h-full relative">
      <div className="max-w-6xl mx-auto space-y-8 pb-12 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header & Search */}
        <div className="flex flex-col space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center">
                <FolderKanban className="w-8 h-8 mr-3 text-cyan-600 dark:text-cyan-400" />
                Mes Projets
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Recherchez et accédez à vos architectures de projets générées.
              </p>
            </div>
            
            <button 
              onClick={() => navigate('/')}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] flex items-center shrink-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Projet
            </button>
          </div>

          <div className="relative max-w-xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher un projet par nom ou date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-11 pr-4 py-3 bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Projects List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-100 dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 dark:border-[#27272a] rounded-3xl bg-gray-50 dark:bg-[#121214]/50">
            <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 rounded-full flex items-center justify-center mb-4">
              <FolderKanban className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Aucun projet trouvé</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
              Vous n'avez pas encore généré de projet.
            </p>
          </div>
        ) : (
          <div className="flex flex-col space-y-3">
            {projects
              .filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()) || new Date(p.created_at).toLocaleDateString().includes(searchTerm))
              .map((project) => (
              <div 
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="group flex items-center justify-between p-5 bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] hover:border-cyan-500/50 hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] rounded-2xl cursor-pointer transition-all duration-300"
              >
                <div className="flex items-center space-x-5">
                  <div className="w-12 h-12 bg-cyan-50 dark:bg-[#1a1a1f] border border-cyan-100 dark:border-[#27272a] rounded-xl flex items-center justify-center text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition-transform shrink-0">
                    <FolderKanban className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">
                      {project.title}
                    </h3>
                    <div className="flex items-center space-x-4 text-xs font-mono text-gray-500 dark:text-gray-400">
                      <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1.5" /> {new Date(project.created_at).toLocaleDateString()}</span>
                      <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1.5" /> {new Date(project.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 ml-4">
                  <div className="hidden sm:flex items-center text-[10px] uppercase font-bold tracking-wider text-gray-500 bg-gray-100 dark:bg-[#1a1a1f] dark:text-gray-400 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#27272a]">
                    ID: {project.id.substring(0, 8)}...
                  </div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 dark:bg-[#1a1a1f] text-gray-400 group-hover:bg-cyan-50 dark:group-hover:bg-cyan-500/10 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            ))}
            {projects.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()) || new Date(p.created_at).toLocaleDateString().includes(searchTerm)).length === 0 && (
               <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">
                 Aucun projet ne correspond à votre recherche "{searchTerm}".
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
