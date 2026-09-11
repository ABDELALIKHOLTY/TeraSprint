import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import type { Task } from '../../types/backlog';
import { TicketCard } from './TicketCard';
import { Edit2, Trash2 } from 'lucide-react';

interface Props {
  id: string;
  title: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onRename?: (oldName: string, newName: string) => void;
  onDelete?: (name: string) => void;
}

export const Column: React.FC<Props> = ({ id, title, tasks, onTaskClick, onRename, onDelete }) => {
  return (
    <div className="flex flex-col flex-1 min-w-[280px] max-w-[450px] shrink-0 max-h-full bg-white dark:bg-[#121214] rounded-xl border border-gray-200 dark:border-[#27272a] shadow-sm transition-colors duration-300 group">
      <div className="px-3 py-2 border-b border-gray-100 dark:border-[#27272a] flex items-center justify-between bg-white/90 dark:bg-[#121214]/90 rounded-t-xl transition-colors duration-300 relative">
        <h3 className="font-mono text-sm font-bold text-gray-800 dark:text-gray-300 flex items-center">
          {title}
        </h3>
        <div className="flex items-center space-x-2">
          {/* Action buttons appear on hover */}
          <div className="hidden group-hover:flex items-center space-x-1 mr-1">
            <button 
              onClick={() => {
                const newName = window.prompt("Nouveau nom de la colonne :", title);
                if (newName && newName.trim() && newName.trim() !== title && onRename) {
                  onRename(title, newName.trim().toUpperCase());
                }
              }}
              className="p-1 text-gray-400 hover:text-cyan-500 transition-colors rounded"
              title="Renommer"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button 
              onClick={() => {
                if (window.confirm(`Supprimer la colonne "${title}" ? Les tâches ne seront pas supprimées.`) && onDelete) {
                  onDelete(title);
                }
              }}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded"
              title="Supprimer"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          
          <span className="bg-gray-100 dark:bg-[#1a1a1f] text-cyan-700 dark:text-cyan-400 text-[10px] font-mono font-semibold px-2 py-0.5 rounded border border-gray-200 dark:border-cyan-900/30">
            {tasks.length}
          </span>
        </div>
      </div>

      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto custom-scrollbar p-3 min-h-[150px] transition-colors rounded-b-xl ${
              snapshot.isDraggingOver ? 'bg-cyan-50/50 dark:bg-cyan-900/10' : ''
            }`}
          >
            <div className="flex flex-col gap-2">
              {tasks.map((task, index) => (
                <TicketCard
                  key={task.id}
                  task={task}
                  index={index}
                  taskNumber={task.taskNumber}
                  onClick={() => onTaskClick(task)}
                />
              ))}
            </div>
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};
