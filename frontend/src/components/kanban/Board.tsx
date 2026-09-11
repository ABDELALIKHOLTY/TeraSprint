import React, { useState, useEffect } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Column } from './Column';
import { TicketModal } from './TicketModal';
import type { Backlog, Task } from '../../types/backlog';

interface Props {
  initialBacklog: Backlog | null;
}

export const Board: React.FC<Props> = ({ initialBacklog }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [columns, setColumns] = useState<string[]>(['TO DO', 'IN PROGRESS', 'IN REVIEW', 'DONE']);
  const [taskChats, setTaskChats] = useState<Record<string, any[]>>({});
  const [completedSubtasks, setCompletedSubtasks] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (initialBacklog) {
      if (initialBacklog.columns && initialBacklog.columns.length > 0) {
        setColumns(initialBacklog.columns);
      }
      const allTasks: Task[] = [];
      let globalIndex = 1;
      initialBacklog.epics.forEach((epic) => {
        epic.user_stories.forEach((us) => {
          us.tasks.forEach((task, index) => {
            allTasks.push({
              ...task,
              id: task.id.length > 20 ? task.id : `${epic.title.replace(/\s+/g, '')}-${us.title.replace(/\s+/g, '')}-${task.id}-${index}-${Math.random().toString(36).substring(2, 7)}`,
              us_title: us.title,
              epic_title: epic.title,
              taskNumber: globalIndex++,
            });
          });
        });
      });
      setTasks(allTasks);
    }
  }, [initialBacklog]);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId;
    
    setTasks(prevTasks => {
      const draggedTask = prevTasks.find(t => t.id === draggableId);
      if (!draggedTask) return prevTasks;
      
      const newTasks = prevTasks.filter(t => t.id !== draggableId);
      const updatedTask = { ...draggedTask, status: newStatus };
      
      const destColumnTasks = newTasks.filter(t => t.status.toUpperCase() === newStatus);
      destColumnTasks.splice(destination.index, 0, updatedTask);
      
      // Update DB in background
      import('../../services/api').then(({ apiCall }) => {
        apiCall(`/projects/tasks/${updatedTask.id}`, 'PUT', { status: newStatus }).catch(console.error);
      });

      return [...newTasks.filter(t => t.status.toUpperCase() !== newStatus), ...destColumnTasks];
    });
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    setSelectedTask(updatedTask);
    
    // Sauvegarder dans la DB PostgreSQL
    try {
      const { apiCall } = await import('../../services/api');
      await apiCall(`/projects/tasks/${updatedTask.id}`, 'PUT', updatedTask);
    } catch (e) {
      console.error("Failed to save task update to DB", e);
    }
  };
  const saveColumnsToDb = (newCols: string[]) => {
    const pathParts = window.location.pathname.split('/');
    const projectId = pathParts[pathParts.length - 1];
    if (projectId && projectId !== 'projects' && projectId !== '') {
      import('../../services/api').then(({ apiCall }) => {
        apiCall(`/projects/${projectId}/columns`, 'PUT', { columns: newCols }).catch(console.error);
      });
    }
  };

  const handleAddColumn = () => {
    const name = window.prompt('NOM DE LA COLONNE :');
    if (name && name.trim()) {
      const newName = name.trim().toUpperCase();
      setColumns(prev => {
        const newCols = [...prev];
        if (newCols.length > 0) {
          newCols.splice(newCols.length - 1, 0, newName);
        } else {
          newCols.push(newName);
        }
        saveColumnsToDb(newCols);
        return newCols;
      });
    }
  };

  const handleRenameColumn = (oldName: string, newName: string) => {
    setColumns(prev => {
      const newCols = prev.map(c => c === oldName ? newName : c);
      saveColumnsToDb(newCols);
      return newCols;
    });
    setTasks(prev => prev.map(t => t.status === oldName ? { ...t, status: newName } : t));
  };

  const handleDeleteColumn = (name: string) => {
    setColumns(prev => {
      const newCols = prev.filter(c => c !== name);
      saveColumnsToDb(newCols);
      return newCols;
    });
  };

  useEffect(() => {
    window.addEventListener('kanban:add-column', handleAddColumn);
    return () => window.removeEventListener('kanban:add-column', handleAddColumn);
  }, []);

  const tasksByColumn = columns.reduce((acc, col) => {
    acc[col] = tasks.filter(t => t.status.toUpperCase() === col);
    return acc;
  }, {} as Record<string, Task[]>);

  if (!initialBacklog) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 font-mono text-sm tracking-widest uppercase transition-colors duration-300">
        <div className="w-16 h-16 border border-dashed border-gray-300 dark:border-[#27272a] rounded-xl flex items-center justify-center mb-4 bg-gray-50 dark:bg-[#121214] transition-colors duration-300">
          <span className="text-2xl text-cyan-400 dark:text-cyan-500 opacity-50">+</span>
        </div>
        <p className="text-cyan-600/50 dark:text-cyan-500/50">AWAITING CORE DIRECTIVE</p>
      </div>
    );
  }

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

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex h-full overflow-x-auto space-x-3 p-3 items-stretch custom-scrollbar bg-[#fafafa] dark:bg-transparent transition-colors duration-300">
          {columns.map((columnId, index) => (
            <React.Fragment key={columnId}>
              <Column
                id={columnId}
                title={columnId}
                tasks={tasksByColumn[columnId] || []}
                onTaskClick={(task) => setSelectedTask(task)}
                onRename={handleRenameColumn}
                onDelete={handleDeleteColumn}
              />
              {index < columns.length - 1 && (
                <div className="h-full w-px bg-gray-200 dark:bg-[#27272a]/50 shrink-0 self-stretch my-2 rounded-full hidden md:block"></div>
              )}
            </React.Fragment>
          ))}
          
          <div className="h-full w-px bg-gray-200 dark:bg-[#27272a]/50 shrink-0 self-stretch my-2 rounded-full hidden md:block"></div>
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
    </>
  );
};
