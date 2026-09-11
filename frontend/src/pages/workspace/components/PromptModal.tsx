import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export type PromptType = 'create_file' | 'create_folder' | 'rename' | 'delete';

export interface PromptState {
  isOpen: boolean;
  type: PromptType;
  path: string;
  initialValue: string;
}

interface PromptModalProps {
  promptState: PromptState | null;
  onClose: () => void;
  onSubmit: (value: string) => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({ promptState, onClose, onSubmit }) => {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (promptState?.isOpen) {
      setValue(promptState.initialValue || '');
      setTimeout(() => inputRef.current?.focus(), 100);
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [promptState?.isOpen, promptState?.initialValue, onClose]);

  if (!promptState?.isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(value);
  };

  const titles = {
    create_file: 'Nouveau Fichier',
    create_folder: 'Nouveau Dossier',
    rename: 'Renommer',
    delete: 'Confirmer la suppression'
  };

  const isDelete = promptState.type === 'delete';

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 font-sans">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
          {titles[promptState.type]}
        </h3>
        
        <form onSubmit={handleSubmit}>
          {!isDelete ? (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                {promptState.type === 'rename' ? 'Nouveau nom' : 'Nom'}
              </label>
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#1a1a1f] border border-gray-300 dark:border-[#3f3f46] text-gray-900 dark:text-gray-100 text-sm rounded-xl focus:ring-cyan-500 focus:border-cyan-500 block p-3 outline-none transition-colors"
                placeholder={promptState.type === 'create_file' ? 'ex: index.ts' : 'ex: src'}
                required
              />
            </div>
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
              Êtes-vous sûr de vouloir supprimer <strong className="text-red-500">{promptState.initialValue}</strong> ? Cette action est irréversible.
            </p>
          )}

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#1a1a1f] hover:bg-gray-200 dark:hover:bg-[#27272a] rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-sm font-bold text-white rounded-xl transition-colors shadow-sm ${
                isDelete ? 'bg-red-600 hover:bg-red-700' : 'bg-cyan-600 hover:bg-cyan-700'
              }`}
            >
              {isDelete ? 'Supprimer' : 'Confirmer'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
