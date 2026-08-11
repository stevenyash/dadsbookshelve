import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'neutral' | 'primary' | 'success' | 'warning' | 'error';
  className?: string;
}

export function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  const variants = {
    neutral: 'badge-neutral',
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
  };

  return <span className={`badge ${variants[variant]} ${className}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const getVariant = (s: string): 'neutral' | 'primary' | 'success' | 'warning' | 'error' => {
    const lower = s?.toLowerCase();
    if (lower === 'pending') return 'warning';
    if (lower === 'paid') return 'success';
    if (lower === 'processing' || lower === 'queued') return 'primary';
    if (lower === 'converted' || lower === 'completed' || lower === 'link_sent') return 'success';
    if (lower === 'failed') return 'error';
    return 'neutral';
  };

  return <Badge variant={getVariant(status)}>{status?.toUpperCase()}</Badge>;
}
