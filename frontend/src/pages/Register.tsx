import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, setToken } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';

export function Register() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite') ?? undefined;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.auth.register({
        email,
        password,
        name: name || undefined,
        inviteToken,
      });
      setToken(res.access_token);
      setAuth(res.access_token, res.user);
      if (res.joinedOrgId) {
        navigate(`/orgs/${res.joinedOrgId}`, { replace: true });
      } else {
        navigate('/orgs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0f0f12]">
      <div className="w-full max-w-[360px] rounded-lg border border-[#27272a] bg-[#18181b] p-6">
        <h1 className="text-lg font-semibold text-white mb-1">API Status</h1>
        <p className="text-sm text-[#a1a1aa] mb-6">Create your account</p>
        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-[#a1a1aa] mb-1">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
            />
          </div>
          <div>
            <label htmlFor="reg-name" className="block text-sm font-medium text-[#a1a1aa] mb-1">
              Name (optional)
            </label>
            <input
              id="reg-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="w-full rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
            />
          </div>
          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-[#a1a1aa] mb-1">
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-md border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating account…' : 'Register'}
          </Button>
        </form>
        <p className="mt-6 text-sm text-[#a1a1aa]">
          Already have an account?{' '}
          <Link to="/login" className="text-[#3b82f6] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
