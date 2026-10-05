import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { TicketModal } from './TicketModal';
import { TicketCard } from './TicketCard';
import type { Backlog, Task } from '../../types/backlog';
import { Book, Edit2, Trash2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface Props {
  initialBacklog: Backlog | null;
}

export const Board: React.FC<Props> = ({ initialBacklog }) => {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [columns, setColumns] = useState<string[]>(['TO DO', 'IN PROGRESS', 'IN REVIEW', 'DONE']);
  const [taskChats, setTaskChats] = useState<Record<string, any[]>>({});
  const [completedSubtasks, setCompletedSubtasks] = useState<Record<string, string[]>>({});
  const [userStories, setUserStories] = useState<{id: string, title: string, epic_title: string}[]>([]);

  useEffect(() => {
    if (initialBacklog) {
      if (initialBacklog.columns && initialBacklog.columns.length > 0) {
        setColumns(initialBacklog.columns);
      }
      const allTasks: Task[] = [];
      const stories: {id: string, title: string, epic_title: string}[] = [];
      let globalIndex = 1;
      
      initialBacklog.epics.forEach((epic) => {
        epic.user_stories.forEach((us) => {
          stories.push({ id: us.id || us.title, title: us.title, epic_title: epic.title });
          us.tasks.forEach((task, index) => {
            allTasks.push({
              ...task,
              id: task.id.length > 20 ? task.id : `${epic.title.replace(/\s+/g, '')}-${us.title.replace(/\s+/g, '')}-${task.id}-${index}-${Math.random().toString(36).substring(2, 7)}`,
              us_title: us.title,
              us_id: us.id || us.title,
              epic_title: epic.title,
              taskNumber: globalIndex++,
            });
          });
        });
      });
      setTasks(allTasks);
      setUserStories(stories);
    }
  }, [initialBacklog]);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // droppableId format: "usId___status"
    const [sourceUsId, sourceStatus] = source.droppableId.split('___');
    const [destUsId, destStatus] = destination.droppableId.split('___');

    // Prevent dragging between different User Stories
    if (sourceUsId !== destUsId) return;

    setTasks(prevTasks => {
      const draggedTask = prevTasks.find(t => t.id === draggableId);
      if (!draggedTask) return prevTasks;
      
      const newTasks = prevTasks.filter(t => t.id !== draggableId);
      const updatedTask = { ...draggedTask, status: destStatus };
      
      const destColumnTasks = newTasks.filter(t => t.us_id === destUsId && t.status.toUpperCase() === destStatus);
      destColumnTasks.splice(destination.index, 0, updatedTask);
      
      import('../../services/api').then(({ apiCall }) => {
        apiCall(`/projects/tasks/${updatedTask.id}`, 'PUT', { status: destStatus }).catch(console.error);
      });

      return [...newTasks.filter(t => !(t.us_id === destUsId && t.status.toUpperCase() === destStatus)), ...destColumnTasks];
    });
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    setSelectedTask(updatedTask);
    try {
      const { apiCall } = await import('../../services/api');
      await apiCall(`/projects/tasks/${updatedTask.id}`, 'PUT', updatedTask);
    } catch (e) {
      console.error("Failed to save task update to DB", e);
    }
  };

  const handleNegotiate = async (taskId: string, message: string, model: string, history: any[] = []) => {
    try {
      const { negotiateTask } = await import('../../services/api');
      const targetTask = tasks.find(t => t.id === taskId);
      if (!targetTask) return;
      const result = await negotiateTask(taskId, message, targetTask, model, history);
      const updatedTask = result.updated_task;
      if (updatedTask) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updatedTask } : t));
        if (selectedTask?.id === taskId) {
          setSelectedTask(prev => prev ? { ...prev, ...updatedTask } : null);
        }
      }
      return result.ai_message || "TASK.UPDATE_SUCCESS";
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  if (!initialBacklog) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 font-mono text-sm tracking-widest uppercase transition-colors duration-300">
        <p className="text-cyan-600/50 dark:text-cyan-500/50">AWAITING CORE DIRECTIVE</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#121214] font-sans rounded-xl overflow-auto shadow-sm">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="min-w-[1180px] flex flex-col h-full">
          {/* Table Header (Columns) */}
          <div className="flex bg-gray-50 dark:bg-[#1a1a1f] border-b border-gray-200 dark:border-[#27272a] sticky top-0 z-10 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <div className="w-[300px] shrink-0 p-3 border-r border-gray-200 dark:border-[#27272a]">
              {t('sprints.user_story')}
            </div>
            {columns.map(col => {
              const mappedCol = 
                col === 'TO DO' ? t('board.todo') :
                col === 'IN PROGRESS' ? t('board.in_progress') :
                col === 'IN REVIEW' ? t('board.in_review') :
                col === 'DONE' ? t('board.done') : col;
                
              return (
                <div key={col} className="flex-1 min-w-[220px] p-3 text-center border-r border-gray-200 dark:border-[#27272a]">
                  {mappedCol}
                </div>
              );
            })}
          </div>

          {/* Swimlanes */}
          <div className="flex-1 overflow-y-visible">
            {userStories.map(us => (
            <div key={us.id} className="flex border-b border-gray-200 dark:border-[#27272a] min-h-[150px] group">
              {/* Left Cell: US Card */}
              <div className="w-[300px] shrink-0 p-3 border-r border-gray-200 dark:border-[#27272a] bg-gray-50/50 dark:bg-[#1a1a1f]/30">
                <div className="flex flex-col p-3 bg-white dark:bg-[#1a1a1f] border-l-4 border-l-blue-500 border border-gray-200 dark:border-[#27272a] shadow-sm rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <Book className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">{us.epic_title}</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200">{us.title}</h3>
                </div>
              </div>

              {/* Status Columns */}
              {columns.map(col => (
                <Droppable key={`${us.id}___${col}`} droppableId={`${us.id}___${col}`}>
                  {(provided, snapshot) => (
                    <div 
                      ref={provided.innerRef} 
                      {...provided.droppableProps}
                      className={`flex-1 min-w-[220px] p-2 border-r border-gray-200 dark:border-[#27272a] ${snapshot.isDraggingOver ? 'bg-cyan-50/30 dark:bg-cyan-900/10' : ''}`}
                    >
                      <div className="flex flex-col gap-2">
                        {tasks.filter(t => t.us_id === us.id && t.status.toUpperCase() === col).map((task, index) => (
                          <TicketCard
                            key={task.id}
                            task={task}
                            index={index}
                            taskNumber={task.taskNumber}
                            onClick={() => setSelectedTask(task)}
                          />
                        ))}
                      </div>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          ))}
            {userStories.length === 0 && (
              <div className="p-8 text-center text-gray-500">Aucune User Story trouvée dans ce sprint.</div>
            )}
          </div>
        </div>
      </DragDropContext>

      <TicketModal 
        task={selectedTask} 
        onClose={() => setSelectedTask(null)} 
        onUpdateTask={handleUpdateTask}
        onNegotiate={handleNegotiate}
        chatHistory={selectedTask ? taskChats[selectedTask.id] || [] : []}
        onUpdateChat={(msgs) => selectedTask && setTaskChats(prev => ({ ...prev, [selectedTask.id]: msgs }))}
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
          const updated = { ...selectedTask, subtasks: (selectedTask.subtasks || []).filter(s => s !== subtask) };
          setTasks(prev => prev.map(t => t.id === selectedTask.id ? updated : t));
          setSelectedTask(updated);
        }}
      />
    </div>
  );
};
