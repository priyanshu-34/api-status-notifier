import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, type OrgRole, type PendingInvitation, type AuditLogEntryDto } from '../api/client';
import { useOrg } from '../context/OrgContext';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Spinner } from '../components/Spinner';

interface MemberRow {
  userId: string;
  email: string;
  name: string | null;
  role: OrgRole;
}

export function Settings() {
  const { orgId } = useParams<{ orgId: string }>();
  const { role, refreshOrgs } = useOrg();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [pending, setPending] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<OrgRole>('member');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'pending' | 'organization' | 'audit'>('members');
  const [auditItems, setAuditItems] = useState<AuditLogEntryDto[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(0);
  const auditLimit = 20;
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [statusPageEnabled, setStatusPageEnabled] = useState(false);
  const [statusPageTitle, setStatusPageTitle] = useState('');
  const [timezone, setTimezone] = useState('');
  const [orgSaving, setOrgSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const isAdmin = role === 'admin';

  const load = async () => {
    if (!orgId || !isAdmin) return;
    try {
      const [memberList, pendingList, org] = await Promise.all([
        api.orgs.members.list(orgId),
        api.orgs.invitations.list(orgId),
        api.orgs.get(orgId),
      ]);
      setMembers(memberList);
      setPending(pendingList);
      setOrgName(org.name ?? '');
      setOrgSlug(org.slug ?? '');
      setStatusPageEnabled(org.statusPageEnabled ?? false);
      setStatusPageTitle(org.statusPageTitle ?? '');
      setTimezone(org.timezone ?? '');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [orgId, isAdmin]);

  const loadAuditLog = async () => {
    if (!orgId) return;
    setAuditLoading(true);
    try {
      const res = await api.auditLog(orgId).list({
        limit: auditLimit,
        offset: auditPage * auditLimit,
      });
      setAuditItems(res.items);
      setAuditTotal(res.total);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit' && orgId) loadAuditLog();
  }, [activeTab, orgId, auditPage]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !isAdmin) return;
    setError('');
    setLastInviteLink(null);
    setAdding(true);
    try {
      const res = await api.orgs.invitations.create(orgId, {
        email: email.trim(),
        role: newMemberRole,
      });
      setEmail('');
      const base = window.location.origin;
      setLastInviteLink(`${base}/invite/${res.token}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setAdding(false);
    }
  };

  const handleCancelInvite = async (invitationId: string) => {
    if (!orgId || !isAdmin || !confirm('Cancel this invitation?')) return;
    try {
      await api.orgs.invitations.cancel(orgId, invitationId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel');
    }
  };

  const handleRemove = async (userId: string) => {
    if (!orgId || !isAdmin || !confirm('Remove this member?')) return;
    try {
      await api.orgs.members.update(orgId, userId, { remove: true });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove');
    }
  };

  const handleRoleChange = async (userId: string, newRole: OrgRole) => {
    if (!orgId || !isAdmin) return;
    try {
      await api.orgs.members.update(orgId, userId, { role: newRole });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const copyInviteLink = () => {
    if (lastInviteLink) {
      navigator.clipboard.writeText(lastInviteLink);
    }
  };

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !isAdmin) return;
    setOrgSaving(true);
    try {
      await api.orgs.update(orgId, {
        name: orgName.trim() || undefined,
        slug: statusPageEnabled ? orgSlug.trim() || undefined : undefined,
        statusPageEnabled,
        statusPageTitle: statusPageEnabled ? (statusPageTitle.trim() || null) : null,
        timezone: timezone.trim() || null,
      });
      await load();
    } finally {
      setOrgSaving(false);
    }
  };

  const handleDeleteOrg = async () => {
    if (!orgId || !isAdmin || deleteConfirm !== orgName) return;
    if (!confirm('Permanently delete this organization? All data will be lost.')) return;
    setDeleting(true);
    try {
      await api.orgs.delete(orgId);
      await refreshOrgs();
      navigate('/orgs');
    } finally {
      setDeleting(false);
      setDeleteConfirm('');
    }
  };

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="Settings" />
        <Card>
          <p className="text-[#a1a1aa] text-sm">Only admins can access organization settings.</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Organization settings" />
      <Card>
        <div className="flex gap-1 border-b border-[#27272a] mb-4 -mx-4 sm:mx-0 px-4 sm:px-0">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'members'
                ? 'border-[#3b82f6] text-white'
                : 'border-transparent text-[#a1a1aa] hover:text-white'
            }`}
          >
            Members
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'pending'
                ? 'border-[#3b82f6] text-white'
                : 'border-transparent text-[#a1a1aa] hover:text-white'
            }`}
          >
            Pending invitations
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('organization')}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'organization'
                ? 'border-[#3b82f6] text-white'
                : 'border-transparent text-[#a1a1aa] hover:text-white'
            }`}
          >
            Organization
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'audit'
                ? 'border-[#3b82f6] text-white'
                : 'border-transparent text-[#a1a1aa] hover:text-white'
            }`}
          >
            Audit log
          </button>
        </div>

        {activeTab === 'members' && (
          <>
            <CardHeader title="Invite by email" />
            <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3 mb-6">
              {error && <p className="w-full text-sm text-red-400">{error}</p>}
              <div className="min-w-0 flex-1">
                <label htmlFor="invite-email" className="block text-xs text-[#71717a] mb-1">
                  Email
                </label>
                <input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                />
              </div>
              <div>
                <label htmlFor="invite-role" className="block text-xs text-[#71717a] mb-1">
                  Role
                </label>
                <select
                  id="invite-role"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as OrgRole)}
                  className="rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                >
                  <option value="viewer">Viewer</option>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <Button type="submit" disabled={adding}>
                {adding ? 'Sending…' : 'Send invitation'}
              </Button>
            </form>
            {lastInviteLink && (
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <input
                  readOnly
                  value={lastInviteLink}
                  className="flex-1 min-w-0 rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-sm text-[#a1a1aa]"
                />
                <Button variant="secondary" onClick={copyInviteLink}>
                  Copy link
                </Button>
              </div>
            )}
            <CardHeader title="Members" />
            {loading ? (
              <div className="flex items-center gap-2 py-6 text-[#a1a1aa]">
                <Spinner />
                <span className="text-sm">Loading…</span>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="min-w-[400px] w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#27272a]">
                      <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]">Email</th>
                      <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]">Name</th>
                      <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]">Role</th>
                      <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.userId} className="border-b border-[#27272a] hover:bg-[#27272a]/50">
                        <td className="py-3 px-3 text-[#e4e4e7]">{m.email}</td>
                        <td className="py-3 px-3 text-[#a1a1aa]">{m.name ?? '—'}</td>
                        <td className="py-3 px-3">
                          <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m.userId, e.target.value as OrgRole)}
                            className="rounded border border-[#3f3f46] bg-[#27272a] px-2 py-1 text-sm text-[#e4e4e7] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="py-3 px-3">
                          <Button
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 p-0 h-auto min-w-0"
                            onClick={() => handleRemove(m.userId)}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'organization' && (
          <>
            <form onSubmit={handleSaveOrg} className="space-y-6">
              <div>
                <CardHeader title="Organization profile" />
                <div className="mt-2 space-y-4 max-w-md">
                  <div>
                    <label htmlFor="org-name" className="block text-xs text-[#71717a] mb-1">
                      Organization name
                    </label>
                    <input
                      id="org-name"
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="My Company"
                      required
                      className="w-full rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                    />
                  </div>
                  <div>
                    <label htmlFor="org-timezone" className="block text-xs text-[#71717a] mb-1">
                      Timezone (for reports and digest)
                    </label>
                    <input
                      id="org-timezone"
                      type="text"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      placeholder="America/New_York"
                      className="w-full rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                    />
                    <p className="mt-1 text-xs text-[#71717a]">
                      IANA timezone (e.g. Europe/London, Asia/Kolkata). Leave empty for UTC.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#27272a] pt-6">
                <CardHeader title="Public status page" />
                <p className="text-sm text-[#a1a1aa] mb-4 mt-2">
                  When enabled, anyone with the link can view your organization&apos;s service status at{' '}
                  <code className="text-[#e4e4e7]">/status/your-slug</code>.
                </p>
                <div className="space-y-4 max-w-md">
                  <label className="flex items-center gap-2 text-sm text-[#e4e4e7]">
                    <input
                      type="checkbox"
                      checked={statusPageEnabled}
                      onChange={(e) => setStatusPageEnabled(e.target.checked)}
                      className="rounded border-[#3f3f46] text-[#3b82f6] focus:ring-[#3b82f6]"
                    />
                    Enable public status page
                  </label>
                  {statusPageEnabled && (
                    <>
                      <div>
                        <label htmlFor="org-slug" className="block text-xs text-[#71717a] mb-1">
                          URL slug (e.g. my-company)
                        </label>
                        <input
                          id="org-slug"
                          type="text"
                          value={orgSlug}
                          onChange={(e) => setOrgSlug(e.target.value)}
                          placeholder="my-company"
                          required={statusPageEnabled}
                          className="w-full rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                        />
                        <p className="mt-1 text-xs text-[#71717a]">
                          Status page: {typeof window !== 'undefined' && (
                            <a
                              href={`${window.location.origin}/status/${orgSlug || 'your-slug'}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#3b82f6] hover:underline"
                            >
                              {window.location.origin}/status/{orgSlug || 'your-slug'}
                            </a>
                          )}
                        </p>
                      </div>
                      <div>
                        <label htmlFor="status-page-title" className="block text-xs text-[#71717a] mb-1">
                          Status page title (optional)
                        </label>
                        <input
                          id="status-page-title"
                          type="text"
                          value={statusPageTitle}
                          onChange={(e) => setStatusPageTitle(e.target.value)}
                          placeholder="Acme API Status"
                          className="w-full rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                        />
                        <p className="mt-1 text-xs text-[#71717a]">
                          Shown at the top of the public status page. Defaults to organization name if empty.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={orgSaving}>
                {orgSaving ? 'Saving…' : 'Save'}
              </Button>
            </form>

            <div className="border-t border-[#27272a] mt-8 pt-8">
              <CardHeader title="Danger zone" />
              <p className="text-sm text-[#a1a1aa] mb-4 mt-2">
                Deleting this organization will permanently remove all endpoints, check history, notifications, members, and invitations. This cannot be undone.
              </p>
              <div className="flex flex-wrap items-end gap-3 max-w-md">
                <div className="flex-1 min-w-0">
                  <label htmlFor="delete-confirm" className="block text-xs text-[#71717a] mb-1">
                    Type <strong className="text-[#e4e4e7]">{orgName}</strong> to confirm
                  </label>
                  <input
                    id="delete-confirm"
                    type="text"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder={orgName}
                    className="w-full rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <Button
                  variant="ghost"
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  disabled={deleteConfirm !== orgName || deleting}
                  onClick={handleDeleteOrg}
                >
                  {deleting ? 'Deleting…' : 'Delete organization'}
                </Button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'audit' && (
          <>
            <CardHeader title="Audit log" />
            <p className="text-sm text-[#a1a1aa] mb-4">
              Who did what in this organization. Read-only.
            </p>
            {auditLoading && auditItems.length === 0 ? (
              <div className="flex items-center gap-2 py-6 text-[#a1a1aa]">
                <Spinner />
                <span className="text-sm">Loading…</span>
              </div>
            ) : auditItems.length === 0 ? (
              <p className="text-sm text-[#a1a1aa] py-4">No audit entries yet.</p>
            ) : (
              <>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="min-w-[560px] w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#27272a]">
                        <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]">Time</th>
                        <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]">Actor</th>
                        <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]">Action</th>
                        <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]">Resource</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditItems.map((entry) => (
                        <tr key={entry.id} className="border-b border-[#27272a] hover:bg-[#27272a]/50">
                          <td className="py-3 px-3 text-[#a1a1aa]">
                            {new Date(entry.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-[#e4e4e7]">
                            {entry.userEmail ?? entry.userName ?? entry.userId}
                          </td>
                          <td className="py-3 px-3 text-[#e4e4e7]">{entry.action}</td>
                          <td className="py-3 px-3 text-[#a1a1aa]">
                            {entry.resourceType}
                            {entry.resourceId ? ` (${entry.resourceId.slice(-8)})` : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-[#71717a]">
                    {auditPage * auditLimit + 1}–{Math.min((auditPage + 1) * auditLimit, auditTotal)} of {auditTotal}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      disabled={auditPage === 0 || auditLoading}
                      onClick={() => setAuditPage((p) => Math.max(0, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={(auditPage + 1) * auditLimit >= auditTotal || auditLoading}
                      onClick={() => setAuditPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'pending' && (
          <>
            <CardHeader title="Pending invitations" />
            {loading ? (
              <div className="flex items-center gap-2 py-6 text-[#a1a1aa]">
                <Spinner />
                <span className="text-sm">Loading…</span>
              </div>
            ) : pending.length === 0 ? (
              <p className="text-sm text-[#a1a1aa] py-4">No pending invitations.</p>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="min-w-[400px] w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#27272a]">
                      <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]">Email</th>
                      <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]">Role</th>
                      <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]">Invited by</th>
                      <th className="text-left py-3 px-3 font-medium text-[#a1a1aa]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((inv) => (
                      <tr key={inv.id} className="border-b border-[#27272a] hover:bg-[#27272a]/50">
                        <td className="py-3 px-3 text-[#e4e4e7]">{inv.inviteeEmail}</td>
                        <td className="py-3 px-3 text-[#a1a1aa]">{inv.role}</td>
                        <td className="py-3 px-3 text-[#a1a1aa]">{inv.inviterEmail}</td>
                        <td className="py-3 px-3">
                          <Button
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 p-0 h-auto min-w-0"
                            onClick={() => handleCancelInvite(inv.id)}
                          >
                            Cancel
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
