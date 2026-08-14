import { useEffect, useState, type FormEvent } from 'react'
import {
  getMyClearanceRequestApi,
  submitClearanceRequestApi,
} from '../api/clearanceRequests'
import { CLEARANCE_LABELS } from '../data/mockDatabase'
import { useAuth } from '../context/AuthContext'
import { AnorepLogo } from './AnorepLogo'
import {
  EMPTY_CLEARANCE_REQUEST_FORM,
  type ClearanceLevel,
  type ClearanceRequest,
  type ClearanceRequestFormData,
} from '../types'

interface ClearanceRequestPageProps {
  onBack: () => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString()
}

export function ClearanceRequestPage({ onBack }: ClearanceRequestPageProps) {
  const { session } = useAuth()
  const [form, setForm] = useState<ClearanceRequestFormData>(() => ({
    ...EMPTY_CLEARANCE_REQUEST_FORM,
    name: session?.displayName ?? '',
    requestedClearance: Math.min(5, Math.max(2, (session?.clearance ?? 1) + 1)) as ClearanceLevel,
  }))
  const [pending, setPending] = useState<ClearanceRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!session || session.isAdministrator) return

    setLoading(true)
    getMyClearanceRequestApi()
      .then(setPending)
      .catch(() => setPending(null))
      .finally(() => setLoading(false))
  }, [session])

  if (!session || session.isAdministrator) return null

  function updateField<K extends keyof ClearanceRequestFormData>(
    key: K,
    value: ClearanceRequestFormData[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
    setError('')
    setSuccess('')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!session) return

    setError('')
    setSuccess('')

    if (!form.name.trim() || !form.rank.trim() || !form.job.trim() || !form.notes.trim()) {
      setError('Name, rank, job, and notes are required.')
      return
    }

    const isClearanceUpgrade = form.requestedClearance > session.clearance
    const isContainmentAccessUpgrade = form.requestContainmentAccess && !session.containmentAccess
    if (!isClearanceUpgrade && !isContainmentAccessUpgrade) {
      setError(
        'Request a higher clearance than your current level, and/or Containment Access if you do not already have it.',
      )
      return
    }

    setSubmitting(true)
    try {
      const result = await submitClearanceRequestApi(form)
      setPending(result.request)
      setSuccess('Clearance request submitted for administrator review.')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to submit request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="screen clearance-screen">
      <header className="terminal-header">
        <div className="terminal-header-brand">
          <AnorepLogo variant="header" />
          <div>
            <p className="system-id">ANOREP // CLEARANCE REQUEST</p>
            <p className="system-sub">
              Operator: {session.displayName} — Clearance {session.clearance} [
              {CLEARANCE_LABELS[session.clearance]}]
              {session.containmentAccess ? ' + CONTAINMENT ACCESS' : ''}
            </p>
          </div>
        </div>
        <button className="btn-ghost" onClick={onBack} type="button">
          Back to Menu
        </button>
      </header>

      <section className="approval-intro panel">
        <h1>Request Higher Clearance</h1>
        <p>
          New accounts start at CL1. Submit a request for elevated clearance and/or Containment Access.
          An administrator will review your name, rank, job, and justification.
        </p>
        {loading && <p className="hint">Checking existing requests...</p>}
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
      </section>

      {pending ? (
        <section className="panel">
          <h2>Pending Request</h2>
          <p className="hint">
            Submitted {formatDate(pending.submittedAt)}. You cannot submit another request until
            this one is reviewed.
          </p>
          <dl className="approval-preview-fields">
            <div className="approval-preview-row">
              <dt>Requested Clearance</dt>
              <dd>
                {pending.requestedClearance} — {CLEARANCE_LABELS[pending.requestedClearance]}
                {pending.requestContainmentAccess ? ' + Containment Access' : ''}
              </dd>
            </div>
            <div className="approval-preview-row">
              <dt>Name</dt>
              <dd>{pending.name}</dd>
            </div>
            <div className="approval-preview-row">
              <dt>Rank</dt>
              <dd>{pending.rank}</dd>
            </div>
            <div className="approval-preview-row">
              <dt>Job</dt>
              <dd>{pending.job}</dd>
            </div>
            <div className="approval-preview-row">
              <dt>Notes</dt>
              <dd>{pending.notes}</dd>
            </div>
          </dl>
        </section>
      ) : (
        !loading && (
          <form className="panel scp-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                Requested Clearance
                <select
                  onChange={(event) =>
                    updateField(
                      'requestedClearance',
                      Number(event.target.value) as ClearanceLevel,
                    )
                  }
                  value={form.requestedClearance}
                >
                  <option value={1}>1 — {CLEARANCE_LABELS[1]}</option>
                  <option value={2}>2 — {CLEARANCE_LABELS[2]}</option>
                  <option value={3}>3 — {CLEARANCE_LABELS[3]}</option>
                  <option value={4}>4 — {CLEARANCE_LABELS[4]}</option>
                  <option value={5}>5 — {CLEARANCE_LABELS[5]}</option>
                </select>
              </label>

              <label className="clearance-containment-access-toggle">
                <span>Request Containment Access</span>
                <input
                  checked={form.requestContainmentAccess}
                  disabled={session.containmentAccess}
                  onChange={(event) => updateField('requestContainmentAccess', event.target.checked)}
                  type="checkbox"
                />
                <span className="hint">
                  {session.containmentAccess
                    ? 'You already have Containment Access.'
                    : 'Required to view Containment Procedures sections.'}
                </span>
              </label>

              <label>
                Name
                <input
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="Full name"
                  type="text"
                  value={form.name}
                />
              </label>

              <label>
                Rank
                <input
                  onChange={(event) => updateField('rank', event.target.value)}
                  placeholder="e.g. Agent, Specialist, Director"
                  type="text"
                  value={form.rank}
                />
              </label>

              <label className="form-span-2">
                Job
                <input
                  onChange={(event) => updateField('job', event.target.value)}
                  placeholder="Assignment / role"
                  type="text"
                  value={form.job}
                />
              </label>

              <label className="form-span-2">
                Notes
                <textarea
                  onChange={(event) => updateField('notes', event.target.value)}
                  placeholder="Explain why you need this clearance and/or Containment Access..."
                  rows={5}
                  value={form.notes}
                />
              </label>
            </div>

            <div className="form-actions">
              <button className="btn-primary" disabled={submitting} type="submit">
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
              <button className="btn-ghost" onClick={onBack} type="button">
                Cancel
              </button>
            </div>
          </form>
        )
      )}
    </div>
  )
}
