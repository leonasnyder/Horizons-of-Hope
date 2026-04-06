'use client';
import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { formatTime, getWeekDates } from '@/lib/utils';
import { toast } from 'sonner';

interface ScheduleEntry {
  time_slot: string; activity_name: string; category: string | null; notes: string | null;
}

interface ExportDayDocProps {
  date: string;
  entries: ScheduleEntry[];
}

export function ExportDayDocButton({ date, entries }: ExportDayDocProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType } = await import('docx');

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: 'Horizons of Hope — Daily Schedule',
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              children: [new TextRun({ text: format(parseISO(date), 'EEEE, MMMM d, yyyy'), size: 24 })],
            }),
            new Paragraph({ text: '' }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: ['Time', 'Activity', 'Category', 'Notes'].map(h =>
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
                    })
                  ),
                }),
                ...entries.map(e =>
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph(formatTime(e.time_slot))] }),
                      new TableCell({ children: [new Paragraph(e.activity_name)] }),
                      new TableCell({ children: [new Paragraph(e.category ?? '')] }),
                      new TableCell({ children: [new Paragraph(e.notes ?? '')] }),
                    ],
                  })
                ),
              ],
            }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `schedule-${date}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Word document downloaded');
    } catch (e) {
      toast.error('Export failed: ' + String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button id="export-day-doc" variant="outline" size="sm" onClick={handleExport} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
      Word Doc
    </Button>
  );
}

interface WeekScheduleEntry {
  time_slot: string; activity_name: string; category?: string | null; notes?: string | null;
}

interface ExportWeekDocProps {
  weekStart: string;
  entriesByDate: Record<string, WeekScheduleEntry[]>;
}

export function ExportWeekDocButton({ weekStart, entriesByDate }: ExportWeekDocProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType } = await import('docx');
      const days = getWeekDates(weekStart);

      const doc = new Document({
        sections: [{
          properties: { page: { size: { orientation: 'landscape' as const } } },
          children: [
            new Paragraph({
              text: 'Horizons of Hope — Weekly Schedule',
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              children: [new TextRun({
                text: `${format(parseISO(weekStart), 'MMMM d')} – ${format(days[6], 'MMMM d, yyyy')}`,
                size: 24,
              })],
            }),
            new Paragraph({ text: '' }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: days.map(d =>
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: format(d, 'EEE M/d'), bold: true })],
                      })],
                    })
                  ),
                }),
                new TableRow({
                  children: days.map(d => {
                    const dateStr = format(d, 'yyyy-MM-dd');
                    const dayEntries = entriesByDate[dateStr] ?? [];
                    return new TableCell({
                      children: dayEntries.length > 0
                        ? dayEntries.map(e => new Paragraph(`${formatTime(e.time_slot)} – ${e.activity_name}`))
                        : [new Paragraph('')],
                    });
                  }),
                }),
              ],
            }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `week-schedule-${weekStart}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Word document downloaded');
    } catch (e) {
      toast.error('Export failed: ' + String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button id="export-week-doc" variant="outline" size="sm" onClick={handleExport} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
      Word Doc
    </Button>
  );
}
