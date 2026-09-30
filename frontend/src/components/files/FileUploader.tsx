import React, { useState, useRef } from 'react';
import { Upload, X, File as FileIcon, Image as ImageIcon, Code, Loader2 } from 'lucide-react';

interface Props {
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
}

export const FileUploader: React.FC<Props> = ({ onUpload, isUploading }) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await onUpload(e.target.files[0]);
      // Reset input
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div 
      className={`relative w-full border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
        dragActive 
          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/10' 
          : 'border-gray-300 dark:border-[#3f3f46] hover:border-cyan-400 hover:bg-gray-50 dark:hover:bg-[#1a1a1f]'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input 
        ref={inputRef}
        type="file" 
        className="hidden" 
        onChange={handleChange}
        disabled={isUploading}
      />
      
      <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
        {isUploading ? (
          <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <Upload className="w-6 h-6" />
          </div>
        )}
        
        <div className="text-gray-700 dark:text-gray-300 font-medium">
          {isUploading ? 'Uploading file...' : 'Glissez-déposez un fichier ici ou cliquez pour parcourir'}
        </div>
        <p className="text-xs text-gray-500">
          Documents, Images, Code zippé (max 50MB)
        </p>
      </div>
    </div>
  );
};
