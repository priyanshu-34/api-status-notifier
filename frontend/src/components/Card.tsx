import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-[#27272a] bg-[#18181b] p-4 sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  className?: string;
}

export function CardHeader({ title, className = '' }: CardHeaderProps) {
  return (
    <h2 className={`text-sm font-medium text-white mb-3 ${className}`}>
      {title}
    </h2>
  );
}
