import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, type StatusItemDto } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Spinner } from '../components/Spinner';

export function StatusPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [items, setItems] = useState<StatusItemDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      const data = await api.status(orgId).list();
      if (!cancelled) setItems(data);
    })().finally(() => {
      if (!cancelled) setLoading(false);
    });
    const t = setInterval(async () => {
      const data = await api.status(orgId).list();
      if (!cancelled) setItems(data);
    }, 30000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [orgId]);

  const inMaintenance = (ep: StatusItemDto) =>
    ep.maintenanceUntil && new Date(ep.maintenanceUntil) > new Date();
  const displayStatus = (ep: StatusItemDto) =>
    inMaintenance(ep) ? 'maintenance' : (ep.latestCheck?.status ?? 'down');
  const allUp =
    items.length > 0 &&
    items.every((ep) => inMaintenance(ep) || ep.latestCheck?.status === 'up');
  const anyDown = items.some((ep) => !inMaintenance(ep) && ep.latestCheck?.status === 'down');
  const operational = items.filter(
    (ep) => inMaintenance(ep) || ep.latestCheck?.status === 'up',
  ).length;

  return (
    <div>
      <PageHeader title="Status" />
      {loading && items.length === 0 ? (
        <Card>
          <div className="flex items-center gap-2 py-8 text-[#a1a1aa]">
            <Spinner />
            <span className="text-sm">Loading status…</span>
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="rounded-lg border border-[#27272a] bg-[#18181b] px-4 py-3">
              {loading ? (
                <span className="text-[#a1a1aa] text-sm">Checking…</span>
              ) : (
                <>
                  <StatusBadge
                    status={
                      allUp ? 'up' : anyDown ? 'down' : items.some(inMaintenance) ? 'maintenance' : 'slow'
                    }
                  />
                  <span className="ml-2 text-sm text-[#a1a1aa]">
                    {operational} / {items.length} systems operational
                  </span>
                </>
              )}
            </div>
          </div>
          <Card>
            <ul className="divide-y divide-[#27272a]">
              {items.map((ep) => (
                <li key={ep.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={displayStatus(ep) as 'up' | 'down' | 'slow' | 'maintenance'} />
                    <span className="font-medium text-white">{ep.name}</span>
                  </div>
                  <div className="mt-1 text-sm text-[#71717a]">
                    {ep.latestCheck?.checkedAt
                      ? `Last checked ${new Date(ep.latestCheck.checkedAt).toLocaleString()}`
                      : 'Not checked yet'}
                    {ep.latestCheck?.responseTimeMs != null &&
                      ` · ${ep.latestCheck.responseTimeMs}ms`}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
