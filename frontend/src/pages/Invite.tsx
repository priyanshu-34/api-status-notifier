import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Spinner } from '../components/Spinner';

export function Invite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [info, setInfo] = useState<{
    valid: boolean;
    orgName?: string;
    inviterEmail?: string;
    inviteeEmail?: string;
    role?: string;
    canAccept?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setInfo({ valid: false });
      setLoading(false);
      return;
    }
    let cancelled = false;
    api.invitations
      .getByToken(token)
      .then((data) => {
        if (!cancelled) setInfo(data);
      })
      .catch(() => {
        if (!cancelled) setInfo({ valid: false });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleAccept = async () => {
    if (!token || !info?.canAccept) return;
    setError('');
    setAccepting(true);
    try {
      const res = await api.invitations.accept(token);
      navigate(`/orgs/${res.orgId}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept');
    } finally {
      setAccepting(false);
    }
  };

  if (loading || !info) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#0f0f12]">
        <div className="w-full max-w-[360px] rounded-lg border border-[#27272a] bg-[#18181b] p-6 text-center">
          <Spinner className="mx-auto mb-3" />
          <p className="text-sm text-[#a1a1aa]">Loading invitation…</p>
        </div>
      </div>
    );
  }

  if (!info.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#0f0f12]">
        <div className="w-full max-w-[360px] rounded-lg border border-[#27272a] bg-[#18181b] p-6">
          <h1 className="text-lg font-semibold text-white mb-1">API Status</h1>
          <h2 className="text-base font-medium text-white mt-4 mb-2">Invalid or expired invitation</h2>
          <p className="text-sm text-[#a1a1aa] mb-6">
            This invitation link is invalid or has expired.
          </p>
          {isAuthenticated ? (
            <Link to="/orgs" className="text-[#3b82f6] hover:underline text-sm">
              Go to organizations
            </Link>
          ) : (
            <p className="text-sm text-[#a1a1aa]">
              <Link to="/login" className="text-[#3b82f6] hover:underline">Log in</Link>
              {' or '}
              <Link to="/register" className="text-[#3b82f6] hover:underline">Register</Link>
            </p>
          )}
        </div>
      </div>
    );
  }

  const registerUrl = `/register?invite=${token}`;
  const loginUrl = `/login?redirect=${encodeURIComponent(`/invite/${token}`)}`;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0f0f12]">
      <div className="w-full max-w-[360px] rounded-lg border border-[#27272a] bg-[#18181b] p-6">
        <h1 className="text-lg font-semibold text-white mb-1">API Status</h1>
        <h2 className="text-base font-medium text-white mt-4 mb-2">You're invited</h2>
        <p className="text-sm text-[#a1a1aa] mb-6">
          You've been invited to join <strong className="text-white">{info.orgName}</strong>
          {info.inviterEmail && <> by {info.inviterEmail}</>}.
          {info.role && <> Your role will be <strong className="text-white">{info.role}</strong>.</>}
        </p>
        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
        {isAuthenticated ? (
          info.canAccept ? (
            <div className="space-y-4">
              <Button onClick={handleAccept} disabled={accepting} className="w-full">
                {accepting ? 'Joining…' : 'Accept invitation'}
              </Button>
              <p className="text-sm text-[#a1a1aa] text-center">
                <Link to="/orgs" className="text-[#3b82f6] hover:underline">
                  Skip — go to organizations
                </Link>
              </p>
            </div>
          ) : (
            <p className="text-sm text-[#a1a1aa]">
              This invitation was sent to <strong className="text-white">{info.inviteeEmail}</strong>.
              Log in with that email to accept, or{' '}
              <Link to="/orgs" className="text-[#3b82f6] hover:underline">go to organizations</Link>.
            </p>
          )
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[#a1a1aa]">
              Create an account or log in to accept this invitation.
            </p>
            <div className="flex flex-col gap-2">
              <Link to={registerUrl}>
                <Button variant="primary" className="w-full">
                  Register with {info.inviteeEmail}
                </Button>
              </Link>
              <p className="text-sm text-[#a1a1aa] text-center">
                <Link to={loginUrl} className="text-[#3b82f6] hover:underline">
                  Log in
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
