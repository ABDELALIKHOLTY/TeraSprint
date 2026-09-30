import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiCall } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Loader2, Calendar, Users, GripVertical, Plus, ChevronRight, ChevronDown } from 'lucide-react';
import { ProjectMembersModal } from '../../components/kanban/ProjectMembersModal';
import { TopActions } from '../../components/navigation/TopActions';
import type { Task, UserStory, Epic } from '../../types/backlog';
import { TicketModal } from '../../components/kanban/TicketModal';

export const BacklogPage = () => {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  
  // Users & Filters
  const [users, setUsers] = useState<any[]>([]);
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  
  // Ticket Modal States
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [taskChats, setTaskChats] = useState<Record<string, any[]>>({});
  const [completedSubtasks, setCompletedSubtasks] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (id && token) {
      // Load Project
      apiCall(`/projects/${id}`, 'GET', null, token)
        .then(data => {
          setProject(data);
          
          if (data && data.epics) {
            const initialExpanded: Record<string, boolean> = {};
            data.epics.forEach((epic: any) => {
              initialExpanded[epic.id] = true;
            });
            setExpanded(initialExpanded);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
        
      // Load Users
      apiCall(`/projects/${id}/members`, 'GET', null, token)
        .then(data => setUsers(data || []))
        .catch(err => console.error(err));
    }
  }, [id, token]);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-cyan-500" /></div>;
  }

  const toggleExpand = (itemId: string) => {
    setExpanded(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'DONE':
      case 'CLOSED':
        return 'text-green-500';
      case 'IN PROGRESS':
      case 'ACTIVE':
        return 'text-blue-500';
      default:
        return 'text-gray-400';
    }
  };

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

  const handleUpdateEpic = async (updatedEpic: any) => {
    setProject((prev: any) => {
      if (!prev) return prev;
      const newProject = { ...prev };
      newProject.epics = newProject.epics.map((epic: any) => epic.id === updatedEpic.id ? updatedEpic : epic);
      return newProject;
    });
    
    try {
      await apiCall(`/projects/epics/${updatedEpic.id}`, 'PUT', updatedEpic);
    } catch (e) {
      console.error("Failed to save epic update to DB", e);
    }
  };

  const handleUpdateUserStory = async (updatedUs: any) => {
    setProject((prev: any) => {
      if (!prev) return prev;
      const newProject = { ...prev };
      newProject.epics = newProject.epics.map((epic: any) => ({
        ...epic,
        user_stories: epic.user_stories?.map((us: any) => us.id === updatedUs.id ? updatedUs : us)
      }));
      return newProject;
    });
    
    try {
      await apiCall(`/projects/user-stories/${updatedUs.id}`, 'PUT', updatedUs);
    } catch (e) {
      console.error("Failed to save user story update to DB", e);
    }
  };

  const handleNegotiate = async (taskId: string, message: string, model: string, history: any[] = []) => {
    try {
      // Flattens to find target task
      const allTasks = project?.epics?.flatMap((e: any) => e.user_stories.flatMap((us: any) => us.tasks)) || [];
      const targetTask = allTasks.find((t: any) => t.id === taskId);
      if (!targetTask) return;
      
      const result = await apiCall(`/projects/tasks/${taskId}/negotiate`, 'POST', {
        message,
        task: targetTask,
        model,
        history
      });
      
      const updatedTask = result.updated_task;
      if (updatedTask) {
        handleUpdateTask(updatedTask);
      }
      return result.ai_message || "TASK.UPDATE_SUCCESS";
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const handleNewWorkItem = () => {
    // Generate a dummy task for inline creation
    const newTask = {
      id: `task-${Date.now()}`,
      title: 'Nouveau Work Item',
      status: 'New',
      estimated_hours: 0,
      description: '',
      assignee_id: null
    };
    
    // In a real app we would add this to an "Unparented Tasks" Epic, 
    // but here we just add it to the first Epic or create a dummy Epic if none exists.
    setProject((prev: any) => {
      if (!prev) return prev;
      const newProject = { ...prev };
      if (!newProject.epics || newProject.epics.length === 0) {
        newProject.epics = [{ id: 'epic-default', title: 'Default Epic', user_stories: [{ id: 'us-default', title: 'Default User Story', tasks: [newTask] }] }];
      } else if (!newProject.epics[0].user_stories || newProject.epics[0].user_stories.length === 0) {
        newProject.epics[0].user_stories = [{ id: `us-${Date.now()}`, title: 'Default User Story', tasks: [newTask] }];
      } else {
        newProject.epics[0].user_stories[0].tasks = [...(newProject.epics[0].user_stories[0].tasks || []), newTask];
      }
      return newProject;
    });
    
    // Automatically open the sidebar for editing
    setSelectedTask(newTask);
  };

  return (
    <div className="flex h-full overflow-hidden bg-white dark:bg-[#121214] font-sans">
      {/* Main Content */}
      <div className="flex-1 p-8 h-full flex flex-col overflow-hidden">
        {/* Header Tabs & Toolbar (Azure Style) */}
        <div className="mb-4 border-b border-gray-200 dark:border-[#27272a] pb-2 flex items-center justify-between text-sm">
          <div className="flex items-center space-x-6">
            <div className="font-semibold text-cyan-600 dark:text-cyan-500 border-b-2 border-cyan-500 pb-2 -mb-[9px]">Backlog</div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button onClick={handleNewWorkItem} className="flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-[#1a1a1f] dark:hover:bg-[#27272a] border border-gray-200 dark:border-[#3f3f46] text-gray-700 dark:text-gray-300 rounded text-sm transition-colors shadow-sm">
                <Plus className="w-4 h-4" /> {t('sprints.new_work_item')}
              </button>
              <button onClick={() => setIsMembersModalOpen(true)} className="flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-[#1a1a1f] dark:hover:bg-[#27272a] border border-gray-200 dark:border-[#3f3f46] text-gray-700 dark:text-gray-300 rounded text-sm transition-colors shadow-sm">
                <Users className="w-4 h-4" /> {t('sprints.members')}
              </button>
            </div>
            
            {/* Filter Bar (Azure DevOps style) */}
            <div className="flex items-center space-x-3 text-sm border-r border-gray-200 dark:border-gray-800 pr-4">
              <span className="text-gray-500 font-medium text-xs">{t('sprints.filters')}</span>
              <div className="flex -space-x-1.5">
                <button 
                  onClick={() => setFilterAssignee(null)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center border-2 border-white dark:border-[#121214] text-xs font-bold transition-transform hover:scale-110 hover:z-10 ${filterAssignee === null ? 'bg-cyan-600 text-white shadow-md z-10 scale-110' : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}
                  title="Tous les membres"
                >
                  All
                </button>
                {users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => setFilterAssignee(filterAssignee === u.id ? null : u.id)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center border-2 border-white dark:border-[#121214] bg-gray-300 dark:bg-[#27272a] text-[10px] font-bold text-gray-700 dark:text-gray-300 transition-transform hover:scale-110 hover:z-10 ${filterAssignee === u.id ? 'ring-2 ring-cyan-500 ring-offset-1 z-10 scale-110' : ''}`}
                    title={u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.name}
                  >
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt={u.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      (u.first_name ? u.first_name.charAt(0) : u.name.charAt(0)).toUpperCase()
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            <TopActions />
          </div>
        </div>
      
      {/* Tree Grid */}
      <div className="flex-1 overflow-auto border border-gray-200 dark:border-[#27272a] rounded shadow-sm bg-white dark:bg-[#121214]">
        <div className="min-w-[1000px]">
          {/* Grid Header */}
          <div className="grid grid-cols-[50px_150px_3fr_1fr_80px_1fr_120px] gap-4 p-2 bg-gray-50 dark:bg-[#1a1a1f] border-b border-gray-200 dark:border-[#27272a] text-xs font-semibold text-gray-500 dark:text-gray-400 sticky top-0 z-10">
            <div className="text-center">{t('backlog.order')}</div>
            <div>{t('backlog.type')}</div>
            <div>{t('backlog.title')}</div>
            <div>{t('backlog.state')}</div>
            <div className="text-center">{t('backlog.effort')}</div>
            <div>{t('backlog.business_value')}</div>
            <div>{t('backlog.assignee')}</div>
          </div>

          {/* Grid Body */}
          <div className="flex flex-col text-sm text-gray-800 dark:text-gray-200">
          {project?.epics?.map((epic: any, eIndex: number) => (
            <React.Fragment key={epic.id}>
              {/* EPIC ROW */}
              <div className={`grid grid-cols-[50px_150px_3fr_1fr_80px_1fr_120px] gap-4 p-2 border-b hover:bg-gray-50 dark:hover:bg-[#1a1a1f] items-center group transition-colors ${epic.assignee_id === user?.id ? 'border-l-4 border-l-cyan-500 bg-cyan-50/20 dark:bg-cyan-900/10 border-b-cyan-100 dark:border-b-cyan-900/30' : 'border-b-gray-100 dark:border-b-[#27272a]/50'}`}>
                <div className="text-center text-gray-400 text-xs">{eIndex + 1}</div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 flex items-center justify-center bg-orange-100 dark:bg-orange-900/30 rounded shadow-sm">
                    <span className="text-orange-500 text-[10px]">👑</span>
                  </div>
                  Epic
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <button onClick={() => toggleExpand(epic.id)} className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                    {expanded[epic.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                  {epic.title}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div> New
                </div>
                <div className="text-center"></div>
                <div>Business</div>
                <div className="flex items-center justify-center text-gray-400">
                  -
                </div>
              </div>

              {/* USER STORIES ROWS */}
              {expanded[epic.id] && epic.user_stories?.map((us: any) => (
                <React.Fragment key={us.id}>
                  <div className="grid grid-cols-[50px_150px_3fr_1fr_80px_1fr_120px] gap-4 p-2 border-b border-gray-100 dark:border-[#27272a]/50 hover:bg-gray-50 dark:hover:bg-[#1a1a1f] items-center group bg-blue-50/30 dark:bg-blue-900/5 transition-colors">
                    <div className="text-center text-gray-400 text-xs"></div>
                    <div className="flex items-center gap-2 pl-4">
                      <div className="w-4 h-4 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded shadow-sm">
                        <span className="text-blue-500 text-[10px]">📖</span>
                      </div>
                      User Story
                    </div>
                    <div className="flex items-center gap-2 pl-6">
                      <button onClick={() => toggleExpand(us.id)} className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                        {expanded[us.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </button>
                      <span className="truncate font-medium">{us.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full bg-blue-500`}></div> {us.status || 'Active'}
                    </div>
                    <div className="text-center text-gray-500">{us.story_points || ''}</div>
                    <div>Business</div>
                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                      <div className="relative group/assign">
                        <button className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:ring-2 ring-cyan-500 overflow-hidden">
                          {us.assignee_id ? (
                            users.find(u => u.id === us.assignee_id)?.avatar_url ? (
                              <img src={users.find(u => u.id === us.assignee_id)?.avatar_url} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                                {users.find(u => u.id === us.assignee_id)?.first_name?.charAt(0).toUpperCase() || users.find(u => u.id === us.assignee_id)?.name?.charAt(0).toUpperCase()}
                              </span>
                            )
                          ) : (
                            <Users className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] rounded shadow-lg z-50 hidden group-hover/assign:block">
                          <div className="p-1 max-h-48 overflow-y-auto custom-scrollbar">
                            <div className="text-xs font-semibold text-gray-500 px-2 py-1">{t('backlog.assign_to')}</div>
                            <button onClick={() => handleUpdateUserStory({ ...us, assignee_id: null })} className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-[#27272a] rounded flex items-center space-x-2">
                              <div className="w-5 h-5 rounded-full border border-dashed border-gray-400 flex items-center justify-center"><Users className="w-3 h-3 text-gray-400" /></div>
                              <span>{t('backlog.unassigned')}</span>
                            </button>
                            {users.map(u => (
                              <button key={u.id} onClick={() => handleUpdateUserStory({ ...us, assignee_id: u.id })} className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-[#27272a] rounded flex items-center space-x-2">
                                {u.avatar_url ? <img src={u.avatar_url} className="w-5 h-5 rounded-full object-cover" /> : <div className="w-5 h-5 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-[10px] font-bold text-cyan-700 dark:text-cyan-400">{(u.first_name ? u.first_name.charAt(0) : u.name.charAt(0)).toUpperCase()}</div>}
                                <span className="truncate">{u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TASKS ROWS */}
                  {expanded[us.id] && us.tasks?.filter((t: any) => !filterAssignee || t.assignee_id === filterAssignee).map((task: any) => (
                    <div 
                      key={task.id} 
                      className={`grid grid-cols-[50px_150px_3fr_1fr_80px_1fr_120px] gap-4 p-2 border-b hover:bg-cyan-50 dark:hover:bg-cyan-900/10 cursor-pointer items-center group transition-colors ${task.assignee_id === user?.id ? 'border-l-4 border-l-cyan-500 bg-cyan-50/30 dark:bg-cyan-900/10 border-b-cyan-100 dark:border-b-cyan-900/30' : 'border-b-gray-100 dark:border-b-[#27272a]/50'}`}
                    >
                      <div className="text-center text-gray-400 text-xs" onClick={() => setSelectedTask(task)}></div>
                      <div className="flex items-center gap-2 pl-8" onClick={() => setSelectedTask(task)}>
                        <div className="w-4 h-4 flex items-center justify-center bg-yellow-100 dark:bg-yellow-900/30 rounded shadow-sm">
                          <span className="text-yellow-600 text-[10px]">☑</span>
                        </div>
                        Task
                      </div>
                      <div className="flex items-center gap-2 pl-12" onClick={() => setSelectedTask(task)}>
                        <span className="truncate group-hover:text-cyan-700 dark:group-hover:text-cyan-400 transition-colors">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-2" onClick={() => setSelectedTask(task)}>
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(task.status)}`}></div> {task.status || 'New'}
                      </div>
                      <div className="text-center text-gray-500" onClick={() => setSelectedTask(task)}>{task.estimated_hours || ''}</div>
                      <div onClick={() => setSelectedTask(task)}></div>
                      <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                        {/* Quick Assign Dropdown */}
                        <div className="relative group/assign">
                          <button className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:ring-2 ring-cyan-500 overflow-hidden">
                            {task.assignee_id ? (
                              users.find(u => u.id === task.assignee_id)?.avatar_url ? (
                                <img src={users.find(u => u.id === task.assignee_id)?.avatar_url} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                                  {users.find(u => u.id === task.assignee_id)?.first_name?.charAt(0).toUpperCase() || users.find(u => u.id === task.assignee_id)?.name?.charAt(0).toUpperCase()}
                                </span>
                              )
                            ) : (
                              <Users className="w-3.5 h-3.5 text-gray-400" />
                            )}
                          </button>
                          {/* Dropdown Menu */}
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] rounded shadow-lg z-50 hidden group-hover/assign:block">
                            <div className="p-1 max-h-48 overflow-y-auto">
                              <div className="text-xs font-semibold text-gray-500 px-2 py-1">{t('backlog.assign_to')}</div>
                              <button
                                onClick={() => handleUpdateTask({ ...task, assignee_id: null })}
                                className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-[#27272a] rounded flex items-center space-x-2"
                              >
                                <div className="w-5 h-5 rounded-full border border-dashed border-gray-400 flex items-center justify-center"><Users className="w-3 h-3 text-gray-400" /></div>
                                <span>{t('backlog.unassigned')}</span>
                              </button>
                              {users.map(u => (
                                <button
                                  key={u.id}
                                  onClick={() => handleUpdateTask({ ...task, assignee_id: u.id })}
                                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-[#27272a] rounded flex items-center space-x-2"
                                >
                                  {u.avatar_url ? (
                                    <img src={u.avatar_url} className="w-5 h-5 rounded-full object-cover" />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-[10px] font-bold text-cyan-700 dark:text-cyan-400">
                                      {(u.first_name ? u.first_name.charAt(0) : u.name.charAt(0)).toUpperCase()}
                                    </div>
                                  )}
                                  <span className="truncate">{u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </React.Fragment>
          ))}
          
          {(!project?.epics || project.epics.length === 0) && (
            <div className="p-12 text-center text-gray-500">
              Aucun élément dans le backlog. Utilisez l'Agent AI pour générer votre projet.
            </div>
          )}
          </div>
        </div>
      </div>
      </div>
      
      {/* Full Work Item Modal */}
      <TicketModal 
        task={selectedTask} 
        projectId={id}
        onClose={() => setSelectedTask(null)} 
        onUpdateTask={handleUpdateTask}
        onNegotiate={handleNegotiate}
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



