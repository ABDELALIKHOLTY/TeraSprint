import React from 'react';
import { LayoutDashboard, LogOut, X, Code2, Settings, Database, Bot, Zap, Menu, FolderKanban, Key, Search, FolderClosed, Layers, Sun, Moon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../ui/Logo';
import { apiCall } from '../../services/api';
import { GlobalSearchModal } from '../ui/GlobalSearchModal';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface SidebarProps {
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggle?: () => void;
  isProjectPage?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose, isCollapsed = false, onToggle, isProjectPage = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, token } = useAuth();
  const { t } = useLanguage();
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [recentProjects, setRecentProjects] = React.useState<any[]>([]);
  const [expandedProjects, setExpandedProjects] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (token) {
      apiCall('/projects/', 'GET', null, token)
        .then(data => setRecentProjects(data.slice(0, 5)))
        .catch(console.error);
    }
  }, [token, location.pathname]);

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <>
      <aside className={`${isCollapsed ? 'w-20' : 'w-72'} bg-gray-50/80 dark:bg-[#121214]/80 backdrop-blur-xl border-r border-gray-200 dark:border-[#27272a]/50 flex flex-col h-screen font-sans text-gray-700 dark:text-gray-300 shrink-0 z-20 m-0 sm:m-2 rounded-r-none sm:rounded-2xl shadow-none sm:shadow-2xl relative transition-all duration-300`}>
      
      {/* Dark Mode Glow top left */}
      <div className="hidden dark:block absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-cyan-900/20 to-transparent pointer-events-none rounded-t-2xl"></div>

      {/* Collapse/Expand Toggle Button (Desktop) */}
      <button
        onClick={onToggle}
        className="hidden lg:flex absolute -right-3.5 top-8 w-7 h-7 bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] rounded-full items-center justify-center text-gray-400 hover:text-cyan-500 hover:border-cyan-500 shadow-sm transition-colors z-50 cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}>
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>

      {/* Logo Area */}
      <div className={`flex items-center p-6 mb-4 ${isCollapsed ? 'justify-center px-0' : 'justify-between'}`}>
        {!isCollapsed ? (
          <Logo className="scale-[0.8] origin-left" />
        ) : (
          <div className="w-8 h-8 flex items-center justify-center text-2xl font-bold tracking-tight text-gray-800 dark:text-gray-100 transition-colors">
            T
          </div>
        )}
        {!isCollapsed && (
          <button 
            onClick={() => setIsSearchOpen(true)} 
            className="p-2 text-gray-400 hover:text-cyan-500 hover:bg-gray-100 dark:hover:bg-[#1a1a1f] rounded-lg transition-colors cursor-pointer"
            title="Rechercher (Ctrl+K)"
          >
            <Search className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto custom-scrollbar ${isCollapsed ? 'px-2' : 'px-4'}`}>
        
        <div className="mb-8">
          <div className="space-y-1">
            <button onClick={() => { navigate('/'); }} className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3' : 'justify-between px-4 py-2.5'} rounded-xl transition-colors ${location.pathname === '/' ? 'bg-white dark:bg-[#1e1e24] text-gray-900 dark:text-gray-200 border border-gray-200 dark:border-[#27272a] shadow-sm dark:shadow-inner' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a1f] hover:text-gray-900 dark:hover:text-gray-300'}`} title={isCollapsed ? t('sidebar.dashboard') : undefined}>
              <div className="flex items-center">
                <LayoutDashboard className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} />
                {!isCollapsed && <span className="text-sm font-medium">{t('sidebar.dashboard')}</span>}
              </div>
              {!isCollapsed && location.pathname === '/' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>}
            </button>
            
            <button onClick={() => { navigate('/projects'); }} className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3' : 'justify-between px-4 py-2.5'} rounded-xl transition-colors ${location.pathname === '/projects' ? 'bg-white dark:bg-[#1e1e24] text-gray-900 dark:text-gray-200 border border-gray-200 dark:border-[#27272a] shadow-sm dark:shadow-inner' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a1f] hover:text-gray-900 dark:hover:text-gray-300'}`} title={isCollapsed ? t('sidebar.my_projects') : undefined}>
              <div className="flex items-center">
                <FolderKanban className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} />
                {!isCollapsed && <span className="text-sm font-medium">{t('sidebar.my_projects')}</span>}
              </div>
              {!isCollapsed && location.pathname === '/projects' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>}
            </button>

            {/* Espaces de travail */}
            {!isCollapsed && recentProjects.length > 0 && (
              <div className="mt-6 mb-2 px-4">
                <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t('sidebar.workspaces')}</p>
              </div>
            )}
            
            {recentProjects.length > 0 && (
              <div className={`${isCollapsed ? 'space-y-2 mt-4' : 'px-3 space-y-1'}`}>
                {recentProjects.map(p => {
                  const isProjectRoute = location.pathname.includes(`/projects/${p.id}`);
                  const isExpanded = expandedProjects.has(p.id) || isProjectRoute;
                  
                  const toggleExpand = () => {
                    setExpandedProjects(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(p.id)) {
                        newSet.delete(p.id);
                      } else {
                        newSet.add(p.id);
                      }
                      return newSet;
                    });
                  };

                  if (isCollapsed) {
                    return (
                      <button 
                        key={p.id}
                        onClick={() => { navigate(`/projects/${p.id}/backlog`); }}
                        className={`w-full flex items-center justify-center p-3 text-[13px] font-medium transition-colors rounded-xl ${isProjectRoute ? 'text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-[#1e1e24]' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1a1a1f]'}`}
                        title={p.title}
                      >
                        <Layers className="w-5 h-5" />
                      </button>
                    );
                  }

                  return (
                    <div key={p.id} className="flex flex-col">
                      <button 
                        onClick={toggleExpand} 
                        className={`w-full flex items-center px-3 py-2 text-[13px] font-medium transition-colors rounded-lg ${isProjectRoute ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-[#1e1e24] font-semibold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a1a1f]'}`}
                      >
                        <span className="truncate flex-1 text-left">{p.title}</span>
                      </button>
                      
                      {/* Sub-menu (Backlogs, Sprints, Boards) */}
                      {isExpanded && (
                        <div className="mt-1 flex flex-col space-y-0.5">
                          <button onClick={() => { navigate(`/projects/${p.id}/backlog`); }} className={`w-full flex items-center pl-8 pr-3 py-1.5 text-[13px] transition-colors rounded-lg ${location.pathname === `/projects/${p.id}/backlog` ? 'text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/10 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1a1a1f]'}`}>
                            Backlog
                          </button>
                          
                          <button onClick={() => { navigate(`/projects/${p.id}/sprints`); }} className={`w-full flex items-center pl-8 pr-3 py-1.5 text-[13px] transition-colors rounded-lg ${location.pathname === `/projects/${p.id}/sprints` ? 'text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/10 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1a1a1f]'}`}>
                            Sprints
                          </button>

                          <button onClick={() => { navigate(`/projects/${p.id}`); }} className={`w-full flex items-center pl-8 pr-3 py-1.5 text-[13px] transition-colors rounded-lg ${location.pathname === `/projects/${p.id}` ? 'text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/10 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1a1a1f]'}`}>
                            Board
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </nav>



      {/* Configuration des Providers Button */}
      <div className={`mx-2 sm:mx-4 mb-4 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <button
          onClick={() => {
            navigate('/providers');
            if (onClose) onClose();
          }}
          className={`p-3 sm:p-4 bg-gray-50 dark:bg-[#1a1a1f] hover:bg-gray-100 dark:hover:bg-[#27272a] border border-gray-200 dark:border-[#27272a] rounded-xl flex items-center transition-colors group ${isCollapsed ? 'w-auto' : 'w-full text-left'}`}
          title={isCollapsed ? "Configuration des Providers" : undefined}
        >
          <div className={`rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${isCollapsed ? 'w-8 h-8' : 'w-10 h-10 mr-4'}`}>
            <Key className="w-5 h-5 text-cyan-500" />
          </div>
          {!isCollapsed && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Configuration</h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Gérer les clés API</p>
            </div>
          )}
        </button>
      </div>

      {/* Subscription/Unlock Area */}
      {!isCollapsed && (
        <div className="mx-4 mb-4 p-4 rounded-xl bg-gradient-to-b from-white to-gray-50 dark:from-[#1a1e24] dark:to-[#121214] border border-gray-200 dark:border-[#27272a] shadow-sm relative overflow-hidden group cursor-pointer transition-colors">
          <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-cyan-500 dark:text-cyan-400 text-xs">🔒</span>
            <span className="text-gray-800 dark:text-gray-200 text-sm font-semibold">TeraSprint Pro</span>
          </div>
          <p className="text-xs text-gray-500">Unlock AI advanced features.</p>
        </div>
      )}

      {/* User Profile */}
      <div 
        onClick={() => { navigate('/settings'); if (onClose) onClose(); }}
        className={`mx-2 sm:mx-4 mb-4 rounded-xl bg-white dark:bg-[#1a1a1f] hover:bg-gray-50 dark:hover:bg-[#27272a] border border-gray-200 dark:border-[#27272a] hover:border-cyan-500/50 shadow-sm flex items-center transition-colors cursor-pointer ${isCollapsed ? 'p-2 justify-center' : 'p-4 justify-between'}`}
        title={isCollapsed ? user?.name : undefined}
      >
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-cyan-50 dark:bg-cyan-900/50 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center text-xs font-bold text-cyan-600 dark:text-cyan-400 overflow-hidden shrink-0">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user?.first_name ? getInitials(user.first_name) : getInitials(user?.name || 'U')
            )}
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.name || 'Utilisateur'}
              </p>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              logout();
            }}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 rounded-lg transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
      </aside>

      {/* Render modal outside aside */}
      <GlobalSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </>
  );
};
