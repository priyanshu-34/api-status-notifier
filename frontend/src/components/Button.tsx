import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-[#3b82f6] text-white hover:bg-[#2563eb] focus:ring-[#3b82f6]',
  secondary:
    'border border-[#3f3f46] bg-[#27272a] text-[#e4e4e7] hover:bg-[#3f3f46] focus:ring-[#71717a]',
  ghost:
    'text-[#a1a1aa] hover:text-white hover:bg-[#27272a] focus:ring-[#71717a]',
  danger:
    'bg-[#ef4444] text-white hover:bg-[#dc2626] focus:ring-[#ef4444]',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#18181b] disabled:opacity-50 disabled:cursor-not-allowed ${
        variantClasses[variant]
      } ${className}`}
      disabled={disabled}
      {...props}
    />
  );
}
