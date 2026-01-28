// Client-side storage abstraction using localStorage
// Provides persistent storage for the kanban board in the browser

import { Task, TaskStatus, User, USERS } from '@/types';

const STORAGE_KEY = 'kanban_tasks';

// Get all tasks from localStorage
export function getAllTasks(): Task[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as Task[];
  } catch {
    console.error('Failed to parse tasks from localStorage');
    return [];
  }
}

// Save all tasks to localStorage
function saveTasks(tasks: Task[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// Get a single task by ID
export function getTaskById(id: string): Task | null {
  const tasks = getAllTasks();
  return tasks.find(t => t.id === id) || null;
}

// Create a new task
export function createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'>): Task {
  const tasks = getAllTasks();
  const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  // Get max order for the status column
  const tasksInColumn = tasks.filter(t => t.status === task.status);
  const maxOrder = tasksInColumn.length > 0 
    ? Math.max(...tasksInColumn.map(t => t.order)) 
    : -1;
  
  const newTask: Task = {
    id,
    ...task,
    description: task.description || '',
    notes: task.notes || '',
    order: maxOrder + 1,
    createdAt: now,
    updatedAt: now
  };
  
  saveTasks([...tasks, newTask]);
  return newTask;
}

// Update an existing task
export function updateTask(id: string, updates: Partial<Task>): Task | null {
  const tasks = getAllTasks();
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return null;
  
  const now = new Date().toISOString();
  const updated: Task = { 
    ...tasks[index], 
    ...updates, 
    updatedAt: now 
  };
  
  tasks[index] = updated;
  saveTasks(tasks);
  return updated;
}

// Delete a task
export function deleteTask(id: string): boolean {
  const tasks = getAllTasks();
  const filtered = tasks.filter(t => t.id !== id);
  
  if (filtered.length === tasks.length) return false;
  
  saveTasks(filtered);
  return true;
}

// Reorder tasks (for drag and drop)
export function reorderTasks(moves: { taskId: string; newStatus: TaskStatus; newOrder: number }[]): void {
  const tasks = getAllTasks();
  const now = new Date().toISOString();
  
  for (const move of moves) {
    const task = tasks.find(t => t.id === move.taskId);
    if (task) {
      task.status = move.newStatus;
      task.order = move.newOrder;
      task.updatedAt = now;
    }
  }
  
  saveTasks(tasks);
}

// Get users (returns static list)
export function getUsers(): User[] {
  return USERS;
}

// Initialize with sample tasks if empty (optional)
export function initializeSampleData(): void {
  if (typeof window === 'undefined') return;
  
  const existing = getAllTasks();
  if (existing.length > 0) return;
  
  const now = new Date().toISOString();
  const sampleTasks: Task[] = [
    {
      id: 'task_sample_1',
      title: 'Welcome to the Kanban Board!',
      description: 'This is your first task. Drag it between columns to change status.',
      status: 'todo',
      priority: 'high',
      assigneeId: 'cody',
      notes: '',
      order: 0,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'task_sample_2',
      title: 'Try creating a new task',
      description: 'Click the + button in any column to add tasks.',
      status: 'todo',
      priority: 'medium',
      assigneeId: 'claire',
      notes: '',
      order: 1,
      createdAt: now,
      updatedAt: now
    }
  ];
  
  saveTasks(sampleTasks);
}
