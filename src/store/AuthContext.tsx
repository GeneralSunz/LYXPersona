import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

interface AuthState {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    // 10 秒超时，防止 Supabase 不可用时界面卡死
    let expired = false
    const timer = setTimeout(() => { expired = true; setLoading(false) }, 10000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!expired) setUser(session?.user ?? null)
    }).catch(() => {
      // ignore
    }).finally(() => {
      clearTimeout(timer)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      clearTimeout(timer)
      listener.subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string): Promise<string | null> => {
    try {
      const { error } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new DOMException('', 'AbortError')), 15000)
        ),
      ])
      return error?.message ?? null
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return '登录超时，请检查网络连接'
      }
      return err instanceof Error ? err.message : '登录失败，请检查网络连接'
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
