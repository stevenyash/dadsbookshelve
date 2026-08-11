import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  actions?: ReactNode;
}

export function Card({ children, className = '', title, actions }: CardProps) {
  return (
    <div className={`card bg-base-100 shadow-xl ${className}`}>
      {title && (
        <div className="card-body">
          <h2 className="card-title">{title}</h2>
          {children}
        </div>
      )}
      {!title && <div className="card-body">{children}</div>}
      {actions && <div className="card-actions justify-end">{actions}</div>}
    </div>
  );
}

export function CardSimple({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card bg-base-100 shadow-sm border border-base-200 ${className}`}>{children}</div>;
}
