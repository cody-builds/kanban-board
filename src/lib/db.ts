// Database abstraction layer
// Uses SQLite for local development

import Database from 'better-sqlite3';
import path from 'path';
import { Task, TaskStatus, USERS } from '@/types';

const DB_PATH = path.join(process.cwd(), 'data', 'kanban.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeDb(db);
  }
  return db;
}

function initializeDb(database: Database.Database) {
  // Create tables
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      avatar TEXT,
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      assignee_id TEXT,
      notes TEXT DEFAULT '',
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (assignee_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_order ON tasks(status, "order");
  `);

  // Seed users if not exists
  const userCount = database.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const insertUser = database.prepare(
      'INSERT INTO users (id, name, email, avatar, color) VALUES (?, ?, ?, ?, ?)'
    );
    for (const user of USERS) {
      insertUser.run(user.id, user.name, user.email, user.avatar || null, user.color);
    }
  }
}

// Task operations
export function getAllTasks(): Task[] {
  const database = getDb();
  const rows = database.prepare(`
    SELECT id, title, description, status, priority, assignee_id as assigneeId, 
           notes, "order", created_at as createdAt, updated_at as updatedAt
    FROM tasks 
    ORDER BY status, "order"
  `).all() as Task[];
  return rows;
}

export function getTaskById(id: string): Task | null {
  const database = getDb();
  const row = database.prepare(`
    SELECT id, title, description, status, priority, assignee_id as assigneeId,
           notes, "order", created_at as createdAt, updated_at as updatedAt
    FROM tasks WHERE id = ?
  `).get(id) as Task | undefined;
  return row || null;
}

export function createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'>): Task {
  const database = getDb();
  const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  // Get max order for the status column
  const maxOrder = database.prepare(
    'SELECT COALESCE(MAX("order"), -1) as maxOrder FROM tasks WHERE status = ?'
  ).get(task.status) as { maxOrder: number };
  const order = maxOrder.maxOrder + 1;

  database.prepare(`
    INSERT INTO tasks (id, title, description, status, priority, assignee_id, notes, "order", created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, task.title, task.description || '', task.status, task.priority, task.assigneeId, task.notes || '', order, now, now);

  return {
    id,
    ...task,
    description: task.description || '',
    notes: task.notes || '',
    order,
    createdAt: now,
    updatedAt: now
  };
}

export function updateTask(id: string, updates: Partial<Task>): Task | null {
  const database = getDb();
  const existing = getTaskById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updated = { ...existing, ...updates, updatedAt: now };

  database.prepare(`
    UPDATE tasks SET 
      title = ?, description = ?, status = ?, priority = ?, 
      assignee_id = ?, notes = ?, "order" = ?, updated_at = ?
    WHERE id = ?
  `).run(
    updated.title, updated.description, updated.status, updated.priority,
    updated.assigneeId, updated.notes, updated.order, now, id
  );

  return updated;
}

export function deleteTask(id: string): boolean {
  const database = getDb();
  const result = database.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return result.changes > 0;
}

export function reorderTasks(moves: { taskId: string; newStatus: TaskStatus; newOrder: number }[]): void {
  const database = getDb();
  const now = new Date().toISOString();
  
  const updateStmt = database.prepare(`
    UPDATE tasks SET status = ?, "order" = ?, updated_at = ? WHERE id = ?
  `);

  const transaction = database.transaction(() => {
    for (const move of moves) {
      updateStmt.run(move.newStatus, move.newOrder, now, move.taskId);
    }
  });

  transaction();
}

export function getUsers() {
  const database = getDb();
  return database.prepare('SELECT id, name, email, avatar, color FROM users').all();
}
