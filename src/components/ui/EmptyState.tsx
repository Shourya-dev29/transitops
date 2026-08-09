// ============================================================
// TransitOps — EmptyState Component
// ============================================================

import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1.5rem',
      textAlign: 'center',
    }}>
      <div style={{
        width: 56,
        height: 56,
        borderRadius: 'var(--radius-lg)',
        background: 'var(--neutral-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1rem',
      }}>
        <Icon size={24} color="var(--neutral)" />
      </div>
      <h3 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: '1.125rem',
        marginBottom: '0.375rem',
        color: 'var(--text-primary)',
      }}>
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: 340 }}>
          {description}
        </p>
      )}
      {action && (
        <button
          className="btn-primary"
          style={{ marginTop: '1rem' }}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
