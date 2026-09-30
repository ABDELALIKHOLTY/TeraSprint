import React, { useState, useEffect } from 'react';
import { X, UserPlus, Mail, Shield, Trash2, Search } from 'lucide-react';
import { createPortal } from 'react-dom';
import { apiCall } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface Member {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  role: string;
  avatar_url?: string;
}

interface Props {
  projectId: string;
  onClose: () => void;
}

export const ProjectMembersModal: React.FC<Props> = ({ projectId, onClose }) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Member');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedUserName, setSelectedUserName] = useState('');

  useEffect(() => {
    fetchMembers();
    fetchAllUsers();
  }, [projectId]);

  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const data = await apiCall('/auth/users', 'GET', null, token);
      setAllUsers(data || []);
    } catch (err) {
      console.error("Failed to load users for autocomplete", err);
    }
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const data = await apiCall(`/projects/${projectId}/members`, 'GET', null, token);
      setMembers(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setIsAdding(true);
      setError('');
      const token = localStorage.getItem('token');
      await apiCall(`/projects/${projectId}/members`, 'POST', { email, role }, token);
      setEmail('');
      setSelectedUserName('');
      setRole('Member');
      fetchMembers();
    } catch (err: any) {
      setError(err.message || "Failed to add member. Make sure they have registered.");
    } finally {
      setIsAdding(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="absolute inset-0 bg-gray-900/60 dark:bg-black/70 backdrop-blur-sm transition-colors duration-300" onClick={onClose}></div>
      
      <div className="relative bg-white dark:bg-[#1a1a1f] w-full max-w-4xl flex flex-col border border-gray-200 dark:border-[#27272a] shadow-2xl rounded-lg animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-gray-200 dark:border-[#27272a] bg-gray-50 dark:bg-[#121214] rounded-t-lg">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center">
            <UserPlus className="w-5 h-5 mr-2 text-cyan-600" />
            Project Members
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#27272a] rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-200 dark:border-red-800/30">
              {error}
            </div>
          )}

          {/* Add Member Form - Only for Owner */}
          {members.some(m => m.email === user?.email && m.role === 'Owner') && (
          <form onSubmit={handleAddMember} className="bg-gray-50 dark:bg-[#121214] p-4 rounded-lg border border-gray-200 dark:border-[#27272a] mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Invite new member</h3>
            <div className="flex space-x-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  value={selectedUserName}
                  onChange={(e) => {
                    setSelectedUserName(e.target.value);
                    setEmail(e.target.value); // Temporarily store input for search
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Search and select a user..."
                  className="w-full bg-white dark:bg-[#1a1a1f] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 rounded p-2 pl-9 focus:border-cyan-500 outline-none text-sm transition-colors"
                  required
                />
                
                {/* Autocomplete Suggestions */}
                {showSuggestions && selectedUserName && (
                  <div className="absolute z-50 w-[150%] max-w-xl mt-1 bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] rounded-lg shadow-2xl max-h-72 overflow-y-auto custom-scrollbar">
                    {allUsers
                      .filter(u => {
                        const fullName = `${u.first_name || ''} ${u.last_name || ''} ${u.name || ''}`.toLowerCase();
                        return (fullName.includes(selectedUserName.toLowerCase()) ||
                                u.email.toLowerCase().includes(selectedUserName.toLowerCase())) &&
                                !members.some(m => m.email === u.email);
                      })
                      .map(u => {
                        const displayName = u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.name;
                        return (
                          <div
                            key={u.id}
                            className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#27272a] cursor-pointer flex items-center space-x-3 border-b border-gray-100 dark:border-[#27272a] last:border-0"
                            onClick={() => {
                              setEmail(u.email);
                              setSelectedUserName(displayName);
                              setShowSuggestions(false);
                            }}
                          >
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt={displayName} className="w-10 h-10 rounded-full object-cover shadow-sm" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling!.classList.remove('hidden'); }} />
                            ) : null}
                            <div className={`w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-sm font-bold text-cyan-700 dark:text-cyan-400 shadow-sm ${u.avatar_url ? 'hidden' : ''}`}>
                              {displayName ? displayName.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{displayName}</div>
                              <div className="text-xs text-gray-500">{u.email}</div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
              <div className="w-1/3 relative">
                <Shield className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-white dark:bg-[#1a1a1f] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 rounded p-2 pl-9 focus:border-cyan-500 outline-none text-sm transition-colors"
                >
                  <option value="Member">Member</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <button 
                type="submit"
                disabled={isAdding}
                className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-4 py-2 rounded text-sm transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {isAdding ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </form>
          )}

          {/* Members List */}
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-gray-200 dark:border-[#27272a] pb-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Current Members ({members.length})
              </h3>
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-[#121214] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-200 rounded p-1.5 pl-8 focus:border-cyan-500 outline-none text-xs transition-colors"
                />
              </div>
            </div>
            
            {loading ? (
              <div className="text-center py-8 text-gray-500 text-sm">Loading members...</div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {members.filter(m => {
                  const mName = m.name || m.first_name || '';
                  return mName.toLowerCase().includes(searchQuery.toLowerCase()) || m.email.toLowerCase().includes(searchQuery.toLowerCase());
                }).map(member => {
                  const displayName = member.name || (member.first_name ? `${member.first_name} ${member.last_name || ''}` : member.email);
                  return (
                  <div key={member.id} className="flex justify-between items-center p-3 border border-gray-200 dark:border-[#27272a] rounded-lg bg-white dark:bg-[#1a1a1f]">
                    <div className="flex items-center space-x-3">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt={displayName} className="w-10 h-10 rounded-full object-cover shadow-sm" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling!.classList.remove('hidden'); }} />
                      ) : null}
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm ${member.avatar_url ? 'hidden' : ''}`}>
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{displayName}</div>
                        <div className="text-xs text-gray-500">{member.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${member.role === 'Owner' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {member.role}
                      </span>
                      {member.role !== 'Owner' && (
                        <button className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors" title="Remove member">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
