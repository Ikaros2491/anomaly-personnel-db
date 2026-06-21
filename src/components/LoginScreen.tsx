import { useState, type FormEvent } from 'react'
import { submitSignupApi } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { AnorepLogo } from './AnorepLogo'
import { EMPTY_SIGNUP_FORM } from '../types'

type LoginMode = 'signin' | 'signup'

export function LoginScreen() {
  const { login } = useAuth()
  const [mode, setMode] = useState<LoginMode>('signin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [signupForm, setSignupForm] = useState(EMPTY_SIGNUP_FORM)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function switchMode(next: LoginMode) {
    setMode(next)
    setError('')
    setSuccess('')
  }

  async function handleSignIn(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    const result = await login(username, password)
    setSubmitting(false)

    if (!result.ok) {
      setError(
        result.deactivated
          ? 'ACCESS DENIED — This operator account has been deactivated.'
          : 'ACCESS DENIED — Invalid operator ID or access code.',
      )
    }
  }

  async function handleSignUp(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    const result = await submitSignupApi(
      signupForm.username,
      signupForm.password,
      signupForm.displayName,
      signupForm.justification,
    )

    setSubmitting(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setSignupForm(EMPTY_SIGNUP_FORM)
    setSuccess(
      'Access request submitted. An administrator must approve your account before you can sign in.',
    )
    setMode('signin')
  }

  return (
    <div className="welcome-page">
      <div aria-hidden="true" className="welcome-backdrop" />

      <main className="welcome-shell">
        <section className="welcome-hero">
          <AnorepLogo variant="hero" />
          <p className="welcome-kicker">ANOREP — Secure Terminal Access</p>
          <h1 className="welcome-title">Welcome, Operator</h1>
          <p className="welcome-copy">
            You are connecting to ANOREP. Authorized personnel may sign in to query
            logged anomalous records by clearance level.
          </p>
          <p className="welcome-status">
            <span className="status-dot" />
            Secure channel established — awaiting credentials
          </p>
        </section>

        <section
          aria-labelledby={mode === 'signin' ? 'sign-in-heading' : 'signup-heading'}
          className="sign-in-card panel"
        >
          <div className="auth-mode-tabs">
            <button
              className={mode === 'signin' ? 'auth-tab auth-tab--active' : 'auth-tab'}
              onClick={() => switchMode('signin')}
              type="button"
            >
              Sign In
            </button>
            <button
              className={mode === 'signup' ? 'auth-tab auth-tab--active' : 'auth-tab'}
              onClick={() => switchMode('signup')}
              type="button"
            >
              Request Access
            </button>
          </div>

          {mode === 'signin' ? (
            <>
              <header className="sign-in-header">
                <h2 id="sign-in-heading">Sign In</h2>
                <p>Enter your operator credentials to continue.</p>
              </header>

              <form className="login-form" onSubmit={handleSignIn}>
                <label>
                  Operator ID
                  <input
                    autoComplete="username"
                    autoFocus
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="e.g. agent.smith"
                    type="text"
                    value={username}
                  />
                </label>

                <label>
                  Access Code
                  <input
                    autoComplete="current-password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter access code"
                    type="password"
                    value={password}
                  />
                </label>

                {error && (
                  <p className="error-text" role="alert">
                    {error}
                  </p>
                )}
                {success && (
                  <p className="success-text" role="status">
                    {success}
                  </p>
                )}

                <button className="btn-primary btn-sign-in" disabled={submitting} type="submit">
                  {submitting ? 'Authenticating...' : 'Sign In'}
                </button>
              </form>
            </>
          ) : (
            <>
              <header className="sign-in-header">
                <h2 id="signup-heading">Request Access</h2>
                <p>
                  Submit a sign-up request for administrator review. You cannot sign in until
                  approved.
                </p>
              </header>

              <form className="login-form" onSubmit={handleSignUp}>
                <label>
                  Operator ID
                  <input
                    autoFocus
                    onChange={(event) =>
                      setSignupForm((f) => ({ ...f, username: event.target.value }))
                    }
                    placeholder="Choose an operator ID"
                    type="text"
                    value={signupForm.username}
                  />
                </label>

                <label>
                  Access Code
                  <input
                    onChange={(event) =>
                      setSignupForm((f) => ({ ...f, password: event.target.value }))
                    }
                    placeholder="Choose an access code"
                    type="password"
                    value={signupForm.password}
                  />
                </label>

                <label>
                  Display Name
                  <input
                    onChange={(event) =>
                      setSignupForm((f) => ({ ...f, displayName: event.target.value }))
                    }
                    placeholder="e.g. Smith, R."
                    type="text"
                    value={signupForm.displayName}
                  />
                </label>

                <label>
                  Justification
                  <textarea
                    onChange={(event) =>
                      setSignupForm((f) => ({ ...f, justification: event.target.value }))
                    }
                    placeholder="Reason for access request, assignment, or clearance need..."
                    rows={3}
                    value={signupForm.justification}
                  />
                </label>

                {error && (
                  <p className="error-text" role="alert">
                    {error}
                  </p>
                )}

                <button className="btn-primary btn-sign-in" disabled={submitting} type="submit">
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            </>
          )}
        </section>

        <footer className="welcome-footer">
          <p className="classified-notice">
            CLASSIFIED — Unauthorized access is monitored and prosecuted.
          </p>
        </footer>
      </main>
    </div>
  )
}
