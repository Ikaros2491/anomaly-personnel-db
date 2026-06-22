import { useEffect, useState } from 'react'
import { CLEARANCE_LABELS } from '../data/mockDatabase'
import {
  deleteOperatorApi,
  getOperatorsApi,
  setOperatorAdministratorApi,
  setOperatorDeactivatedApi,
  updateOperatorClearanceApi,
} from '../api/operators'
import { useAuth } from '../context/AuthContext'
import { AnorepLogo } from './AnorepLogo'
import type { ClearanceLevel, ManagedOperator } from '../types'

interface OperatorManagementPageProps {
  onBack: () => void
}

type PendingAction =
  | { type: 'deactivate'; operator: ManagedOperator }
  | { type: 'delete'; operator: ManagedOperator }
  | { type: 'grant-admin'; operator: ManagedOperator }
  | { type: 'revoke-admin'; operator: ManagedOperator }

export function OperatorManagementPage({ onBack }: OperatorManagementPageProps) {
  const { session } = useAuth()
  const [operators, setOperators] = useState<ManagedOperator[]>([])
  const [message, setMessage] = useState('')
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [clearanceDraft, setClearanceDraft] = useState<Record<string, ClearanceLevel>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.isAdministrator) return

    setLoading(true)
    getOperatorsApi()
      .then(setOperators)
      .finally(() => setLoading(false))
  }, [session])

  if (!session?.isAdministrator) return null

  const isDoll = session.username === 'Doll'

  async function reload() {
    const next = await getOperatorsApi()
    setOperators(next)
  }

  async function handleClearanceChange(username: string, clearance: ClearanceLevel) {
    try {
      await updateOperatorClearanceApi(username, clearance)
      setMessage(`Clearance updated for ${username}.`)
      await reload()
    } catch {
      setMessage(`Failed to update clearance for ${username}.`)
    }
  }

  async function handleToggleDeactivate(operator: ManagedOperator) {
    if (operator.deactivated) {
      try {
        await setOperatorDeactivatedApi(operator.username, false)
        setMessage(`${operator.username} reactivated.`)
        await reload()
      } catch {
        setMessage(`Failed to reactivate ${operator.username}.`)
      }
      return
    }
    setPendingAction({ type: 'deactivate', operator })
  }

  function handleDeleteRequest(operator: ManagedOperator) {
    setPendingAction({ type: 'delete', operator })
  }

  async function confirmPendingAction() {
    if (!pendingAction) return

    try {
      if (pendingAction.type === 'deactivate') {
        await setOperatorDeactivatedApi(pendingAction.operator.username, true)
        setMessage(`${pendingAction.operator.username} deactivated.`)
      }

      if (pendingAction.type === 'delete') {
        await deleteOperatorApi(pendingAction.operator.username)
        setMessage(`${pendingAction.operator.username} permanently deleted.`)
      }

      if (pendingAction.type === 'grant-admin') {
        await setOperatorAdministratorApi(pendingAction.operator.username, true)
        setMessage(
          `${pendingAction.operator.username} granted administrator access. They may need to sign out and back in to see admin features.`,
        )
      }

      if (pendingAction.type === 'revoke-admin') {
        await setOperatorAdministratorApi(pendingAction.operator.username, false)
        setMessage(`${pendingAction.operator.username} administrator access revoked.`)
      }

      await reload()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Action failed.')
    }

    setPendingAction(null)
  }

  function pendingActionText(action: PendingAction) {
    if (action.type === 'delete') {
      return (
        <>
          Are you sure you want to permanently delete operator{' '}
          <strong>{action.operator.username}</strong>? This cannot be undone.
        </>
      )
    }

    if (action.type === 'deactivate') {
      return (
        <>
          Are you sure you want to deactivate operator{' '}
          <strong>{action.operator.username}</strong>? They will be unable to sign in.
        </>
      )
    }

    if (action.type === 'grant-admin') {
      return (
        <>
          Grant <strong>{action.operator.username}</strong> full administrator access? They will
          be able to approve sign-ups, manage operators, and delete personnel files.
        </>
      )
    }

    return (
      <>
        Remove administrator access from <strong>{action.operator.username}</strong>? They will
        keep their account at their current clearance level.
      </>
    )
  }

  return (
    <div className="screen operators-screen">
      <header className="terminal-header">
        <div className="terminal-header-brand">
          <AnorepLogo variant="header" />
          <div>
            <p className="system-id">ANOREP // OPERATOR MANAGEMENT</p>
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
        <h1>Registered Operators</h1>
        <p>
          Manage all signed-in personnel — system accounts and approved sign-ups. Grant
          administrator access to trusted operators, change clearance, deactivate accounts, or
          delete approved sign-ups.
          {isDoll && ' Access codes are visible on this terminal only.'}
        </p>
        {message && (
          <p className="success-text" role="status">
            {message}
          </p>
        )}
        {loading && <p className="hint">Loading operators...</p>}
      </section>

      {pendingAction && (
        <div className="delete-confirm panel" role="alert">
          <p className="delete-confirm-text">{pendingActionText(pendingAction)}</p>
          <div className="delete-confirm-actions">
            <button className="btn-ghost btn-reject" onClick={() => void confirmPendingAction()} type="button">
              Confirm
            </button>
            <button className="btn-ghost" onClick={() => setPendingAction(null)} type="button">
              Cancel
            </button>
          </div>
        </div>
      )}

      <section className="operators-table panel">
        {operators.length === 0 ? (
          <p className="approval-empty">No operators registered.</p>
        ) : (
          <ul className="operators-list">
            {operators.map((operator) => (
              <li
                className={`operator-row ${operator.deactivated ? 'operator-row--inactive' : ''}`}
                key={operator.username}
              >
                <div className="operator-main">
                  <p className="operator-name">
                    {operator.displayName}{' '}
                    <span className="operator-username">({operator.username})</span>
                  </p>
                  <p className="operator-meta">
                    {operator.badgeId} — {operator.source === 'system' ? 'System account' : 'Approved sign-up'}
                    {operator.isAdministrator && (
                      <span className="admin-badge operator-admin-tag"> ADMINISTRATOR</span>
                    )}
                    {operator.deactivated && (
                      <span className="operator-status-tag"> DEACTIVATED</span>
                    )}
                  </p>
                  {isDoll && operator.password && (
                    <p className="operator-password">
                      Access code: <code>{operator.password}</code>
                    </p>
                  )}
                </div>

                <div className="operator-controls">
                  <label className="approval-clearance-select">
                    Clearance
                    <select
                      disabled={!operator.canModify}
                      onChange={(event) =>
                        setClearanceDraft((current) => ({
                          ...current,
                          [operator.username]: Number(event.target.value) as ClearanceLevel,
                        }))
                      }
                      value={clearanceDraft[operator.username] ?? operator.clearance}
                    >
                      <option value={1}>1 — {CLEARANCE_LABELS[1]}</option>
                      <option value={2}>2 — {CLEARANCE_LABELS[2]}</option>
                      <option value={3}>3 — {CLEARANCE_LABELS[3]}</option>
                      <option value={4}>4 — {CLEARANCE_LABELS[4]}</option>
                      <option value={5}>5 — {CLEARANCE_LABELS[5]}</option>
                    </select>
                  </label>

                  {operator.canModify && (
                    <button
                      className="btn-ghost btn-small"
                      onClick={() =>
                        void handleClearanceChange(
                          operator.username,
                          clearanceDraft[operator.username] ?? operator.clearance,
                        )
                      }
                      type="button"
                    >
                      Save Clearance
                    </button>
                  )}

                  {operator.canGrantAdmin && (
                    <button
                      className="btn-primary btn-small"
                      onClick={() => setPendingAction({ type: 'grant-admin', operator })}
                      type="button"
                    >
                      Grant Admin
                    </button>
                  )}

                  {operator.canRevokeAdmin && (
                    <button
                      className="btn-ghost btn-reject btn-small"
                      onClick={() => setPendingAction({ type: 'revoke-admin', operator })}
                      type="button"
                    >
                      Revoke Admin
                    </button>
                  )}

                  {operator.canModify && (
                    <button
                      className="btn-ghost btn-small"
                      onClick={() => void handleToggleDeactivate(operator)}
                      type="button"
                    >
                      {operator.deactivated ? 'Reactivate' : 'Deactivate'}
                    </button>
                  )}

                  {operator.canDelete && (
                    <button
                      className="btn-ghost btn-reject btn-small"
                      onClick={() => handleDeleteRequest(operator)}
                      type="button"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
