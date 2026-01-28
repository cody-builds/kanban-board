import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Task, User, TaskStatus, USERS } from '@/types';

interface BoardState {
  tasks: Task[];
  users: User[];
  selectedTask: Task | null;
  isModalOpen: boolean;
  isCreating: boolean;
  isInitialized: boolean;

  // Actions
  setTasks: (tasks: Task[]) => void;
  setUsers: (users: User[]) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (taskId: string, newStatus: TaskStatus, newOrder: number) => void;
  reorderTasks: (moves: { taskId: string; newStatus: TaskStatus; newOrder: number }[]) => void;
  openCreateModal: () => void;
  openEditModal: (task: Task) => void;
  closeModal: () => void;
  initialize: () => void;
  
  // Computed
  getTasksByStatus: (status: TaskStatus) => Task[];
  getUserById: (id: string | null) => User | undefined;
}

export const useBoardStore = create<BoardState>()(
  persist(
    (set, get) => ({
      tasks: [],
      users: USERS,
      selectedTask: null,
      isModalOpen: false,
      isCreating: false,
      isInitialized: false,

      setTasks: (tasks) => set({ tasks }),
      setUsers: (users) => set({ users }),
      
      addTask: (taskData) => {
        const tasks = get().tasks;
        const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();
        
        // Get max order for the status column
        const tasksInColumn = tasks.filter(t => t.status === taskData.status);
        const maxOrder = tasksInColumn.length > 0 
          ? Math.max(...tasksInColumn.map(t => t.order)) 
          : -1;
        
        const newTask: Task = {
          id,
          title: taskData.title,
          description: taskData.description || '',
          status: taskData.status,
          priority: taskData.priority,
          assigneeId: taskData.assigneeId,
          notes: taskData.notes || '',
          order: maxOrder + 1,
          createdAt: now,
          updatedAt: now
        };
        
        set({ tasks: [...tasks, newTask] });
        return newTask;
      },

      updateTask: (id, updates) => {
        const now = new Date().toISOString();
        set((state) => ({
          tasks: state.tasks.map((t) => 
            t.id === id ? { ...t, ...updates, updatedAt: now } : t
          ),
          selectedTask: state.selectedTask?.id === id 
            ? { ...state.selectedTask, ...updates, updatedAt: now }
            : state.selectedTask
        }));
      },

      deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        selectedTask: state.selectedTask?.id === id ? null : state.selectedTask,
        isModalOpen: state.selectedTask?.id === id ? false : state.isModalOpen
      })),

      moveTask: (taskId, newStatus, newOrder) => {
        const now = new Date().toISOString();
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId 
              ? { ...t, status: newStatus, order: newOrder, updatedAt: now } 
              : t
          )
        }));
      },

      reorderTasks: (moves) => {
        const now = new Date().toISOString();
        set((state) => {
          const newTasks = [...state.tasks];
          for (const move of moves) {
            const task = newTasks.find(t => t.id === move.taskId);
            if (task) {
              task.status = move.newStatus;
              task.order = move.newOrder;
              task.updatedAt = now;
            }
          }
          return { tasks: newTasks };
        });
      },

      openCreateModal: () => set({ 
        isModalOpen: true, 
        isCreating: true, 
        selectedTask: null 
      }),

      openEditModal: (task) => set({ 
        isModalOpen: true, 
        isCreating: false, 
        selectedTask: task 
      }),

      closeModal: () => set({ 
        isModalOpen: false, 
        isCreating: false, 
        selectedTask: null 
      }),

      initialize: () => {
        const state = get();
        if (state.isInitialized) return;
        
        // Add sample tasks if none exist
        if (state.tasks.length === 0) {
          const now = new Date().toISOString();
          const sampleTasks: Task[] = [
            {
              id: 'task_welcome_1',
              title: '👋 Welcome to the Kanban Board!',
              description: 'This is your task management board. Drag tasks between columns to update their status.',
              status: 'todo',
              priority: 'high',
              assigneeId: 'cody',
              notes: '',
              order: 0,
              createdAt: now,
              updatedAt: now
            },
            {
              id: 'task_welcome_2',
              title: '✨ Try creating a new task',
              description: 'Click the + button in any column header to add a new task.',
              status: 'todo',
              priority: 'medium',
              assigneeId: 'claire',
              notes: '',
              order: 1,
              createdAt: now,
              updatedAt: now
            }
          ];
          set({ tasks: sampleTasks, isInitialized: true });
        } else {
          set({ isInitialized: true });
        }
      },

      getTasksByStatus: (status) => {
        return get().tasks
          .filter((t) => t.status === status)
          .sort((a, b) => a.order - b.order);
      },

      getUserById: (id) => {
        if (!id) return undefined;
        return get().users.find((u) => u.id === id);
      },
    }),
    {
      name: 'kanban-board-storage',
      storage: createJSONStorage(() => {
        // Return a mock storage for SSR
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {}
          };
        }
        return localStorage;
      }),
      partialize: (state) => ({ 
        tasks: state.tasks,
        isInitialized: state.isInitialized
      }),
    }
  )
);
