import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LoginScreen } from './components/LoginScreen'
import { HomeMenu } from './components/HomeMenu'
import { SearchTerminal } from './components/SearchTerminal'
import { AddScpForm } from './components/AddScpForm'
import { ApprovalPage } from './components/ApprovalPage'
import { OperatorManagementPage } from './components/OperatorManagementPage'
import type { AppView } from './types'
import './App.css'

function AppContent() {
  const { session, loading } = useAuth()
  const [view, setView] = useState<AppView>('home')

  useEffect(() => {
    if (session) {
      setView('home')
    }
  }, [session?.username])

  if (loading) {
    return (
      <div className="welcome-page">
        <main className="welcome-shell">
          <p className="welcome-status">Establishing secure channel...</p>
        </main>
      </div>
    )
  }

  if (!session) {
    return <LoginScreen />
  }

  if (view === 'search') {
    return <SearchTerminal onBack={() => setView('home')} />
  }

  if (view === 'add') {
    return <AddScpForm onBack={() => setView('home')} />
  }

  if (view === 'approve') {
    if (!session.isAdministrator) {
      return <HomeMenu onNavigate={setView} />
    }
    return <ApprovalPage onBack={() => setView('home')} />
  }

  if (view === 'operators') {
    if (!session.isAdministrator) {
      return <HomeMenu onNavigate={setView} />
    }
    return <OperatorManagementPage onBack={() => setView('home')} />
  }

  return <HomeMenu onNavigate={setView} />
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
