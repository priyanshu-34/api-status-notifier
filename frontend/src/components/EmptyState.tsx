interface EmptyStateProps {
  message: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-[#3f3f46] bg-[#18181b]/50 py-12 px-4 text-center">
      <p className="text-[#a1a1aa] text-sm mb-4">{message}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex items-center rounded-md bg-[#3b82f6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:ring-offset-2 focus:ring-offset-[#18181b]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
