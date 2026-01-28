#!/usr/bin/env node
/**
 * Post-build script for cache busting
 * Generates version.json and injects build timestamp into HTML
 */

const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'out');
const buildTime = Date.now().toString();

console.log('🔧 Running post-build cache-busting...');
console.log(`   Build version: ${buildTime}`);

// 1. Generate version.json
const versionData = {
  buildTime,
  buildDate: new Date().toISOString(),
  version: process.env.GITHUB_SHA?.slice(0, 7) || 'local',
};

const versionPath = path.join(outDir, 'version.json');
fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2));
console.log('✅ Created version.json');

// 2. Update index.html with version and cache headers
const indexPath = path.join(outDir, 'index.html');
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf-8');
  
  // Remove any existing data-version attributes first (idempotent)
  html = html.replace(/\s*data-version="[^"]*"/g, '');
  
  // Inject version into html tag
  html = html.replace(
    /<html([^>]*)>/,
    `<html$1 data-version="${buildTime}">`
  );
  
  // Add cache-busting meta tags and nuclear mobile refresh script
  if (!html.includes('name="build-version"')) {
    // Inject build version meta tag
    html = html.replace(
      '</head>',
      `<meta name="build-version" content="${buildTime}"></head>`
    );
    
    // Inject nuclear cache-busting script right before the first <script> tag in body
    html = html.replace(
      /<script/,
      `<script id="nuclear-cache-buster">
// NUCLEAR MOBILE CACHE BUSTING - Multiple detection methods
(function() {
  const currentBuildTime = '${buildTime}';
  const isMobile = /mobile|android|iphone|ipad/i.test(navigator.userAgent);
  const isIOSChrome = /crios/i.test(navigator.userAgent) || 
                     (/chrome/i.test(navigator.userAgent) && /ios/i.test(navigator.userAgent));
  const isIOSSafari = /iphone|ipad/i.test(navigator.userAgent) && /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
  
  // Always apply to iOS devices (Safari and Chrome)
  const shouldApplyCacheBust = isIOSChrome || isIOSSafari || isMobile;
  
  if (!shouldApplyCacheBust) return;
  
  console.log('🧹 Mobile cache buster active', { 
    isMobile, 
    isIOSChrome, 
    isIOSSafari,
    currentBuild: currentBuildTime.slice(-8)
  });
  
  let needsRefresh = false;
  let refreshReason = '';
  
  // Method 1: Check HTML version vs current build
  const htmlVersion = document.documentElement.dataset.version;
  if (!htmlVersion || htmlVersion !== currentBuildTime) {
    needsRefresh = true;
    refreshReason = 'HTML version mismatch';
  }
  
  // Method 2: Check if we have Supabase config (indicates fresh JS bundle)
  let hasSupabaseConfig = false;
  try {
    // Try multiple ways to detect Supabase config
    if (typeof process !== 'undefined' && process.env) {
      hasSupabaseConfig = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && 
                            process.env.NEXT_PUBLIC_SUPABASE_URL.includes('supabase'));
    }
    
    // Fallback: check if the config constants were replaced at build time
    const supabaseUrlPattern = /https:\\/\\/[a-zA-Z0-9-]+\\.supabase\\.co/;
    const pageSource = document.documentElement.outerHTML;
    if (!hasSupabaseConfig && supabaseUrlPattern.test(pageSource)) {
      hasSupabaseConfig = true;
    }
  } catch (e) {
    console.warn('Could not check Supabase config:', e);
  }
  
  if (!hasSupabaseConfig) {
    needsRefresh = true;
    refreshReason = 'No Supabase config found';
  }
  
  // Method 3: Version check via network (if not already refreshing)
  const urlParams = new URLSearchParams(window.location.search);
  const hasRefreshParam = urlParams.has('_cb') || urlParams.has('_refresh') || urlParams.has('_nuclear');
  
  if (!hasRefreshParam && !needsRefresh) {
    // Quick version check
    setTimeout(() => {
      fetch('/kanban-board/version.json?t=' + Date.now(), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      }).then(r => r.json()).then(data => {
        if (data.buildTime !== currentBuildTime) {
          console.log('🔄 Network version check failed, triggering refresh');
          forceRefresh('Network version mismatch');
        }
      }).catch(() => {
        // If version.json fails to load, assume cache issue
        console.log('🔄 Version check failed, assuming cache issue');
        forceRefresh('Version endpoint unreachable');
      });
    }, 1000);
  }
  
  // If we detected issues and haven't already tried to refresh, do it now
  if (needsRefresh && !hasRefreshParam) {
    console.log('🚨 Cache issue detected:', refreshReason);
    forceRefresh(refreshReason);
  }
  
  function forceRefresh(reason) {
    console.log('🔄 Forcing refresh:', reason);
    
    // Step 1: Clear all possible caches
    Promise.allSettled([
      // Clear Cache API
      'caches' in window ? caches.keys().then(names => 
        Promise.all(names.map(name => caches.delete(name)))
      ) : Promise.resolve(),
      
      // Clear service worker caches
      'serviceWorker' in navigator ? 
        navigator.serviceWorker.getRegistrations().then(regs =>
          Promise.all(regs.map(reg => reg.unregister()))
        ) : Promise.resolve()
    ]).then(() => {
      // Step 2: Construct cache-busting URL
      const url = new URL(window.location.href);
      
      // Add multiple cache-busting parameters
      url.searchParams.set('_cb', Date.now().toString());
      url.searchParams.set('_refresh', '1');
      url.searchParams.set('_v', currentBuildTime);
      url.searchParams.set('_nuclear', '1');
      
      // Add iOS-specific parameter
      if (isIOSChrome) {
        url.searchParams.set('_ios', '1');
      }
      
      // Step 3: Hard refresh with cache busting
      console.log('🎯 Redirecting to fresh URL:', url.pathname + url.search);
      
      // Use replace to avoid back button issues
      window.location.replace(url.toString());
    });
  }
  
  // Add a manual refresh button after 3 seconds if we haven't refreshed
  if (shouldApplyCacheBust && !hasRefreshParam) {
    setTimeout(() => {
      if (document.getElementById('manual-refresh-btn')) return;
      
      const refreshBtn = document.createElement('div');
      refreshBtn.id = 'manual-refresh-btn';
      refreshBtn.innerHTML = \`
        <div style="
          position: fixed; 
          top: 10px; 
          right: 10px; 
          z-index: 9999; 
          background: #ef4444; 
          color: white; 
          padding: 8px 12px; 
          border-radius: 6px; 
          font-size: 12px; 
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          font-family: system-ui, sans-serif;
        " onclick="window.location.reload(true)">
          🔄 Tap to fix sync
        </div>
      \`;
      document.body.appendChild(refreshBtn);
    }, 3000);
  }
})();
</script>
<script`
    );
  }
  
  fs.writeFileSync(indexPath, html);
  console.log('✅ Updated index.html with version and cache headers');
}

// 3.5. CRITICAL FIX: Replace environment variables in JavaScript bundles
// Next.js static export doesn't properly inject NEXT_PUBLIC_ vars, so we do it manually
const jsDir = path.join(outDir, '_next', 'static', 'chunks');
if (fs.existsSync(jsDir)) {
  console.log('🔧 Injecting environment variables into JavaScript bundles...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  
  if (supabaseUrl && supabaseKey) {
    // Process all JavaScript files
    const processJSFiles = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          processJSFiles(filePath);
        } else if (file.endsWith('.js')) {
          let content = fs.readFileSync(filePath, 'utf-8');
          let modified = false;
          
          // Replace the process polyfill env object with actual values
          const envReplacement = `{NEXT_PUBLIC_SUPABASE_URL:"${supabaseUrl}",NEXT_PUBLIC_SUPABASE_ANON_KEY:"${supabaseKey}",NEXT_PUBLIC_BASE_PATH:"${basePath}",NEXT_PUBLIC_BUILD_VERSION:"${buildTime}"}`;
          
          // Find and replace empty env objects
          if (content.includes('env:{}') || content.includes('env: {}')) {
            content = content.replace(/env:\s*\{\}/g, `env:${envReplacement}`);
            modified = true;
          }
          
          // Also replace direct NEXT_PUBLIC_ references
          if (content.includes('NEXT_PUBLIC_SUPABASE_URL') && !content.includes(supabaseUrl)) {
            content = content.replace(/process\.env\.NEXT_PUBLIC_SUPABASE_URL/g, `"${supabaseUrl}"`);
            content = content.replace(/process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY/g, `"${supabaseKey}"`);
            content = content.replace(/p\.env\.NEXT_PUBLIC_SUPABASE_URL/g, `"${supabaseUrl}"`);
            content = content.replace(/p\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY/g, `"${supabaseKey}"`);
            modified = true;
          }
          
          if (modified) {
            fs.writeFileSync(filePath, content);
            console.log(`   ✅ Updated ${file}`);
          }
        }
      });
    };
    
    processJSFiles(jsDir);
    console.log('✅ Environment variables injected into JavaScript bundles');
  } else {
    console.log('⚠️ Supabase environment variables not found - skipping injection');
  }
}

// 3. Create _headers file for GitHub Pages (may not be honored but doesn't hurt)
const headersContent = `/*
  Cache-Control: no-cache, no-store, must-revalidate
  Pragma: no-cache
  Expires: 0

/version.json
  Cache-Control: no-cache, no-store, must-revalidate

/_next/static/*
  Cache-Control: public, max-age=31536000, immutable
`;

fs.writeFileSync(path.join(outDir, '_headers'), headersContent);
console.log('✅ Created _headers file');

// 4. Create an aggressive sw.js for cache management
const swContent = `// NUCLEAR Service Worker for aggressive cache management
const CACHE_VERSION = '${buildTime}';
const CACHE_NAME = 'kanban-v' + CACHE_VERSION;

// Install: immediately take control
self.addEventListener('install', (event) => {
  console.log('[SW] Installing version:', CACHE_VERSION);
  self.skipWaiting(); // Take control immediately
});

// Activate: nuke all old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating version:', CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Clear all caches that don't match current version
      caches.keys().then((cacheNames) => {
        console.log('[SW] Found caches:', cacheNames);
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      
      // Take control of all clients immediately
      clients.claim()
    ])
  );
});

// Fetch: aggressive network-first for all mobile browsers
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-HTTP requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Check if this is a mobile browser request
  const userAgent = event.request.headers.get('user-agent') || '';
  const isMobile = /mobile|android|iphone|ipad/i.test(userAgent);
  const isIOSChrome = /crios/i.test(userAgent);
  
  // For HTML documents or mobile browsers: ALWAYS go network first
  if (event.request.mode === 'navigate' || 
      event.request.destination === 'document' ||
      isMobile || isIOSChrome) {
    
    event.respondWith(
      fetch(event.request, { 
        cache: 'no-store',
        headers: {
          ...Object.fromEntries(event.request.headers.entries()),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      .then(response => {
        console.log('[SW] Network response for:', url.pathname, response.status);
        
        // For successful HTML responses, add extra cache-busting headers
        if (response.ok && 
            (event.request.mode === 'navigate' || event.request.destination === 'document')) {
          const modifiedResponse = new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: {
              ...Object.fromEntries(response.headers.entries()),
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
              'X-Cache-Busted': CACHE_VERSION
            }
          });
          return modifiedResponse;
        }
        
        return response;
      })
      .catch(error => {
        console.log('[SW] Network failed for:', url.pathname, error);
        
        // Only fall back to cache for static assets, not HTML
        if (event.request.mode !== 'navigate' && event.request.destination !== 'document') {
          return caches.match(event.request);
        }
        
        // For HTML, return a cache-busting error page
        return new Response(\`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Connection Error</title>
            <meta http-equiv="Cache-Control" content="no-cache">
          </head>
          <body>
            <h1>Connection Error</h1>
            <p>Please check your internet connection and <button onclick="window.location.reload(true)">try again</button>.</p>
            <script>
              // Auto-retry in 3 seconds
              setTimeout(() => window.location.reload(true), 3000);
            </script>
          </body>
          </html>
        \`, {
          status: 200,
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
      })
    );
    return;
  }
  
  // For other assets on desktop: cache-first but with version check
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Check if cached version matches current build
        const cacheControl = cached.headers.get('X-Cache-Version');
        if (cacheControl === CACHE_VERSION) {
          return cached;
        }
        // Cached version is stale, fetch fresh
        console.log('[SW] Stale cache for:', url.pathname, 'fetching fresh');
      }
      
      return fetch(event.request).then(response => {
        // Cache successful responses
        if (response.ok && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      });
    })
  );
});

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW] Clearing all caches on request');
    event.waitUntil(
      caches.keys().then(names => 
        Promise.all(names.map(name => caches.delete(name)))
      ).then(() => {
        event.ports[0].postMessage({ success: true });
      })
    );
  }
});
`;

fs.writeFileSync(path.join(outDir, 'sw.js'), swContent);
console.log('✅ Created sw.js for cache management');

console.log('🎉 Post-build complete!');
