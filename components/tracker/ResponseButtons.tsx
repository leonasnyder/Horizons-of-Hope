'use client';
import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

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
  const [correctOpen, setCorrectOpen] = useState(false);
  const [incorrectOpen, setIncorrectOpen] = useState(false);
  const [logging, setLogging] = useState(false);

  const handleLog = async (type: 'correct' | 'incorrect', subcatId: number) => {
    setLogging(true);
    await onLog(type, subcatId);
    setLogging(false);
    setCorrectOpen(false);
    setIncorrectOpen(false);
  };

  return (
    <div id={`response-buttons-${goalId}`} className="flex gap-3">
      <Popover open={correctOpen} onOpenChange={setCorrectOpen}>
        <PopoverTrigger asChild>
          <Button
            id={`response-correct-btn-${goalId}`}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white min-h-[52px] text-base font-semibold focus:ring-green-400"
            disabled={logging}
          >
            <Check className="h-5 w-5 mr-2" /> Correct
          </Button>
        </PopoverTrigger>
        <PopoverContent id={`response-correct-popover-${goalId}`} className="w-64 p-2" align="start">
          <p className="text-xs font-semibold text-gray-500 mb-2 px-1 uppercase tracking-wide">Select response type:</p>
          {correctSubcats.length === 0 ? (
            <p className="text-xs text-gray-400 px-2 py-1">No subcategories defined</p>
          ) : (
            correctSubcats.map(s => (
              <button
                key={s.id}
                id={`correct-subcat-${s.id}`}
                onClick={() => handleLog('correct', s.id)}
                className="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-green-50 dark:hover:bg-green-950 transition-colors min-h-[44px] flex items-center gap-2"
              >
                <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                {s.label}
              </button>
            ))
          )}
        </PopoverContent>
      </Popover>

      <Popover open={incorrectOpen} onOpenChange={setIncorrectOpen}>
        <PopoverTrigger asChild>
          <Button
            id={`response-incorrect-btn-${goalId}`}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white min-h-[52px] text-base font-semibold focus:ring-red-400"
            disabled={logging}
          >
            <X className="h-5 w-5 mr-2" /> Incorrect
          </Button>
        </PopoverTrigger>
        <PopoverContent id={`response-incorrect-popover-${goalId}`} className="w-64 p-2" align="start">
          <p className="text-xs font-semibold text-gray-500 mb-2 px-1 uppercase tracking-wide">Select response type:</p>
          {incorrectSubcats.length === 0 ? (
            <p className="text-xs text-gray-400 px-2 py-1">No subcategories defined</p>
          ) : (
            incorrectSubcats.map(s => (
              <button
                key={s.id}
                id={`incorrect-subcat-${s.id}`}
                onClick={() => handleLog('incorrect', s.id)}
                className="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors min-h-[44px] flex items-center gap-2"
              >
                <X className="h-3 w-3 text-red-500 flex-shrink-0" />
                {s.label}
              </button>
            ))
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
