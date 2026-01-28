'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useBoardStore } from '@/store/boardStore';
import { CreateTaskRequest, UpdateTaskRequest, Task, TaskStatus } from '@/types';
import { useEffect } from 'react';

export function useTasks() {
  const setTasks = useBoardStore((s) => s.setTasks);
  
  const query = useQuery({
    queryKey: ['tasks'],
    queryFn: api.getTasks,
    staleTime: 1000 * 60,
  });

  // Sync to store
  useEffect(() => {
    if (query.data) {
      setTasks(query.data);
    }
  }, [query.data, setTasks]);

  return query;
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const addTask = useBoardStore((s) => s.addTask);

  return useMutation({
    mutationFn: (data: CreateTaskRequest) => api.createTask(data),
    onSuccess: (task) => {
      addTask(task);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const updateTask = useBoardStore((s) => s.updateTask);

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTaskRequest }) =>
      api.updateTask(id, updates),
    onMutate: ({ id, updates }) => {
      // Optimistic update
      updateTask(id, updates as Partial<Task>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => {
      // Rollback on error - refetch
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const deleteTask = useBoardStore((s) => s.deleteTask);

  return useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onMutate: (id) => {
      deleteTask(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useReorderTasks() {
  const queryClient = useQueryClient();
  const moveTask = useBoardStore((s) => s.moveTask);

  return useMutation({
    mutationFn: (moves: { taskId: string; newStatus: TaskStatus; newOrder: number }[]) =>
      api.reorderTasks(moves),
    onMutate: (moves) => {
      // Optimistic update
      moves.forEach(({ taskId, newStatus, newOrder }) => {
        moveTask(taskId, newStatus, newOrder);
      });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
