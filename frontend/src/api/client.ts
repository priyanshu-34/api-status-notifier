const BASE = import.meta.env.VITE_API_URL || '/api';

export function getToken(): string | null {
  return localStorage.getItem('access_token');
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('access_token', token);
  else localStorage.removeItem('access_token');
}

async function request<T>(
  path: string,
  options?: RequestInit & { params?: Record<string, string> },
): Promise<T> {
  let url = `${BASE}${path}`;
  if (options?.params) {
    const search = new URLSearchParams(options.params).toString();
    if (search) url += `?${search}`;
  }
  const { params: _, ...fetchOptions } = options ?? {};
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...fetchOptions, headers });
  if (res.status === 401) {
    setToken(null);
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type AuthTypeDto = 'none' | 'basic' | 'bearer';

export interface EndpointDto {
  id: string;
  name: string;
  url: string;
  method: string;
  expectedStatus: number;
  timeoutMs: number;
  slowThresholdMs: number;
  checkIntervalMinutes: number;
  maintenanceUntil: string | null;
  tags: string[];
  slaTargetPercent: number | null;
  slaWindowDays: number;
  headers?: Record<string, string> | null;
  authType?: AuthTypeDto;
  authUsername?: string | null;
  authPassword?: string | null;
  authBearerToken?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckResultDto {
  id: string;
  endpointId: string;
  status: 'up' | 'down' | 'slow';
  statusCode: number | null;
  responseTimeMs: number | null;
  errorMessage: string | null;
  checkedAt: string;
}

export interface StatusItemDto extends EndpointDto {
  latestCheck: {
    status: string;
    statusCode: number | null;
    responseTimeMs: number | null;
    checkedAt: string;
  } | null;
}

export interface NotificationConfigDto {
  id: string;
  /** @deprecated Use emailTargets instead */
  email?: string | null;
  /** @deprecated Use webhooks instead */
  webhookUrl?: string | null;
  emails: string[];
  /** Email targets with optional per-endpoint scoping. Empty endpointIds = all endpoints. */
  emailTargets?: Array<{ email: string; endpointIds?: string[] }>;
  webhooks: Array<{
    url: string;
    label?: string | null;
    /** Endpoint IDs this webhook receives alerts for. Empty or missing = all endpoints. */
    endpointIds?: string[];
  }>;
  notifyOnDown: boolean;
  notifyOnSlow: boolean;
  cooldownMinutes: number;
  digestEnabled: boolean;
  digestFrequency: 'daily' | 'weekly';
  digestDayOfWeek: number;
}

export interface NotificationLogDto {
  id: string;
  endpointId: string;
  channel: string;
  reason: string;
  target?: string | null;
  sentAt: string;
  endpoint?: { name: string; url: string };
}

export interface OrgWithRole {
  id: string;
  name: string;
  slug: string | null;
  role: 'admin' | 'member' | 'viewer';
}

export type OrgRole = 'admin' | 'member' | 'viewer';

export interface InvitationInfo {
  valid: boolean;
  id?: string;
  orgId?: string;
  orgName?: string;
  inviterEmail?: string;
  inviteeEmail?: string;
  role?: OrgRole;
  status?: string;
  canAccept?: boolean;
}

export interface PendingInvitation {
  id: string;
  inviteeEmail: string;
  role: OrgRole;
  inviterEmail: string;
  createdAt: string;
}

export interface PublicStatusDto {
  orgName: string;
  slug: string | null;
  overallStatus: 'operational' | 'partial_outage' | 'major_outage';
  services: Array<{
    id: string;
    name: string;
    status: string;
    statusCode: number | null;
    responseTimeMs: number | null;
    checkedAt: string | null;
    uptime24h: number | null;
    maintenanceUntil: string | null;
  }>;
  incidents: Array<{
    id: string;
    title: string | null;
    description: string | null;
    status: string;
    startedAt: string;
    resolvedAt: string | null;
    resolveNote: string | null;
  }>;
}

async function publicRequest<T>(path: string): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}

export const api = {
  public: {
    getStatus: (orgSlug: string) =>
      publicRequest<PublicStatusDto>(`/public/status/${encodeURIComponent(orgSlug)}`),
  },
  auth: {
    register: (body: { email: string; password: string; name?: string; inviteToken?: string }) =>
      request<{
        access_token: string;
        user: { id: string; email: string; name: string | null };
        joinedOrgId?: string;
      }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: { email: string; password: string }) =>
      request<{ access_token: string; user: { id: string; email: string; name: string | null } }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify(body) },
      ),
  },
  orgs: {
    list: () => request<OrgWithRole[]>('/orgs'),
    create: (body: { name: string; slug?: string }) =>
      request<{ id: string; name: string; slug: string | null }>('/orgs', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    get: (orgId: string) =>
      request<{
        id: string;
        name: string;
        slug: string | null;
        statusPageEnabled?: boolean;
        statusPageTitle?: string | null;
        timezone?: string | null;
      }>(`/orgs/${orgId}`),
    update: (
      orgId: string,
      body: {
        name?: string;
        slug?: string;
        statusPageEnabled?: boolean;
        statusPageTitle?: string | null;
        timezone?: string | null;
      },
    ) =>
      request<{ id: string; name: string; slug: string | null }>(`/orgs/${orgId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    delete: (orgId: string) =>
      request<void>(`/orgs/${orgId}`, { method: 'DELETE' }),
    members: {
      list: (orgId: string) => request<Array<{ userId: string; email: string; name: string | null; role: OrgRole }>>(`/orgs/${orgId}/members`),
      update: (orgId: string, memberUserId: string, body: { role?: OrgRole } | { remove: true }) =>
        request<void>(`/orgs/${orgId}/members/${memberUserId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
    },
    invitations: {
      list: (orgId: string) => request<PendingInvitation[]>(`/orgs/${orgId}/invitations`),
      create: (orgId: string, body: { email: string; role: OrgRole }) =>
        request<{ id: string; token: string; inviteeEmail: string; role: OrgRole; status: string }>(
          `/orgs/${orgId}/invitations`,
          { method: 'POST', body: JSON.stringify(body) },
        ),
      cancel: (orgId: string, invitationId: string) =>
        request<void>(`/orgs/${orgId}/invitations/${invitationId}/cancel`, {
          method: 'POST',
        }),
    },
  },
  invitations: {
    getByToken: (token: string) =>
      request<InvitationInfo>(`/invitations/${token}`),
    accept: (token: string) =>
      request<{ orgId: string }>(`/invitations/${token}/accept`, {
        method: 'POST',
      }),
  },
  endpoints: (orgId: string) => ({
    list: () => request<EndpointDto[]>(`/orgs/${orgId}/endpoints`),
    get: (id: string) => request<EndpointDto>(`/orgs/${orgId}/endpoints/${id}`),
    create: (body: Partial<EndpointDto>) =>
      request<EndpointDto>(`/orgs/${orgId}/endpoints`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (id: string, body: Partial<EndpointDto>) =>
      request<EndpointDto>(`/orgs/${orgId}/endpoints/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      request<void>(`/orgs/${orgId}/endpoints/${id}`, { method: 'DELETE' }),
  }),
  status: (orgId: string) => ({
    list: (params?: { tag?: string }) =>
      request<StatusItemDto[]>(`/orgs/${orgId}/status`, {
        params: params as Record<string, string>,
      }),
    history: (endpointId: string, params?: { limit?: number; offset?: number; status?: string }) =>
      request<{ results: CheckResultDto[]; total: number }>(
        `/orgs/${orgId}/status/history/${endpointId}`,
        { params: params as Record<string, string> },
      ),
    uptime: (endpointId: string, hours?: number) =>
      request<{ uptimePercent: number; totalChecks: number; upChecks: number } | null>(
        `/orgs/${orgId}/status/uptime/${endpointId}`,
        { params: hours != null ? { hours: String(hours) } : undefined },
      ),
  }),
  notifications: (orgId: string) => ({
    getConfig: () => request<NotificationConfigDto | null>(`/orgs/${orgId}/notifications/config`),
    updateConfig: (body: Partial<NotificationConfigDto>) =>
      request<NotificationConfigDto>(`/orgs/${orgId}/notifications/config`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    getLog: () => request<NotificationLogDto[]>(`/orgs/${orgId}/notifications/log`),
  }),
  auditLog: (orgId: string) => ({
    list: (params?: { action?: string; userId?: string; from?: string; to?: string; limit?: number; offset?: number }) =>
      request<{ items: AuditLogEntryDto[]; total: number }>(
        `/orgs/${orgId}/audit-log`,
        { params: params as Record<string, string> },
      ),
  }),
  incidents: (orgId: string) => ({
    list: (params?: { status?: 'open' | 'resolved'; limit?: number; offset?: number }) =>
      request<{ items: IncidentDto[]; total: number }>(`/orgs/${orgId}/incidents`, {
        params: params as Record<string, string>,
      }),
    create: (body: { title?: string; description?: string; endpointIds?: string[] }) =>
      request<IncidentDto>(`/orgs/${orgId}/incidents`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    get: (id: string) => request<IncidentDto>(`/orgs/${orgId}/incidents/${id}`),
    resolve: (id: string, body: { note?: string }) =>
      request<IncidentDto>(`/orgs/${orgId}/incidents/${id}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
  }),
};

export interface AuditLogEntryDto {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface IncidentDto {
  id: string;
  title: string | null;
  description: string | null;
  status: 'open' | 'resolved';
  startedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  endpointIds: string[];
  resolveNote: string | null;
}
