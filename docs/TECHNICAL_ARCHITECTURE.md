# Technical Architecture Document
## Kanban Board Interface for Cody & Claire

**Version:** 1.0  
**Date:** January 28, 2025  
**Technical Lead:** Claude (Technical Lead Agent)  
**Status:** Ready for Development

---

## 1. Architecture Overview

### System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 14)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  KanbanBoard │  │  TaskModal  │  │  AssignmentPanel   │ │
│  │  Component   │  │  Component  │  │     Component      │ │
│  └──────┬──────┘  └──────┬──────┘  └─────────┬──────────┘ │
│         │                │                    │             │
│  ┌──────┴────────────────┴────────────────────┴──────────┐ │
│  │              React Query + Zustand State               │ │
│  └────────────────────────┬──────────────────────────────┘ │
└───────────────────────────┼─────────────────────────────────┘
                            │ REST API
┌───────────────────────────┼─────────────────────────────────┐
│                     API ROUTES (Next.js)                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐│
│  │ /api/tasks │  │ /api/users │  │ /api/board             ││
│  └─────┬──────┘  └─────┬──────┘  └───────────┬────────────┘│
│        └───────────────┴─────────────────────┘              │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                    PERSISTENCE LAYER                         │
│  ┌────────────────────────┴────────────────────────────────┐│
│  │              Vercel KV (Redis) / SQLite                 ││
│  │         (switchable via environment config)              ││
│  └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### Frontend
| Technology | Purpose | Version |
|------------|---------|---------|
| Next.js 14 | React Framework (App Router) | 14.2.x |
| TypeScript | Type Safety | 5.x |
| Tailwind CSS | Styling | 3.4.x |
| @dnd-kit/core | Drag & Drop | 6.x |
| Zustand | Client State | 4.x |
| React Query | Server State | 5.x |
| Lucide React | Icons | Latest |
| date-fns | Date Formatting | 3.x |

### Backend
| Technology | Purpose | Version |
|------------|---------|---------|
| Next.js API Routes | REST Endpoints | 14.2.x |
| Vercel KV | Production Persistence | Latest |
| better-sqlite3 | Local Development DB | 9.x |
| Zod | Schema Validation | 3.x |

### DevOps
| Technology | Purpose |
|------------|---------|
| GitHub | Version Control |
| Vercel | Hosting & Deployment |
| GitHub Actions | CI/CD Pipeline |

---

## 3. Data Models

### TypeScript Interfaces

```typescript
// types/index.ts

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string; // For UI differentiation
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId: string | null;
  notes: string; // For PR links and context
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  order: number; // Position within column
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type Priority = 'low' | 'medium' | 'high';

export interface Board {
  id: string;
  name: string;
  columns: Column[];
  users: User[];
}

export interface Column {
  id: TaskStatus;
  title: string;
  color: string;
}

// API Request/Response types
export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: Priority;
  assigneeId?: string;
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
```

### Database Schema (SQLite/KV)

```sql
-- Tasks table
CREATE TABLE tasks (
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

-- Users table (pre-seeded)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  avatar TEXT,
  color TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_order ON tasks(status, "order");
```

---

## 4. API Specification

### Endpoints

#### Tasks API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List all tasks |
| POST | `/api/tasks` | Create new task |
| GET | `/api/tasks/[id]` | Get task by ID |
| PATCH | `/api/tasks/[id]` | Update task |
| DELETE | `/api/tasks/[id]` | Delete task |
| POST | `/api/tasks/reorder` | Batch reorder tasks |

#### Users API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |

#### Board API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/board` | Get full board state |

### Example API Responses

```json
// GET /api/tasks
{
  "tasks": [
    {
      "id": "task_1",
      "title": "Implement login flow",
      "description": "Add OAuth support",
      "status": "in_progress",
      "priority": "high",
      "assigneeId": "cody",
      "notes": "PR: github.com/repo/pull/123",
      "order": 0,
      "createdAt": "2025-01-28T12:00:00Z",
      "updatedAt": "2025-01-28T14:30:00Z"
    }
  ]
}

// POST /api/tasks/reorder
{
  "moves": [
    { "taskId": "task_1", "newStatus": "review", "newOrder": 0 },
    { "taskId": "task_2", "newStatus": "review", "newOrder": 1 }
  ]
}
```

---

## 5. Component Architecture

### Component Hierarchy

```
src/
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Main kanban board page
│   └── api/
│       ├── tasks/
│       │   ├── route.ts        # GET all, POST new
│       │   ├── [id]/route.ts   # GET, PATCH, DELETE single
│       │   └── reorder/route.ts
│       ├── users/route.ts
│       └── board/route.ts
├── components/
│   ├── board/
│   │   ├── KanbanBoard.tsx     # Main board container
│   │   ├── KanbanColumn.tsx    # Column component
│   │   └── ColumnHeader.tsx    # Column title + count
│   ├── task/
│   │   ├── TaskCard.tsx        # Draggable task card
│   │   ├── TaskModal.tsx       # Create/edit modal
│   │   ├── TaskForm.tsx        # Form fields
│   │   └── PriorityBadge.tsx   # Priority indicator
│   ├── user/
│   │   ├── UserAvatar.tsx      # User avatar component
│   │   └── UserSelect.tsx      # Assignment dropdown
│   └── ui/
│       ├── Button.tsx
│       ├── Modal.tsx
│       ├── Input.tsx
│       └── Select.tsx
├── hooks/
│   ├── useTasks.ts             # Task CRUD operations
│   ├── useBoard.ts             # Board state management
│   └── useDragDrop.ts          # DnD logic
├── lib/
│   ├── db.ts                   # Database connection
│   ├── api.ts                  # API client
│   └── utils.ts                # Helper functions
├── store/
│   └── boardStore.ts           # Zustand store
└── types/
    └── index.ts                # TypeScript types
```

---

## 6. State Management

### Client State (Zustand)

```typescript
// store/boardStore.ts
interface BoardState {
  tasks: Task[];
  users: User[];
  selectedTask: Task | null;
  isModalOpen: boolean;
  
  // Actions
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, newStatus: TaskStatus, newOrder: number) => void;
  openModal: (task?: Task) => void;
  closeModal: () => void;
}
```

### Server State (React Query)

```typescript
// hooks/useTasks.ts
export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.getTasks(),
    staleTime: 1000 * 60 // 1 minute
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createTask,
    onSuccess: () => queryClient.invalidateQueries(['tasks'])
  });
}
```

---

## 7. Drag & Drop Implementation

### Using @dnd-kit

```typescript
// Key implementation approach
import { 
  DndContext, 
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';

// Optimistic updates for smooth UX
// Backend sync on drop completion
// Visual feedback during drag
```

---

## 8. Pre-seeded Data

### Users (Hardcoded)

```typescript
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
```

### Columns (Fixed)

```typescript
export const COLUMNS: Column[] = [
  { id: 'todo', title: 'Todo', color: '#6B7280' },
  { id: 'in_progress', title: 'In Progress', color: '#F59E0B' },
  { id: 'review', title: 'Review', color: '#8B5CF6' },
  { id: 'done', title: 'Done', color: '#10B981' }
];
```

---

## 9. Environment Configuration

```env
# .env.local (development)
DATABASE_URL=./data/kanban.db
NEXT_PUBLIC_APP_URL=http://localhost:3000

# .env.production (Vercel)
KV_REST_API_URL=<vercel-kv-url>
KV_REST_API_TOKEN=<vercel-kv-token>
NEXT_PUBLIC_APP_URL=https://kanban.vercel.app
```

---

## 10. Performance Optimizations

1. **Optimistic Updates**: Update UI immediately, sync with server
2. **Debounced Saves**: Batch rapid changes (300ms debounce)
3. **Memoization**: React.memo for TaskCard, useMemo for filtered lists
4. **Virtual Scrolling**: If columns exceed 50 tasks (future)
5. **Image Optimization**: Next.js Image for avatars

---

## 11. Testing Strategy

| Type | Tool | Coverage Target |
|------|------|-----------------|
| Unit | Vitest | 80% - utils, hooks |
| Component | Testing Library | Key interactions |
| E2E | Playwright | Critical user flows |

---

## 12. Deployment Architecture

```
GitHub Repository
       │
       ▼ (push to main)
GitHub Actions CI
       │
       ├── Lint & Type Check
       ├── Run Tests
       └── Build Verification
       │
       ▼ (on success)
Vercel Auto-Deploy
       │
       ├── Preview (PR branches)
       └── Production (main branch)
```

---

## 13. Security Considerations

1. **Input Validation**: Zod schemas for all API inputs
2. **XSS Prevention**: React's built-in escaping + DOMPurify for notes
3. **CSRF**: Next.js built-in protection
4. **Rate Limiting**: Vercel Edge middleware (future)

---

## 14. File Structure (Final)

```
kanban-board/
├── .github/
│   └── workflows/
│       └── ci.yml
├── docs/
│   ├── TECHNICAL_ARCHITECTURE.md
│   └── API.md
├── src/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── store/
│   └── types/
├── data/                  # Local SQLite (gitignored)
├── public/
├── .env.example
├── .gitignore
├── next.config.mjs
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

**Document Status:** Approved for Development  
**Next Action:** Task breakdown and team assignment
