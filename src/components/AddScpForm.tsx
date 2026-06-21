import { useState, type ChangeEvent, type FormEvent } from 'react'
import {
  addApprovedPersonnel,
  buildPersonnelRecord,
  submitPersonnelForApproval,
} from '../data/personnelStorage'
import { useAuth } from '../context/AuthContext'
import { AnorepLogo } from './AnorepLogo'
import { CLEARANCE_TAG_INSTRUCTIONS } from '../data/clearanceTags'
import { EMPTY_SCP_SUBMISSION, type ScpSubmission } from '../types'

interface AddScpFormProps {
  onBack: () => void
}

export function AddScpForm({ onBack }: AddScpFormProps) {
  const { session } = useAuth()
  const [form, setForm] = useState<ScpSubmission>(EMPTY_SCP_SUBMISSION)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!session) return null

  function updateField<K extends keyof ScpSubmission>(key: K, value: ScpSubmission[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setError('')
    setSuccess('')
  }

  function handlePictureUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Picture must be an image file.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateField('picture', reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!session) return

    setError('')
    setSuccess('')

    if (!form.designation.trim() || !form.name.trim() || !form.role.trim()) {
      setError('Designation, name, and role are required.')
      return
    }

    if (
      !form.physicalDescription.trim() ||
      !form.anomalousAbilities.trim() ||
      !form.containmentProcedures.trim()
    ) {
      setError('All profile fields must be completed before filing.')
      return
    }

    const record = buildPersonnelRecord(form, session.displayName)

    if (session.isAdministrator) {
      addApprovedPersonnel(record)
      setSuccess(`SCP file ${record.id} registered and indexed immediately.`)
    } else {
      submitPersonnelForApproval(record, session.displayName)
      setSuccess(
        `SCP file ${record.id} submitted for administrator approval. It will not appear in search until approved.`,
      )
    }

    setForm(EMPTY_SCP_SUBMISSION)
  }

  return (
    <div className="screen add-screen">
      <header className="terminal-header">
        <div className="terminal-header-brand">
          <AnorepLogo variant="header" />
          <div>
            <p className="system-id">ANOREP // SCP REGISTRATION</p>
            <p className="system-sub">
              Personnel File Registration — Operator: {session.displayName}
              {session.isAdministrator && ' — Administrator Override'}
            </p>
          </div>
        </div>
        <button className="btn-ghost" onClick={onBack} type="button">
          Back to Menu
        </button>
      </header>

      <section className="add-intro panel">
        <h1>Register New SCP File</h1>
        <p>
          All submitted records use a uniform personnel file format. Personnel files are visible
          to all clearance levels — use clearance tags inside text fields to redact sensitive
          details from lower-level operators.
          {session.isAdministrator
            ? ' Administrator submissions are indexed immediately.'
            : ' Files are sent to the administrator approval queue before becoming searchable.'}
        </p>
      </section>

      <section className="clearance-tag-help panel">
        <h2>Clearance Tag Guide</h2>
        <pre className="clearance-tag-help-text">{CLEARANCE_TAG_INSTRUCTIONS}</pre>
      </section>

      <form className="add-form panel" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            SCP Designation
            <input
              onChange={(event) => updateField('designation', event.target.value)}
              placeholder='e.g. SCP-████ or AP-2201'
              type="text"
              value={form.designation}
            />
          </label>

          <label>
            Name of SCP
            <input
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="Subject or entity name"
              type="text"
              value={form.name}
            />
          </label>

          <label className="form-span-2">
            Role / Position
            <input
              onChange={(event) => updateField('role', event.target.value)}
              placeholder="Assigned role, rank, or operational position"
              type="text"
              value={form.role}
            />
          </label>

          <div className="form-span-2 picture-field">
            <label htmlFor="scp-picture-url">Picture</label>
            <input
              id="scp-picture-url"
              onChange={(event) => updateField('picture', event.target.value)}
              placeholder="Paste image URL or upload below"
              type="url"
              value={form.picture.startsWith('data:') ? '' : form.picture}
            />
            <label className="file-upload">
              Upload image
              <input accept="image/*" onChange={handlePictureUpload} type="file" />
            </label>
            {form.picture && (
              <div className="picture-preview">
                <img alt={`Preview of ${form.name || 'SCP'}`} src={form.picture} />
                <button
                  className="btn-ghost btn-small"
                  onClick={() => updateField('picture', '')}
                  type="button"
                >
                  Remove picture
                </button>
              </div>
            )}
          </div>

          <label className="form-span-2">
            Physical Description
            <textarea
              onChange={(event) => updateField('physicalDescription', event.target.value)}
              placeholder="Height, build, attire... Use [C2]...[/C2] to hide details from CL1 operators."
              rows={4}
              value={form.physicalDescription}
            />
          </label>

          <label className="form-span-2">
            Anomalous Abilities
            <textarea
              onChange={(event) => updateField('anomalousAbilities', event.target.value)}
              placeholder="Documented traits... Example: [C4]Reality alteration within 12m.[/C4]"
              rows={4}
              value={form.anomalousAbilities}
            />
          </label>

          <label className="form-span-2">
            Containment Procedures (Defection)
            <textarea
              onChange={(event) => updateField('containmentProcedures', event.target.value)}
              placeholder="Protocols if subject defects... Use [C3]...[/C3] or [C4]...[/C4] for classified steps."
              rows={4}
              value={form.containmentProcedures}
            />
          </label>
        </div>

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

        <div className="form-actions">
          <button className="btn-primary" type="submit">
            {session.isAdministrator ? 'Register SCP File' : 'Submit for Approval'}
          </button>
          <button className="btn-ghost" onClick={onBack} type="button">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
