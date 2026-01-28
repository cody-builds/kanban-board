# Supabase Setup Guide

This guide walks through setting up Supabase for real-time task synchronization.

## Quick Setup (5 minutes)

### Step 1: Create Supabase Account & Project

1. Go to [supabase.com](https://supabase.com) and sign up (free tier is sufficient)
2. Click **New Project**
3. Choose organization, name it `kanban-board`, set a database password
4. Select region closest to you, click **Create new project**
5. Wait ~2 minutes for project to provision

### Step 2: Run Database Schema

1. In your Supabase project dashboard, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Copy and paste the contents of [`supabase/schema.sql`](../supabase/schema.sql)
4. Click **Run** (or press Cmd/Ctrl+Enter)
5. You should see "Success. No rows returned"

### Step 3: Get API Credentials

1. Click **Settings** (gear icon) in the left sidebar
2. Click **API** under "Project Settings"
3. Copy these values:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon public** key (under "Project API keys")

### Step 4: Configure GitHub Repository

1. Go to your GitHub repository
2. Click **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret** and add:
   - Name: `SUPABASE_URL`
   - Value: Your Project URL from Step 3
4. Click **New repository secret** again:
   - Name: `SUPABASE_ANON_KEY`
   - Value: Your anon public key from Step 3

### Step 5: Trigger Deploy

Either:
- Push any commit to trigger the workflow
- Go to **Actions** tab, select "Deploy to GitHub Pages", click **Run workflow**

### Step 6: Verify

1. Open the kanban board URL
2. Look for the **green "Synced" indicator** in the header
3. If you see amber "Local Only", check your secrets are correct

## Verification Checklist

- [ ] Supabase project created
- [ ] SQL schema executed successfully
- [ ] `SUPABASE_URL` secret added to GitHub
- [ ] `SUPABASE_ANON_KEY` secret added to GitHub
- [ ] GitHub Actions workflow completed successfully
- [ ] Board shows green "Synced" indicator

## Troubleshooting

### "Local Only" indicator showing

1. Check GitHub Actions logs for build errors
2. Verify secrets are named exactly `SUPABASE_URL` and `SUPABASE_ANON_KEY`
3. Ensure secrets don't have extra whitespace

### Tasks not syncing between users

1. Open browser console (F12) and check for errors
2. Verify Supabase Realtime is enabled for the tasks table
3. Check Supabase dashboard > Database > Replication to ensure `tasks` table is listed

### Permission denied errors

The schema includes a permissive RLS policy. If you're seeing permission errors:

1. Go to Supabase > Database > Tables > tasks
2. Click the shield icon (RLS)
3. Ensure RLS is enabled and the "Allow all access" policy exists

## Local Development

For local development with Supabase:

```bash
# Copy example env file
cp .env.example .env.local

# Edit with your credentials
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Run dev server
npm run dev
```

## Architecture Notes

- **Optimistic Updates**: Changes appear instantly in the UI, then sync to Supabase
- **Realtime Subscriptions**: Postgres changes broadcast to all connected clients
- **Fallback Mode**: If Supabase isn't configured, localStorage is used (local-only)
- **No Authentication**: Current setup is open access (suitable for private use)

## Security Considerations

The current setup uses anonymous access with permissive RLS policies. For production:

1. Consider adding authentication (Supabase Auth)
2. Restrict RLS policies to authenticated users
3. Use Row Level Security based on user IDs
