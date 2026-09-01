import { Routes, Route, Navigate, useLocation } from 'react-router'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from '@/lib/auth'
import { AppProvider } from '@/context/AppContext'
import Layout from '@/components/Layout'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import VerifyEmail from '@/pages/VerifyEmail'
import Chat from '@/pages/Chat'
import Discover from '@/pages/Discover'
import Vacancies from '@/pages/Vacancies'
import TalentProfile from '@/pages/TalentProfile'
import VideoCall from '@/pages/VideoCall'
import Questionnaires from '@/pages/Questionnaires'
import Meetings from '@/pages/Meetings'
import Dashboard from '@/pages/Dashboard'
import Exchange from '@/pages/Exchange'
import PortalHome from '@/pages/portal/PortalHome'
import PortalQuestionnaires from '@/pages/portal/PortalQuestionnaires'
import PortalVisits from '@/pages/portal/PortalVisits'
import PortalProfile from '@/pages/portal/PortalProfile'
import AssessorHome from '@/pages/AssessorHome'
import Retention from '@/pages/Retention'
import Record from '@/pages/Record'
import PublicRecord from '@/pages/PublicRecord'
import Admin from '@/pages/Admin'
import { ShieldCheck } from 'lucide-react'

function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Loading NetWorthy…</span>
      </div>
    </div>
  )
}

function homeFor(role: string) {
  return role === 'talent' ? '/portal'
    : role === 'assessor' ? '/assessor'
    : role === 'admin' ? '/admin'
    : '/discover'
}

/** Holding screen for recruiters whose application is still under review. */
function PendingApproval() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      <div className="max-w-md rounded-3xl border border-border bg-card p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold">Application under review</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Thanks for joining NetWorthy. Every recruiter is personally reviewed before they can meet
          the pool — the talents’ trust is the product. You’ll get access as soon as your account is
          approved, usually within a day.
        </p>
      </div>
    </div>
  )
}

function RequireAuth({ role, children }: { role?: 'recruiter' | 'talent' | 'assessor' | 'admin'; children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (role && user.role !== role) {
    return <Navigate to={homeFor(user.role)} replace />
  }
  if (user.role === 'recruiter' && !user.approvedAt) {
    return <PendingApproval />
  }
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        {/* Recruiter routes */}
        <Route path="/discover" element={<RequireAuth role="recruiter"><Discover /></RequireAuth>} />
        <Route path="/vacancies" element={<RequireAuth role="recruiter"><Vacancies /></RequireAuth>} />
        <Route path="/talent/:id" element={<RequireAuth role="recruiter"><TalentProfile /></RequireAuth>} />
        <Route path="/questionnaires" element={<RequireAuth role="recruiter"><Questionnaires /></RequireAuth>} />
        <Route path="/meetings" element={<RequireAuth role="recruiter"><Meetings /></RequireAuth>} />
        <Route path="/dashboard" element={<RequireAuth role="recruiter"><Dashboard /></RequireAuth>} />
        {/* Talent portal */}
        <Route path="/portal" element={<RequireAuth role="talent"><PortalHome /></RequireAuth>} />
        <Route path="/portal/questionnaires" element={<RequireAuth role="talent"><PortalQuestionnaires /></RequireAuth>} />
        <Route path="/portal/visits" element={<RequireAuth role="talent"><PortalVisits /></RequireAuth>} />
        <Route path="/portal/profile" element={<RequireAuth role="talent"><PortalProfile /></RequireAuth>} />
        {/* NetWorthy Record — the earned CV (talent + recruiter) */}
        <Route path="/record/:matchId" element={<RequireAuth><Record /></RequireAuth>} />
        <Route path="/chat/:matchId" element={<RequireAuth><Chat /></RequireAuth>} />
        {/* Retention mode — first 90 days (talent + recruiter) */}
        <Route path="/retention/:matchId" element={<RequireAuth><Retention /></RequireAuth>} />
        {/* Admin — trust gate */}
        <Route path="/admin" element={<RequireAuth role="admin"><Admin /></RequireAuth>} />
        {/* Assessor portal */}
        <Route path="/assessor" element={<RequireAuth role="assessor"><AssessorHome /></RequireAuth>} />
        {/* Teach & Learn — shared by both roles */}
        <Route path="/exchange" element={<RequireAuth><Exchange /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      {/* Public NetWorthy Record — share token, no login */}
      <Route path="/r/:token" element={<PublicRecord />} />
      {/* Full-screen video call (both roles) */}
      <Route path="/call/:id" element={<RequireAuth><VideoCall /></RequireAuth>} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </AuthProvider>
  )
}
