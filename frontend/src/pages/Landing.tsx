import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const features = [
  {
    title: 'Monitor your APIs',
    description: 'Add endpoints and get checked on a schedule. Know immediately when something goes down or slows down.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    title: 'Email & webhooks',
    description: 'Get notified by email or send alerts to Slack, Discord, or any webhook. Configurable cooldowns so you stay informed, not spammed.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    title: 'Public status page',
    description: 'Share a clean, branded status page with your users. Show uptime, recent incidents, and current health at a glance.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: 'SLA & incidents',
    description: 'Track SLA targets, get breach alerts, and log incidents so your team and customers stay in the loop.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export function Landing() {
  const { user, isReady } = useAuth();

  if (isReady && user) {
    return <Navigate to="/orgs" replace />;
  }

  return (
    <div className="min-h-screen bg-[#0f0f12] text-[#e4e4e7]">
      {/* Header */}
      <header className="border-b border-[#27272a] bg-[#0f0f12]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <Link to="/" className="text-lg font-semibold text-white tracking-tight">
            API Status
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-[#a1a1aa] hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-[#27272a]"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-[#3b82f6] text-white hover:bg-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:ring-offset-2 focus:ring-offset-[#18181b] transition-colors"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#3b82f6]/10 via-transparent to-transparent pointer-events-none" />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 pb-20 sm:pb-28">
            <div className="text-center max-w-2xl mx-auto">
              <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
                Know when your APIs go down
              </h1>
              <p className="mt-4 text-lg sm:text-xl text-[#a1a1aa] leading-relaxed">
                Monitor endpoints, get alerts by email or webhook, and share a status page with your users. Simple and reliable.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-medium bg-[#3b82f6] text-white hover:bg-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:ring-offset-2 focus:ring-offset-[#0f0f12] transition-colors"
                >
                  Get started
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-medium border border-[#3f3f46] bg-[#27272a] text-[#e4e4e7] hover:bg-[#3f3f46] focus:outline-none focus:ring-2 focus:ring-[#71717a] focus:ring-offset-2 focus:ring-offset-[#0f0f12] transition-colors"
                >
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-[#27272a] bg-[#18181b]/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <h2 className="text-2xl sm:text-3xl font-semibold text-white text-center">
              Everything you need to keep APIs reliable
            </h2>
            <p className="mt-2 text-[#a1a1aa] text-center max-w-xl mx-auto">
              Add endpoints, configure notifications, and share status—all in one place.
            </p>
            <div className="mt-12 grid sm:grid-cols-2 gap-6">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 hover:border-[#3f3f46] transition-colors"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#3b82f6]/15 text-[#3b82f6]">
                    {f.icon}
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-white">{f.title}</h3>
                  <p className="mt-2 text-sm text-[#a1a1aa] leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-[#27272a]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <div className="rounded-2xl border border-[#27272a] bg-[#18181b] px-6 py-12 sm:px-12 sm:py-14 text-center">
              <h2 className="text-xl sm:text-2xl font-semibold text-white">
                Ready to monitor your APIs?
              </h2>
              <p className="mt-2 text-[#a1a1aa]">
                Create an account and add your first endpoint in minutes.
              </p>
              <div className="mt-6">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-medium bg-[#3b82f6] text-white hover:bg-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:ring-offset-2 focus:ring-offset-[#18181b] transition-colors"
                >
                  Sign up free
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#27272a] py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center text-sm text-[#71717a]">
          API Status Notifier — monitor, notify, and share status.
        </div>
      </footer>
    </div>
  );
}
