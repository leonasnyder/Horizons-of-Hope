'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

/**
 * Shared stopwatch state.
 *
 * This lives in a React Context mounted in the root layout so that
 * the timer is NOT unmounted when the user navigates between pages
 * (Scheduler -> Tracker -> Tasks -> Settings etc.). State is also
 * mirrored to localStorage so the timer survives a full page refresh.
 *
 * Elapsed time is computed from a monotonic timestamp (`runSinceMs`)
 * + an accumulated base (`baseSecs`). When running, "now - runSinceMs"
 * is added to baseSecs on every tick. This avoids drift and keeps the
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
  baseSecs: number;
  runSinceMs: number | null;
  label: string;
  splits: Split[];
}

const DEFAULT_STATE: PersistShape = {
  baseSecs: 0,
  runSinceMs: null,
  label: '',
  splits: [],
};

function loadPersisted(): PersistShape {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<PersistShape> | null;
    if (!parsed || typeof parsed !== 'object') return DEFAULT_STATE;
    return {
      baseSecs: typeof parsed.baseSecs === 'number' && Number.isFinite(parsed.baseSecs)
        ? Math.max(0, Math.floor(parsed.baseSecs))
        : 0,
      runSinceMs: typeof parsed.runSinceMs === 'number' && Number.isFinite(parsed.runSinceMs)
        ? parsed.runSinceMs
        : null,
      label: typeof parsed.label === 'string' ? parsed.label : '',
      splits: Array.isArray(parsed.splits)
        ? parsed.splits
            .filter((s): s is Split =>
              !!s && typeof s === 'object'
              && typeof (s as Split).label === 'string'
              && typeof (s as Split).dur === 'number'
              && Number.isFinite((s as Split).dur)
            )
            .slice(0, 5)
        : [],
    };
  } catch {
    return DEFAULT_STATE;
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
  // Authoritative state, mirrored to localStorage after hydration.
  // Always start with DEFAULT_STATE so the server-rendered HTML and
  // the first client render match (avoids React hydration errors).
  const [baseSecs, setBaseSecs] = useState<number>(DEFAULT_STATE.baseSecs);
  const [runSinceMs, setRunSinceMs] = useState<number | null>(DEFAULT_STATE.runSinceMs);
  const [label, setLabelState] = useState<string>(DEFAULT_STATE.label);
  const [splits, setSplits] = useState<Split[]>(DEFAULT_STATE.splits);

  // Ticker — bumps a counter while running so `elapsed` is recomputed.
  const [, setTick] = useState(0);
  const hydratedRef = useRef(false);
  const labelRef = useRef(label);
  useEffect(() => { labelRef.current = label; }, [label]);

  // Hydrate from localStorage once, after first mount, on the client only.
  useEffect(() => {
    const p = loadPersisted();
    setBaseSecs(p.baseSecs);
    setRunSinceMs(p.runSinceMs);
    setLabelState(p.label);
    setSplits(p.splits);
    hydratedRef.current = true;
  }, []);

  // Persist on every change (but not before hydration — otherwise we'd
  // overwrite saved state with the initial defaults).
  useEffect(() => {
    if (!hydratedRef.current) return;
    savePersisted({ baseSecs, runSinceMs, label, splits });
  }, [baseSecs, runSinceMs, label, splits]);

  // Tick interval — only while running.
  useEffect(() => {
    if (runSinceMs === null) return;
    const id = setInterval(() => {
      setTick(t => (t + 1) % 1_000_000);
    }, 250);
    return () => clearInterval(id);
  }, [runSinceMs]);

  // Derived values.
  const running = runSinceMs !== null;
  const elapsed = (() => {
    if (runSinceMs === null) return baseSecs;
    const delta = Math.floor((Date.now() - runSinceMs) / 1000);
    return baseSecs + (delta > 0 ? delta : 0);
  })();

  const start = useCallback(() => {
    setRunSinceMs(prev => (prev === null ? Date.now() : prev));
  }, []);

  const stop = useCallback(() => {
    // Read current runSinceMs & baseSecs off refs so we don't need
    // nested setState updaters (which was crashing in some cases).
    setRunSinceMs(prevRunSince => {
      if (prevRunSince === null) return null;
      const addedSecs = Math.max(0, Math.floor((Date.now() - prevRunSince) / 1000));
      setBaseSecs(prevBase => {
        const total = prevBase + addedSecs;
        if (total > 0) {
          const lbl = (labelRef.current || '').trim() || 'Activity';
          // Queue the split push in a microtask so we're not calling a
          // setter-inside-a-setter (which React tolerates but makes the
          // execution order surprising).
          queueMicrotask(() => {
            setSplits(prev => [{ label: lbl, dur: total }, ...prev].slice(0, 5));
          });
        }
        return total;
      });
      return null;
    });
  }, []);

  const reset = useCallback(() => {
    setRunSinceMs(null);
    setBaseSecs(0);
    setLabelState('');
    setSplits([]);
  }, []);

  const setLabel = useCallback((next: string) => setLabelState(next), []);

  const value = useMemo<StopwatchState>(() => ({
    elapsed,
    running,
    label,
    splits,
    start,
    stop,
    reset,
    setLabel,
  }), [elapsed, running, label, splits, start, stop, reset, setLabel]);

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
