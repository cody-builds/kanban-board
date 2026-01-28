import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Task, User, TaskStatus, USERS } from '@/types';
import {
  isSupabaseConfigured,
  fetchAllTasks,
  insertTask,
  updateTaskInDb,
  deleteTaskFromDb,
  batchUpdateTasks,
  subscribeToTasks,
  DbTask,
} from '@/lib/supabase';

// Convert DB format to app format
const dbToTask = (db: DbTask): Task => ({
  id: db.id,
  title: db.title,
  description: db.description,
  status: db.status,
  priority: db.priority,
  assigneeId: db.assignee_id,
  notes: db.notes,
  order: db.task_order,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

// Convert app format to DB format
const taskToDb = (task: Partial<Task>): Partial<DbTask> => {
  const db: Partial<DbTask> = {};
  if (task.title !== undefined) db.title = task.title;
  if (task.description !== undefined) db.description = task.description;
  if (task.status !== undefined) db.status = task.status;
  if (task.priority !== undefined) db.priority = task.priority;
  if (task.assigneeId !== undefined) db.assignee_id = task.assigneeId;
  if (task.notes !== undefined) db.notes = task.notes;
  if (task.order !== undefined) db.task_order = task.order;
  return db;
};

interface BoardState {
  tasks: Task[];
  users: User[];
  selectedTask: Task | null;
  isModalOpen: boolean;
  isCreating: boolean;
  isInitialized: boolean;
  useSupabase: boolean;
  unsubscribe: (() => void) | null;

  // Actions
  setTasks: (tasks: Task[]) => void;
  setUsers: (users: User[]) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (taskId: string, newStatus: TaskStatus, newOrder: number) => void;
  reorderTasks: (moves: { taskId: string; newStatus: TaskStatus; newOrder: number }[]) => Promise<void>;
  openCreateModal: () => void;
  openEditModal: (task: Task) => void;
  closeModal: () => void;
  initialize: () => Promise<void>;
  
  // Internal actions for realtime sync
  _handleRemoteInsert: (dbTask: DbTask) => void;
  _handleRemoteUpdate: (dbTask: DbTask) => void;
  _handleRemoteDelete: (id: string) => void;
  
  // Computed
  getTasksByStatus: (status: TaskStatus) => Task[];
  getUserById: (id: string | null) => User | undefined;
}

// Create store with conditional persistence
type SetState = (partial: Partial<BoardState> | ((state: BoardState) => Partial<BoardState>)) => void;
type GetState = () => BoardState;

const createStore = () => {
  const baseStore = (set: SetState, get: GetState): BoardState => ({
    tasks: [],
    users: USERS,
    selectedTask: null,
    isModalOpen: false,
    isCreating: false,
    isInitialized: false,
    useSupabase: false,
    unsubscribe: null,

    setTasks: (tasks) => set({ tasks }),
    setUsers: (users) => set({ users }),
    
    addTask: async (taskData) => {
      const tasks = get().tasks;
      const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      // Get max order for the status column
      const tasksInColumn = tasks.filter((t: Task) => t.status === taskData.status);
      const maxOrder = tasksInColumn.length > 0 
        ? Math.max(...tasksInColumn.map((t: Task) => t.order)) 
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
      
      // If using Supabase, persist to database
      if (get().useSupabase) {
        const dbTask = await insertTask({
          id: newTask.id,
          title: newTask.title,
          description: newTask.description,
          status: newTask.status,
          priority: newTask.priority,
          assignee_id: newTask.assigneeId,
          notes: newTask.notes,
          task_order: newTask.order,
        });
        
        if (!dbTask) {
          console.error('Failed to insert task to Supabase');
          // Still add to local state as fallback
          set({ tasks: [...tasks, newTask] });
          return newTask;
        }
        
        // The realtime subscription will handle adding to state
        // But we also add immediately for instant feedback
        set({ tasks: [...tasks, newTask] });
        return newTask;
      }
      
      // Local storage mode
      set({ tasks: [...tasks, newTask] });
      return newTask;
    },

    updateTask: async (id, updates) => {
      const now = new Date().toISOString();
      
      // Optimistic update
      set((state: BoardState) => ({
        tasks: state.tasks.map((t) => 
          t.id === id ? { ...t, ...updates, updatedAt: now } : t
        ),
        selectedTask: state.selectedTask?.id === id 
          ? { ...state.selectedTask, ...updates, updatedAt: now }
          : state.selectedTask
      }));
      
      // If using Supabase, persist to database
      if (get().useSupabase) {
        const dbUpdates = taskToDb(updates);
        await updateTaskInDb(id, dbUpdates);
      }
    },

    deleteTask: async (id) => {
      // Optimistic delete
      set((state: BoardState) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        selectedTask: state.selectedTask?.id === id ? null : state.selectedTask,
        isModalOpen: state.selectedTask?.id === id ? false : state.isModalOpen
      }));
      
      // If using Supabase, delete from database
      if (get().useSupabase) {
        await deleteTaskFromDb(id);
      }
    },

    moveTask: (taskId, newStatus, newOrder) => {
      const now = new Date().toISOString();
      set((state: BoardState) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId 
            ? { ...t, status: newStatus, order: newOrder, updatedAt: now } 
            : t
        )
      }));
    },

    reorderTasks: async (moves) => {
      const now = new Date().toISOString();
      
      // Optimistic update
      set((state: BoardState) => {
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
      
      // If using Supabase, batch update in database
      if (get().useSupabase) {
        const dbUpdates = moves.map(m => ({
          id: m.taskId,
          status: m.newStatus,
          task_order: m.newOrder,
        }));
        await batchUpdateTasks(dbUpdates);
      }
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

    initialize: async () => {
      const state = get();
      if (state.isInitialized) return;
      
      // Check if Supabase is configured
      const supabaseAvailable = isSupabaseConfigured();
      
      if (supabaseAvailable) {
        console.log('🔗 Supabase configured - using cloud sync');
        set({ useSupabase: true });
        
        // Fetch tasks from Supabase
        const dbTasks = await fetchAllTasks();
        const tasks = dbTasks.map(dbToTask);
        
        // Set up realtime subscription
        const unsubscribe = subscribeToTasks(
          get()._handleRemoteInsert,
          get()._handleRemoteUpdate,
          get()._handleRemoteDelete
        );
        
        if (tasks.length === 0) {
          // Initialize with sample tasks for new Supabase instance
          const now = new Date().toISOString();
          const sampleTasks: Task[] = [
            {
              id: `task_${Date.now()}_welcome1`,
              title: '👋 Welcome to the Kanban Board!',
              description: 'This is your shared task management board. Tasks sync in real-time between all users.',
              status: 'todo',
              priority: 'high',
              assigneeId: 'cody',
              notes: '',
              order: 0,
              createdAt: now,
              updatedAt: now
            },
            {
              id: `task_${Date.now()}_welcome2`,
              title: '✨ Real-time sync enabled',
              description: 'Changes you make will appear instantly for Claire, and vice versa!',
              status: 'todo',
              priority: 'medium',
              assigneeId: 'claire',
              notes: '',
              order: 1,
              createdAt: now,
              updatedAt: now
            }
          ];
          
          // Insert sample tasks to Supabase
          for (const task of sampleTasks) {
            await insertTask({
              id: task.id,
              title: task.title,
              description: task.description,
              status: task.status,
              priority: task.priority,
              assignee_id: task.assigneeId,
              notes: task.notes,
              task_order: task.order,
            });
          }
          
          set({ tasks: sampleTasks, isInitialized: true, unsubscribe });
        } else {
          set({ tasks, isInitialized: true, unsubscribe });
        }
      } else {
        console.log('📦 Using local storage (Supabase not configured)');
        // Fallback to localStorage mode - check for existing tasks
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
              title: '⚠️ Local mode - tasks not shared',
              description: 'Configure Supabase environment variables to enable real-time sync between users.',
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
      }
    },
    
    // Realtime handlers
    _handleRemoteInsert: (dbTask) => {
      const task = dbToTask(dbTask);
      set((state: BoardState) => {
        // Check if task already exists (from our own insert)
        if (state.tasks.find(t => t.id === task.id)) {
          return state;
        }
        return { tasks: [...state.tasks, task] };
      });
    },
    
    _handleRemoteUpdate: (dbTask) => {
      const task = dbToTask(dbTask);
      set((state: BoardState) => ({
        tasks: state.tasks.map(t => t.id === task.id ? task : t),
        selectedTask: state.selectedTask?.id === task.id ? task : state.selectedTask
      }));
    },
    
    _handleRemoteDelete: (id) => {
      set((state: BoardState) => ({
        tasks: state.tasks.filter(t => t.id !== id),
        selectedTask: state.selectedTask?.id === id ? null : state.selectedTask,
        isModalOpen: state.selectedTask?.id === id ? false : state.isModalOpen
      }));
    },

    getTasksByStatus: (status) => {
      return get().tasks
        .filter((t: Task) => t.status === status)
        .sort((a: Task, b: Task) => a.order - b.order);
    },

    getUserById: (id) => {
      if (!id) return undefined;
      return get().users.find((u: User) => u.id === id);
    },
  });

  return create<BoardState>()(
    persist(
      baseStore,
      {
        name: 'kanban-board-storage',
        storage: createJSONStorage(() => {
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
          // Only persist tasks if NOT using Supabase
          ...(state.useSupabase ? {} : { tasks: state.tasks }),
          isInitialized: false, // Always re-initialize to check Supabase
        }),
      }
    )
  );
};

export const useBoardStore = createStore();
