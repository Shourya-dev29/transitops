// ============================================================
// TransitOps — ErrorState Component
// ============================================================

import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
}

export default function ErrorState({ error, onRetry }: ErrorStateProps) {
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
        background: 'var(--danger-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1rem',
      }}>
        <AlertTriangle size={24} color="var(--danger)" />
      </div>
      <h3 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: '1.125rem',
        marginBottom: '0.375rem',
        color: 'var(--text-primary)',
      }}>
        Something went wrong
      </h3>
      <p style={{
        fontSize: '0.8125rem',
        color: 'var(--danger)',
        maxWidth: 400,
        marginBottom: onRetry ? '1rem' : 0,
      }}>
        {error}
      </p>
      {onRetry && (
        <button className="btn-secondary" onClick={onRetry}>
          <RefreshCw size={14} />
          Retry
        </button>
      )}
    </div>
  );
}
