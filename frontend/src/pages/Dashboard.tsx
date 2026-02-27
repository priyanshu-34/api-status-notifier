import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type StatusItemDto } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { useOrg } from '../context/OrgContext';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { Spinner } from '../components/Spinner';

type UptimeMap = Record<string, { uptimePercent: number; totalChecks: number }>;
type SlaUptimeMap = Record<string, number>;

function displayStatus(ep: StatusItemDto): 'up' | 'down' | 'slow' | 'maintenance' {
  const inMaintenance =
    ep.maintenanceUntil && new Date(ep.maintenanceUntil) > new Date();
  if (inMaintenance) return 'maintenance';
  return (ep.latestCheck?.status as 'up' | 'down' | 'slow') ?? 'down';
}

export function Dashboard() {
  const { orgId } = useParams<{ orgId: string }>();
  const { role } = useOrg();
  const [items, setItems] = useState<StatusItemDto[]>([]);
  const [uptime, setUptime] = useState<UptimeMap>({});
  const [slaUptime, setSlaUptime] = useState<SlaUptimeMap>({});
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    url: '',
    method: 'GET',
    expectedStatus: 200,
    timeoutMs: 10000,
    slowThresholdMs: 5000,
    checkIntervalMinutes: 5,
    tags: '',
    slaTargetPercent: '' as number | '',
    slaWindowDays: 30,
    headers: [] as { key: string; value: string }[],
    authType: 'none' as 'none' | 'basic' | 'bearer',
    authUsername: '',
    authPassword: '',
    authBearerToken: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [maintenanceFor, setMaintenanceFor] = useState<string | null>(null);
  const [maintenanceUntil, setMaintenanceUntil] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('');

  const canEdit = role === 'admin' || role === 'member';

  const load = async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      const data = await api.status(orgId).list(
        tagFilter ? { tag: tagFilter } : undefined,
      );
      setItems(data);
      const u: UptimeMap = {};
      const s: SlaUptimeMap = {};
      await Promise.all([
        ...data.map(async (ep) => {
          const res = await api.status(orgId).uptime(ep.id, 24);
          if (res) u[ep.id] = { uptimePercent: res.uptimePercent, totalChecks: res.totalChecks };
        }),
        ...data
          .filter((ep) => ep.slaTargetPercent != null)
          .map(async (ep) => {
            const hours = (ep.slaWindowDays ?? 30) * 24;
            const res = await api.status(orgId).uptime(ep.id, hours);
            if (res) s[ep.id] = res.uptimePercent;
          }),
      ]);
      setUptime(u);
      setSlaUptime(s);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [orgId, tagFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !canEdit) return;
    setSubmitting(true);
    try {
      const headersObj: Record<string, string> = {};
      form.headers.forEach(({ key, value }) => {
        if (key.trim()) headersObj[key.trim()] = value;
      });
      // Use form values as entered; coerce numbers so we never send NaN
      const n = (v: number, fallback: number) => (Number.isFinite(v) && v > 0 ? v : fallback);
      await api.endpoints(orgId).create({
        name: form.name.trim(),
        url: form.url.trim(),
        method: form.method,
        expectedStatus: n(form.expectedStatus, 200),
        timeoutMs: n(form.timeoutMs, 10000),
        slowThresholdMs: n(form.slowThresholdMs, 5000),
        checkIntervalMinutes: n(form.checkIntervalMinutes, 5),
        tags: form.tags
          ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : undefined,
        slaTargetPercent:
          form.slaTargetPercent !== '' && Number.isFinite(Number(form.slaTargetPercent))
            ? Number(form.slaTargetPercent)
            : undefined,
        slaWindowDays: n(form.slaWindowDays, 30),
        headers: Object.keys(headersObj).length > 0 ? headersObj : undefined,
        authType: form.authType,
        authUsername: form.authType === 'basic' ? form.authUsername : undefined,
        authPassword: form.authType === 'basic' && form.authPassword ? form.authPassword : undefined,
        authBearerToken: form.authType === 'bearer' && form.authBearerToken ? form.authBearerToken : undefined,
      });
      setForm({
        ...form,
        name: '',
        url: '',
        tags: '',
        slaTargetPercent: '',
        headers: [],
        authType: 'none',
        authUsername: '',
        authPassword: '',
        authBearerToken: '',
      });
      setAddOpen(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!orgId || !canEdit || !confirm('Delete this endpoint?')) return;
    await api.endpoints(orgId).delete(id);
    await load();
  };

  const setMaintenance = async (endpointId: string, until: string | null) => {
    if (!orgId || !canEdit) return;
    await api.endpoints(orgId).update(endpointId, { maintenanceUntil: until });
    setMaintenanceFor(null);
    setMaintenanceUntil('');
    await load();
  };

  const applyMaintenancePreset = async (endpointId: string, hours: number) => {
    const d = new Date();
    d.setHours(d.getHours() + hours);
    await setMaintenance(endpointId, d.toISOString());
  };

  return (
    <div>
      <PageHeader
        title="Endpoints"
        actions={
          canEdit && (
            <Button variant="primary" onClick={() => setAddOpen((o) => !o)}>
              {addOpen ? 'Cancel' : 'Add endpoint'}
            </Button>
          )
        }
      />
      {canEdit && addOpen && (
        <Card className="mb-6">
          <CardHeader title="Add endpoint" />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[#a1a1aa] mb-1">Name</label>
                <input
                  required
                  placeholder="API name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#a1a1aa] mb-1">URL</label>
                <input
                  required
                  type="url"
                  placeholder="https://api.example.com/health"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="w-full rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                />
              </div>
            </div>
            <div className="border-t border-[#27272a] pt-4">
              <p className="text-sm font-medium text-[#a1a1aa] mb-2">Check settings</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <label className="block text-xs text-[#71717a] mb-1">Method</label>
                  <select
                    value={form.method}
                    onChange={(e) => setForm({ ...form, method: e.target.value })}
                    className="w-full rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="HEAD">HEAD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#71717a] mb-1">Expected status</label>
                  <input
                    type="number"
                    min={100}
                    max={599}
                    value={form.expectedStatus}
                    onChange={(e) =>
                      setForm({ ...form, expectedStatus: parseInt(e.target.value, 10) })
                    }
                    className="w-full rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#71717a] mb-1">Timeout (ms)</label>
                  <input
                    type="number"
                    min={1000}
                    value={form.timeoutMs}
                    onChange={(e) =>
                      setForm({ ...form, timeoutMs: parseInt(e.target.value, 10) })
                    }
                    className="w-full rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#71717a] mb-1">Slow threshold (ms)</label>
                  <input
                    type="number"
                    min={500}
                    value={form.slowThresholdMs}
                    onChange={(e) =>
                      setForm({ ...form, slowThresholdMs: parseInt(e.target.value, 10) })
                    }
                    className="w-full rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#71717a] mb-1">Interval (min)</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={form.checkIntervalMinutes}
                    onChange={(e) =>
                      setForm({ ...form, checkIntervalMinutes: parseInt(e.target.value, 10) })
                    }
                    className="w-full rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>
              </div>
            </div>
            <div className="border-t border-[#27272a] pt-4">
              <p className="text-sm font-medium text-[#a1a1aa] mb-2">Custom headers</p>
              {form.headers.map((row, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    placeholder="Header name"
                    value={row.key}
                    onChange={(e) => {
                      const next = [...form.headers];
                      next[i] = { ...next[i]!, key: e.target.value };
                      setForm({ ...form, headers: next });
                    }}
                    className="flex-1 rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-sm text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                  <input
                    placeholder="Value"
                    value={row.value}
                    onChange={(e) => {
                      const next = [...form.headers];
                      next[i] = { ...next[i]!, value: e.target.value };
                      setForm({ ...form, headers: next });
                    }}
                    className="flex-1 rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-sm text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        headers: form.headers.filter((_, j) => j !== i),
                      })
                    }
                    className="text-[#71717a] hover:text-red-400 px-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setForm({ ...form, headers: [...form.headers, { key: '', value: '' }] })
                }
                className="text-sm text-[#3b82f6] hover:underline"
              >
                + Add header
              </button>
            </div>
            <div className="border-t border-[#27272a] pt-4">
              <p className="text-sm font-medium text-[#a1a1aa] mb-2">Auth</p>
              <select
                value={form.authType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    authType: e.target.value as 'none' | 'basic' | 'bearer',
                    authUsername: '',
                    authPassword: '',
                    authBearerToken: '',
                  })
                }
                className="rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
              >
                <option value="none">None</option>
                <option value="basic">Basic</option>
                <option value="bearer">Bearer token</option>
              </select>
              {form.authType === 'basic' && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2 max-w-md">
                  <div>
                    <label className="block text-xs text-[#71717a] mb-1">Username</label>
                    <input
                      placeholder="Username"
                      value={form.authUsername}
                      onChange={(e) => setForm({ ...form, authUsername: e.target.value })}
                      className="w-full rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-sm text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#71717a] mb-1">Password</label>
                    <input
                      type="password"
                      placeholder="Password"
                      value={form.authPassword}
                      onChange={(e) => setForm({ ...form, authPassword: e.target.value })}
                      className="w-full rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-sm text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                    />
                  </div>
                </div>
              )}
              {form.authType === 'bearer' && (
                <div className="mt-2 max-w-md">
                  <label className="block text-xs text-[#71717a] mb-1">Bearer token</label>
                  <input
                    type="password"
                    placeholder="Token"
                    value={form.authBearerToken}
                    onChange={(e) => setForm({ ...form, authBearerToken: e.target.value })}
                    className="w-full rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-sm text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#a1a1aa] mb-1">Tags (comma-separated)</label>
              <input
                placeholder="payment, critical"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="w-full max-w-xs rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-[#a1a1aa] mb-1">SLA target % (optional)</label>
                <input
                  type="number"
                  min={90}
                  max={100}
                  step={0.1}
                  placeholder="99.9"
                  value={form.slaTargetPercent === '' ? '' : form.slaTargetPercent}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      slaTargetPercent: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                  className="w-24 rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#a1a1aa] mb-1">SLA window (days)</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={form.slaWindowDays}
                  onChange={(e) =>
                    setForm({ ...form, slaWindowDays: parseInt(e.target.value, 10) || 30 })
                  }
                  className="w-20 rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                />
              </div>
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add endpoint'}
            </Button>
          </form>
        </Card>
      )}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <CardHeader title="Endpoints" />
          <div className="flex items-center gap-2">
            <label className="text-sm text-[#a1a1aa]">Filter by tag:</label>
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-1.5 text-sm text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
            >
              <option value="">All</option>
              {[...new Set(items.flatMap((ep) => ep.tags || []))].sort().map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        {loading && items.length === 0 ? (
          <div className="flex items-center gap-2 py-8 text-[#a1a1aa]">
            <Spinner />
            <span className="text-sm">Loading endpoints…</span>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            message="No endpoints yet."
            action={
              canEdit
                ? { label: 'Add your first endpoint', onClick: () => setAddOpen(true) }
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="min-w-[640px] w-full text-sm">
              <thead>
                <tr className="border-b border-[#27272a]">
                  <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]">Name</th>
                  <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]">URL</th>
                  <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]">Tags</th>
                  <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]">Status</th>
                  <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]">24h uptime</th>
                  <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]">Last check</th>
                  <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]">Response</th>
                  <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((ep) => (
                  <tr
                    key={ep.id}
                    className="border-b border-[#27272a] hover:bg-[#27272a]/50 transition-colors"
                  >
                    <td className="py-3 px-3 font-medium text-white">{ep.name}</td>
                    <td className="py-3 px-3 text-[#a1a1aa] max-w-[200px] truncate" title={ep.url}>
                      {ep.url}
                    </td>
                    <td className="py-3 px-3 text-[#a1a1aa]">
                      {(ep.tags && ep.tags.length) ? ep.tags.join(', ') : '—'}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={displayStatus(ep)} />
                    </td>
                    <td className="py-3 px-3 text-[#a1a1aa]">
                      {uptime[ep.id] ? (
                        <>
                          {uptime[ep.id].uptimePercent}%
                          {ep.slaTargetPercent != null && slaUptime[ep.id] != null && (
                            <span className="block text-xs">
                              {slaUptime[ep.id]! >= ep.slaTargetPercent
                                ? `(target ${ep.slaTargetPercent}%)`
                                : `Below target: ${slaUptime[ep.id]}%`}
                            </span>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-3 text-[#a1a1aa]">
                      {ep.latestCheck?.checkedAt
                        ? new Date(ep.latestCheck.checkedAt).toLocaleString()
                        : '—'}
                    </td>
                    <td className="py-3 px-3 text-[#a1a1aa]">
                      {ep.latestCheck?.responseTimeMs != null
                        ? `${ep.latestCheck.responseTimeMs}ms`
                        : '—'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/orgs/${orgId}/endpoints/${ep.id}/history`}
                          className="text-[#3b82f6] hover:underline text-sm"
                        >
                          History
                        </Link>
                        {canEdit &&
                          (displayStatus(ep) === 'maintenance' ? (
                            <Button
                              variant="ghost"
                              className="text-amber-400 hover:text-amber-300 hover:bg-transparent p-0 h-auto min-w-0 text-sm"
                              onClick={() => setMaintenance(ep.id, null)}
                            >
                              End maintenance
                            </Button>
                          ) : (
                            <>
                              <span className="text-[#71717a]">·</span>
                              <button
                                type="button"
                                className="text-[#a1a1aa] hover:text-white text-sm"
                                onClick={() => setMaintenanceFor(maintenanceFor === ep.id ? null : ep.id)}
                              >
                                Set maintenance
                              </button>
                            </>
                          ))}
                        {canEdit && (
                          <Button
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 hover:bg-transparent p-0 h-auto min-w-0"
                            onClick={() => handleDelete(ep.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                      {canEdit && maintenanceFor === ep.id && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <input
                            type="datetime-local"
                            value={maintenanceUntil}
                            onChange={(e) => setMaintenanceUntil(e.target.value)}
                            className="rounded border border-[#3f3f46] bg-[#27272a] px-2 py-1 text-sm text-[#e4e4e7]"
                          />
                          <Button
                            variant="secondary"
                            className="!py-1 text-sm"
                            onClick={() => {
                              if (maintenanceUntil) {
                                setMaintenance(ep.id, new Date(maintenanceUntil).toISOString());
                              } else {
                                setMaintenanceFor(null);
                              }
                            }}
                          >
                            Schedule
                          </Button>
                          <span className="text-[#71717a] text-xs">or</span>
                          {[1, 2, 4, 8].map((h) => (
                            <button
                              key={h}
                              type="button"
                              className="text-[#3b82f6] hover:underline text-xs"
                              onClick={() => applyMaintenancePreset(ep.id, h)}
                            >
                              {h}h
                            </button>
                          ))}
                          <button
                            type="button"
                            className="text-[#71717a] hover:text-[#a1a1aa] text-xs"
                            onClick={() => setMaintenanceFor(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
