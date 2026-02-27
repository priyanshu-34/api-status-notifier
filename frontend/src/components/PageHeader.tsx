import { Link } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  backTo?: { to: string; label: string };
  actions?: React.ReactNode;
}

export function PageHeader({ title, backTo, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
      <div className="min-w-0">
        {backTo && (
          <Link
            to={backTo.to}
            className="text-sm text-[#a1a1aa] hover:text-white mb-1 inline-block"
          >
            ← {backTo.label}
          </Link>
        )}
        <h1 className="text-xl font-semibold text-white truncate">{title}</h1>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
