import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiCall } from '../../services/api';
import { X, Upload, Check, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user, token, updateUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !user) return null;

  const handleSave = async () => {
    try {
      setLoading(true);
      const res = await apiCall('/users/profile', 'PUT', {
        first_name: firstName,
        last_name: lastName
      }, token);
      
      if (res && res.user) {
        updateUser(res.user);
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('http://localhost:8000/api/v1/users/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!res.ok) throw new Error('Upload failed');
      
      const data = await res.json();
      if (data && data.avatar_url) {
        updateUser({ avatar_url: data.avatar_url });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1a1a1f] w-full max-w-md rounded-2xl shadow-xl border border-gray-200 dark:border-[#27272a] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-[#27272a]">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Profil Professionnel</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="flex flex-col items-center mb-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full border-4 border-white dark:border-[#27272a] shadow-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-gray-400">
                    {(user.first_name ? user.first_name.charAt(0) : user.name.charAt(0)).toUpperCase()}
                  </span>
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center rounded-full text-white cursor-pointer transition-colors"
              >
                {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarUpload} 
                className="hidden" 
                accept="image/*" 
              />
            </div>
            
            <div className="mt-4 text-center">
              <h4 className="font-bold text-lg text-gray-900 dark:text-white">
                {user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.name}
              </h4>
              <p className="text-sm text-cyan-600 dark:text-cyan-400 font-mono mt-1">
                {user.saas_email || user.email}
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prénom</label>
              <input 
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121214] border border-gray-300 dark:border-[#3f3f46] rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Votre prénom..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom</label>
              <input 
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121214] border border-gray-300 dark:border-[#3f3f46] rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Votre nom..."
              />
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-[#27272a] flex justify-end">
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>Enregistrer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
