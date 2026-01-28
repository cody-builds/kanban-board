import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

import { TaskStatus, Priority } from '@/types';

// Database types for type safety
export interface DbTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assignee_id: string | null;
  notes: string;
  task_order: number;
  created_at: string;
  updated_at: string;
}

// Check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(url && key && url.includes('supabase'));
};

// Supabase client singleton
let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (typeof window === 'undefined') return null;
  
  if (!isSupabaseConfigured()) {
    return null;
  }
  
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  
  return supabaseInstance;
};

// Real-time subscription helper
let realtimeChannel: RealtimeChannel | null = null;

export const subscribeToTasks = (
  onInsert: (task: DbTask) => void,
  onUpdate: (task: DbTask) => void,
  onDelete: (id: string) => void
): (() => void) => {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  // Unsubscribe from existing channel
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel('tasks-changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'tasks' },
      (payload) => {
        console.log('Task inserted:', payload.new);
        onInsert(payload.new as DbTask);
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'tasks' },
      (payload) => {
        console.log('Task updated:', payload.new);
        onUpdate(payload.new as DbTask);
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'tasks' },
      (payload) => {
        console.log('Task deleted:', payload.old);
        onDelete((payload.old as DbTask).id);
      }
    )
    .subscribe();

  return () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  };
};

// API functions
export const fetchAllTasks = async (): Promise<DbTask[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('task_order', { ascending: true });

  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }

  return data || [];
};

export const insertTask = async (task: Omit<DbTask, 'created_at' | 'updated_at'>): Promise<DbTask | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single();

  if (error) {
    console.error('Error inserting task:', error);
    return null;
  }

  return data;
};

export const updateTaskInDb = async (id: string, updates: Partial<DbTask>): Promise<DbTask | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating task:', error);
    return null;
  }

  return data;
};

export const deleteTaskFromDb = async (id: string): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting task:', error);
    return false;
  }

  return true;
};

export const batchUpdateTasks = async (
  updates: { id: string; status: string; task_order: number }[]
): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;

  const now = new Date().toISOString();
  
  // Supabase doesn't have native batch update, so we use Promise.all
  const results = await Promise.all(
    updates.map(({ id, status, task_order }) =>
      supabase
        .from('tasks')
        .update({ status, task_order, updated_at: now })
        .eq('id', id)
    )
  );

  const hasError = results.some(r => r.error);
  if (hasError) {
    console.error('Error in batch update:', results.filter(r => r.error));
    return false;
  }

  return true;
};
