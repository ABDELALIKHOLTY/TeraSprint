import React from 'react';
import { LayoutDashboard, LogOut, X, Code2, Settings, Database, Bot, Zap, Menu, FolderKanban, Key, Search } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../ui/Logo';
import { apiCall } from '../../services/api';
import { GlobalSearchModal } from '../ui/GlobalSearchModal';

interface SidebarProps {
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, token } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [recentProjects, setRecentProjects] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (token) {
      apiCall('/projects/', 'GET', null, token)
        .then(data => setRecentProjects(data.slice(0, 5))) // On prend max 5 projets récents
        .catch(console.error);
    }
  }, [token, location.pathname]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <>
      <aside className="w-72 bg-gray-50/80 dark:bg-[#121214]/80 backdrop-blur-xl border-r border-gray-200 dark:border-[#27272a]/50 flex flex-col h-screen font-sans text-gray-700 dark:text-gray-300 shrink-0 z-20 m-0 sm:m-2 rounded-r-none sm:rounded-2xl shadow-none sm:shadow-2xl relative overflow-hidden transition-colors duration-300">
      
      {/* Dark Mode Glow top left */}
      <div className="hidden dark:block absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-cyan-900/20 to-transparent pointer-events-none"></div>

      {/* Logo Area */}
      <div className="flex items-center justify-between p-6 mb-4">
        <Logo className="scale-[0.8] origin-left" />
        <button 
          onClick={() => setIsSearchOpen(true)} 
          className="p-2 text-gray-400 hover:text-cyan-500 hover:bg-gray-100 dark:hover:bg-[#1a1a1f] rounded-lg transition-colors cursor-pointer"
          title="Rechercher (Ctrl+K)"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-4">
        
        <div className="mb-8">
          <div className="space-y-1">
            <button onClick={() => { navigate('/'); onClose?.(); }} className={`w-full flex items-center justify-between space-x-3 px-4 py-2.5 rounded-xl transition-colors ${location.pathname === '/' ? 'bg-white dark:bg-[#1e1e24] text-gray-900 dark:text-gray-200 border border-gray-200 dark:border-[#27272a] shadow-sm dark:shadow-inner' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a1f] hover:text-gray-900 dark:hover:text-gray-300'}`}>
              <span className="text-sm font-medium flex items-center"><LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard</span>
              {location.pathname === '/' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>}
            </button>
            
            {recentProjects.length > 0 && (
              <div className="pl-6 space-y-1 relative before:absolute before:left-4 before:top-0 before:bottom-0 before:w-px before:bg-gray-200 dark:before:bg-[#27272a]">
                {recentProjects.map(p => (
                  <button key={p.id} onClick={() => { navigate(`/projects/${p.id}`); onClose?.(); }} className="relative flex items-center w-full px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors group text-left">
                    <span className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-[10px] h-px bg-gray-200 dark:bg-[#27272a]"></span>
                    <span className="truncate max-w-[170px]">{p.title}</span>
                  </button>
                ))}
              </div>
            )}
            
            <button onClick={() => { navigate('/projects'); onClose?.(); }} className={`w-full flex items-center justify-between space-x-3 px-4 py-2.5 rounded-xl transition-colors ${location.pathname === '/projects' ? 'bg-white dark:bg-[#1e1e24] text-gray-900 dark:text-gray-200 border border-gray-200 dark:border-[#27272a] shadow-sm dark:shadow-inner' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a1f] hover:text-gray-900 dark:hover:text-gray-300'}`}>
              <span className="text-sm font-medium flex items-center"><FolderKanban className="w-4 h-4 mr-2" /> Mes Projets</span>
              {location.pathname === '/projects' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>}
            </button>
            

          </div>
        </div>

      </nav>

      {/* Configuration des Providers Button */}
      <div className="mx-4 mb-4">
        <button
          onClick={() => {
            navigate('/providers');
            if (onClose) onClose();
          }}
          className="w-full p-4 bg-gray-50 dark:bg-[#1a1a1f] hover:bg-gray-100 dark:hover:bg-[#27272a] border border-gray-200 dark:border-[#27272a] rounded-xl flex items-center transition-colors text-left group"
        >
          <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center mr-4 shrink-0 group-hover:scale-110 transition-transform">
            <Key className="w-5 h-5 text-cyan-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Configuration des Providers</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Gérer les clés API</p>
          </div>
        </button>
      </div>

      {/* Subscription/Unlock Area (Like BuildHub) */}
      <div className="mx-4 mb-4 p-4 rounded-xl bg-gradient-to-b from-white to-gray-50 dark:from-[#1a1e24] dark:to-[#121214] border border-gray-200 dark:border-[#27272a] shadow-sm relative overflow-hidden group cursor-pointer transition-colors">
        <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-cyan-500 dark:text-cyan-400 text-xs">🔒</span>
          <span className="text-gray-800 dark:text-gray-200 text-sm font-semibold">TeraSprint Pro</span>
        </div>
        <p className="text-xs text-gray-500">Unlock AI advanced features.</p>
      </div>

      {/* User Profile */}
      <div className="p-4 mx-4 mb-4 rounded-xl bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] shadow-sm flex items-center justify-between transition-colors">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-cyan-50 dark:bg-cyan-900/50 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center text-xs font-bold text-cyan-600 dark:text-cyan-400">
            {user?.name ? getInitials(user.name) : 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{user?.name || 'Utilisateur'}</p>
          </div>
        </div>
        <button 
          onClick={logout}
          className="p-2 text-gray-400 dark:text-gray-500 hover:text-cyan-500 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-400/10 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
      </aside>

      {/* Render modal outside aside to prevent containing block issues from backdrop-blur/transform */}
      <GlobalSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </>
  );
};
