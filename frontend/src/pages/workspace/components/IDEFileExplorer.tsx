import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileCode, FileText, Plus, Trash2, Edit2, FilePlus, FolderPlus, FileJson, FileType2, FileTerminal, FileArchive, FileImage, FileCog, Database } from 'lucide-react';
import { PromptModal } from './PromptModal';
import type { PromptState, PromptType } from './PromptModal';

export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  language?: string;
  path?: string;
}

// Mock initial file tree
export const MOCK_FILE_TREE: FileNode[] = [
  {
    name: 'src',
    type: 'folder',
    children: [
      {
        name: 'components',
        type: 'folder',
        children: [
          { name: 'App.tsx', type: 'file', language: 'typescript', content: 'export const App = () => {\n  return <div>Hello World</div>;\n};' },
          { name: 'Button.tsx', type: 'file', language: 'typescript', content: 'export const Button = () => <button>Click me</button>;' }
        ]
      },
      { name: 'main.tsx', type: 'file', language: 'typescript', content: 'import React from "react";\nimport ReactDOM from "react-dom/client";\nimport App from "./App";\n\nReactDOM.createRoot(document.getElementById("root")!).render(<App />);' },
      { name: 'index.css', type: 'file', language: 'css', content: '@tailwind base;\n@tailwind components;\n@tailwind utilities;' }
    ]
  },
  {
    name: 'package.json',
    type: 'file',
    language: 'json',
    content: '{\n  "name": "mock-project",\n  "version": "1.0.0",\n  "dependencies": {\n    "react": "^18.2.0"\n  }\n}'
  },
  {
    name: 'README.md',
    type: 'file',
    language: 'markdown',
    content: '# Mock Project\n\nThis is a mock project for the IDE workspace.'
  }
];

interface Props {
  onSelectFile: (file: FileNode) => void;
  selectedFile: FileNode | null;
  fileTree?: FileNode[];
  onCreateFile?: (path: string, type: 'file' | 'folder') => void;
  onDeleteFile?: (path: string) => void;
  onRenameFile?: (oldPath: string, newPath: string) => void;
}

const FileTreeNode: React.FC<{
  node: FileNode;
  depth: number;
  path: string;
  onSelectFile: (file: FileNode) => void;
  selectedFile: FileNode | null;
  onCreateFile?: (path: string, type: 'file' | 'folder') => void;
  onDeleteFile?: (path: string) => void;
  onRenameFile?: (oldPath: string, newPath: string) => void;
  onRequestPrompt: (type: PromptType, path: string, nodeName: string) => void;
}> = ({ node, depth, path, onSelectFile, selectedFile, onCreateFile, onDeleteFile, onRenameFile, onRequestPrompt }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const isSelected = selectedFile?.name === node.name && selectedFile?.content === node.content;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleSelect = () => {
    if (node.type === 'file') {
      onSelectFile({ ...node, path });
    } else {
      setIsOpen(!isOpen);
    }
  };

  const getFileIcon = (name: string) => {
    const n = name.toLowerCase();
    
    // Exact file matches
    if (n === 'dockerfile' || n === 'docker-compose.yml' || n === 'docker-compose.yaml') return <FileCog className="w-4 h-4 text-blue-500" />;
    if (n === '.gitignore' || n === '.gitattributes') return <FileCog className="w-4 h-4 text-orange-500" />;
    if (n === 'package.json' || n === 'package-lock.json') return <FileJson className="w-4 h-4 text-green-500" />;
    if (n === 'tsconfig.json') return <FileJson className="w-4 h-4 text-blue-400" />;
    if (n === 'yarn.lock' || n === 'pnpm-lock.yaml') return <FileCog className="w-4 h-4 text-cyan-400" />;

    // Extensions
    const ext = n.split('.').pop();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return <FileCode className="w-4 h-4 text-blue-400" />;
      case 'js':
      case 'jsx':
        return <FileCode className="w-4 h-4 text-yellow-400" />;
      case 'css':
      case 'scss':
      case 'less':
        return <FileCode className="w-4 h-4 text-cyan-400" />;
      case 'html':
      case 'htm':
        return <FileCode className="w-4 h-4 text-orange-500" />;
      case 'json':
        return <FileJson className="w-4 h-4 text-yellow-500" />;
      case 'md':
      case 'mdx':
        return <FileText className="w-4 h-4 text-gray-300" />;
      case 'py':
      case 'ipynb':
        return <FileCode className="w-4 h-4 text-blue-500" />;
      case 'java':
      case 'jar':
      case 'class':
        return <FileCode className="w-4 h-4 text-red-500" />;
      case 'cpp':
      case 'c':
      case 'h':
      case 'hpp':
        return <FileCode className="w-4 h-4 text-purple-500" />;
      case 'go':
        return <FileCode className="w-4 h-4 text-cyan-500" />;
      case 'rs':
        return <FileCog className="w-4 h-4 text-orange-600" />;
      case 'sql':
      case 'db':
      case 'sqlite':
        return <Database className="w-4 h-4 text-pink-500" />;
      case 'sh':
      case 'bash':
      case 'zsh':
        return <FileTerminal className="w-4 h-4 text-green-400" />;
      case 'yml':
      case 'yaml':
      case 'toml':
      case 'ini':
      case 'env':
        return <FileCog className="w-4 h-4 text-gray-400" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'svg':
      case 'gif':
      case 'webp':
      case 'ico':
        return <FileImage className="w-4 h-4 text-purple-400" />;
      case 'zip':
      case 'tar':
      case 'gz':
        return <FileArchive className="w-4 h-4 text-red-400" />;
      case 'txt':
        return <FileType2 className="w-4 h-4 text-gray-400" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleCreateFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRequestPrompt('create_file', path, '');
  };

  const handleCreateFolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRequestPrompt('create_folder', path, '');
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRequestPrompt('delete', path, node.name);
  };

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRequestPrompt('rename', path, node.name);
  };

  return (
    <div className="select-none">
      <div 
        className={`flex items-center justify-between py-1.5 px-2 cursor-pointer text-sm transition-colors rounded-md mx-2 mb-0.5 group
          ${isSelected ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-300 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2a2e]'}
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleSelect}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center overflow-hidden">
          {node.type === 'folder' ? (
          <div className="flex items-center space-x-1.5" onClick={handleToggle}>
            {isOpen ? <ChevronDown className="w-3.5 h-3.5 opacity-70" /> : <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
            {isOpen ? <FolderOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-500" /> : <Folder className="w-4 h-4 text-cyan-600 dark:text-cyan-500" />}
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 ml-4">
            {getFileIcon(node.name)}
          </div>
        )}
          <span className="ml-2 truncate">{node.name}</span>
        </div>
        
        {/* Actions */}
        <div className={`flex items-center space-x-1 ${isHovered ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
          {node.type === 'folder' && (
            <>
              <button onClick={handleCreateFile} className="p-0.5 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200" title="Nouveau fichier">
                <FilePlus className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleCreateFolder} className="p-0.5 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200" title="Nouveau dossier">
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {node.type === 'file' && (
            <button onClick={handleRename} className="p-0.5 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200" title="Renommer">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={handleDelete} className="p-0.5 hover:bg-red-200 dark:hover:bg-red-900/50 rounded text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400" title="Supprimer">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {node.type === 'folder' && isOpen && node.children && (
        <div className="flex flex-col">
          {node.children.map((child, idx) => (
            <FileTreeNode 
              key={`${child.name}-${idx}`} 
              node={child} 
              depth={depth + 1}
              path={path ? `${path}/${child.name}` : child.name}
              onSelectFile={onSelectFile}
              selectedFile={selectedFile}
              onCreateFile={onCreateFile}
              onDeleteFile={onDeleteFile}
              onRenameFile={onRenameFile}
              onRequestPrompt={onRequestPrompt}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const IDEFileExplorer: React.FC<Props> = ({ onSelectFile, selectedFile, fileTree = [], onCreateFile, onDeleteFile, onRenameFile }) => {
  const [promptState, setPromptState] = useState<PromptState | null>(null);

  const handleRootCreate = (type: PromptType) => {
    setPromptState({
      isOpen: true,
      type,
      path: '',
      initialValue: ''
    });
  };

  const handleRequestPrompt = (type: PromptType, path: string, nodeName: string) => {
    setPromptState({
      isOpen: true,
      type,
      path,
      initialValue: nodeName
    });
  };

  const handlePromptSubmit = (value: string) => {
    if (!promptState) return;
    const { type, path, initialValue } = promptState;

    if (type === 'create_file' && onCreateFile) {
      const newPath = path ? `${path}/${value}` : value;
      onCreateFile(newPath, 'file');
    } else if (type === 'create_folder' && onCreateFile) {
      const newPath = path ? `${path}/${value}` : value;
      onCreateFile(newPath, 'folder');
    } else if (type === 'rename' && onRenameFile) {
      if (value !== initialValue) {
        const parentPath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
        const newPath = parentPath ? `${parentPath}/${value}` : value;
        onRenameFile(path, newPath);
      }
    } else if (type === 'delete' && onDeleteFile) {
      onDeleteFile(path);
    }

    setPromptState(null);
  };

  return (
    <div className="w-full h-full bg-gray-50 dark:bg-[#18181b] border-r border-gray-200 dark:border-[#27272a] flex flex-col flex-shrink-0">
      <div className="h-14 flex items-center justify-between px-4 uppercase text-xs font-bold tracking-widest text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-[#27272a] shrink-0">
        <span>Explorer</span>
        <div className="flex items-center space-x-1">
          <button onClick={() => handleRootCreate('create_file')} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" title="Nouveau fichier à la racine">
            <FilePlus className="w-4 h-4" />
          </button>
          <button onClick={() => handleRootCreate('create_folder')} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" title="Nouveau dossier à la racine">
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-3 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-[#3f3f46] scrollbar-track-transparent">
        {fileTree.length === 0 ? (
          <div className="text-xs text-gray-500 text-center mt-10 px-4">
            L'explorateur est vide. Lancez l'IA pour générer les fichiers.
          </div>
        ) : (
          fileTree.map((node, idx) => (
            <FileTreeNode 
              key={`${node.name}-${idx}`} 
              node={node} 
              depth={0} 
              path={node.name}
              onSelectFile={onSelectFile}
              selectedFile={selectedFile}
              onCreateFile={onCreateFile}
              onDeleteFile={onDeleteFile}
              onRenameFile={onRenameFile}
              onRequestPrompt={handleRequestPrompt}
            />
          ))
        )}
      </div>

      <PromptModal
        promptState={promptState}
        onClose={() => setPromptState(null)}
        onSubmit={handlePromptSubmit}
      />
    </div>
  );
};
