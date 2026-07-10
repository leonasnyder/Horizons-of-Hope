const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  reloadOnOnline: true,
  // Aggressive front-end navigation caching made the app serve stale pages
  // after a new deploy. Turning it off keeps offline support for static assets
  // while ensuring visitors get fresh page content when they're online.
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  workboxOptions: {
    // Activate a newly deployed service worker right away instead of waiting
    // for every tab to close, and let it take control of open pages.
    skipWaiting: true,
    clientsClaim: true,
    // Remove precached files from previous deploys so users never load a
    // broken mix of old and new build files.
    cleanupOutdatedCaches: true,
    disableDevLogs: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = withPWA(nextConfig);
