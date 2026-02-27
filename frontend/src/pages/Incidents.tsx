import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, type IncidentDto } from '../api/client';
import { useOrg } from '../context/OrgContext';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Spinner } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';

export function Incidents() {
  const { orgId } = useParams<{ orgId: string }>();
  const { role } = useOrg();
  const [items, setItems] = useState<IncidentDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState<Record<string, string>>({});

  const canEdit = role === 'admin' || role === 'member';

  const load = async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      const res = await api.incidents(orgId).list({
        status: filter === 'all' ? undefined : filter,
        limit: 50,
        offset: 0,
      });
      setItems(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [orgId, filter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !canEdit) return;
    setSubmitting(true);
    try {
      await api.incidents(orgId).create({
        title: form.title.trim() || undefined,
        description: form.description.trim() || undefined,
      });
      setForm({ title: '', description: '' });
      setCreateOpen(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (id: string) => {
    if (!orgId || !canEdit) return;
    setResolvingId(id);
    try {
      const note = resolveNotes[id]?.trim();
      await api.incidents(orgId).resolve(id, { note: note || undefined });
      setResolveNotes((prev) => ({ ...prev, [id]: '' }));
      await load();
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Incidents"
        actions={
          canEdit && (
            <Button variant="primary" onClick={() => setCreateOpen((o) => !o)}>
              {createOpen ? 'Cancel' : 'Start incident'}
            </Button>
          )
        }
      />
      {canEdit && createOpen && (
        <Card className="mb-6">
          <CardHeader title="New incident" />
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#a1a1aa] mb-1">Title</label>
              <input
                placeholder="e.g. Payment API degraded"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#a1a1aa] mb-1">Description (optional)</label>
              <textarea
                placeholder="What happened?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create'}
            </Button>
          </form>
        </Card>
      )}
      <Card>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm text-[#a1a1aa]">Filter:</span>
          {(['all', 'open', 'resolved'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-sm ${
                filter === f
                  ? 'bg-[#3b82f6] text-white'
                  : 'bg-[#27272a] text-[#a1a1aa] hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f === 'open' ? 'Open' : 'Resolved'}
            </button>
          ))}
        </div>
        {loading && items.length === 0 ? (
          <div className="flex items-center gap-2 py-8 text-[#a1a1aa]">
            <Spinner />
            <span className="text-sm">Loading…</span>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            message="No incidents."
            action={
              canEdit
                ? { label: 'Start an incident', onClick: () => setCreateOpen(true) }
                : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-[#27272a]">
            {items.map((inc) => (
              <li key={inc.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      inc.status === 'resolved' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <span className="font-medium text-white">
                    {inc.title || 'Incident'}
                  </span>
                  <span className="text-xs text-[#71717a]">
                    {new Date(inc.startedAt).toLocaleString()}
                  </span>
                  {inc.status === 'resolved' && inc.resolvedAt && (
                    <span className="text-xs text-[#71717a]">
                      · Resolved {new Date(inc.resolvedAt).toLocaleString()}
                    </span>
                  )}
                </div>
                {inc.description && (
                  <p className="text-sm text-[#a1a1aa] mt-1">{inc.description}</p>
                )}
                {inc.status === 'open' && canEdit && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="Resolve note (optional)"
                      value={resolveNotes[inc.id] ?? ''}
                      onChange={(e) =>
                        setResolveNotes((prev) => ({ ...prev, [inc.id]: e.target.value }))
                      }
                      className="rounded border border-[#3f3f46] bg-[#27272a] px-2 py-1 text-sm text-[#e4e4e7] w-64"
                    />
                    <Button
                      variant="secondary"
                      className="!py-1"
                      disabled={resolvingId === inc.id}
                      onClick={() => handleResolve(inc.id)}
                    >
                      {resolvingId === inc.id ? 'Resolving…' : 'Resolve'}
                    </Button>
                  </div>
                )}
                {inc.status === 'resolved' && inc.resolveNote && (
                  <p className="text-xs text-[#71717a] mt-1">Note: {inc.resolveNote}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
