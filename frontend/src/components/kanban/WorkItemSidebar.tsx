import React, { useState, useEffect } from 'react';
import { X, Search, Clock, AlignLeft, Users, CheckSquare } from 'lucide-react';
import type { Task } from '../../types/backlog';

interface Props {
  task: Task | null;
  users: any[];
  onClose: () => void;
  onUpdateTask: (task: Task) => void;
}

export const WorkItemSidebar: React.FC<Props> = ({ task, users, onClose, onUpdateTask }) => {
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');

  useEffect(() => {
    setEditedTask(task);
  }, [task]);

  if (!editedTask) return null;

  const handleSave = (field: keyof Task, value: any) => {
    const updated = { ...editedTask, [field]: value };
    setEditedTask(updated);
    onUpdateTask(updated);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'DONE':
      case 'CLOSED':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'IN PROGRESS':
      case 'ACTIVE':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const filteredUsers = users.filter(u => 
    (u.first_name || u.name).toLowerCase().includes(assigneeSearch.toLowerCase()) || 
    (u.last_name || '').toLowerCase().includes(assigneeSearch.toLowerCase())
  );

  return (
    <div className="w-80 border-l border-gray-200 dark:border-[#27272a] bg-gray-50 dark:bg-[#121214] flex flex-col h-full shadow-inner z-20">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-[#27272a] flex items-center justify-between bg-white dark:bg-[#1a1a1f]">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 flex items-center justify-center bg-yellow-100 dark:bg-yellow-900/30 rounded">
            <span className="text-yellow-600 text-[10px]">☑</span>
          </div>
          <span className="text-xs font-semibold text-gray-500 uppercase">Task</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-[#27272a] text-gray-500 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4 space-y-6">
          {/* Title */}
          <div>
            <input 
              type="text" 
              value={editedTask.title} 
              onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
              onBlur={(e) => handleSave('title', e.target.value)}
              className="w-full text-lg font-bold bg-transparent border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-cyan-500 focus:bg-white dark:focus:bg-[#1a1a1f] rounded px-2 py-1 outline-none transition-all"
              placeholder="Titre de la tâche"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">State</label>
              <select 
                value={editedTask.status || 'New'}
                onChange={(e) => handleSave('status', e.target.value)}
                className={`w-full text-sm rounded border px-2 py-1.5 outline-none appearance-none cursor-pointer ${getStatusColor(editedTask.status || 'New')}`}
              >
                <option value="New">New</option>
                <option value="Active">Active</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            {/* Effort */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 flex items-center"><Clock className="w-3 h-3 mr-1" /> Effort</label>
              <input 
                type="number" 
                value={editedTask.estimated_hours || ''}
                onChange={(e) => setEditedTask({ ...editedTask, estimated_hours: parseFloat(e.target.value) || 0 })}
                onBlur={(e) => handleSave('estimated_hours', parseFloat(e.target.value) || 0)}
                className="w-full text-sm rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a1a1f] px-2 py-1.5 outline-none focus:border-cyan-500"
                placeholder="Hours"
              />
            </div>
          </div>

          {/* Assignee Search / Dropdown (Azure Style) */}
          <div className="relative">
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Assignee</label>
            <div 
              className="flex items-center p-1.5 border border-transparent hover:border-gray-300 dark:hover:border-gray-700 rounded cursor-pointer group"
              onClick={() => setIsAssigneeOpen(!isAssigneeOpen)}
            >
              <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800 flex items-center justify-center shrink-0 border border-gray-300 dark:border-gray-600">
                {editedTask.assignee_id ? (
                  users.find(u => u.id === editedTask.assignee_id)?.avatar_url ? (
                    <img src={users.find(u => u.id === editedTask.assignee_id)?.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                      {(users.find(u => u.id === editedTask.assignee_id)?.first_name?.charAt(0) || users.find(u => u.id === editedTask.assignee_id)?.name?.charAt(0))?.toUpperCase()}
                    </span>
                  )
                ) : (
                  <Users className="w-3 h-3 text-gray-400" />
                )}
              </div>
              <span className="ml-2 text-sm truncate flex-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                {editedTask.assignee_id 
                  ? `${users.find(u => u.id === editedTask.assignee_id)?.first_name || ''} ${users.find(u => u.id === editedTask.assignee_id)?.last_name || ''}`.trim() || users.find(u => u.id === editedTask.assignee_id)?.name 
                  : 'Unassigned'}
              </span>
            </div>

            {isAssigneeOpen && (
              <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] shadow-lg rounded z-30 overflow-hidden">
                <div className="p-2 border-b border-gray-100 dark:border-gray-800">
                  <div className="relative">
                    <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      value={assigneeSearch}
                      onChange={(e) => setAssigneeSearch(e.target.value)}
                      placeholder="Search users..." 
                      className="w-full text-xs pl-7 pr-2 py-1.5 bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-[#3f3f46] rounded outline-none focus:border-cyan-500"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <button 
                    onClick={() => { handleSave('assignee_id', null); setIsAssigneeOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#27272a] flex items-center space-x-2 transition-colors"
                  >
                    <div className="w-5 h-5 rounded-full border border-dashed border-gray-400 flex items-center justify-center"><Users className="w-3 h-3 text-gray-400" /></div>
                    <span className="text-gray-500">Unassigned</span>
                  </button>
                  {filteredUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => { handleSave('assignee_id', u.id); setIsAssigneeOpen(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-cyan-50 dark:hover:bg-cyan-900/10 flex items-center space-x-2 transition-colors"
                    >
                      {u.avatar_url ? (
                        <img src={u.avatar_url} className="w-5 h-5 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-[10px] font-bold text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800">
                          {(u.first_name ? u.first_name.charAt(0) : u.name.charAt(0)).toUpperCase()}
                        </div>
                      )}
                      <span className="truncate">{u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 flex items-center"><AlignLeft className="w-3 h-3 mr-1" /> Description</label>
            <textarea 
              value={editedTask.description || ''}
              onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
              onBlur={(e) => handleSave('description', e.target.value)}
              className="w-full h-32 text-sm p-2 bg-white dark:bg-[#1a1a1f] border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 focus:border-cyan-500 rounded outline-none resize-y transition-colors custom-scrollbar"
              placeholder="Add a description..."
            />
          </div>

        </div>
      </div>
    </div>
  );
};
