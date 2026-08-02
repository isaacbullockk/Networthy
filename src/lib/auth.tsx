import { createContext, useContext, type ReactNode } from 'react'
import { trpc } from '@/providers/trpc'
import type { SessionUser } from '@/types'

interface RegisterInput {
  name: string
  email: string
  password: string
  role: 'talent' | 'recruiter'
  company?: string
}

interface AuthState {
  user: SessionUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<SessionUser>
  register: (input: RegisterInput) => Promise<SessionUser>
  guestLogin: () => Promise<SessionUser>
  logout: () => void
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const utils = trpc.useUtils()
  const me = trpc.auth.me.useQuery(undefined, { retry: false, staleTime: 60_000 })
  const loginMut = trpc.auth.login.useMutation({
    onSuccess: () => utils.invalidate(),
  })
  const logoutMut = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.invalidate()
      window.location.href = '/login'
    },
  })

  const registerMut = trpc.auth.register.useMutation({
    onSuccess: () => utils.invalidate(),
  })

  const login = async (email: string, password: string) => {
    return (await loginMut.mutateAsync({ email: email.toLowerCase(), password })) as SessionUser
  }

  const register = async (input: RegisterInput) => {
    return (await registerMut.mutateAsync({ ...input, email: input.email.toLowerCase() })) as SessionUser
  }

  const guestMut = trpc.auth.guestLogin.useMutation({
    onSuccess: () => utils.invalidate(),
  })

  const guestLogin = async () => {
    return (await guestMut.mutateAsync()) as SessionUser
  }

  return (
    <Ctx.Provider
      value={{
        user: (me.data ?? null) as SessionUser | null,
        loading: me.isLoading,
        login,
        register,
        guestLogin,
        logout: () => logoutMut.mutate(),
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
