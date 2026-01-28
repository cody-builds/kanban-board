'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/types';
import { useBoardStore } from '@/store/boardStore';
import { UserAvatar } from '../user/UserAvatar';
import { PriorityBadge } from './PriorityBadge';
import { GripVertical, MessageSquare } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
}

export function TaskCard({ task, isDragging = false }: TaskCardProps) {
  const openEditModal = useBoardStore((s) => s.openEditModal);
  const getUserById = useBoardStore((s) => s.getUserById);
  const assignee = getUserById(task.assigneeId);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isActive = isDragging || isSortableDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-white rounded-lg border border-slate-200 p-3 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all ${
        isActive ? 'shadow-lg scale-105 rotate-2 opacity-90' : ''
      }`}
      onClick={() => !isActive && openEditModal(task)}
    >
      {/* Drag Handle + Priority */}
      <div className="flex items-start justify-between mb-2">
        <PriorityBadge priority={task.priority} />
        <div
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 p-1 -mr-1 -mt-1 cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={16} className="text-slate-400" />
        </div>
      </div>

      {/* Title */}
      <h3 className="font-medium text-slate-800 mb-1 line-clamp-2">
        {task.title}
      </h3>

      {/* Description Preview */}
      {task.description && (
        <p className="text-sm text-slate-500 line-clamp-2 mb-2">
          {task.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          {assignee ? (
            <UserAvatar user={assignee} size="sm" />
          ) : (
            <span className="text-xs text-slate-400">Unassigned</span>
          )}
        </div>
        
        {task.notes && (
          <div className="flex items-center gap-1 text-slate-400">
            <MessageSquare size={14} />
          </div>
        )}
      </div>
    </div>
  );
}
