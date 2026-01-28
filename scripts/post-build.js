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
  
  // Add cache-busting meta tags and aggressive mobile refresh script
  if (!html.includes('http-equiv="Cache-Control"')) {
    html = html.replace(
      '</head>',
      `  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <meta http-equiv="Expires" content="0">
  <script>
    // Ultra-aggressive mobile cache busting - runs immediately
    (function() {
      const isMobile = /mobile|android|iphone|ipad/i.test(navigator.userAgent);
      const isIOSChrome = /crios/i.test(navigator.userAgent) || 
                         (/chrome/i.test(navigator.userAgent) && /ios/i.test(navigator.userAgent));
      
      if (!isMobile && !isIOSChrome) return;
      
      // Check if we have Supabase config (indicates fresh JS)
      let hasSupabaseConfig = false;
      try {
        hasSupabaseConfig = !!(typeof process !== 'undefined' && 
                              process.env && 
                              process.env.NEXT_PUBLIC_SUPABASE_URL);
      } catch (e) {
        hasSupabaseConfig = false;
      }
      
      // If no Supabase config on mobile, force hard refresh immediately
      if (!hasSupabaseConfig) {
        console.log('Mobile cache detected - forcing immediate refresh');
        
        // Clear all possible caches
        if ('caches' in window) {
          caches.keys().then(names => names.forEach(name => caches.delete(name)));
        }
        
        // Add cache-busting parameter and hard refresh
        const currentUrl = new URL(window.location);
        if (!currentUrl.searchParams.has('_cb')) {
          currentUrl.searchParams.set('_cb', Date.now().toString());
          window.location.replace(currentUrl.toString());
        }
      }
    })();
  </script>
</head>`
    );
  }
  
  fs.writeFileSync(indexPath, html);
  console.log('✅ Updated index.html with version and cache headers');
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

// 4. Create a simple sw.js for cache management
const swContent = `// Service Worker for cache management
const CACHE_VERSION = '${buildTime}';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_VERSION)
          .map((name) => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // For HTML, always go to network first
  if (event.request.mode === 'navigate' || 
      event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // For other assets, use cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
`;

fs.writeFileSync(path.join(outDir, 'sw.js'), swContent);
console.log('✅ Created sw.js for cache management');

console.log('🎉 Post-build complete!');
