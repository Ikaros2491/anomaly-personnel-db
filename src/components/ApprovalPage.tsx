import { useEffect, useState } from 'react'
import {
  approveClearanceRequestApi,
  getPendingClearanceRequestsApi,
  rejectClearanceRequestApi,
} from '../api/clearanceRequests'
import {
  approvePersonnelApi,
  getPendingPersonnelApi,
  rejectPersonnelApi,
} from '../api/personnel'
import { CLEARANCE_LABELS } from '../data/mockDatabase'
import { useAuth } from '../context/AuthContext'
import { AnorepLogo } from './AnorepLogo'
import type { ClearanceRequest, PendingPersonnelSubmission } from '../types'

interface ApprovalPageProps {
  onBack: () => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString()
}

export function ApprovalPage({ onBack }: ApprovalPageProps) {
  const { session } = useAuth()
  const [pendingClearance, setPendingClearance] = useState<ClearanceRequest[]>([])
  const [pendingFiles, setPendingFiles] = useState<PendingPersonnelSubmission[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.isAdministrator) return

    setLoading(true)
    Promise.all([getPendingClearanceRequestsApi(), getPendingPersonnelApi()])
      .then(([requests, files]) => {
        setPendingClearance(requests)
        setPendingFiles(files)
      })
      .finally(() => setLoading(false))
  }, [session])

  if (!session?.isAdministrator) return null

  async function reload() {
    const [requests, files] = await Promise.all([
      getPendingClearanceRequestsApi(),
      getPendingPersonnelApi(),
    ])
    setPendingClearance(requests)
    setPendingFiles(files)
  }

  async function handleApproveClearance(requestId: string) {
    try {
      await approveClearanceRequestApi(requestId)
      setMessage('Clearance request approved. Operator access updated.')
      await reload()
    } catch {
      setMessage('Failed to approve clearance request.')
    }
  }

  async function handleRejectClearance(requestId: string) {
    try {
      await rejectClearanceRequestApi(requestId)
      setMessage('Clearance request denied.')
      await reload()
    } catch {
      setMessage('Failed to deny clearance request.')
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
          Review clearance elevation requests and user-submitted anomaly files before elevated
          access or registry indexing takes effect.
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
          <h2>Clearance Requests</h2>
          <span className="approval-count">{pendingClearance.length} pending</span>
        </header>

        {pendingClearance.length === 0 ? (
          <p className="approval-empty">No pending clearance requests.</p>
        ) : (
          <ul className="approval-list">
            {pendingClearance.map((request) => (
              <li className="approval-item" key={request.id}>
                <div className="approval-item-body">
                  <p className="approval-item-title">
                    {request.name}{' '}
                    <span className="approval-item-id">({request.username})</span>
                  </p>
                  <p className="approval-item-meta">
                    Current: CL{request.currentClearance}
                    {request.currentContainmentAccess ? ' + Containment Access' : ''} → Requested: CL
                    {request.requestedClearance} —{' '}
                    {CLEARANCE_LABELS[request.requestedClearance]}
                    {request.requestContainmentAccess ? ' + Containment Access' : ''} — Submitted{' '}
                    {formatDate(request.submittedAt)}
                  </p>
                  <dl className="approval-preview-fields">
                    <div className="approval-preview-row">
                      <dt>Rank</dt>
                      <dd>{request.rank}</dd>
                    </div>
                    <div className="approval-preview-row">
                      <dt>Job</dt>
                      <dd>{request.job}</dd>
                    </div>
                    <div className="approval-preview-row">
                      <dt>Notes</dt>
                      <dd>{request.notes}</dd>
                    </div>
                  </dl>
                </div>
                <div className="approval-actions">
                  <button
                    className="btn-primary"
                    onClick={() => void handleApproveClearance(request.id)}
                    type="button"
                  >
                    Approve
                  </button>
                  <button
                    className="btn-ghost btn-reject"
                    onClick={() => void handleRejectClearance(request.id)}
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
                    {submission.record.fields.map((field) => (
                      <div className="approval-preview-row" key={field.label}>
                        <dt>
                          {field.label}
                          {field.requiresContainmentAccess ? ' (Containment Access)' : ''}
                        </dt>
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
