import React from 'react';
import { Sparkles } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export const MainLayout: React.FC<Props> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col font-sans">
      <header className="w-full bg-gray-900 border-b border-gray-800 p-4 shadow-md z-10 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Sparkles className="w-6 h-6 text-blue-400" />
          <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            TeraSprint
          </span>
        </div>
        <div className="text-sm text-gray-500 font-mono">
          IA Factory
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {children}
      </main>
    </div>
  );
};
