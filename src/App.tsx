import { Routes, Route, Navigate } from 'react-router-dom'
import { FileProvider } from './store/FileContext'
import { AuthProvider } from './store/AuthContext'
import { isSupabaseConfigured } from './lib/supabase'
import { useAuth } from './store/AuthContext'
import Header from './layouts/Header'
import Portfolio from './pages/Portfolio'
import Resume from './pages/Resume'
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
          {/* 个人主页 —— 站点门面 */}
          <Route path="/" element={<Portfolio />} />

          {/* A4 简历页：供浏览器打印 / 生成 PDF 使用，同时也是在线简历 */}
          <Route path="/resume" element={<Resume />} />

          {/* 子界面：熔炉档案馆（公开下载门户） */}
          <Route path="/archive" element={<DownloadPage />} />

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
