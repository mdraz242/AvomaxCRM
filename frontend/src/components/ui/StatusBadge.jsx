import { getStatusBadgeStyle } from '../../utils/statusColors.js';

export default function StatusBadge({ status, className = '' }) {
  const label = status || 'Not Started';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${getStatusBadgeStyle(label)} ${className}`}
    >
      {label}
    </span>
  );
}

