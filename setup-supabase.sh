#!/bin/bash
# Kanban Board Supabase Setup Script
# Run after creating your Supabase project

set -e

echo "🔧 Kanban Board Supabase Configuration"
echo "======================================="
echo ""

# Check if gh is authenticated
if ! gh auth status &>/dev/null; then
    echo "❌ GitHub CLI not authenticated. Run: gh auth login"
    exit 1
fi

# Get Supabase credentials
read -p "Enter your Supabase Project URL (e.g., https://abc123.supabase.co): " SUPABASE_URL
read -p "Enter your Supabase Anon Key: " SUPABASE_ANON_KEY

# Validate inputs
if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_ANON_KEY" ]]; then
    echo "❌ Both URL and Key are required"
    exit 1
fi

if [[ ! "$SUPABASE_URL" =~ ^https://.*\.supabase\.co$ ]]; then
    echo "⚠️  URL doesn't look like a Supabase URL. Continuing anyway..."
fi

echo ""
echo "📝 Adding GitHub Secrets..."

# Add secrets
gh secret set SUPABASE_URL --body "$SUPABASE_URL" -R cody-builds/kanban-board
gh secret set SUPABASE_ANON_KEY --body "$SUPABASE_ANON_KEY" -R cody-builds/kanban-board

echo "✅ Secrets added successfully!"
echo ""

# Trigger deployment
echo "🚀 Triggering deployment..."
gh workflow run "Deploy to GitHub Pages" -R cody-builds/kanban-board

echo ""
echo "✅ Setup complete!"
echo ""
echo "🔗 Your kanban board: https://cody-builds.github.io/kanban-board"
echo "   (Wait ~2 minutes for deployment to complete)"
echo ""
echo "📋 Verify by:"
echo "   1. Opening the kanban board URL"
echo "   2. Looking for green 'Synced' indicator"
echo ""
