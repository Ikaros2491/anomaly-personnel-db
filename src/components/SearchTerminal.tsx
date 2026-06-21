import { useState, type FormEvent } from 'react'
import { CLEARANCE_LABELS } from '../data/mockDatabase'
import { searchPersonnelApi } from '../api/personnel'
import { getAccessLabel } from '../data/access'
import { useAuth } from '../context/AuthContext'
import { PersonnelFile } from './PersonnelFile'
import { AnorepLogo } from './AnorepLogo'
import type { PersonnelRecord } from '../types'

interface SearchTerminalProps {
  onBack: () => void
}

export function SearchTerminal({ onBack }: SearchTerminalProps) {
  const { session } = useAuth()
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<PersonnelRecord | null>(null)
  const [searched, setSearched] = useState(false)
  const [notFoundFlash, setNotFoundFlash] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [searching, setSearching] = useState(false)

  if (!session) return null

  async function handleSearch(event: FormEvent) {
    event.preventDefault()
    setStatusMessage('')
    setSearching(true)

    try {
      const match = await searchPersonnelApi(query)
      setSearched(true)
      setResult(match)

      if (!match) {
        setNotFoundFlash(true)
        window.setTimeout(() => setNotFoundFlash(false), 1200)
      }
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className={`screen search-screen ${notFoundFlash ? 'flash-red' : ''}`}>
      <header className="terminal-header">
        <div className="terminal-header-brand">
          <AnorepLogo variant="header" />
          <div>
            <p className="system-id">ANOREP // PERSONNEL QUERY TERMINAL</p>
          <p className="system-sub">
            Operator: {session.displayName} ({session.badgeId}) —{' '}
            {session.isAdministrator ? (
              <span className="admin-badge">{getAccessLabel(session)}</span>
            ) : (
              <>
                Clearance {session.clearance} [{CLEARANCE_LABELS[session.clearance]}]
              </>
            )}
          </p>
          </div>
        </div>
        <button className="btn-ghost" onClick={onBack} type="button">
          Back to Menu
        </button>
      </header>

      <form className="search-form panel" onSubmit={handleSearch}>
        <label htmlFor="personnel-query">Search Anomalous Personnel</label>
        <div className="search-row">
          <input
            id="personnel-query"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Enter name, alias, or record ID..."
            type="text"
            value={query}
          />
          <button className="btn-primary" disabled={searching} type="submit">
            {searching ? 'Searching...' : 'Query Database'}
          </button>
        </div>
        <p className="hint">
          Search includes operator-submitted SCP files and legacy indexed records.
        </p>
      </form>

      {searched && !result && (
        <div aria-live="assertive" className="not-found panel" role="alert">
          <p className="not-found-title">NO RECORD FOUND</p>
          <p>
            Query &ldquo;{query.trim()}&rdquo; returned zero matches in the anomalous personnel
            registry.
          </p>
        </div>
      )}

      {result && (
        <PersonnelFile
          onDeleted={(deleted) => {
            setResult(null)
            setStatusMessage(`Personnel file ${deleted.id} permanently deleted from the registry.`)
          }}
          onUpdated={(updated) => {
            setResult(updated)
            setStatusMessage(`Personnel file ${updated.id} updated successfully.`)
          }}
          record={result}
          session={session}
        />
      )}

      {statusMessage && !result && (
        <p className="success-text panel" role="status">
          {statusMessage}
        </p>
      )}
    </div>
  )
}
