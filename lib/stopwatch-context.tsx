'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

/**
 * Shared stopwatch state.
 *
 * This lives in a React Context mounted in the root layout so that
 * the timer is NOT unmounted when the user navigates between pages
 * (Scheduler -> Tracker -> Tasks -> Settings etc.).  State is also
 * mirrored to localStorage so the timer survives a full page refresh
 * or the app being reopened later in the day.
 *
 * Elapsed time is computed from a monotonic timestamp (`runSinceMs`)
 * + an accumulated base (`baseSecs`).  When running, "now - runSinceMs"
 * is added to baseSecs on every tick.  This avoids drift and keeps the
 * clock accurate even if the tab was backgrounded.
 */

export interface Split {
  label: string;
  dur: number;
}

interface StopwatchState {
  elapsed: number;
  running: boolean;
  label: string;
  splits: Split[];
  start: () => void;
  stop: () => void;
  reset: () => void;
  setLabel: (label: string) => void;
}

const STORAGE_KEY = 'hoh:stopwatch:v1';

interface PersistShape {
  baseSecs: number;      // accumulated seconds that finished before current run
  runSinceMs: number | null; // ms timestamp when current run started (null if paused)
  label: string;
  splits: Split[];
}

function loadPersisted(): PersistShape {
  if (typeof window === 'undefined') {
    return { baseSecs: 0, runSinceMs: null, label: '', splits: [] };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { baseSecs: 0, runSinceMs: null, label: '', splits: [] };
    const parsed = JSON.parse(raw) as Partial<PersistShape>;
    return {
      baseSecs: typeof parsed.baseSecs === 'number' ? parsed.baseSecs : 0,
      runSinceMs: typeof parsed.runSinceMs === 'number' ? parsed.runSinceMs : null,
      label: typeof parsed.label === 'string' ? parsed.label : '',
      splits: Array.isArray(parsed.splits) ? parsed.splits.slice(0, 5) : [],
    };
  } catch {
    return { baseSecs: 0, runSinceMs: null, label: '', splits: [] };
  }
}

function savePersisted(state: PersistShape) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private-mode — ignore */
  }
}

const StopwatchContext = createContext<StopwatchState | null>(null);

export function StopwatchProvider({ children }: { children: React.ReactNode }) {
  // Authoritative state, mirrored to localStorage on every change.
  const [baseSecs, setBaseSecs] = useState(0);
  const [runSinceMs, setRunSinceMs] = useState<number | null>(null);
  const [label, setLabelState] = useState('');
  const [splits, setSplits] = useState<Split[]>([]);

  // Tick counter used only to re-render while running — elapsed is
  // recomputed from timestamps each render.
  const [, setTick] = useState(0);
  const hydratedRef = useRef(false);

  // Hydrate from localStorage once on mount (client only).
  useEffect(() => {
    const p = loadPersisted();
    setBaseSecs(p.baseSecs);
    setRunSinceMs(p.runSinceMs);
    setLabelState(p.label);
    setSplits(p.splits);
    hydratedRef.current = true;
  }, []);

  // Persist on every change (after hydration).
  useEffect(() => {
    if (!hydratedRef.current) return;
    savePersisted({ baseSecs, runSinceMs, label, splits });
  }, [baseSecs, runSinceMs, label, splits]);

  // Tick interval — only runs while running.
  useEffect(() => {
    if (runSinceMs === null) return;
    const id = setInterval(() => setTick(t => t + 1), 250);
    return () => clearInterval(id);
  }, [runSinceMs]);

  // Derived elapsed seconds.
  const running = runSinceMs !== null;
  const elapsed = running
    ? baseSecs + Math.floor((Date.now() - runSinceMs) / 1000)
    : baseSecs;

  const start = useCallback(() => {
    setRunSinceMs(prev => (prev === null ? Date.now() : prev));
  }, []);

  const stop = useCallback(() => {
    setRunSinceMs(prevRunSince => {
      if (prevRunSince === null) return null;
      const finalSecs = Math.floor((Date.now() - prevRunSince) / 1000);
      setBaseSecs(prevBase => {
        const total = prevBase + finalSecs;
        if (total > 0) {
          setSplits(prevSplits => {
            const lbl = label.trim() || 'Activity';
            return [{ label: lbl, dur: total }, ...prevSplits.slice(0, 4)];
          });
        }
        return total;
      });
      return null;
    });
  }, [label]);

  const reset = useCallback(() => {
    setRunSinceMs(null);
    setBaseSecs(0);
    setLabelState('');
    setSplits([]);
  }, []);

  const setLabel = useCallback((next: string) => setLabelState(next), []);

  const value: StopwatchState = {
    elapsed,
    running,
    label,
    splits,
    start,
    stop,
    reset,
    setLabel,
  };

  return (
    <StopwatchContext.Provider value={value}>
      {children}
    </StopwatchContext.Provider>
  );
}

export function useStopwatch(): StopwatchState {
  const ctx = useContext(StopwatchContext);
  if (!ctx) {
    throw new Error('useStopwatch must be used inside <StopwatchProvider>');
  }
  return ctx;
}
