import type { CheckResultDto } from '../api/client';

type Status = 'up' | 'down' | 'slow' | 'maintenance';

const variantClasses: Record<Status, string> = {
  up: 'bg-emerald-600/80 text-emerald-100',
  down: 'bg-red-600/80 text-red-100',
  slow: 'bg-amber-600/80 text-amber-100',
  maintenance: 'bg-slate-500/80 text-slate-100',
};

export function StatusBadge({
  status,
}: {
  status: Status | CheckResultDto['status'] | 'maintenance';
}) {
  const s = (status as Status) ?? 'down';
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${variantClasses[s] ?? variantClasses.down}`}
    >
      {s}
    </span>
  );
}
