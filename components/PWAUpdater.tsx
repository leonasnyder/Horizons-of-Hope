'use client';

import { useEffect } from 'react';

/**
 * When a new version of the app is deployed, the new service worker activates
 * immediately (skipWaiting/clientsClaim in next.config.js) and fires a
 * `controllerchange` event. We reload the page once at that point so the user
 * is running a consistent, fully up-to-date version instead of a stale one.
 *
 * The `hadController` guard avoids reloading on the very first visit (when the
 * service worker is installed for the first time), and `refreshing` prevents
 * any chance of a reload loop.
 */
export default function PWAUpdater() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const hadController = Boolean(navigator.serviceWorker.controller);
    let refreshing = false;

    const onControllerChange = () => {
      if (refreshing || !hadController) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  return null;
}
