import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiCall } from '../../services/api';
import { useAuth } from "../../context/AuthContext";
import { Loader2, Users, Clock, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { TicketModal } from '../../components/kanban/TicketModal';
import { ProjectMembersModal } from '../../components/kanban/ProjectMembersModal';
import { TopActions } from '../../components/navigation/TopActions';
import type { Task } from '../../types/backlog';

export const SprintsPage = () => {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  
  // Ticket Modal States
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [taskChats, setTaskChats] = useState<Record<string, any[]>>({});
  const [completedSubtasks, setCompletedSubtasks] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (id && token) {
      Promise.all([
        apiCall(`/projects/${id}`, 'GET', null, token),
        apiCall(`/projects/${id}/members`, 'GET', null, token)
      ]).then(([projectData, usersData]) => {
        setProject(projectData);
        setUsers(usersData || []);
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
    }
  }, [id, token]);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-cyan-500" /></div>;
  }

  const userStories = project?.epics?.flatMap((e: any) => e.user_stories || []) || [];
  const allTasks = userStories.flatMap((us: any) => us.tasks || []);
  
  // Calculate workload per user
  const workload: Record<string, { user: any, hours: number, taskCount: number }> = {};
  allTasks.forEach((task: any) => {
    if (task.assignee_id) {
      if (!workload[task.assignee_id]) {
        workload[task.assignee_id] = { user: users.find(u => u.id === task.assignee_id), hours: 0, taskCount: 0 };
      }
      workload[task.assignee_id].hours += (task.estimated_hours || 0);
      workload[task.assignee_id].taskCount += 1;
    }
  });

  const handleUpdateTask = async (updatedTask: any) => {
    setProject((prev: any) => {
      if (!prev) return prev;
      const newProject = { ...prev };
      newProject.epics = newProject.epics.map((epic: any) => ({
        ...epic,
        user_stories: epic.user_stories.map((us: any) => ({
          ...us,
          tasks: us.tasks.map((task: any) => task.id === updatedTask.id ? updatedTask : task)
        }))
      }));
      return newProject;
    });
    setSelectedTask(updatedTask);
    
    try {
      await apiCall(`/projects/tasks/${updatedTask.id}`, 'PUT', updatedTask);
    } catch (e) {
      console.error("Failed to save task update to DB", e);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'DONE':
      case 'CLOSED':
        return 'border-green-500 bg-white dark:bg-[#1a1a1f]';
      case 'IN PROGRESS':
      case 'ACTIVE':
        return 'border-blue-500 bg-white dark:bg-[#1a1a1f]';
      default:
        return 'border-gray-300 dark:border-[#3f3f46] bg-white dark:bg-[#1a1a1f]';
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-white dark:bg-[#121214] font-sans">
      <div className="flex-1 p-8 h-full flex flex-col overflow-hidden">
        
        {/* Header Tabs (Azure Style) */}
        <div className="mb-4 border-b border-gray-200 dark:border-[#27272a] pb-2 flex items-center justify-between text-sm">
          <div className="flex items-center space-x-6">
            <div className="font-semibold text-cyan-600 dark:text-cyan-500 border-b-2 border-cyan-500 pb-2 -mb-[9px]">Taskboard</div>
          </div>
          <TopActions />
        </div>

        {/* Workload Summary */}
        <div className="mb-6 bg-gray-50 dark:bg-[#1a1a1f] p-4 rounded border border-gray-200 dark:border-[#27272a] flex space-x-6 overflow-x-auto custom-scrollbar">
          <div className="flex flex-col justify-center pr-6 border-r border-gray-200 dark:border-gray-800">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{t('sprints.work_details')}</span>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{Object.keys(workload).length} {t('sprints.assignees')}</span>
          </div>
          
          {Object.values(workload).map(w => (
            <div key={w.user?.id} className="flex items-center space-x-3 shrink-0">
              <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center overflow-hidden">
                {w.user?.avatar_url ? (
                  <img src={w.user.avatar_url} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400">
                    {(w.user?.first_name?.charAt(0) || w.user?.name?.charAt(0) || 'U').toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{w.user?.first_name || w.user?.name}</span>
                <span className="text-[10px] font-mono text-gray-500 flex items-center"><Clock className="w-3 h-3 mr-1" /> {w.hours}h ({w.taskCount} tasks)</span>
              </div>
            </div>
          ))}
          {Object.keys(workload).length === 0 && (
            <div className="text-sm text-gray-500 flex items-center">No tasks assigned in this sprint.</div>
          )}
        </div>
        
        {/* Kanban Taskboard by Swimlane */}
        <div className="flex-1 overflow-auto custom-scrollbar border border-gray-200 dark:border-[#27272a] rounded bg-gray-50/50 dark:bg-[#0a0a0c]">
          {/* Header Row */}
          <div className="flex bg-gray-100 dark:bg-[#1a1a1f] border-b border-gray-200 dark:border-[#27272a] sticky top-0 z-10 font-semibold text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            <div className="w-1/4 min-w-[250px] p-3 border-r border-gray-200 dark:border-[#27272a]">{t('sprints.user_story')}</div>
            <div className="w-1/4 min-w-[250px] p-3 border-r border-gray-200 dark:border-[#27272a]">{t('board.todo')}</div>
            <div className="w-1/4 min-w-[250px] p-3 border-r border-gray-200 dark:border-[#27272a]">{t('board.in_progress')}</div>
            <div className="w-1/4 min-w-[250px] p-3">{t('board.done')}</div>
          </div>

          {/* Swimlanes */}
          {userStories.map((us: any) => {
            const usTasks = us.tasks || [];
            const todoTasks = usTasks.filter((t: any) => t.status?.toUpperCase() === 'NEW' || t.status?.toUpperCase() === 'TO DO');
            const inProgressTasks = usTasks.filter((t: any) => t.status?.toUpperCase() === 'ACTIVE' || t.status?.toUpperCase() === 'IN PROGRESS');
            const doneTasks = usTasks.filter((t: any) => t.status?.toUpperCase() === 'CLOSED' || t.status?.toUpperCase() === 'DONE' || t.status?.toUpperCase() === 'RESOLVED');

            return (
              <div key={us.id} className="flex border-b border-gray-200 dark:border-[#27272a]">
                
                {/* User Story Info Column */}
                <div className="w-1/4 min-w-[250px] p-4 border-r border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#121214]">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
                      <span className="text-[10px] text-white font-bold">US</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-500">{us.id.substring(0, 6)}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-tight mb-3">{us.title}</h3>
                  <div className="flex items-center space-x-3 text-xs font-mono text-gray-500">
                    <span className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-500" /> {doneTasks.length}/{usTasks.length}</span>
                    <span className="bg-gray-200 dark:bg-gray-800 px-1.5 rounded">{usTasks.reduce((acc: number, t: any) => acc + (t.estimated_hours || 0), 0)}h</span>
                  </div>
                </div>

                {/* Columns for Tasks */}
                {[todoTasks, inProgressTasks, doneTasks].map((taskGroup, idx) => (
                  <div key={idx} className="w-1/4 min-w-[250px] p-2 border-r border-gray-200 dark:border-[#27272a] last:border-0 bg-transparent flex flex-col space-y-2">
                    {taskGroup.map((task: any) => (
                      <div 
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className={`p-3 rounded border-l-4 cursor-pointer hover:shadow-md transition-shadow shadow-sm ${getStatusColor(task.status)} border-y border-r border-y-gray-200 border-r-gray-200 dark:border-y-[#3f3f46] dark:border-r-[#3f3f46] ${task.assignee_id === user?.id ? 'ring-1 ring-cyan-500 bg-cyan-50/30 dark:bg-cyan-900/20' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-1.5">
                            <div className="w-3.5 h-3.5 bg-yellow-400 rounded-sm flex items-center justify-center">
                              <span className="text-[9px] text-yellow-900 font-bold">☑</span>
                            </div>
                            <span className="text-[10px] font-bold text-gray-500">{task.id.substring(0, 6)}</span>
                          </div>
                        </div>
                        <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-3 line-clamp-3">{task.title}</h4>
                        
                        <div className="flex items-center justify-between mt-auto">
                          <div className="flex items-center text-[10px] font-mono text-gray-500 font-bold">
                            <Clock className="w-3 h-3 mr-1" /> {task.estimated_hours || 0}h
                          </div>
                          
                          <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            {task.assignee_id ? (
                              users.find(u => u.id === task.assignee_id)?.avatar_url ? (
                                <img src={users.find(u => u.id === task.assignee_id)?.avatar_url} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[8px] font-bold text-gray-600 dark:text-gray-300">
                                  {(users.find(u => u.id === task.assignee_id)?.first_name?.charAt(0) || users.find(u => u.id === task.assignee_id)?.name?.charAt(0))?.toUpperCase()}
                                </span>
                              )
                            ) : (
                              <Users className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })}
          {userStories.length === 0 && (
            <div className="p-12 text-center text-gray-500 text-sm">
              No User Stories found in this sprint. Plan them from the Backlog.
            </div>
          )}
        </div>
      </div>

      <TicketModal 
        task={selectedTask} 
        projectId={id}
        onClose={() => setSelectedTask(null)} 
        onUpdateTask={handleUpdateTask}
        onNegotiate={async () => {}}
        chatHistory={selectedTask?.chat_history || []}
        onUpdateChat={(msgs) => {
          if (selectedTask) handleUpdateTask({ ...selectedTask, chat_history: msgs });
        }}
        completedSubtasks={selectedTask ? completedSubtasks[selectedTask.id] || [] : []}
        onToggleSubtask={(subtask) => {
          if (!selectedTask) return;
          setCompletedSubtasks(prev => {
            const current = prev[selectedTask.id] || [];
            const isCompleted = current.includes(subtask);
            return {
              ...prev,
              [selectedTask.id]: isCompleted ? current.filter(s => s !== subtask) : [...current, subtask]
            };
          });
        }}
        onDeleteSubtask={(subtask) => {
          if (!selectedTask) return;
          const updated = { ...selectedTask, subtasks: (selectedTask.subtasks || []).filter((s: any) => s !== subtask) };
          handleUpdateTask(updated);
        }}
      />
      
      {isMembersModalOpen && id && (
        <ProjectMembersModal projectId={id} onClose={() => setIsMembersModalOpen(false)} />
      )}
    </div>
  );
};


