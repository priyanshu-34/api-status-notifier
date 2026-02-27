import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useOrg } from '../context/OrgContext';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';

export function OrgList() {
  const { orgs, currentOrg, setCurrentOrgId, refreshOrgs } = useOrg();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const org = await api.orgs.create({ name });
      await refreshOrgs();
      setCurrentOrgId(org.id);
      navigate(`/orgs/${org.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-6">Organizations</h1>
      {orgs.length === 0 ? (
        <Card className="mb-6">
          <EmptyState message="You're not in any organization yet. Create one below to get started." />
          <form onSubmit={handleCreate} className="mt-6 max-w-sm space-y-3">
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div>
              <label htmlFor="org-name" className="block text-sm font-medium text-[#a1a1aa] mb-1">
                Organization name
              </label>
              <input
                id="org-name"
                type="text"
                placeholder="My Team"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-[#e4e4e7] placeholder-[#71717a] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
              />
            </div>
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating…' : 'Create organization'}
            </Button>
          </form>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            {orgs.map((org) => (
              <button
                type="button"
                key={org.id}
                onClick={() => {
                  setCurrentOrgId(org.id);
                  navigate(`/orgs/${org.id}`);
                }}
                className={`rounded-lg border p-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:ring-offset-2 focus:ring-offset-[#0f0f12] ${
                  currentOrg?.id === org.id
                    ? 'border-[#3b82f6] bg-[#1e3a5f]/30'
                    : 'border-[#27272a] bg-[#18181b] hover:border-[#3f3f46]'
                }`}
              >
                <span className="font-medium text-white block truncate">{org.name}</span>
                <span className="text-xs text-[#a1a1aa] uppercase mt-1">{org.role}</span>
              </button>
            ))}
          </div>
          <Card>
            <CardHeader title="Create another organization" />
            <form onSubmit={handleCreate} className="max-w-md space-y-3">
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div>
                <label htmlFor="org-name-2" className="block text-sm font-medium text-[#a1a1aa] mb-1">
                  Organization name
                </label>
                <input
                  id="org-name-2"
                  type="text"
                  placeholder="My Team"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-[#e4e4e7] placeholder-[#71717a] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
                />
              </div>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating…' : 'Create organization'}
              </Button>
            </form>
          </Card>
        </>
      )}
    </div>
  );
}
