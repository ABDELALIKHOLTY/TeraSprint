import React from 'react';
import { Settings, X, Key, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GlobalSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSettingsDrawer: React.FC<GlobalSettingsDrawerProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />
      
      <div className={`fixed right-0 top-0 h-full w-80 max-w-full bg-white dark:bg-[#121214] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-gray-200 dark:border-[#27272a] flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#27272a]">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center">
            <Settings className="w-5 h-5 mr-2 text-cyan-500" />
            Parametres
          </h2>
          <button onClick={onClose} className="p-1 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1e1e24] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          
          {/* TeraSprint Pro Banner */}
          <div className="w-full p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-900/20 dark:hover:to-orange-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-center transition-all cursor-pointer shadow-sm">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mr-4 shrink-0">
              <Lock className="w-5 h-5 text-amber-600 dark:text-amber-500" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-500">TeraSprint Pro</h3>
              <p className="text-xs text-amber-700/70 dark:text-amber-500/70">Unlock AI advanced features.</p>
            </div>
          </div>

          {/* Configuration Providers Banner */}
          <button
            onClick={() => { onClose(); navigate('/providers'); }}
            className="w-full p-4 bg-gray-50 dark:bg-[#1a1a1f] hover:bg-gray-100 dark:hover:bg-[#27272a] border border-gray-200 dark:border-[#27272a] rounded-xl flex items-center transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center mr-4 shrink-0 group-hover:scale-110 transition-transform">
              <Key className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Configuration des Providers</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Gérer les clés API (Groq, OpenRouter...)</p>
            </div>
          </button>

        </div>
      </div>
    </>
  );
};
