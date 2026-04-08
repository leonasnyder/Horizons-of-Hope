'use client';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, addDays, subDays, isToday, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';

interface DatePickerProps {
  date: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

export default function DatePicker({ date, onChange }: DatePickerProps) {
  const parsed = parseISO(date);
  return (
    <div id="date-picker" className="flex items-center gap-2 flex-wrap">
      <Button
        id="date-picker-prev"
        variant="outline"
        size="icon"
        onClick={() => onChange(format(subDays(parsed, 1), 'yyyy-MM-dd'))}
        aria-label="Previous day"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div id="date-picker-display" className="flex items-center gap-2 min-w-[200px]">
        <Calendar className="h-4 w-4 text-red-600" />
        <span className="font-semibold text-base">
          {format(parsed, 'EEEE, MMMM d, yyyy')}
        </span>
      </div>

      <Button
        id="date-picker-next"
        variant="outline"
        size="icon"
        onClick={() => onChange(format(addDays(parsed, 1), 'yyyy-MM-dd'))}
        aria-label="Next day"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isToday(parsed) && (
        <Button
          id="date-picker-today"
          variant="outline"
          size="sm"
          onClick={() => onChange(format(new Date(), 'yyyy-MM-dd'))}
        >
          Today
        </Button>
      )}
    </div>
  );
}
