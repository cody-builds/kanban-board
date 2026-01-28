'use client';

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useState } from 'react';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from '../task/TaskCard';
import { TaskModal } from '../task/TaskModal';
import { useBoardStore } from '@/store/boardStore';
import { useTasks, useReorderTasks, useInitializeBoard } from '@/hooks/useTasks';
import { COLUMNS, Task, TaskStatus } from '@/types';
import { Plus } from 'lucide-react';
import { SyncStatus } from './SyncStatus';

export function KanbanBoard() {
  useInitializeBoard();
  const { isLoading, error } = useTasks();
  const { mutate: reorderTasks } = useReorderTasks();
  const { tasks, isModalOpen, openCreateModal, getTasksByStatus } = useBoardStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Determine the target column
    let targetStatus: TaskStatus;
    const overTask = tasks.find((t) => t.id === over.id);
    
    if (overTask) {
      targetStatus = overTask.status;
    } else {
      // Dropped on column directly
      targetStatus = over.id as TaskStatus;
    }

    if (!COLUMNS.find((c) => c.id === targetStatus)) return;

    // Calculate new order
    const tasksInColumn = getTasksByStatus(targetStatus);
    let newOrder: number;

    if (overTask && overTask.id !== taskId) {
      // Position relative to the over task
      const overIndex = tasksInColumn.findIndex((t) => t.id === overTask.id);
      newOrder = overIndex;
    } else {
      // End of column
      newOrder = tasksInColumn.length;
    }

    // Only update if something changed
    if (task.status !== targetStatus || task.order !== newOrder) {
      // Recalculate orders for affected tasks
      const moves: { taskId: string; newStatus: TaskStatus; newOrder: number }[] = [];
      
      // Moving task
      moves.push({ taskId, newStatus: targetStatus, newOrder });

      // Shift other tasks if needed
      if (task.status === targetStatus) {
        // Same column reorder
        tasksInColumn
          .filter((t) => t.id !== taskId)
          .forEach((t, i) => {
            const order = i >= newOrder ? i + 1 : i;
            if (t.order !== order) {
              moves.push({ taskId: t.id, newStatus: targetStatus, newOrder: order });
            }
          });
      }

      reorderTasks(moves);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">Error loading board. Please refresh.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Kanban Board</h1>
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-500">Cody & Claire Collaboration</p>
              <SyncStatus />
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-6 py-3 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm min-h-[44px] touch-manipulation"
          >
            <Plus size={20} />
            Add Task
          </button>
        </div>
      </header>

      {/* Board */}
      <div className="max-w-7xl mx-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={getTasksByStatus(column.id)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask ? (
              <TaskCard task={activeTask} isDragging />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modal */}
      {isModalOpen && <TaskModal />}
    </div>
  );
}
