import { useEffect, useRef, useState } from 'react';

export const PULL_THRESHOLD = 60;

// Walk up the DOM to find the nearest scrollable ancestor and return its scrollTop
function getScrollTop(target: EventTarget | null): number {
  let el = target instanceof Element ? target : null;
  while (el) {
    const style = window.getComputedStyle(el);
    const overflow = style.overflowY;
    if ((overflow === 'auto' || overflow === 'scroll') && el.scrollHeight > el.clientHeight) {
      return el.scrollTop;
    }
    el = el.parentElement;
  }
  return window.scrollY;
}

export function usePullToRefresh(onRefresh: () => void) {
  const [pullDistance, setPullDistance] = useState(0);

  const startYRef = useRef<number | null>(null);
  const touchTargetRef = useRef<EventTarget | null>(null);
  const pullDistanceRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      // Only begin tracking if the touched element's scroll container is at the top
      if (getScrollTop(e.target) <= 1) {
        startYRef.current = e.touches[0].clientY;
        touchTargetRef.current = e.target;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startYRef.current === null) return;

      // If the user has scrolled the inner container since touchstart, cancel
      if (getScrollTop(touchTargetRef.current) > 1) {
        startYRef.current = null;
        pullDistanceRef.current = 0;
        setPullDistance(0);
        return;
      }

      const delta = e.touches[0].clientY - startYRef.current;
      if (delta > 0) {
        const clamped = Math.min(delta, PULL_THRESHOLD * 1.5);
        pullDistanceRef.current = clamped;
        setPullDistance(clamped);
      } else {
        // Moved up — cancel
        startYRef.current = null;
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    };

    const onTouchEnd = () => {
      if (pullDistanceRef.current >= PULL_THRESHOLD) {
        onRefreshRef.current();
      }
      startYRef.current = null;
      touchTargetRef.current = null;
      pullDistanceRef.current = 0;
      setPullDistance(0);
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  return { pullDistance, threshold: PULL_THRESHOLD };
}
