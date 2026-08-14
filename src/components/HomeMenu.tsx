import { useEffect, useState } from 'react'
import { getMyClearanceRequestApi, getPendingClearanceRequestsApi } from '../api/clearanceRequests'
import { getOperatorsApi } from '../api/operators'
import { getPersonnelStatsApi } from '../api/personnel'
import { canRegisterScp, getAccessLabel } from '../data/access'
import { useAuth } from '../context/AuthContext'
import { AnorepLogo } from './AnorepLogo'
import type { AppView } from '../types'

interface HomeMenuProps {
  onNavigate: (view: AppView) => void
}

export function HomeMenu({ onNavigate }: HomeMenuProps) {
  const { session, logout } = useAuth()
  const [userCreatedCount, setUserCreatedCount] = useState(0)
  const [pendingApprovals, setPendingApprovals] = useState(0)
  const [operatorCount, setOperatorCount] = useState(0)
  const [hasPendingClearanceRequest, setHasPendingClearanceRequest] = useState(false)

  useEffect(() => {
    if (!session) return

    getPersonnelStatsApi()
      .then((stats) => setUserCreatedCount(stats.approvedUserCreated))
      .catch(() => setUserCreatedCount(0))

    if (session.isAdministrator) {
      Promise.all([
        getPendingClearanceRequestsApi(),
        getPersonnelStatsApi(),
        getOperatorsApi(),
      ])
        .then(([requests, stats, operators]) => {
          setPendingApprovals(requests.length + stats.pending)
          setOperatorCount(operators.length)
        })
        .catch(() => {
          setPendingApprovals(0)
          setOperatorCount(0)
        })
    } else {
      getMyClearanceRequestApi()
        .then((request) => setHasPendingClearanceRequest(Boolean(request)))
        .catch(() => setHasPendingClearanceRequest(false))
    }
  }, [session])

  if (!session) return null

  const canManageRecords = canRegisterScp(session)
  const accessLabel = getAccessLabel(session)

  return (
    <div className="screen home-screen">
      <header className="terminal-header">
        <div className="terminal-header-brand">
          <AnorepLogo variant="header" />
          <div>
            <p className="system-id">ANOREP // OPERATOR HOME</p>
            <p className="system-sub">
              Welcome, {session.displayName} ({session.badgeId}) —{' '}
              {session.isAdministrator ? (
                <span className="admin-badge">{accessLabel}</span>
              ) : (
                <>Clearance {session.clearance} [{accessLabel}]</>
              )}
            </p>
          </div>
        </div>
        <button className="btn-ghost" onClick={() => void logout()} type="button">
          Terminate Session
        </button>
      </header>

      <section className="home-intro panel">
        <h1>Main Menu</h1>
        <p>
          Select an authorized function below. Personnel queries are available at your current
          clearance level.
          {session.isAdministrator
            ? ' Administrator access grants full system visibility, approval authority, and file registration privileges.'
            : canManageRecords
              ? ' As a CL2+ operator, you may register new SCP personnel files pending administrator approval.'
              : ' CL2 clearance is required to register new SCP files. Request higher clearance below.'}
        </p>
        {userCreatedCount > 0 && (
          <p className="home-stat">
            {userCreatedCount} approved operator-submitted file{userCreatedCount === 1 ? '' : 's'}{' '}
            indexed
          </p>
        )}
      </section>

      <nav aria-label="Main menu" className="home-menu">
        <button className="menu-card panel" onClick={() => onNavigate('search')} type="button">
          <span className="menu-card-label">Personnel Search</span>
          <strong>Query Anomalous Personnel</strong>
          <p>Search the registry by name, alias, or SCP designation.</p>
        </button>

        {canManageRecords ? (
          <button
            className={`menu-card panel ${session.isAdministrator ? 'menu-card--admin' : 'menu-card--privileged'}`}
            onClick={() => onNavigate('add')}
            type="button"
          >
            <span className="menu-card-label">
              {session.isAdministrator ? 'Administrator' : 'CL2+ Access'}
            </span>
            <strong>Register New SCP File</strong>
            <p>
              Submit a new personnel record with designation, profile, abilities, and containment
              data.
            </p>
          </button>
        ) : (
          <div aria-disabled="true" className="menu-card panel menu-card--locked">
            <span className="menu-card-label">Restricted</span>
            <strong>Register New SCP File</strong>
            <p>CL2 clearance required. Request higher clearance from the menu card below.</p>
          </div>
        )}

        {!session.isAdministrator && (
          <button
            className="menu-card panel menu-card--privileged"
            onClick={() => onNavigate('clearance')}
            type="button"
          >
            <span className="menu-card-label">
              Operator Access
              {hasPendingClearanceRequest && <span className="pending-badge">1</span>}
            </span>
            <strong>Request Higher Clearance</strong>
            <p>
              Request elevated clearance and/or Containment Access. Include your name, rank, job, and
              justification for administrator review.
            </p>
          </button>
        )}

        {session.isAdministrator && (
          <>
            <button
              className="menu-card panel menu-card--admin"
              onClick={() => onNavigate('approve')}
              type="button"
            >
              <span className="menu-card-label">
                Administrator
                {pendingApprovals > 0 && (
                  <span className="pending-badge">{pendingApprovals}</span>
                )}
              </span>
              <strong>Approval Queue</strong>
              <p>
                Review clearance elevation requests and user-submitted anomaly files before they
                go live.
              </p>
            </button>

            <button
              className="menu-card panel menu-card--admin"
              onClick={() => onNavigate('operators')}
              type="button"
            >
              <span className="menu-card-label">Administrator — {operatorCount} operators</span>
              <strong>Operator Management</strong>
              <p>
                View registered personnel, change clearance, grant Containment Access, deactivate
                accounts, or delete operators.
              </p>
            </button>
          </>
        )}
      </nav>
    </div>
  )
}
