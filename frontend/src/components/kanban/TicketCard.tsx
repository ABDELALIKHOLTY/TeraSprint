import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import type { Task } from '../../types/backlog';
import { ListTodo, Paperclip, Clock } from 'lucide-react';

interface Props {
  task: Task;
  index: number;
  taskNumber?: number;
  onClick?: () => void;
}

const getPriorityColor = (priority: string) => {
  switch (priority.toLowerCase()) {
    case 'high':
      return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-400/10 dark:border-red-900/50';
    case 'medium':
      return 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-400/10 dark:border-amber-900/50';
    case 'low':
      return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-400/10 dark:border-emerald-900/50';
    default:
      return 'text-cyan-700 bg-cyan-50 border-cyan-200 dark:text-cyan-400 dark:bg-cyan-400/10 dark:border-cyan-900/50';
  }
};

export const TicketCard: React.FC<Props> = ({ task, index, taskNumber, onClick }) => {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          style={provided.draggableProps.style}
          className={`flex flex-col p-2 bg-white dark:bg-[#1a1a1f] border rounded-lg cursor-grab active:cursor-grabbing hover:border-cyan-500/50 ${
            snapshot.isDragging 
              ? 'border-cyan-500 shadow-xl dark:shadow-[0_0_20px_rgba(6,182,212,0.3)] z-50' 
              : 'border-gray-200 dark:border-[#27272a] shadow-sm hover:shadow-md transition-colors duration-200'
          }`}
        >
          <div className="flex items-start justify-between mb-1.5">
            <span className={`text-[8px] font-mono font-bold px-1 py-0.5 rounded uppercase border transition-colors duration-300 ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
            <span className="text-[8px] font-mono text-gray-400 dark:text-gray-500 max-w-[70px] truncate">
              TÂCHE {taskNumber !== undefined ? taskNumber : index + 1}
            </span>
          </div>

          <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-200 mb-1 line-clamp-2 leading-tight transition-colors duration-300">
            {task.title}
          </h4>

          {task.us_title && (
            <div className="mb-1.5 px-1 py-0.5 rounded bg-gray-50 dark:bg-[#121214] border border-gray-100 dark:border-[#27272a] transition-colors duration-300">
              <span className="text-[8px] text-gray-500 dark:text-gray-400 line-clamp-1 leading-tight">
                {task.us_title}
              </span>
            </div>
          )}

          <div className="mt-auto pt-1.5 flex items-center justify-between border-t border-gray-100 dark:border-[#27272a] transition-colors duration-300">
            <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-500">
              {task.subtasks && task.subtasks.length > 0 && (
                <div className="flex items-center space-x-1" title={`${task.subtasks.filter(s => typeof s === 'object' && s.completed).length}/${task.subtasks.length} subtasks completed`}>
                  <ListTodo className="w-3.5 h-3.5" />
                  <span className="text-xs font-mono">{task.subtasks.filter(s => typeof s === 'object' && s.completed).length}/{task.subtasks.length}</span>
                </div>
              )}
              {task.acceptance_criteria && task.acceptance_criteria.length > 0 && (
                <div className="flex items-center space-x-1">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span className="text-xs font-mono">{task.acceptance_criteria.length}</span>
                </div>
              )}
            </div>
            
            {task.estimated_hours !== undefined && task.estimated_hours > 0 && (
              <div className="flex items-center space-x-1 bg-gray-50 dark:bg-[#121214] px-1.5 py-0.5 rounded border border-gray-100 dark:border-[#27272a] transition-colors duration-300">
                <Clock className="w-2.5 h-2.5 text-cyan-600 dark:text-cyan-500" />
                <span className="text-[8px] font-mono font-bold text-gray-700 dark:text-gray-300">
                  {task.estimated_hours}h
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};
