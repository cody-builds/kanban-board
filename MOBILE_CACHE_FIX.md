# Mobile Cache Fix - Definitive Solutions

## Problem Summary
iOS Chrome caches old JavaScript bundles because **GitHub Pages has hardcoded `cache-control: max-age=600`** that cannot be overridden. The `_headers` file is ignored by GitHub Pages.

---

## Solution 1: Migrate to Cloudflare Pages (RECOMMENDED)

**Why it works:** Cloudflare Pages honors `_headers` file - our existing no-cache rules will finally work.

### Steps:

1. **Go to Cloudflare Dashboard** → Workers & Pages → Create Application → Pages
2. **Connect to Git** → Select `cody-builds/kanban-board` repository  
3. **Build Configuration:**
   - Framework preset: `Next.js (Static HTML Export)`
   - Build command: `npm run build`
   - Build output directory: `out`
4. **Environment Variables (IMPORTANT):**
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
   - `NEXT_PUBLIC_BASE_PATH` = `` (empty - no base path needed on Cloudflare)
5. **Deploy**

### URL Change:
- Old: `https://cody-builds.github.io/kanban-board`
- New: `https://kanban-board.pages.dev` (or custom domain)

### Benefits:
- ✅ `_headers` file is honored - HTML will not be cached
- ✅ No code changes needed
- ✅ Free tier (100,000 requests/day)
- ✅ Automatic builds on push
- ✅ Faster global CDN

---

## Solution 2: Keep GitHub Pages + External Version Check

If Cloudflare Pages is not an option, use an external uncacheable endpoint.

### Concept:
Load a version-checking script from a URL that bypasses GitHub's cache (like raw.githubusercontent.com or a serverless function).

### Implementation:
See `scripts/external-loader.js` for the pattern.

---

## Solution 3: Cloudflare Proxy in Front of GitHub Pages

Use Cloudflare as a reverse proxy with Page Rules to override cache headers.

### Steps:
1. Add your domain to Cloudflare
2. CNAME to `cody-builds.github.io`
3. Create Page Rule: `*domain.com/*` → Cache Level: Bypass

---

## Why Other Attempts Failed

| Attempt | Why It Failed |
|---------|--------------|
| `_headers` file | GitHub Pages ignores it |
| Service Worker cache clearing | Can't clear browser's HTTP cache |
| Meta headers | Only affect new requests, not cached HTML |
| URL parameters | Old HTML with old params is still cached |
| Nuclear refresh script | Script is inside cached HTML - chicken-and-egg |
| `version.json` polling | By the time it runs, old JS is already loaded |

---

## Quick Fix for Testing

Users can manually force refresh by:
1. iOS Chrome: Settings → Privacy → Clear Browsing Data
2. Or visit: `https://cody-builds.github.io/kanban-board/?_force=<timestamp>`

But this is not a real solution - Cloudflare Pages migration is.
