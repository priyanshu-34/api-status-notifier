import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, type CheckResultDto } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Spinner } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';

export function History() {
  const { orgId, endpointId } = useParams<{ orgId: string; endpointId: string }>();
  const [endpointName, setEndpointName] = useState<string>('');
  const [results, setResults] = useState<CheckResultDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    if (!orgId || !endpointId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [statusList, history] = await Promise.all([
          api.status(orgId).list(),
          api.status(orgId).history(endpointId, { limit, offset: 0 }),
        ]);
        if (cancelled) return;
        const ep = statusList.find((e) => e.id === endpointId);
        setEndpointName(ep?.name ?? 'Endpoint');
        setResults(history.results);
        setTotal(history.total);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, endpointId]);

  const loadPage = async (offset: number) => {
    if (!orgId || !endpointId) return;
    const history = await api.status(orgId).history(endpointId, { limit, offset });
    setResults(history.results);
    setPage(Math.floor(offset / limit));
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <PageHeader
        title={endpointName ? `History: ${endpointName}` : 'History'}
        backTo={{ to: `/orgs/${orgId}`, label: 'Dashboard' }}
      />
      {loading && results.length === 0 ? (
        <Card>
          <div className="flex items-center gap-2 py-8 text-[#a1a1aa]">
            <Spinner />
            <span className="text-sm">Loading history…</span>
          </div>
        </Card>
      ) : results.length === 0 ? (
        <Card>
          <EmptyState message="No check history yet." />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="min-w-[500px] w-full text-sm">
              <thead>
                <tr className="border-b border-[#27272a]">
                  <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]">Status</th>
                  <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]">HTTP</th>
                  <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]">Response time</th>
                  <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]">Checked at</th>
                  <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]">Error</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} className="border-b border-[#27272a] hover:bg-[#27272a]/50">
                    <td className="py-3 px-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-3 px-3 text-[#e4e4e7]">{r.statusCode ?? '—'}</td>
                    <td className="py-3 px-3 text-[#a1a1aa]">
                      {r.responseTimeMs != null ? `${r.responseTimeMs}ms` : '—'}
                    </td>
                    <td className="py-3 px-3 text-[#a1a1aa]">
                      {new Date(r.checkedAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-red-400 max-w-[200px] truncate" title={r.errorMessage ?? undefined}>
                      {r.errorMessage ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Button
                variant="secondary"
                disabled={page <= 0}
                onClick={() => loadPage((page - 1) * limit)}
              >
                Previous
              </Button>
              <span className="text-sm text-[#a1a1aa]">
                Page {page + 1} of {totalPages} ({total} total)
              </span>
              <Button
                variant="secondary"
                disabled={page >= totalPages - 1}
                onClick={() => loadPage((page + 1) * limit)}
              >
                Next
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
