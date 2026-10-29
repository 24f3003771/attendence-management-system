import React from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'green' | 'red' | 'yellow' | 'indigo' | 'blue';
  subtitle?: string;
}

const colorMap: Record<StatCardProps['color'], { bg: string; icon: string; text: string }> = {
  green: { bg: 'bg-green-50', icon: 'text-green-600', text: 'text-green-700' },
  red: { bg: 'bg-red-50', icon: 'text-red-600', text: 'text-red-700' },
  yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-600', text: 'text-yellow-700' },
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', text: 'text-indigo-700' },
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', text: 'text-blue-700' },
};

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtitle }) => {
  const colors = colorMap[color];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center gap-5">
      <div className={`${colors.bg} rounded-xl p-4 flex-shrink-0`}>
        <div className={`${colors.icon} w-7 h-7`}>{icon}</div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-500 truncate">{title}</p>
        <p className={`text-3xl font-bold ${colors.text} mt-0.5`}>{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};

export default StatCard;

