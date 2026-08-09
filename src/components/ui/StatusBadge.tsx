// ============================================================
// TransitOps — StatusBadge Component
// ============================================================

import { STATUS_COLORS } from '@shared/constants';

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status] || { bg: '#F0EFED', text: '#6B6660', label: status };

  return (
    <span
      className="status-badge"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {colors.label}
    </span>
  );
}
