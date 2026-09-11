import React, { useState, useEffect, useRef } from 'react';
import { Search, X, FileText } from 'lucide-react';
import { createPortal } from 'react-dom';

interface FileSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  allFiles: Record<string, string>;
  onSelectFile: (path: string, content: string) => void;
}

interface SearchResult {
  path: string;
  line: number;
  snippet: string;
  matchIndex: number;
  matchLength: number;
}

export const FileSearchModal: React.FC<FileSearchModalProps> = ({ isOpen, onClose, allFiles, onSelectFile }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 100);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Search logic
  const searchResults: SearchResult[] = [];
  if (query.length > 1) {
    const lowerQuery = query.toLowerCase();
    Object.entries(allFiles).forEach(([path, content]) => {
      // Check path match
      if (path.toLowerCase().includes(lowerQuery)) {
        searchResults.push({
          path,
          line: 1,
          snippet: `[Chemin du fichier correspondant] ${path}`,
          matchIndex: path.toLowerCase().indexOf(lowerQuery) + 33, // +33 for the prefix length
          matchLength: query.length
        });
      }

      // Check content match
      if (content) {
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          const matchIdx = line.toLowerCase().indexOf(lowerQuery);
          if (matchIdx !== -1) {
            // Trim long lines for display
            let start = Math.max(0, matchIdx - 30);
            let end = Math.min(line.length, matchIdx + query.length + 40);
            let snippet = line.substring(start, end);
            if (start > 0) snippet = '...' + snippet;
            if (end < line.length) snippet = snippet + '...';
            
            let displayMatchIdx = snippet.toLowerCase().indexOf(lowerQuery);

            searchResults.push({
              path,
              line: index + 1,
              snippet: snippet.trim(),
              matchIndex: displayMatchIdx !== -1 ? displayMatchIdx : 0,
              matchLength: query.length
            });
          }
        });
      }
    });
  }

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] transition-opacity" onClick={onClose} />
      
      <div className="fixed inset-x-0 top-[10%] md:top-[15%] mx-auto w-full max-w-3xl bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] shadow-2xl rounded-2xl z-[200] overflow-hidden flex flex-col max-h-[70vh]">
        <div className="flex items-center px-4 py-4 border-b border-gray-200 dark:border-[#27272a] bg-gray-50/50 dark:bg-[#1a1a1f]/50">
          <Search className="w-5 h-5 text-gray-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher dans les fichiers (Ctrl+Shift+F)..."
            className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 text-lg placeholder-gray-400 font-sans"
          />
          <button onClick={onClose} className="p-1.5 rounded-md text-gray-400 hover:bg-gray-200 dark:hover:bg-[#27272a] transition-colors ml-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 font-mono">
          {query.length <= 1 ? (
             <div className="p-12 text-center text-gray-500 text-sm flex flex-col items-center justify-center space-y-3 font-sans">
              <Search className="w-8 h-8 text-gray-400 opacity-50" />
              <p>Tapez au moins 2 caractères pour chercher...</p>
             </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-1">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider font-sans">
                Résultats ({searchResults.length})
              </div>
              {searchResults.slice(0, 100).map((res, i) => (
                <button
                  key={`${res.path}-${res.line}-${i}`}
                  onClick={() => {
                    onSelectFile(res.path, allFiles[res.path]);
                    onClose();
                  }}
                  className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#1e1e24] transition-colors flex flex-col group"
                >
                  <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{res.path}</span>
                    <span className="opacity-50">:{res.line}</span>
                  </div>
                  <div className="text-sm text-gray-800 dark:text-gray-300 truncate w-full pl-5">
                    {res.snippet.substring(0, res.matchIndex)}
                    <span className="bg-yellow-200 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-200 rounded px-0.5">
                      {res.snippet.substring(res.matchIndex, res.matchIndex + res.matchLength)}
                    </span>
                    {res.snippet.substring(res.matchIndex + res.matchLength)}
                  </div>
                </button>
              ))}
              {searchResults.length > 100 && (
                <div className="p-4 text-center text-xs text-gray-500 italic">
                  + {searchResults.length - 100} autres résultats. Affinez votre recherche.
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500 text-sm font-sans">
              Aucun résultat pour "{query}"
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 dark:bg-[#151518] px-4 py-2 border-t border-gray-200 dark:border-[#27272a] text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center hidden sm:flex font-sans">
          <span>Recherche globale dans le code source</span>
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
