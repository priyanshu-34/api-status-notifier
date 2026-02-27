import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  api,
  type NotificationConfigDto,
  type NotificationLogDto,
  type EndpointDto,
} from '../api/client';
import { useOrg } from '../context/OrgContext';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Spinner } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';

type EmailTarget = { email: string; endpointIds: string[] };
type WebhookTarget = { url: string; label: string; endpointIds: string[] };

export function Notifications() {
  const { orgId } = useParams<{ orgId: string }>();
  const { role } = useOrg();
  const [config, setConfig] = useState<NotificationConfigDto | null>(null);
  const [log, setLog] = useState<NotificationLogDto[]>([]);
  const [endpoints, setEndpoints] = useState<EndpointDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    emailTargets: [] as EmailTarget[],
    webhooks: [] as WebhookTarget[],
    notifyOnDown: true,
    notifyOnSlow: true,
    cooldownMinutes: 15,
    digestEnabled: false,
    digestFrequency: 'weekly' as 'daily' | 'weekly',
    digestDayOfWeek: 1,
  });
  const [saving, setSaving] = useState(false);

  function normalizeEmailTargets(c: NotificationConfigDto | null): EmailTarget[] {
    if (!c) return [];
    if (c.emailTargets?.length)
      return c.emailTargets
        .filter((t) => t?.email?.trim())
        .map((t) => ({ email: t.email.trim(), endpointIds: t.endpointIds ?? [] }));
    if (c.emails?.length)
      return c.emails.filter((e) => (e as string)?.trim()).map((e) => ({ email: (e as string).trim(), endpointIds: [] }));
    if (c.email?.trim()) return [{ email: c.email.trim(), endpointIds: [] }];
    return [];
  }
  function normalizeWebhooks(c: NotificationConfigDto | null): WebhookTarget[] {
    if (!c) return [];
    if (c.webhooks?.length)
      return c.webhooks
        .filter((w) => w?.url?.trim())
        .map((w) => ({ url: w.url.trim(), label: w.label?.trim() ?? '', endpointIds: w.endpointIds ?? [] }));
    if (c.webhookUrl?.trim()) return [{ url: c.webhookUrl.trim(), label: '', endpointIds: [] }];
    return [];
  }

  const canEditConfig = role === 'admin' || role === 'member';

  const load = async () => {
    if (!orgId) return;
    try {
      const [c, l, eps] = await Promise.all([
        api.notifications(orgId).getConfig(),
        api.notifications(orgId).getLog(),
        api.endpoints(orgId).list(),
      ]);
      setConfig(c ?? null);
      setLog(l);
      setEndpoints(eps ?? []);
      if (c) {
        setForm({
          emailTargets: normalizeEmailTargets(c),
          webhooks: normalizeWebhooks(c),
          notifyOnDown: c.notifyOnDown,
          notifyOnSlow: c.notifyOnSlow,
          cooldownMinutes: c.cooldownMinutes,
          digestEnabled: c.digestEnabled ?? false,
          digestFrequency: c.digestFrequency ?? 'weekly',
          digestDayOfWeek: c.digestDayOfWeek ?? 1,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [orgId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !canEditConfig) return;
    setSaving(true);
    try {
      const updated = await api.notifications(orgId).updateConfig({
        emailTargets: form.emailTargets
          .filter((t) => t.email.trim())
          .map((t) => ({ email: t.email.trim(), endpointIds: t.endpointIds })),
        webhooks: form.webhooks
          .filter((w) => w.url.trim())
          .map((w) => ({ url: w.url.trim(), label: w.label.trim() || undefined, endpointIds: w.endpointIds })),
        notifyOnDown: form.notifyOnDown,
        notifyOnSlow: form.notifyOnSlow,
        cooldownMinutes: form.cooldownMinutes,
        digestEnabled: form.digestEnabled,
        digestFrequency: form.digestFrequency,
        digestDayOfWeek: form.digestDayOfWeek,
      });
      setConfig(updated);
      setForm({
        emailTargets: normalizeEmailTargets(updated),
        webhooks: normalizeWebhooks(updated),
        notifyOnDown: updated.notifyOnDown,
        notifyOnSlow: updated.notifyOnSlow,
        cooldownMinutes: updated.cooldownMinutes,
        digestEnabled: updated.digestEnabled ?? false,
        digestFrequency: updated.digestFrequency ?? 'weekly',
        digestDayOfWeek: updated.digestDayOfWeek ?? 1,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Notifications" />
      {loading ? (
        <Card>
          <div className="flex items-center gap-2 py-8 text-[#a1a1aa]">
            <Spinner />
            <span className="text-sm">Loading…</span>
          </div>
        </Card>
      ) : (
        <>
          {config != null && canEditConfig && (
            <p className="text-sm text-[#a1a1aa] mb-4">
              Notifications are sent to each email and webhook that is configured for the failing endpoint. You can scope each target to all endpoints or to specific ones. Cooldown applies per endpoint per reason.
            </p>
          )}
          {canEditConfig && (
            <Card className="mb-6">
              <CardHeader title="Config" />
              <form onSubmit={handleSave} className="space-y-8">
                <section>
                  <h3 className="text-sm font-medium text-white mb-1">Emails</h3>
                  <p className="text-xs text-[#71717a] mb-4">Alerts are sent to these addresses. Optionally limit to specific endpoints.</p>
                  <div className="space-y-3">
                    {form.emailTargets.map((target, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-[#27272a] bg-[#18181b] overflow-hidden"
                      >
                        <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <label className="sr-only">Email address</label>
                            <input
                              type="email"
                              placeholder="alerts@example.com"
                              value={target.email}
                              onChange={(e) => {
                                const next = [...form.emailTargets];
                                next[i] = { ...next[i], email: e.target.value };
                                setForm({ ...form, emailTargets: next });
                              }}
                              className="w-full rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2.5 text-sm text-[#e4e4e7] placeholder:text-[#71717a] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
                            />
                          </div>
                          <div className="sm:w-64 shrink-0">
                            <span className="text-xs font-medium text-[#a1a1aa] block mb-2">Scope</span>
                            <label className="flex items-center gap-2 text-sm text-[#e4e4e7] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={target.endpointIds.length === 0}
                                onChange={(e) => {
                                  const next = [...form.emailTargets];
                                  next[i] = { ...next[i], endpointIds: e.target.checked ? [] : (endpoints.length ? [endpoints[0].id] : []) };
                                  setForm({ ...form, emailTargets: next });
                                }}
                                className="rounded border-[#3f3f46] bg-[#27272a] text-[#3b82f6] focus:ring-[#3b82f6] focus:ring-offset-0"
                              />
                              All endpoints
                            </label>
                            {target.endpointIds.length > 0 && endpoints.length === 0 && (
                              <p className="text-xs text-[#71717a] mt-1">Add endpoints on the Dashboard to limit scope.</p>
                            )}
                            {target.endpointIds.length > 0 && endpoints.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {endpoints.map((ep) => (
                                  <label
                                    key={ep.id}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#27272a] border border-[#3f3f46] text-xs text-[#e4e4e7] cursor-pointer hover:border-[#52525b]"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={target.endpointIds.includes(ep.id)}
                                      onChange={(e) => {
                                        const next = [...form.emailTargets];
                                        const ids = e.target.checked
                                          ? [...next[i].endpointIds, ep.id]
                                          : next[i].endpointIds.filter((id) => id !== ep.id);
                                        next[i] = { ...next[i], endpointIds: ids };
                                        setForm({ ...form, emailTargets: next });
                                      }}
                                      className="rounded border-[#3f3f46] text-[#3b82f6] focus:ring-[#3b82f6]"
                                    />
                                    {ep.name}
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setForm((prev) => ({ ...prev, emailTargets: prev.emailTargets.filter((_, j) => j !== i) }));
                            }}
                            className="shrink-0 text-sm text-[#71717a] hover:text-red-400 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setForm({ ...form, emailTargets: [...form.emailTargets, { email: '', endpointIds: [] }] })}
                    >
                      + Add email
                    </Button>
                  </div>
                </section>

                <section className="border-t border-[#27272a] pt-6">
                  <h3 className="text-sm font-medium text-white mb-1">Webhooks</h3>
                  <p className="text-xs text-[#71717a] mb-4">POST alerts to these URLs. Optionally limit to specific endpoints.</p>
                  <div className="space-y-3">
                    {form.webhooks.map((wh, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-[#27272a] bg-[#18181b] overflow-hidden"
                      >
                        <div className="p-4 flex flex-col gap-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <label className="sr-only">Webhook URL</label>
                              <input
                                type="url"
                                placeholder="https://hooks.slack.com/..."
                                value={wh.url}
                                onChange={(e) => {
                                  const next = [...form.webhooks];
                                  next[i] = { ...next[i], url: e.target.value };
                                  setForm({ ...form, webhooks: next });
                                }}
                                className="w-full rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2.5 text-sm text-[#e4e4e7] placeholder:text-[#71717a] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
                              />
                            </div>
                            <div className="sm:w-40 shrink-0">
                              <label className="sr-only">Label</label>
                              <input
                                type="text"
                                placeholder="Label (optional)"
                                value={wh.label}
                                onChange={(e) => {
                                  const next = [...form.webhooks];
                                  next[i] = { ...next[i], label: e.target.value };
                                  setForm({ ...form, webhooks: next });
                                }}
                                className="w-full rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2.5 text-sm text-[#e4e4e7] placeholder:text-[#71717a] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setForm((prev) => ({ ...prev, webhooks: prev.webhooks.filter((_, j) => j !== i) }));
                              }}
                              className="shrink-0 text-sm text-[#71717a] hover:text-red-400 transition-colors sm:self-center"
                            >
                              Remove
                            </button>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-[#a1a1aa] block mb-2">Scope</span>
                            <label className="flex items-center gap-2 text-sm text-[#e4e4e7] cursor-pointer mb-2">
                              <input
                                type="checkbox"
                                checked={wh.endpointIds.length === 0}
                                onChange={(e) => {
                                  const next = [...form.webhooks];
                                  next[i] = { ...next[i], endpointIds: e.target.checked ? [] : (endpoints.length ? [endpoints[0].id] : []) };
                                  setForm({ ...form, webhooks: next });
                                }}
                                className="rounded border-[#3f3f46] bg-[#27272a] text-[#3b82f6] focus:ring-[#3b82f6] focus:ring-offset-0"
                              />
                              All endpoints
                            </label>
                            {wh.endpointIds.length > 0 && endpoints.length === 0 && (
                              <p className="text-xs text-[#71717a] mt-1">Add endpoints on the Dashboard to limit scope.</p>
                            )}
                            {wh.endpointIds.length > 0 && endpoints.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {endpoints.map((ep) => (
                                  <label
                                    key={ep.id}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#27272a] border border-[#3f3f46] text-xs text-[#e4e4e7] cursor-pointer hover:border-[#52525b]"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={wh.endpointIds.includes(ep.id)}
                                      onChange={(e) => {
                                        const next = [...form.webhooks];
                                        const ids = e.target.checked
                                          ? [...next[i].endpointIds, ep.id]
                                          : next[i].endpointIds.filter((id) => id !== ep.id);
                                        next[i] = { ...next[i], endpointIds: ids };
                                        setForm({ ...form, webhooks: next });
                                      }}
                                      className="rounded border-[#3f3f46] text-[#3b82f6] focus:ring-[#3b82f6]"
                                    />
                                    {ep.name}
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setForm({ ...form, webhooks: [...form.webhooks, { url: '', label: '', endpointIds: [] }] })}
                    >
                      + Add webhook
                    </Button>
                  </div>
                </section>
                <section className="border-t border-[#27272a] pt-6">
                  <h3 className="text-sm font-medium text-white mb-3">When to notify</h3>
                  <div className="flex flex-wrap items-center gap-6">
                    <label className="flex items-center gap-2.5 text-sm text-[#e4e4e7] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.notifyOnDown}
                        onChange={(e) => setForm({ ...form, notifyOnDown: e.target.checked })}
                        className="rounded border-[#3f3f46] bg-[#27272a] text-[#3b82f6] focus:ring-[#3b82f6] focus:ring-offset-0"
                      />
                      When endpoint is down
                    </label>
                    <label className="flex items-center gap-2.5 text-sm text-[#e4e4e7] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.notifyOnSlow}
                        onChange={(e) => setForm({ ...form, notifyOnSlow: e.target.checked })}
                        className="rounded border-[#3f3f46] bg-[#27272a] text-[#3b82f6] focus:ring-[#3b82f6] focus:ring-offset-0"
                      />
                      When endpoint is slow
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-[#a1a1aa]">Cooldown</label>
                      <input
                        type="number"
                        min={1}
                        value={form.cooldownMinutes}
                        onChange={(e) =>
                          setForm({ ...form, cooldownMinutes: parseInt(e.target.value, 10) || 1 })
                        }
                        className="w-16 rounded-md border border-[#3f3f46] bg-[#27272a] px-2.5 py-2 text-sm text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
                      />
                      <span className="text-sm text-[#71717a]">min</span>
                    </div>
                  </div>
                </section>

                <section className="border-t border-[#27272a] pt-6">
                  <h3 className="text-sm font-medium text-white mb-2">Digest report</h3>
                  <p className="text-xs text-[#71717a] mb-3">Optional summary email of uptime and incidents.</p>
                  <label className="flex items-center gap-2.5 text-sm text-[#e4e4e7] cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={form.digestEnabled}
                      onChange={(e) => setForm({ ...form, digestEnabled: e.target.checked })}
                      className="rounded border-[#3f3f46] bg-[#27272a] text-[#3b82f6] focus:ring-[#3b82f6] focus:ring-offset-0"
                    />
                    Enable digest email
                  </label>
                  {form.digestEnabled && (
                    <div className="flex flex-wrap items-center gap-4 pl-6">
                      <select
                        value={form.digestFrequency}
                        onChange={(e) =>
                          setForm({ ...form, digestFrequency: e.target.value as 'daily' | 'weekly' })
                        }
                        className="rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-sm text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                      {form.digestFrequency === 'weekly' && (
                        <>
                          <label className="text-sm text-[#a1a1aa]">Day</label>
                          <select
                            value={form.digestDayOfWeek}
                            onChange={(e) =>
                              setForm({ ...form, digestDayOfWeek: parseInt(e.target.value, 10) })
                            }
                            className="rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-sm text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
                          >
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                              <option key={d} value={i}>{d}</option>
                            ))}
                          </select>
                        </>
                      )}
                    </div>
                  )}
                </section>

                <div className="border-t border-[#27272a] pt-6">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              </form>
            </Card>
          )}
          <Card>
            <CardHeader title="Recent notifications" />
            {log.length === 0 ? (
              <EmptyState message="No notifications sent yet." />
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="min-w-[400px] w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#27272a]">
                      <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]">Time</th>
                      <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]">Endpoint</th>
                      <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]">Channel / target</th>
                      <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {log.map((entry) => (
                      <tr key={entry.id} className="border-b border-[#27272a] hover:bg-[#27272a]/50">
                        <td className="py-3 px-3 text-[#a1a1aa]">
                          {new Date(entry.sentAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-[#e4e4e7]">
                          {entry.endpoint?.name ?? entry.endpointId}
                        </td>
                        <td className="py-3 px-3 text-[#a1a1aa]">
                          {entry.target ? `${entry.channel}: ${entry.target}` : entry.channel}
                        </td>
                        <td className="py-3 px-3 text-[#a1a1aa]">{entry.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
