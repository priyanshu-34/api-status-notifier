import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, type PublicStatusDto } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';

const statusLabels: Record<string, string> = {
  operational: 'All systems operational',
  partial_outage: 'Partial system outage',
  major_outage: 'Major system outage',
};

export function PublicStatusPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [data, setData] = useState<PublicStatusDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgSlug) return;
    api.public
      .getStatus(orgSlug)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, [orgSlug]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f0f12] text-[#e4e4e7] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-white mb-2">Status page not found</h1>
          <p className="text-[#a1a1aa] text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0f0f12] text-[#e4e4e7] flex items-center justify-center px-4">
        <p className="text-[#a1a1aa]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f12] text-[#e4e4e7]">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold text-white mb-1">{data.orgName}</h1>
        <p className="text-[#a1a1aa] text-sm mb-8">System status</p>

        <div className="rounded-lg border border-[#27272a] bg-[#18181b] p-4 mb-6">
          <div className="flex items-center gap-3">
            <span
              className={`inline-block w-3 h-3 rounded-full ${
                data.overallStatus === 'operational'
                  ? 'bg-emerald-500'
                  : data.overallStatus === 'partial_outage'
                    ? 'bg-amber-500'
                    : 'bg-red-500'
              }`}
            />
            <span className="font-medium text-white">
              {statusLabels[data.overallStatus] ?? data.overallStatus}
            </span>
          </div>
        </div>

        <h2 className="text-sm font-medium text-[#a1a1aa] mb-3">Services</h2>
        <ul className="divide-y divide-[#27272a] rounded-lg border border-[#27272a] bg-[#18181b]">
          {data.services.map((svc) => (
            <li key={svc.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <span className="font-medium text-white">{svc.name}</span>
                {svc.checkedAt && (
                  <p className="text-xs text-[#71717a] mt-0.5">
                    Last checked {new Date(svc.checkedAt).toLocaleString()}
                    {svc.uptime24h != null && ` · ${svc.uptime24h}% uptime (24h)`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {svc.uptime24h != null && (
                  <span className="text-sm text-[#a1a1aa]">{svc.uptime24h}%</span>
                )}
                <StatusBadge
                  status={
                    (svc.status === 'up' || svc.status === 'down' || svc.status === 'slow' || svc.status === 'maintenance'
                      ? svc.status
                      : 'down') as 'up' | 'down' | 'slow' | 'maintenance'
                  }
                />
              </div>
            </li>
          ))}
        </ul>

        {data.incidents && data.incidents.length > 0 && (
          <>
            <h2 className="text-sm font-medium text-[#a1a1aa] mt-8 mb-3">Incidents</h2>
            <ul className="divide-y divide-[#27272a] rounded-lg border border-[#27272a] bg-[#18181b]">
              {data.incidents.map((inc) => (
                <li key={inc.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        inc.status === 'resolved' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    <span className="font-medium text-white">
                      {inc.title || 'Incident'}
                    </span>
                    {inc.status === 'resolved' && inc.resolvedAt && (
                      <span className="text-xs text-[#71717a]">
                        Resolved {new Date(inc.resolvedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {inc.description && (
                    <p className="text-sm text-[#a1a1aa] mt-1">{inc.description}</p>
                  )}
                  {inc.status === 'resolved' && inc.resolveNote && (
                    <p className="text-xs text-[#71717a] mt-1">Note: {inc.resolveNote}</p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
