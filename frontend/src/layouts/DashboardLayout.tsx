import React, { useState } from 'react';
import { Sidebar } from '../components/navigation/Sidebar';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Menu, Sun, Moon, Settings, Key } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TopActions } from '../components/navigation/TopActions';
import { useAuth } from '../context/AuthContext';
import { apiCall } from '../services/api';
import toast from 'react-hot-toast';

interface Props {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<Props> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { user, token, updateUser } = useAuth();
  
  // SSO Password Setup State
  const [ssoPassword, setSsoPassword] = useState('');
  const [ssoPasswordLoading, setSsoPasswordLoading] = useState(false);
  const [ssoPasswordError, setSsoPasswordError] = useState('');

  const handleSetupSsoPassword = async () => {
    if (ssoPassword.length < 8) {
      setSsoPasswordError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    setSsoPasswordLoading(true);
    setSsoPasswordError('');
    try {
      await apiCall('/auth/setup-sso-password', 'PUT', { new_password: ssoPassword }, token);
      updateUser({ needs_password_setup: false });
      toast.success(t('settings.password_success') || "Mot de passe configuré avec succès !");
    } catch (err: any) {
      setSsoPasswordError(err.message || 'Erreur lors de la configuration du mot de passe.');
    } finally {
      setSsoPasswordLoading(false);
    }
  };

  const isProjectPage = location.pathname.includes('/backlog') || location.pathname.includes('/sprints') || location.pathname.includes('/board') || /\/projects\/[^/]+/.test(location.pathname);

  return (
    <div className="flex h-screen bg-[#f3f4f6] dark:bg-[#09090b] font-sans text-gray-900 dark:text-gray-100 overflow-hidden relative transition-colors duration-300">
      
      {/* Dark Mode Ambient Neon Cyan Lights */}
      <div className="hidden dark:block absolute top-[-20%] left-[20%] w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none z-0"></div>
      <div className="hidden dark:block absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none z-0"></div>

      {/* Sidebar - Overlay for small screens */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 sm:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar Container - Pushes content on desktop, overlay on mobile */}
      <div className={`fixed lg:relative z-50 h-full transition-all duration-300 ease-in-out shrink-0 ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full lg:w-20 lg:translate-x-0'}`}>
        <div className="h-full">
          <Sidebar 
            onClose={() => setIsSidebarOpen(false)} 
            isCollapsed={!isSidebarOpen} 
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            isProjectPage={isProjectPage}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        
        {/* We wrap the main content in a white background for light mode, dark mode has its own bg */}
        <div className="flex-1 flex flex-col h-full bg-[#fafafa] dark:bg-[#09090b] overflow-hidden transition-colors duration-300 relative z-10">
          
          {/* Top Header - Only on non-project pages (dashboard home, projects list, settings...) */}
          {!isProjectPage ? (
            <header className="h-[52px] bg-white dark:bg-[#121214] flex items-center justify-between px-4 sm:px-8 z-20 shrink-0 border-b border-gray-200 dark:border-[#27272a] shadow-sm dark:shadow-none transition-colors duration-300">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 text-gray-500 hover:text-cyan-500 dark:text-gray-400 dark:hover:text-cyan-400 transition-colors lg:hidden"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300">
                  Workspace
                </h2>
              </div>
              <TopActions />
            </header>
          ) : (
            /* Floating Menu Button for mobile on project pages */
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="absolute top-3 left-4 z-50 p-2 text-gray-500 hover:text-cyan-500 dark:text-gray-400 dark:hover:text-cyan-400 transition-colors lg:hidden bg-white dark:bg-[#1a1a1f] rounded-lg shadow-sm border border-gray-200 dark:border-[#27272a]"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}

          {/* Dynamic Content */}
          <main className="flex-1 overflow-hidden relative z-10">
            {children}
          </main>

        </div>
      </div>
      
      {/* SSO Password Setup Modal */}
      {user?.needs_password_setup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-2xl w-full max-w-md p-8 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                <Key className="w-8 h-8" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">{t('auth.sso_welcome')}</h2>
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-8">
              {t('auth.sso_setup_desc')}
            </p>
            
            {ssoPasswordError && <p className="text-sm text-red-500 mb-4 p-3 bg-red-50 dark:bg-red-950/30 rounded-xl text-center">{ssoPasswordError}</p>}
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('auth.new_password')}</label>
                <input
                  type="password"
                  value={ssoPassword}
                  onChange={e => setSsoPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-50 dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] text-gray-900 dark:text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow"
                />
              </div>
              <button
                onClick={handleSetupSsoPassword}
                disabled={ssoPasswordLoading || ssoPassword.length < 8}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50 shadow-lg shadow-cyan-500/20"
              >
                {ssoPasswordLoading ? t('auth.configuring') : t('auth.save_password')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
