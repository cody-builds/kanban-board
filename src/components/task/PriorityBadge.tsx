import { Priority } from '@/types';

const PRIORITY_CONFIG: Record<Priority, { label: string; className: string }> = {
  high: {
    label: 'High',
    className: 'bg-red-100 text-red-700 border-red-200',
  },
  medium: {
    label: 'Medium',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  low: {
    label: 'Low',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
};

interface PriorityBadgeProps {
  priority: Priority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${config.className}`}
    >
      {config.label}
    </span>
  );
}
