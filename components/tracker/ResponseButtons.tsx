'use client';
import { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Subcategory {
  id: number;
  label: string;
  response_type: 'correct' | 'incorrect';
}

interface ResponseButtonsProps {
  goalId: number;
  correctSubcats: Subcategory[];
  incorrectSubcats: Subcategory[];
  onLog: (response_type: 'correct' | 'incorrect', subcategory_id: number) => Promise<void>;
}

export default function ResponseButtons({ goalId, correctSubcats, incorrectSubcats, onLog }: ResponseButtonsProps) {
  const [logging, setLogging] = useState(false);
  const [flashedId, setFlashedId] = useState<number | null>(null);

  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  const handleLog = async (type: 'correct' | 'incorrect', subcatId: number) => {
    if (logging) return;
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setLogging(true);
    setFlashedId(subcatId);
    await onLog(type, subcatId);
    setLogging(false);
    flashTimer.current = setTimeout(() => setFlashedId(null), 600);
  };

  const renderGroup = (
    subcats: Subcategory[],
    type: 'correct' | 'incorrect'
  ) => {
    const isCorrect = type === 'correct';
    return (
      <div id={`response-group-${type}-${goalId}`} className="flex-1">
        <p className={cn(
          'text-xs font-semibold uppercase tracking-wide mb-1.5',
          isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
        )}>
          {isCorrect ? '✓ Correct' : '✗ Incorrect'}
        </p>
        {subcats.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No subcategories defined</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {subcats.map(s => {
              const flashed = flashedId === s.id;
              return (
                <button
                  key={s.id}
                  id={`${type}-subcat-${s.id}`}
                  onClick={() => handleLog(type, s.id)}
                  disabled={logging && !flashed}
                  className={cn(
                    'w-full text-left px-3 py-2.5 text-sm rounded-lg border transition-all min-h-[44px] flex items-center gap-2 font-medium',
                    flashed
                      ? isCorrect
                        ? 'bg-green-500 border-green-500 text-white scale-[0.98]'
                        : 'bg-red-500 border-red-500 text-white scale-[0.98]'
                      : isCorrect
                        ? 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-800 text-gray-800 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-green-950 hover:border-green-400'
                        : 'bg-white dark:bg-gray-800 border-red-200 dark:border-red-800 text-gray-800 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-950 hover:border-red-400'
                  )}
                  aria-label={`Record ${type}: ${s.label}`}
                >
                  {flashed
                    ? isCorrect ? <Check className="h-3.5 w-3.5 flex-shrink-0" /> : <X className="h-3.5 w-3.5 flex-shrink-0" />
                    : isCorrect ? <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" /> : <X className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                  }
                  {s.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div id={`response-buttons-${goalId}`} className="flex gap-4">
      {renderGroup(correctSubcats, 'correct')}
      {renderGroup(incorrectSubcats, 'incorrect')}
    </div>
  );
}
