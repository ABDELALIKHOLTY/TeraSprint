import React, { useState } from 'react';
import { Editor, useMonaco } from '@monaco-editor/react';
import { Eye, Code2 } from 'lucide-react';
import type { FileNode } from './IDEFileExplorer';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useLanguage } from '../../../context/LanguageContext';

interface Props {
  file: FileNode | null;
  theme: string;
  onChange?: (path: string, content: string) => void;
}

export const IDECodeEditor: React.FC<Props> = ({ file, theme, onChange }) => {
  const [isPreview, setIsPreview] = useState(false);
  const { t } = useLanguage();

  // Map file extension to monaco language
  let language = 'plaintext';
  if (file) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    if (ext === 'tsx') language = 'typescript'; // Monaco handles TSX via typescript language + compilerOptions, but sometimes typescriptreact is needed. Wait, Monaco's built-in is just 'typescript' or 'javascript'. Wait, no, monaco-editor supports 'typescript'.
    else if (ext === 'ts') language = 'typescript';
    else if (ext === 'jsx') language = 'javascript';
    else if (ext === 'js') language = 'javascript';
    else if (ext === 'css') language = 'css';
    else if (ext === 'json') language = 'json';
    else if (ext === 'html') language = 'html';
    else if (ext === 'md') language = 'markdown';
    else if (ext === 'py') language = 'python';
    else if (ext === 'java') language = 'java';
    else if (ext === 'c' || ext === 'cpp' || ext === 'h') language = 'cpp';
    else if (ext === 'go') language = 'go';
    else if (ext === 'rs') language = 'rust';
    else if (ext === 'sql') language = 'sql';
    else if (ext === 'sh' || ext === 'bash') language = 'shell';
    else if (ext === 'dockerfile') language = 'dockerfile';
    else if (ext === 'yaml' || ext === 'yml') language = 'yaml';
    else if (ext === 'xml') language = 'xml';
    else if (file.language) language = file.language;
  }

  const handleEditorWillMount = (monaco: any) => {
    // Configure TypeScript to support JSX/React
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: "React",
      allowJs: true,
      typeRoots: ["node_modules/@types"]
    });
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'v') {
        if (language === 'markdown') {
          e.preventDefault();
          setIsPreview(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [language]);

  if (!file) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-white dark:bg-[#1e1e1e] text-gray-400 dark:text-gray-500">
        <div className="w-24 h-24 mb-4 opacity-20 dark:opacity-10">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
            <polyline points="13 2 13 9 20 9" />
          </svg>
        </div>
        <p className="text-sm font-medium tracking-wide">{t('ide.select_file')}</p>
      </div>
    );
  }



  return (
    <div className="flex-1 h-full bg-white dark:bg-[#1e1e1e] flex flex-col min-w-0">
      {/* Editor Tab Bar */}
      <div className="h-10 bg-gray-100 dark:bg-[#2d2d2d] flex items-center justify-between shrink-0 border-b border-gray-200 dark:border-[#27272a]">
        <div className="h-full px-4 flex items-center bg-white dark:bg-[#1e1e1e] border-t-2 border-t-cyan-500 border-r border-r-gray-200 dark:border-r-[#27272a] text-gray-800 dark:text-gray-300 text-sm font-medium min-w-[120px]">
          {file.name}
        </div>
        {language === 'markdown' && (
          <div className="flex items-center space-x-1 mr-4">
            <button
              onClick={() => setIsPreview(false)}
              className={`p-1.5 flex items-center space-x-1 rounded text-xs font-medium transition-colors ${!isPreview ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Code</span>
            </button>
            <button
              onClick={() => setIsPreview(true)}
              className={`p-1.5 flex items-center space-x-1 rounded text-xs font-medium transition-colors ${isPreview ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
              title="Aperçu (Ctrl+Shift+V)"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Aperçu</span>
            </button>
          </div>
        )}
      </div>
      
      {/* Container */}
      <div className="flex-1 relative min-h-0 w-full">
        {language === 'markdown' && isPreview ? (
          <div className="absolute inset-0 overflow-y-auto p-8 bg-white dark:bg-[#121214] text-gray-900 dark:text-gray-100">
            <div className="max-w-4xl mx-auto prose dark:prose-invert">
              <MarkdownRenderer content={file.content || ''} />
            </div>
          </div>
        ) : (
          <Editor
            height="100%"
            language={language}
            theme={theme === 'dark' ? 'vs-dark' : 'light'}
            value={file.content || ''}
            beforeMount={handleEditorWillMount}
            onChange={(val) => {
              if (val !== undefined && onChange) {
                onChange(file.path || file.name, val);
              }
            }}
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
              wordWrap: 'on',
              formatOnPaste: true,
              padding: { top: 16 },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on'
            }}
          />
        )}
      </div>
    </div>
  );
};
