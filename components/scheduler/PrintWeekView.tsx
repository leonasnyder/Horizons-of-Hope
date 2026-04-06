import React from 'react';
import { format, parseISO } from 'date-fns';
import { formatTime, getWeekDates } from '@/lib/utils';

interface PrintWeekViewProps {
  weekStart: string;
  entriesByDate: Record<string, Array<{ time_slot: string; activity_name: string }>>;
}

const PrintWeekView = React.forwardRef<HTMLDivElement, PrintWeekViewProps>(
  ({ weekStart, entriesByDate }, ref) => {
    const days = getWeekDates(weekStart);
    const weekEnd = format(days[6], 'MMMM d, yyyy');

    return (
      <div ref={ref} id="print-week-view" style={{ fontFamily: 'Arial, sans-serif' }}>
        <style>{`
          @page { size: letter landscape; margin: 0.5in; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            #print-week-view table { width: 100%; border-collapse: collapse; font-size: 8pt; }
            #print-week-view th, #print-week-view td { border: 1px solid #ccc; padding: 4px; text-align: left; vertical-align: top; }
            #print-week-view th { background-color: #f97316 !important; color: white !important; }
          }
        `}</style>

        <div style={{ marginBottom: '12px' }}>
          <h1 style={{ fontSize: '16pt', fontWeight: 'bold', color: '#f97316', margin: '0 0 2px 0' }}>
            Horizons of Hope — Weekly Schedule
          </h1>
          <p style={{ fontSize: '10pt', color: '#555', margin: 0 }}>
            {format(parseISO(weekStart), 'MMMM d')} – {weekEnd}
          </p>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
          <thead>
            <tr>
              {days.map(d => (
                <th key={d.toISOString()} style={{ width: '14.28%', padding: '4px', border: '1px solid #ccc', backgroundColor: '#f97316', color: 'white' }}>
                  {format(d, 'EEE M/d')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {days.map(d => {
                const dateStr = format(d, 'yyyy-MM-dd');
                const dayEntries = entriesByDate[dateStr] ?? [];
                return (
                  <td key={dateStr} style={{ padding: '4px', border: '1px solid #ccc', verticalAlign: 'top', minHeight: '200px' }}>
                    {dayEntries.map((e, i) => (
                      <div key={i} style={{ marginBottom: '3px', fontSize: '8pt' }}>
                        <strong>{formatTime(e.time_slot)}</strong> – {e.activity_name}
                      </div>
                    ))}
                    {dayEntries.length === 0 && (
                      <div style={{ color: '#ccc', fontSize: '7pt' }}>—</div>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: '16px', fontSize: '7pt', color: '#aaa', textAlign: 'center' }}>
          Horizons of Hope · Page 1
        </div>
      </div>
    );
  }
);
PrintWeekView.displayName = 'PrintWeekView';
export default PrintWeekView;
