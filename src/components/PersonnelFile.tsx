import { useEffect, useState } from 'react'
import { deletePersonnelApi, isUserCreatedRecordApi } from '../api/personnel'
import { applyClearanceTags } from '../data/clearanceTags'
import { getAccessLabel } from '../data/access'
import type { AuthSession, PersonnelField, PersonnelRecord } from '../types'

interface PersonnelFileProps {
  record: PersonnelRecord
  session: AuthSession
  onDeleted?: (record: PersonnelRecord) => void
}

function renderClearanceTaggedText(text: string, clearance: number, isAdministrator: boolean) {
  const parsed = applyClearanceTags(text, clearance, isAdministrator)
  const parts = parsed.split(/(\[REDACTED\])/g)

  return parts.map((part, index) =>
    part === '[REDACTED]' ? (
      <span className="redacted" key={`redacted-${index}`}>
        [REDACTED]
      </span>
    ) : (
      <span key={`text-${index}`}>{part}</span>
    ),
  )
}

function FieldRow({ field, session }: { field: PersonnelField; session: AuthSession }) {
  return (
    <div className="field-row">
      <dt>{field.label}</dt>
      <dd>
        {renderClearanceTaggedText(field.value, session.clearance, session.isAdministrator)}
      </dd>
    </div>
  )
}

export function PersonnelFile({ record, session, onDeleted }: PersonnelFileProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [canDelete, setCanDelete] = useState(false)
  const showPicture = Boolean(record.picture)
  const accessLabel = getAccessLabel(session)

  useEffect(() => {
    if (!session.isAdministrator || !record.recordUid) {
      setCanDelete(false)
      return
    }

    isUserCreatedRecordApi(record.recordUid)
      .then(setCanDelete)
      .catch(() => setCanDelete(false))
  }, [session.isAdministrator, record.recordUid])

  async function handleConfirmDelete() {
    if (!record.recordUid) return

    try {
      await deletePersonnelApi(record.recordUid)
      setConfirmingDelete(false)
      onDeleted?.(record)
    } catch {
      setConfirmingDelete(false)
    }
  }

  return (
    <article className="personnel-file panel">
      <header className="file-header">
        <div className="file-header-main">
          {showPicture && (
            <div className="file-photo">
              <img alt={`Photo of ${record.name}`} src={record.picture} />
            </div>
          )}
          <div>
            <p className="file-label">
              {record.isUserCreated ? 'Operator-Submitted Personnel File' : 'Personnel File Retrieved'}
            </p>
            <h2>{record.name}</h2>
            <p className="file-id">Record ID: {record.id}</p>
            {record.createdBy && (
              <p className="file-meta">Filed by {record.createdBy}</p>
            )}
          </div>
        </div>
        <div className={`clearance-badge ${session.isAdministrator ? 'clearance-badge--admin' : ''}`}>
          {session.isAdministrator ? (
            <>Access Level: {accessLabel}</>
          ) : (
            <>Your Clearance: {session.clearance} — {accessLabel}</>
          )}
        </div>
      </header>

      <dl className="field-list">
        {record.fields.map((field) => (
          <FieldRow field={field} key={field.label} session={session} />
        ))}
      </dl>

      {canDelete && (
        <footer className="file-admin-actions">
          {!confirmingDelete ? (
            <button
              className="btn-ghost btn-reject"
              onClick={() => setConfirmingDelete(true)}
              type="button"
            >
              Delete File
            </button>
          ) : (
            <div className="delete-confirm" role="alert">
              <p className="delete-confirm-text">
                Are you sure you want to permanently delete this personnel file? This action
                cannot be undone.
              </p>
              <div className="delete-confirm-actions">
                <button className="btn-ghost btn-reject" onClick={() => void handleConfirmDelete()} type="button">
                  Confirm Delete
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => setConfirmingDelete(false)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </footer>
      )}
    </article>
  )
}
