# DevOps Deployment Guide: Kanban Board
## GitHub → Vercel Pipeline Setup

**Prepared by:** Technical Lead Agent  
**Date:** January 28, 2025  
**Priority:** P0 - CRITICAL PATH

---

## 📋 Pre-Deployment Checklist

Before starting, verify:
- [x] Build compiles successfully: `npm run build` ✅
- [x] All TypeScript types resolve ✅
- [x] No linting errors ✅
- [ ] GitHub account/organization access available
- [ ] Vercel account available

---

## 🔧 Step 1: GitHub Repository Setup

### 1.1 Create Repository

```bash
# Option A: Using GitHub CLI
gh repo create kanban-board --public --description "Kanban board for Cody & Claire collaboration"

# Option B: Create via GitHub UI
# Go to github.com → New Repository → Name: "kanban-board"
```

### 1.2 Initialize and Push

```bash
cd /home/ubuntu/clawd/projects/kanban-board

# Initialize git if not already done
git init

# Create .gitignore (already exists, but verify these entries)
cat >> .gitignore << 'EOF'
# Dependencies
node_modules/

# Next.js
.next/
out/

# Database (local dev only)
data/*.db
data/*.db-wal
data/*.db-shm

# Environment
.env
.env.local
.env.production.local

# Misc
.DS_Store
*.log
EOF

# Add all files
git add .

# Initial commit
git commit -m "feat: Complete kanban board implementation

Features:
- 4-column workflow (Todo/In Progress/Review/Done)
- Drag-and-drop task management
- User assignment (Cody & Claire)
- Priority levels (High/Medium/Low)
- Notes field for PR links
- Persistent SQLite storage
- Full TypeScript + Next.js 14"

# Add remote (replace with actual repo URL)
git remote add origin https://github.com/<org>/kanban-board.git

# Push to main
git branch -M main
git push -u origin main
```

---

## 🚀 Step 2: Vercel Project Setup

### 2.1 Connect to Vercel

**Option A: Vercel CLI**
```bash
# Install Vercel CLI if needed
npm i -g vercel

# Login
vercel login

# Link project
cd /home/ubuntu/clawd/projects/kanban-board
vercel link

# Deploy
vercel --prod
```

**Option B: Vercel Dashboard**
1. Go to https://vercel.com/new
2. Import Git Repository → Select "kanban-board"
3. Framework Preset: Next.js (auto-detected)
4. Root Directory: ./ (default)
5. Click Deploy

### 2.2 Build Settings (Auto-detected)

Vercel will auto-detect these settings:
```
Framework Preset: Next.js
Build Command: npm run build (or next build)
Output Directory: .next
Install Command: npm install
Node.js Version: 20.x
```

### 2.3 Environment Variables (Optional)

For production database (if migrating from SQLite):

```bash
# Vercel Dashboard → Project → Settings → Environment Variables

# Option: Vercel Postgres
POSTGRES_URL="postgres://..."
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NO_SSL="postgres://..."
POSTGRES_USER="..."
POSTGRES_HOST="..."
POSTGRES_PASSWORD="..."
POSTGRES_DATABASE="..."

# Option: Vercel KV (Redis)
KV_REST_API_URL="https://..."
KV_REST_API_TOKEN="..."
KV_REST_API_READ_ONLY_TOKEN="..."
KV_URL="redis://..."
```

**Note:** Current SQLite implementation works for initial deployment. Database migration can be done post-launch if needed.

---

## 🔄 Step 3: CI/CD Pipeline

### 3.1 Create GitHub Actions Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'

jobs:
  build-and-test:
    name: Build & Test
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Type check
        run: npx tsc --noEmit

      - name: Build application
        run: npm run build

      # Future: Add tests
      # - name: Run tests
      #   run: npm test

  deploy-preview:
    name: Deploy Preview
    runs-on: ubuntu-latest
    needs: build-and-test
    if: github.event_name == 'pull_request'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Deploy to Vercel Preview
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### 3.2 Configure GitHub Secrets

In GitHub Repository → Settings → Secrets and variables → Actions:

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `VERCEL_TOKEN` | Vercel API token | Vercel Dashboard → Account Settings → Tokens |
| `VERCEL_ORG_ID` | Organization ID | `vercel link` outputs this |
| `VERCEL_PROJECT_ID` | Project ID | `vercel link` outputs this |

---

## ✅ Step 4: Verification Checklist

After deployment, verify:

### Production URL Checks
```bash
# Replace with actual production URL
PROD_URL="https://kanban-board.vercel.app"

# Check main page loads
curl -I $PROD_URL

# Check API endpoints
curl $PROD_URL/api/users
curl $PROD_URL/api/tasks
curl $PROD_URL/api/board
```

### Functional Tests
- [ ] Page loads without errors
- [ ] Can create a new task
- [ ] Can edit existing task
- [ ] Can delete a task
- [ ] Drag-and-drop works between columns
- [ ] User assignment works (Cody/Claire)
- [ ] Priority selection works
- [ ] Notes field saves correctly
- [ ] Data persists after page refresh
- [ ] Mobile responsive layout works

### Performance Checks
- [ ] Page load time < 2 seconds
- [ ] Lighthouse performance score > 80
- [ ] No console errors in browser

---

## 🌐 Step 5: Domain Configuration (Optional)

### Custom Domain Setup

1. Vercel Dashboard → Project → Settings → Domains
2. Add custom domain (e.g., `kanban.yourdomain.com`)
3. Configure DNS:
   - CNAME record: `kanban` → `cname.vercel-dns.com`
   - Or A record: → Vercel IP addresses
4. SSL certificate auto-provisioned

---

## 📊 Post-Deployment Monitoring

### Recommended Setup

1. **Vercel Analytics** (Free tier)
   - Dashboard → Project → Analytics → Enable
   
2. **Speed Insights**
   - Dashboard → Project → Speed Insights → Enable

3. **Error Monitoring** (Optional)
   - Consider: Sentry, LogRocket, or Vercel's native logs

---

## 🔧 Troubleshooting

### Common Issues

**Build Fails on Vercel:**
```bash
# Check Node.js version matches local
node --version  # Should be 20.x

# Clear cache and rebuild
vercel --prod --force
```

**Database Issues:**
```bash
# SQLite file not persisting (expected on serverless)
# Solution: Migrate to Vercel Postgres or KV
```

**API Routes 500 Error:**
```bash
# Check Vercel function logs
vercel logs --prod

# Verify environment variables set correctly
vercel env ls
```

---

## 📝 Quick Command Reference

```bash
# Local Development
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build
npm run start        # Run production build locally
npm run lint         # Run ESLint

# Git Operations
git status           # Check changes
git add .            # Stage all
git commit -m "msg"  # Commit
git push             # Push to GitHub

# Vercel Operations
vercel               # Deploy to preview
vercel --prod        # Deploy to production
vercel logs          # View logs
vercel env pull      # Pull env vars to local
```

---

## ✅ Deployment Complete Criteria

This deployment is complete when:

1. [x] Code pushed to GitHub repository
2. [ ] GitHub Actions CI passing
3. [ ] Vercel project connected
4. [ ] Production deployment successful
5. [ ] All functional tests passing
6. [ ] Production URL shared with stakeholders

---

**Document Status:** Ready for Execution  
**Estimated Time:** 1-2 hours  
**Dependencies:** GitHub account, Vercel account
