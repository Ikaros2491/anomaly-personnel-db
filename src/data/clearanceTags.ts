import type { ClearanceLevel } from '../types'

const CLEARANCE_TAG_PATTERN = /\[C([1-4])\]([\s\S]*?)\[\/C\1\]/gi

export const CLEARANCE_TAG_INSTRUCTIONS = `Wrap sensitive text in clearance tags so only operators at that level or higher can read it. Everyone can open the personnel file; tagged sections are blacked out for lower clearances (SCP-style redaction bars).

• [C1]text[/C1] — visible to Clearance 1+
• [C2]text[/C2] — visible to Clearance 2+
• [C3]text[/C3] — visible to Clearance 3+
• [C4]text[/C4] — visible to Clearance 4+

Example: Subject appears human. [C4]Subject is a reality bender.[/C4] Operators below CL4 will see a black redaction bar instead of the tagged sentence.`

export type ClearanceTextSegment =
  | { type: 'text'; value: string }
  | { type: 'redacted'; length: number }

function redactionLength(content: string) {
  const compact = content.replace(/\s+/g, ' ').trim()
  return Math.max(compact.length, 3)
}

/** Split clearance-tagged text into visible text and redacted spans (no secret text in redacted segments). */
export function parseClearanceTaggedText(
  text: string,
  clearance: ClearanceLevel | number,
  isAdministrator: boolean,
): ClearanceTextSegment[] {
  if (isAdministrator) {
    return [{ type: 'text', value: stripClearanceTags(text) }]
  }

  const segments: ClearanceTextSegment[] = []
  let lastIndex = 0
  const pattern = new RegExp(CLEARANCE_TAG_PATTERN.source, 'gi')

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, index) })
    }

    const requiredClearance = Number(match[1])
    const content = match[2] ?? ''
    if (clearance >= requiredClearance) {
      segments.push({ type: 'text', value: content })
    } else {
      segments.push({ type: 'redacted', length: redactionLength(content) })
    }

    lastIndex = index + match[0].length
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }

  if (segments.length === 0) {
    return [{ type: 'text', value: text }]
  }

  return segments
}

/** @deprecated Prefer parseClearanceTaggedText for UI rendering */
export function applyClearanceTags(
  text: string,
  clearance: ClearanceLevel | number,
  isAdministrator: boolean,
): string {
  return parseClearanceTaggedText(text, clearance, isAdministrator)
    .map((segment) =>
      segment.type === 'text' ? segment.value : '█'.repeat(Math.min(segment.length, 24)),
    )
    .join('')
}

export function stripClearanceTags(text: string): string {
  return text.replace(CLEARANCE_TAG_PATTERN, (_match, _level, content) => content)
}
