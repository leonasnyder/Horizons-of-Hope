'use client';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SubcatDataPoint {
  subcategory_id: number | null;
  label: string | null;
  response_type: 'correct' | 'incorrect';
  count: number;
  goal_id: number;
}

interface SubcategoryBreakdownProps {
  data: SubcatDataPoint[];
  type: 'correct' | 'incorrect';
}

const COLORS = {
  correct: ['#22C55E', '#16A34A', '#4ADE80', '#86EFAC', '#BBF7D0'],
  incorrect: ['#EF4444', '#DC2626', '#F87171', '#FCA5A5', '#FECACA'],
};

export default function SubcategoryBreakdown({ data, type }: SubcategoryBreakdownProps) {
  const filtered = data.filter(d => d.response_type === type);

  if (filtered.length === 0) {
    return (
      <div id={`subcat-breakdown-${type}-empty`} className="flex items-center justify-center h-32 text-gray-400 text-sm">
        No {type} responses yet
      </div>
    );
  }

  const chartData = filtered.map(d => ({
    name: d.label ?? 'Unknown',
    value: d.count,
  }));

  return (
    <div id={`subcat-breakdown-${type}`} className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={35}
            outerRadius={65}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell key={index} fill={COLORS[type][index % COLORS[type].length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => [v, 'Responses']} />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
