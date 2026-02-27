export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#3f3f46] border-t-[#3b82f6] ${className}`}
      aria-hidden
    />
  );
}
