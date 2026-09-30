import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, File as FileIcon, Download, Loader2 } from 'lucide-react';
import { apiCall } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FileUploader } from './FileUploader';

interface Props {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectFilesModal: React.FC<Props> = ({ projectId, isOpen, onClose }) => {
  const { token } = useAuth();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const data = await apiCall(`/files/project/${projectId}`, 'GET', null, token);
      setFiles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFiles();
    }
  }, [isOpen, projectId, token]);

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_id', projectId);
      formData.append('file_type', 'document');

      await fetch('http://localhost:8000/api/v1/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      await loadFiles();
    } catch (err) {
      console.error(err);
      alert('Erreur lors du téléchargement du fichier.');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-gray-900/70 dark:bg-black/80 backdrop-blur-md transition-colors duration-300" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-2xl w-full max-w-4xl h-[85vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#27272a] flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <FileIcon className="w-5 h-5 text-cyan-500 mr-2" />
            Fichiers du projet
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-transparent">
          <div className="mb-8">
            <FileUploader onUpload={handleUpload} isUploading={uploading} />
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Fichiers uploadés</h4>
            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-cyan-500" /></div>
            ) : files.length === 0 ? (
              <div className="text-center p-8 text-gray-500 bg-white dark:bg-[#1a1a1f] rounded-xl border border-dashed border-gray-300 dark:border-[#27272a]">
                Aucun fichier dans ce projet pour le moment.
              </div>
            ) : (
              <div className="bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-[#27272a]/50 text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Nom du fichier</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Uploadé par</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#27272a]">
                    {files.map(f => (
                      <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-[#27272a]/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-200 flex items-center space-x-2">
                          <FileIcon className="w-4 h-4 text-gray-400" />
                          <span className="truncate max-w-[200px]">{f.filename}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{f.file_type}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            {f.uploader.avatar_url ? (
                              <img src={f.uploader.avatar_url} className="w-5 h-5 rounded-full object-cover" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-[10px] font-bold text-cyan-700">
                                {f.uploader.name?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="text-gray-600 dark:text-gray-300 text-xs">{f.uploader.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{new Date(f.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          <a 
                            href={f.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-cyan-50 dark:hover:bg-cyan-900/30 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors text-xs font-medium"
                          >
                            <Download className="w-3 h-3" />
                            <span>Ouvrir</span>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
