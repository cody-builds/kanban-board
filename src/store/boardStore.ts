import { create } from 'zustand';
import { Task, User, TaskStatus, USERS } from '@/types';

interface BoardState {
  tasks: Task[];
  users: User[];
  selectedTask: Task | null;
  isModalOpen: boolean;
  isCreating: boolean;

  // Actions
  setTasks: (tasks: Task[]) => void;
  setUsers: (users: User[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, newStatus: TaskStatus, newOrder: number) => void;
  openCreateModal: () => void;
  openEditModal: (task: Task) => void;
  closeModal: () => void;
  
  // Computed
  getTasksByStatus: (status: TaskStatus) => Task[];
  getUserById: (id: string | null) => User | undefined;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  tasks: [],
  users: USERS,
  selectedTask: null,
  isModalOpen: false,
  isCreating: false,

  setTasks: (tasks) => set({ tasks }),
  setUsers: (users) => set({ users }),
  
  addTask: (task) => set((state) => ({
    tasks: [...state.tasks, task]
  })),

  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map((t) => 
      t.id === id ? { ...t, ...updates } : t
    ),
    selectedTask: state.selectedTask?.id === id 
      ? { ...state.selectedTask, ...updates }
      : state.selectedTask
  })),

  deleteTask: (id) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== id),
    selectedTask: state.selectedTask?.id === id ? null : state.selectedTask,
    isModalOpen: state.selectedTask?.id === id ? false : state.isModalOpen
  })),

  moveTask: (id, newStatus, newOrder) => set((state) => ({
    tasks: state.tasks.map((t) =>
      t.id === id ? { ...t, status: newStatus, order: newOrder } : t
    )
  })),

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

  getTasksByStatus: (status) => {
    return get().tasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.order - b.order);
  },

  getUserById: (id) => {
    if (!id) return undefined;
    return get().users.find((u) => u.id === id);
  },
}));
