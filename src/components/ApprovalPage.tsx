import { useEffect, useState } from 'react'
import {
  approvePersonnelApi,
  getPendingPersonnelApi,
  rejectPersonnelApi,
} from '../api/personnel'
import {
  approveSignupApi,
  getPendingSignupsApi,
  rejectSignupApi,
} from '../api/operators'
import { useAuth } from '../context/AuthContext'
import { AnorepLogo } from './AnorepLogo'
import type { ClearanceLevel, PendingPersonnelSubmission, SignupRequest } from '../types'

interface ApprovalPageProps {
  onBack: () => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString()
}

export function ApprovalPage({ onBack }: ApprovalPageProps) {
  const { session } = useAuth()
  const [signupClearance, setSignupClearance] = useState<Record<string, ClearanceLevel>>({})
  const [pendingSignups, setPendingSignups] = useState<SignupRequest[]>([])
  const [pendingFiles, setPendingFiles] = useState<PendingPersonnelSubmission[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.isAdministrator) return

    setLoading(true)
    Promise.all([getPendingSignupsApi(), getPendingPersonnelApi()])
      .then(([signups, files]) => {
        setPendingSignups(signups)
        setPendingFiles(files)
      })
      .finally(() => setLoading(false))
  }, [session])

  if (!session?.isAdministrator) return null

  async function reload() {
    const [signups, files] = await Promise.all([getPendingSignupsApi(), getPendingPersonnelApi()])
    setPendingSignups(signups)
    setPendingFiles(files)
  }

  async function handleApproveSignup(requestId: string) {
    const clearance = signupClearance[requestId] ?? 1
    try {
      await approveSignupApi(requestId, clearance)
      setMessage(`Sign-up request approved at clearance ${clearance}.`)
      await reload()
    } catch {
      setMessage('Failed to approve sign-up request.')
    }
  }

  async function handleRejectSignup(requestId: string) {
    try {
      await rejectSignupApi(requestId)
      setMessage('Sign-up request denied.')
      await reload()
    } catch {
      setMessage('Failed to deny sign-up request.')
    }
  }

  async function handleApproveFile(requestId: string) {
    try {
      await approvePersonnelApi(requestId)
      setMessage('SCP file approved and indexed for search.')
      await reload()
    } catch {
      setMessage('Failed to approve SCP file.')
    }
  }

  async function handleRejectFile(requestId: string) {
    try {
      await rejectPersonnelApi(requestId)
      setMessage('SCP file submission denied.')
      await reload()
    } catch {
      setMessage('Failed to deny SCP file.')
    }
  }

  return (
    <div className="screen approval-screen">
      <header className="terminal-header">
        <div className="terminal-header-brand">
          <AnorepLogo variant="header" />
          <div>
            <p className="system-id">ANOREP // ADMINISTRATOR APPROVAL</p>
            <p className="system-sub">
              Operator: {session.displayName} — <span className="admin-badge">ADMINISTRATOR</span>
            </p>
          </div>
        </div>
        <button className="btn-ghost" onClick={onBack} type="button">
          Back to Menu
        </button>
      </header>

      <section className="approval-intro panel">
        <h1>Approval Queue</h1>
        <p>
          Review pending operator access requests and user-submitted anomaly files before they
          become visible in the personnel search registry.
        </p>
        {message && (
          <p className="success-text" role="status">
            {message}
          </p>
        )}
        {loading && <p className="hint">Loading pending items...</p>}
      </section>

      <section className="approval-section panel">
        <header className="approval-section-header">
          <h2>Sign-Up Requests</h2>
          <span className="approval-count">{pendingSignups.length} pending</span>
        </header>

        {pendingSignups.length === 0 ? (
          <p className="approval-empty">No pending sign-up requests.</p>
        ) : (
          <ul className="approval-list">
            {pendingSignups.map((request) => (
              <li className="approval-item" key={request.id}>
                <div className="approval-item-body">
                  <p className="approval-item-title">{request.displayName}</p>
                  <p className="approval-item-meta">
                    Operator ID: <strong>{request.username}</strong> — Submitted{' '}
                    {formatDate(request.submittedAt)}
                  </p>
                  {request.justification && (
                    <p className="approval-item-detail">
                      <span>Justification:</span> {request.justification}
                    </p>
                  )}
                  <label className="approval-clearance-select">
                    Assign clearance on approval
                    <select
                      onChange={(e) =>
                        setSignupClearance((current) => ({
                          ...current,
                          [request.id]: Number(e.target.value) as ClearanceLevel,
                        }))
                      }
                      value={signupClearance[request.id] ?? 1}
                    >
                      <option value={1}>1 — Restricted</option>
                      <option value={2}>2 — Confidential</option>
                      <option value={3}>3 — Secret</option>
                      <option value={4}>4 — Top Secret</option>
                    </select>
                  </label>
                </div>
                <div className="approval-actions">
                  <button
                    className="btn-primary"
                    onClick={() => void handleApproveSignup(request.id)}
                    type="button"
                  >
                    Approve
                  </button>
                  <button
                    className="btn-ghost btn-reject"
                    onClick={() => void handleRejectSignup(request.id)}
                    type="button"
                  >
                    Deny
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="approval-section panel">
        <header className="approval-section-header">
          <h2>Anomaly File Submissions</h2>
          <span className="approval-count">{pendingFiles.length} pending</span>
        </header>

        {pendingFiles.length === 0 ? (
          <p className="approval-empty">No pending SCP file submissions.</p>
        ) : (
          <ul className="approval-list">
            {pendingFiles.map((submission) => (
              <li className="approval-item" key={submission.requestId}>
                <div className="approval-item-body">
                  <p className="approval-item-title">
                    {submission.record.name}{' '}
                    <span className="approval-item-id">({submission.record.id})</span>
                  </p>
                  <p className="approval-item-meta">
                    Submitted by {submission.submittedBy} — {formatDate(submission.submittedAt)}
                  </p>
                  <dl className="approval-preview-fields">
                    {submission.record.fields.slice(0, 4).map((field) => (
                      <div className="approval-preview-row" key={field.label}>
                        <dt>{field.label}</dt>
                        <dd>{field.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="approval-actions">
                  <button
                    className="btn-primary"
                    onClick={() => void handleApproveFile(submission.requestId)}
                    type="button"
                  >
                    Approve
                  </button>
                  <button
                    className="btn-ghost btn-reject"
                    onClick={() => void handleRejectFile(submission.requestId)}
                    type="button"
                  >
                    Deny
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
