# API Status Notifier

Monitor HTTP endpoints on a schedule. Get notified via email and webhook when endpoints are down or slow. **Organization-based multi-tenancy**: users belong to organizations with roles (admin, member, viewer); endpoints and notification config are per organization.

## Stack

- **Backend**: NestJS, Mongoose (MongoDB), JWT auth, `@nestjs/schedule` (cron), axios, nodemailer
- **Frontend**: React (Vite), TypeScript, react-router-dom

## Quick start

### 1. Database

Use a MongoDB instance and set its URI:

```bash
cd backend
cp .env.example .env
# Edit .env: set MONGODB_URI=... and JWT_SECRET=...
```

### 2. Backend

```bash
cd backend
npm install
npm run start:dev
```

API runs at `http://localhost:3000`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Register an account, create an organization, then add endpoints and configure notifications per org.

### 4. Notifications (optional)

In `backend/.env` set `ENABLE_EMAIL_NOTIFICATIONS=true` and/or `ENABLE_WEBHOOK_NOTIFICATIONS=true`. Email and webhook URL are configured **per organization** in the app (Notifications page for each org).

## Auth and organizations

- **Register / Login**: `POST /auth/register`, `POST /auth/login` (email, password). Returns `access_token` (JWT). Register accepts optional `inviteToken` to auto-join an org after signup. All other API routes require `Authorization: Bearer <token>`.
- **Organizations**: Each user can create orgs and be invited to others. Endpoints and notification config belong to an organization.
- **Invitations**: Admins invite by email (Settings → Send invitation). Invitee gets a link (by email if `ENABLE_EMAIL_NOTIFICATIONS=true`, or copy from UI). Clicking the link: if not logged in, they register or log in; if logged in with that email, they accept and join the org. Invitations are **pending** until accepted; admins can cancel pending invites.
- **Roles** (per organization):
  - **admin**: Manage members, org settings, notification config, and all endpoint actions.
  - **member**: Create/edit/delete endpoints, view status/history, edit notification config.
  - **viewer**: Read-only (view endpoints, status, history, notification log).

## API (all under JWT)

| Method | Path | Description |
|--------|------|-------------|
| GET | /orgs | List orgs the user is in (with role) |
| POST | /orgs | Create org (user becomes admin) |
| GET | /orgs/:orgId | Get org (member) |
| PATCH | /orgs/:orgId | Update org (admin) |
| GET/PATCH | /orgs/:orgId/members | List members / update role or remove (admin) |
| GET/POST | /orgs/:orgId/invitations | List pending / create invitation (admin) |
| POST | /orgs/:orgId/invitations/:id/cancel | Cancel pending invitation (admin) |
| GET | /invitations/:token | Get invite details (public; optional JWT for canAccept) |
| POST | /invitations/:token/accept | Accept invite (JWT required) |
| GET/POST | /orgs/:orgId/endpoints | List / create endpoints (member) |
| GET/PATCH/DELETE | /orgs/:orgId/endpoints/:id | Get / update / delete endpoint (member) |
| GET | /orgs/:orgId/status | Status + latest check (viewer) |
| GET | /orgs/:orgId/status/uptime/:endpointId | Uptime % (viewer) |
| GET | /orgs/:orgId/status/history/:endpointId | History (viewer) |
| GET/PATCH | /orgs/:orgId/notifications/config | Get / update config (member) |
| GET | /orgs/:orgId/notifications/log | Recent log (viewer) |

## Behaviour

- A cron job runs every 2 minutes and checks each endpoint (all orgs) if its `checkIntervalMinutes` has passed since the last check.
- **Up** / **Down** / **Slow**: Same as before; notifications use the **organization’s** notification config (email/webhook set in the app for that org).

## Project structure

```
api-status-notifier/
├── backend/          # NestJS API (auth, orgs, members, endpoints, status, notifications)
├── frontend/         # React SPA (login, org list, org-scoped dashboard, role-based UI)
└── README.md
```
