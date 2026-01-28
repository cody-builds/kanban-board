# Kanban Board

A collaborative task management board for Cody & Claire with **real-time synchronization**.

## Features

- 🎯 Drag-and-drop task management
- 👥 Multi-user collaboration (Cody & Claire)
- ☁️ **Real-time sync** via Supabase (tasks visible to all users instantly)
- 📱 Responsive design
- 🎨 Priority levels (Low, Medium, High)
- 📝 Task descriptions and notes

## Live Demo

[View Kanban Board](https://codyburleson.github.io/kanban-board/)

## Sync Modes

The board operates in two modes:

- **☁️ Cloud Sync** (green indicator): Tasks sync in real-time between all users via Supabase
- **💾 Local Only** (amber indicator): Tasks stored in browser localStorage (fallback when Supabase not configured)

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **SQL Editor** and run the schema from [`supabase/schema.sql`](./supabase/schema.sql)

### 2. Get API Keys

1. In your Supabase project, go to **Settings** > **API**
2. Copy the **Project URL** and **anon/public key**

### 3. Configure GitHub Secrets

In your GitHub repository:

1. Go to **Settings** > **Secrets and variables** > **Actions**
2. Add these secrets:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anon key

### 4. Deploy

Push to `main` branch - GitHub Actions will automatically build and deploy.

## Local Development

```bash
# Install dependencies
npm install

# Create .env.local with your Supabase credentials
cp .env.example .env.local
# Edit .env.local with your values

# Run development server
npm run dev
```

## Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Supabase** - Backend & real-time sync
- **dnd-kit** - Drag and drop
- **Lucide React** - Icons

## Architecture

```
src/
├── app/                 # Next.js app router
├── components/
│   ├── board/          # Board & column components
│   ├── task/           # Task card & modal
│   └── user/           # User avatar & select
├── hooks/              # React hooks
├── lib/                # Supabase client & utilities
├── store/              # Zustand state management
└── types/              # TypeScript types
```

## Real-time Sync Details

When Supabase is configured:
- Tasks are stored in PostgreSQL database
- Changes broadcast via Supabase Realtime
- All connected clients receive updates instantly
- Optimistic updates for snappy UX

When Supabase is NOT configured:
- Falls back to browser localStorage
- Tasks only visible in that browser session
- Shows "Local Only" indicator in header
