import React, { useState } from 'react';
import { Sidebar } from '../components/navigation/Sidebar';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Menu, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<Props> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  // Sidebar hidden by default
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-[#f3f4f6] dark:bg-[#09090b] font-sans text-gray-900 dark:text-gray-100 overflow-hidden relative transition-colors duration-300">
      
      {/* Light Mode subtle noise/grain (optional) - omitted for ultra clean look */}
      


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

      {/* Sidebar Container */}
      <div className={`fixed lg:relative z-50 h-full transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full lg:-translate-x-full'}`}>
        <div className="w-72 h-full">
          <Sidebar onClose={() => setIsSidebarOpen(false)} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        
        {/* We wrap the main content in a white background for light mode, dark mode has its own bg */}
        <div className="flex-1 flex flex-col h-full bg-[#fafafa] dark:bg-[#09090b] overflow-hidden transition-colors duration-300 relative z-10">
          
          {/* Top Header - Made clearly visible in dark mode */}
          <header className="h-[72px] bg-white dark:bg-[#121214] flex items-center justify-between px-4 sm:px-8 z-20 shrink-0 border-b border-gray-200 dark:border-[#27272a] shadow-sm dark:shadow-none transition-colors duration-300">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 text-gray-500 hover:text-cyan-500 dark:text-gray-400 dark:hover:text-cyan-400 transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Workspace
              </h2>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Theme Toggle Button */}
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-full bg-gray-100 dark:bg-[#1a1a1f] text-gray-500 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors border border-gray-200 dark:border-[#27272a]"
                title="Toggle Theme"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => navigate('/settings')}
                className="p-2 rounded-full bg-gray-100 dark:bg-[#1a1a1f] text-gray-500 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors border border-gray-200 dark:border-[#27272a]"
                title="Paramètres"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Dynamic Content */}
          <main className="flex-1 overflow-hidden relative z-10">
            {children}
          </main>

        </div>
      </div>
    </div>
  );
};
