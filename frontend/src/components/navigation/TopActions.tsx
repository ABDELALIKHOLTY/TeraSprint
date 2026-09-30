import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Settings } from 'lucide-react';

export const TopActions = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="flex items-center space-x-2 sm:space-x-4">
      <button 
        onClick={toggleTheme}
        className="p-2 rounded-full bg-gray-100 dark:bg-[#1a1a1f] text-gray-500 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors border border-gray-200 dark:border-[#27272a]"
        title="Toggle Theme"
      >
        {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      </button>
      
      <div className="flex items-center p-1 rounded-full bg-gray-100 dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a]">
        <button 
          onClick={() => setLanguage('fr')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${language === 'fr' ? 'bg-cyan-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
          FR
        </button>
        <button 
          onClick={() => setLanguage('en')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${language === 'en' ? 'bg-cyan-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
          EN
        </button>
      </div>

      <button 
        onClick={() => navigate('/settings')}
        className="p-2 rounded-full bg-gray-100 dark:bg-[#1a1a1f] text-gray-500 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors border border-gray-200 dark:border-[#27272a]"
        title="Paramètres"
      >
        <Settings className="w-4 h-4" />
      </button>
    </div>
  );
};
