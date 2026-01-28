// API client for frontend

import { Task, CreateTaskRequest, UpdateTaskRequest, ReorderRequest, User, Board } from '@/types';

const API_BASE = '/api';

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Tasks
  async getTasks(): Promise<Task[]> {
    const data = await this.request<{ tasks: Task[] }>('/tasks');
    return data.tasks;
  }

  async getTask(id: string): Promise<Task> {
    const data = await this.request<{ task: Task }>(`/tasks/${id}`);
    return data.task;
  }

  async createTask(task: CreateTaskRequest): Promise<Task> {
    const data = await this.request<{ task: Task }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
    return data.task;
  }

  async updateTask(id: string, updates: UpdateTaskRequest): Promise<Task> {
    const data = await this.request<{ task: Task }>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return data.task;
  }

  async deleteTask(id: string): Promise<void> {
    await this.request(`/tasks/${id}`, { method: 'DELETE' });
  }

  async reorderTasks(moves: ReorderRequest['moves']): Promise<void> {
    await this.request('/tasks/reorder', {
      method: 'POST',
      body: JSON.stringify({ moves }),
    });
  }

  // Users
  async getUsers(): Promise<User[]> {
    const data = await this.request<{ users: User[] }>('/users');
    return data.users;
  }

  // Board
  async getBoard(): Promise<Board> {
    const data = await this.request<{ board: Board }>('/board');
    return data.board;
  }
}

export const api = new ApiClient();
