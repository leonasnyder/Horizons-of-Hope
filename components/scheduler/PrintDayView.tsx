import React from 'react';
import { format, parseISO } from 'date-fns';
import { formatTime } from '@/lib/utils';

interface PrintDayViewProps {
  date: string;
  entries: Array<{
    id: number;
    time_slot: string;
    duration_minutes: number;
    notes: string | null;
    activity_name: string;
    category: string | null;
  }>;
}

const PrintDayView = React.forwardRef<HTMLDivElement, PrintDayViewProps>(
  ({ date, entries }, ref) => {
    return (
      <div ref={ref} id="print-day-view" style={{ fontFamily: 'Arial, sans-serif', color: '#000' }}>
        <style>{`
          @page { size: letter portrait; margin: 0.75in; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            #print-day-view table { width: 100%; border-collapse: collapse; }
            #print-day-view th, #print-day-view td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 11pt; }
            #print-day-view th { background-color: #f97316 !important; color: white !important; }
            #print-day-view tr td { min-height: 0.6in; }
            #print-day-view .notes-col { min-height: 0.6in; height: 0.6in; }
          }
        `}</style>

        <div style={{ marginBottom: '16px' }}>
          <h1 style={{ fontSize: '18pt', fontWeight: 'bold', color: '#f97316', margin: '0 0 4px 0' }}>
            Horizons of Hope — Daily Schedule
          </h1>
          <p style={{ fontSize: '12pt', color: '#555', margin: 0 }}>
            {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ width: '80px', padding: '6px 8px', border: '1px solid #ccc', backgroundColor: '#f97316', color: 'white' }}>Time</th>
              <th style={{ width: '180px', padding: '6px 8px', border: '1px solid #ccc', backgroundColor: '#f97316', color: 'white' }}>Activity</th>
              <th style={{ width: '100px', padding: '6px 8px', border: '1px solid #ccc', backgroundColor: '#f97316', color: 'white' }}>Category</th>
              <th style={{ padding: '6px 8px', border: '1px solid #ccc', backgroundColor: '#f97316', color: 'white' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr key={entry.id} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ padding: '6px 8px', border: '1px solid #ccc', fontSize: '11pt' }}>{formatTime(entry.time_slot)}</td>
                <td style={{ padding: '6px 8px', border: '1px solid #ccc', fontSize: '11pt' }}>{entry.activity_name}</td>
                <td style={{ padding: '6px 8px', border: '1px solid #ccc', fontSize: '11pt' }}>{entry.category ?? ''}</td>
                <td className="notes-col" style={{ padding: '6px 8px', border: '1px solid #ccc', fontSize: '11pt', minHeight: '0.6in', height: '0.6in' }}>
                  {entry.notes ?? ''}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '12px 8px', border: '1px solid #ccc', textAlign: 'center', color: '#999' }}>
                  No activities scheduled
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={{ marginTop: 'auto', paddingTop: '24px', fontSize: '8pt', color: '#aaa', textAlign: 'center' }}>
          Horizons of Hope · Page 1
        </div>
      </div>
    );
  }
);
PrintDayView.displayName = 'PrintDayView';
export default PrintDayView;
