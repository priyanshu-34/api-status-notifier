import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOrg } from '../context/OrgContext';

const navItems: Array<{
  to: (id: string) => string;
  label: string;
  end: boolean;
  adminOnly?: boolean;
}> = [
  { to: (id) => `/orgs/${id}`, label: 'Dashboard', end: true },
  { to: (id) => `/orgs/${id}/status`, label: 'Status', end: false },
  { to: (id) => `/orgs/${id}/notifications`, label: 'Notifications', end: false },
  { to: (id) => `/orgs/${id}/incidents`, label: 'Incidents', end: false },
  { to: (id) => `/orgs/${id}/settings`, label: 'Settings', end: false, adminOnly: true },
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive ? 'text-white bg-[#27272a]' : 'text-[#a1a1aa] hover:text-white hover:bg-[#27272a]'
  }`;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { orgs, currentOrg, setCurrentOrgId, role } = useOrg();
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isOrgContext = !!orgId && orgs.some((o) => o.id === orgId);
  const showOrgNav = isOrgContext && orgs.length > 0;

  const navLinks = (
    <>
      {navItems.map((item) => {
        if (item.adminOnly && role !== 'admin') return null;
        const to = item.to(orgId!);
        return (
          <NavLink
            key={item.label}
            to={to}
            end={item.end}
            className={navLinkClass}
            onClick={() => setMobileNavOpen(false)}
          >
            {item.label}
          </NavLink>
        );
      })}
    </>
  );

  const handleOrgChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id) {
      setCurrentOrgId(id);
      navigate(`/orgs/${id}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0f0f12]">
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8 bg-[#18181b] border-b border-[#27272a]">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            to="/orgs"
            className="text-white font-semibold truncate hover:text-[#a1a1aa] transition-colors"
          >
            API Status
          </Link>
          {showOrgNav && (
            <>
              <select
                value={currentOrg?.id ?? ''}
                onChange={handleOrgChange}
                className="rounded-md border border-[#3f3f46] bg-[#27272a] text-[#e4e4e7] px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:ring-offset-2 focus:ring-offset-[#18181b] min-w-0 max-w-[180px] sm:max-w-[220px]"
                aria-label="Select organization"
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.role})
                  </option>
                ))}
              </select>
              <nav className="hidden sm:flex items-center gap-1" aria-label="Main">
                {navLinks}
              </nav>
              {showOrgNav && (
                <button
                  type="button"
                  className="sm:hidden rounded-md p-2 text-[#a1a1aa] hover:text-white hover:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  onClick={() => setMobileNavOpen((o) => !o)}
                  aria-expanded={mobileNavOpen}
                  aria-label="Toggle menu"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {mobileNavOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2" ref={userMenuRef}>
          <span className="hidden sm:inline text-sm text-[#a1a1aa] truncate max-w-[160px]">
            {user?.email}
          </span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-[#a1a1aa] hover:text-white hover:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:ring-offset-2 focus:ring-offset-[#18181b]"
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              <span className="sm:hidden">{user?.email?.replace(/@.*/, '')}</span>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 mt-1 w-48 rounded-md bg-[#27272a] border border-[#3f3f46] py-1 shadow-lg z-40">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-[#e4e4e7] hover:bg-[#3f3f46] focus:outline-none focus:bg-[#3f3f46]"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      {showOrgNav && mobileNavOpen && (
        <div className="sm:hidden flex flex-wrap gap-1 px-4 py-2 bg-[#18181b] border-b border-[#27272a]">
          {navLinks}
        </div>
      )}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
