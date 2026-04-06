'use client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface TrendDataPoint {
  date: string;
  accuracy: number;
  total: number;
  correct: number;
}

interface TrendChartProps {
  data: TrendDataPoint[];
  goalColor?: string;
}

export default function TrendChart({ data, goalColor = '#F97316' }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div id="trend-chart-empty" className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No data available for this period
      </div>
    );
  }

  return (
    <div id="trend-chart" className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tickFormatter={d => format(parseISO(d), 'M/d')}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={v => `${v}%`}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(v: number) => [`${v}%`, 'Accuracy']}
            labelFormatter={d => format(parseISO(d as string), 'MMM d, yyyy')}
          />
          <ReferenceLine
            y={80}
            stroke="#22C55E"
            strokeDasharray="4 4"
            label={{ value: '80%', fontSize: 10, fill: '#22C55E' }}
          />
          <Line
            type="monotone"
            dataKey="accuracy"
            stroke={goalColor}
            strokeWidth={2}
            dot={{ fill: goalColor, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
