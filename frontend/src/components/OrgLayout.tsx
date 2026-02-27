import { useEffect } from 'react';
import { Outlet, useParams, Navigate } from 'react-router-dom';
import { useOrg } from '../context/OrgContext';
import { AppShell } from './AppShell';

export function OrgLayout() {
  const { orgId } = useParams<{ orgId: string }>();
  const { orgs, setCurrentOrgId } = useOrg();

  useEffect(() => {
    if (orgId && orgs.some((o) => o.id === orgId)) setCurrentOrgId(orgId);
  }, [orgId, orgs, setCurrentOrgId]);

  if (!orgId) return <Navigate to="/orgs" replace />;
  if (orgs.length > 0 && !orgs.find((o) => o.id === orgId)) {
    return <Navigate to="/orgs" replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
