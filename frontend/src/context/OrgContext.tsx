import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { api, type OrgWithRole } from '../api/client';

interface OrgContextValue {
  orgs: OrgWithRole[];
  currentOrg: OrgWithRole | null;
  setCurrentOrgId: (id: string | null) => void;
  refreshOrgs: () => Promise<void>;
  role: 'admin' | 'member' | 'viewer' | null;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: ReactNode }) {
  const [orgs, setOrgs] = useState<OrgWithRole[]>([]);
  const [currentOrgId, setCurrentOrgIdState] = useState<string | null>(null);

  const refreshOrgs = useCallback(async () => {
    try {
      const list = await api.orgs.list();
      setOrgs(list);
      setCurrentOrgIdState((prev) => {
        if (list.length === 0) return null;
        if (!prev || !list.find((o) => o.id === prev)) return list[0].id;
        return prev;
      });
    } catch {
      setOrgs([]);
      setCurrentOrgIdState(null);
    }
  }, []);

  useEffect(() => {
    refreshOrgs();
  }, [refreshOrgs]);

  const setCurrentOrgId = useCallback((id: string | null) => {
    setCurrentOrgIdState(id);
  }, []);

  const currentOrg = currentOrgId ? orgs.find((o) => o.id === currentOrgId) ?? null : null;
  const role = currentOrg?.role ?? null;

  return (
    <OrgContext.Provider
      value={{
        orgs,
        currentOrg,
        setCurrentOrgId,
        refreshOrgs,
        role,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used within OrgProvider');
  return ctx;
}
