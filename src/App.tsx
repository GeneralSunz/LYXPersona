import { Routes, Route, Navigate } from 'react-router-dom'
import { FileProvider } from './store/FileContext'
import { AuthProvider } from './store/AuthContext'
import { isSupabaseConfigured } from './lib/supabase'
import { useAuth } from './store/AuthContext'
import Header from './layouts/Header'
import DownloadPage from './pages/DownloadPage'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 24, height: 24,
          border: '2px solid var(--border-default)',
          borderTopColor: 'var(--accent-blue)',
          borderRadius: '50%',
          animation: 'spin 600ms linear infinite',
        }} />
      </div>
    )
  }

  if (isSupabaseConfigured() && !user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function App() {
  const isDev = !isSupabaseConfigured()

  return (
    <AuthProvider>
      <FileProvider>
        <Routes>
          {/* Download portal - public */}
          <Route path="/" element={<DownloadPage />} />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              isDev ? (
                <Home />
              ) : (
                <ProtectedRoute>
                  <Header />
                  <Home />
                </ProtectedRoute>
              )
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </FileProvider>
    </AuthProvider>
  )
}
