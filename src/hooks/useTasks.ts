// Task hooks - using Zustand store with Supabase or localStorage persistence
// Automatically uses Supabase if configured, falls back to localStorage

import { useEffect } from 'react';
import { useBoardStore } from '@/store/boardStore';
import { Task, TaskStatus } from '@/types';

// Initialize the board on mount
export function useInitializeBoard() {
  const initialize = useBoardStore((s) => s.initialize);
  const isInitialized = useBoardStore((s) => s.isInitialized);
  const useSupabase = useBoardStore((s) => s.useSupabase);
  const unsubscribe = useBoardStore((s) => s.unsubscribe);
  
  useEffect(() => {
    initialize();
    
    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [initialize, unsubscribe]);
  
  return { isInitialized, useSupabase };
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
      addTask(task);
    },
    mutateAsync: async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => {
      return await addTask(task);
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
      await updateTask(id, updates);
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
      await deleteTask(id);
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
      await reorderTasks(moves);
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

// Hook to check sync mode
export function useSyncMode() {
  const useSupabase = useBoardStore((s) => s.useSupabase);
  const isInitialized = useBoardStore((s) => s.isInitialized);
  
  return {
    mode: useSupabase ? 'cloud' : 'local',
    isCloud: useSupabase,
    isLocal: !useSupabase,
    isReady: isInitialized
  };
}
