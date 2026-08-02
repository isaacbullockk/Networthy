import { Link, NavLink, Outlet } from 'react-router'
import { Sparkles, LogOut, Eye } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { footer } from '@/config/poolContent'

const RECRUITER_NAV = [
  { to: '/discover', label: 'Discover talent' },
  { to: '/questionnaires', label: 'Questionnaires' },
  { to: '/meetings', label: 'In-house visits' },
  { to: '/exchange', label: 'Teach & Learn' },
  { to: '/dashboard', label: 'Dashboard' },
]

const TALENT_NAV = [
  { to: '/portal', label: 'My journey' },
  { to: '/portal/questionnaires', label: 'Questionnaires' },
  { to: '/portal/visits', label: 'My visits' },
  { to: '/exchange', label: 'Teach & Learn' },
  { to: '/portal/profile', label: 'My story' },
]

const ASSESSOR_NAV = [
  { to: '/assessor', label: 'Verify talent' },
]

const ADMIN_NAV = [
  { to: '/admin', label: 'Trust gate' },
]

function homeFor(role?: string) {
  return role === 'talent' ? '/portal'
    : role === 'assessor' ? '/assessor'
    : role === 'admin' ? '/admin'
    : '/discover'
}

export default function Layout() {
  const { user, logout } = useAuth()
  const nav = user?.role === 'talent' ? TALENT_NAV
    : user?.role === 'assessor' ? ASSESSOR_NAV
    : user?.role === 'admin' ? ADMIN_NAV
    : RECRUITER_NAV

  return (
    <div className="min-h-screen flex flex-col">
      {user?.isGuest && (
        <div className="flex items-center justify-center gap-2 bg-amber-500/15 px-4 py-2 text-center text-xs font-semibold text-amber-700 dark:text-amber-400">
          <Eye className="h-3.5 w-3.5" />
          Guest preview — you're viewing launch content read-only. Actions are disabled.
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to={user ? homeFor(user.role) : '/'} className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="h-4.5 w-4.5" />
            </span>
            <span className="font-display text-xl font-semibold tracking-tight">
              Net<span className="text-primary">Worthy</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/portal'}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-semibold leading-tight">{user.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{user.role === 'assessor' ? 'Independent assessor' : user.role}{user.company ? ` · ${user.company}` : ''}</div>
                </div>
                <button
                  onClick={logout}
                  title="Sign out"
                  className="grid h-10 w-10 place-items-center rounded-full border border-border text-muted-foreground transition hover:border-destructive hover:text-destructive"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border/70 bg-secondary py-10 text-secondary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 sm:px-6 md:flex-row md:items-center">
          <div>
            <div className="font-display text-lg font-semibold">
              Net<span className="text-primary">Worthy</span>
            </div>
            <p className="mt-1 max-w-sm text-sm text-secondary-foreground/70">
              {footer.line}
            </p>
          </div>
          <div className="text-sm text-secondary-foreground/60">
            {footer.motto}
          </div>
        </div>
      </footer>
    </div>
  )
}
