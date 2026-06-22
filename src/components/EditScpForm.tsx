import { useState, type ChangeEvent, type FormEvent } from 'react'
import {
  buildUpdatedPersonnelRecord,
  recordToScpSubmission,
  updatePersonnelApi,
} from '../api/personnel'
import { CLEARANCE_TAG_INSTRUCTIONS } from '../data/clearanceTags'
import type { PersonnelRecord, ScpSubmission } from '../types'
import { compressImageFile, prepareScpSubmission } from '../utils/compressImage'

interface EditScpFormProps {
  record: PersonnelRecord
  onCancel: () => void
  onSaved: (record: PersonnelRecord) => void
}

export function EditScpForm({ record, onCancel, onSaved }: EditScpFormProps) {
  const [form, setForm] = useState<ScpSubmission>(() => recordToScpSubmission(record))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function updateField<K extends keyof ScpSubmission>(key: K, value: ScpSubmission[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setError('')
  }

  async function handlePictureUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Picture must be an image file.')
      return
    }

    try {
      const compressed = await compressImageFile(file)
      updateField('picture', compressed)
    } catch {
      setError('Could not process image. Try a smaller file or a different format.')
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!record.recordUid) return

    setError('')

    if (!form.designation.trim() || !form.name.trim() || !form.role.trim()) {
      setError('Designation, name, and role are required.')
      return
    }

    if (
      !form.physicalDescription.trim() ||
      !form.anomalousAbilities.trim() ||
      !form.containmentProcedures.trim()
    ) {
      setError('All profile fields must be completed before saving.')
      return
    }

    setSubmitting(true)

    try {
      const prepared = await prepareScpSubmission(form)
      const updated = buildUpdatedPersonnelRecord(prepared, record)
      const saved = await updatePersonnelApi(record.recordUid, updated)
      onSaved(saved)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Update failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="add-form panel">
      <header className="edit-form-header">
        <h2>Edit SCP File — {record.id}</h2>
        <p>Update indexed personnel data. Clearance tags in text fields are preserved.</p>
      </header>

      <section className="clearance-tag-help panel">
        <h3>Clearance Tag Guide</h3>
        <pre className="clearance-tag-help-text">{CLEARANCE_TAG_INSTRUCTIONS}</pre>
      </section>

      <form onSubmit={handleSubmit}>
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
            <label htmlFor="edit-scp-picture-url">Picture</label>
            <input
              id="edit-scp-picture-url"
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
              rows={4}
              value={form.physicalDescription}
            />
          </label>

          <label className="form-span-2">
            Anomalous Abilities
            <textarea
              onChange={(event) => updateField('anomalousAbilities', event.target.value)}
              rows={4}
              value={form.anomalousAbilities}
            />
          </label>

          <label className="form-span-2">
            Containment Procedures (Defection)
            <textarea
              onChange={(event) => updateField('containmentProcedures', event.target.value)}
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

        <div className="form-actions">
          <button className="btn-primary" disabled={submitting} type="submit">
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
          <button className="btn-ghost" onClick={onCancel} type="button">
            Cancel
          </button>
        </div>
      </form>
    </section>
  )
}
