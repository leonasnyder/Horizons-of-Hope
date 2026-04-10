import { useEffect, useRef, useState } from 'react';

export const PULL_THRESHOLD = 72; // px needed to trigger refresh

export function usePullToRefresh(onRefresh: () => void) {
  const [pullDistance, setPullDistance] = useState(0);

  // Use refs so event handlers never go stale and we only register listeners once
  const startYRef = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startYRef.current = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startYRef.current === null) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta > 0 && window.scrollY === 0) {
        const clamped = Math.min(delta * 0.5, PULL_THRESHOLD * 1.4); // dampen so it feels natural
        pullDistanceRef.current = clamped;
        setPullDistance(clamped);
      } else {
        // Scrolling up — cancel
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
      pullDistanceRef.current = 0;
      setPullDistance(0);
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, []); // empty — refs handle everything

  return { pullDistance, threshold: PULL_THRESHOLD };
}
