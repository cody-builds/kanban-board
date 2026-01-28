// Type definitions for Kanban Board

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
  order: number;
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type Priority = 'low' | 'medium' | 'high';

export interface Column {
  id: TaskStatus;
  title: string;
  color: string;
}

export interface Board {
  id: string;
  name: string;
  columns: Column[];
  users: User[];
  tasks: Task[];
}

// API Types
export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: Priority;
  assigneeId?: string | null;
  notes?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  assigneeId?: string | null;
  notes?: string;
  order?: number;
}

export interface MoveTaskRequest {
  taskId: string;
  newStatus: TaskStatus;
  newOrder: number;
}

export interface ReorderRequest {
  moves: MoveTaskRequest[];
}

// Pre-seeded data
export const USERS: User[] = [
  {
    id: 'cody',
    name: 'Cody',
    email: 'cody@example.com',
    color: '#3B82F6' // Blue
  },
  {
    id: 'claire',
    name: 'Claire',
    email: 'claire@example.com',
    color: '#8B5CF6' // Purple
  }
];

export const COLUMNS: Column[] = [
  { id: 'todo', title: 'Todo', color: '#6B7280' },
  { id: 'in_progress', title: 'In Progress', color: '#F59E0B' },
  { id: 'review', title: 'Review', color: '#8B5CF6' },
  { id: 'done', title: 'Done', color: '#10B981' }
];
