// Task hooks - now using Zustand store with localStorage persistence
// No server calls needed - all data is persisted locally

import { useEffect } from 'react';
import { useBoardStore } from '@/store/boardStore';
import { Task, TaskStatus } from '@/types';

// Initialize the board on mount
export function useInitializeBoard() {
  const initialize = useBoardStore((s) => s.initialize);
  const isInitialized = useBoardStore((s) => s.isInitialized);
  
  useEffect(() => {
    initialize();
  }, [initialize]);
  
  return { isInitialized };
}

// Get all tasks
export function useTasks() {
  const tasks = useBoardStore((s) => s.tasks);
  const isInitialized = useBoardStore((s) => s.isInitialized);
  
  return {
    data: tasks,
    isLoading: !isInitialized,
    error: null
  };
}

// Get tasks by status
export function useTasksByStatus(status: TaskStatus) {
  const getTasksByStatus = useBoardStore((s) => s.getTasksByStatus);
  return getTasksByStatus(status);
}

// Create task mutation
export function useCreateTask() {
  const addTask = useBoardStore((s) => s.addTask);
  
  return {
    mutate: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => {
      return addTask(task);
    },
    mutateAsync: async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => {
      return addTask(task);
    },
    isPending: false
  };
}

// Update task mutation
export function useUpdateTask() {
  const updateTask = useBoardStore((s) => s.updateTask);
  
  return {
    mutate: ({ id, ...updates }: { id: string } & Partial<Task>) => {
      updateTask(id, updates);
    },
    mutateAsync: async ({ id, ...updates }: { id: string } & Partial<Task>) => {
      updateTask(id, updates);
    },
    isPending: false
  };
}

// Delete task mutation
export function useDeleteTask() {
  const deleteTask = useBoardStore((s) => s.deleteTask);
  
  return {
    mutate: (id: string) => {
      deleteTask(id);
    },
    mutateAsync: async (id: string) => {
      deleteTask(id);
    },
    isPending: false
  };
}

// Reorder tasks mutation
export function useReorderTasks() {
  const reorderTasks = useBoardStore((s) => s.reorderTasks);
  
  return {
    mutate: (moves: { taskId: string; newStatus: TaskStatus; newOrder: number }[]) => {
      reorderTasks(moves);
    },
    mutateAsync: async (moves: { taskId: string; newStatus: TaskStatus; newOrder: number }[]) => {
      reorderTasks(moves);
    },
    isPending: false
  };
}

// Get users
export function useUsers() {
  const users = useBoardStore((s) => s.users);
  return {
    data: users,
    isLoading: false,
    error: null
  };
}
