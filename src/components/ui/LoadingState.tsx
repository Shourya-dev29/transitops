// ============================================================
// TransitOps — LoadingState Component
// ============================================================

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = 'Loading…' }: LoadingStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1rem',
      gap: '0.75rem',
    }}>
      <div className="spinner" />
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{message}</p>
    </div>
  );
}
