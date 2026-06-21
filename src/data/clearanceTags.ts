import type { ClearanceLevel } from '../types'

const CLEARANCE_TAG_PATTERN = /\[C([1-4])\]([\s\S]*?)\[\/C\1\]/gi

export const CLEARANCE_TAG_INSTRUCTIONS = `Wrap sensitive text in clearance tags so only operators at that level or higher can read it. Everyone can open the personnel file; tagged sections are redacted for lower clearances.

• [C1]text[/C1] — visible to Clearance 1+
• [C2]text[/C2] — visible to Clearance 2+
• [C3]text[/C3] — visible to Clearance 3+
• [C4]text[/C4] — visible to Clearance 4+

Example: Subject appears human. [C4]Subject is a reality bender.[/C4] Operators below CL4 will see [REDACTED] in place of the tagged sentence.`

export function applyClearanceTags(
  text: string,
  clearance: ClearanceLevel | number,
  isAdministrator: boolean,
): string {
  if (isAdministrator) {
    return stripClearanceTags(text)
  }

  return text.replace(CLEARANCE_TAG_PATTERN, (_match, level: string, content: string) => {
    const requiredClearance = Number(level)
    return clearance >= requiredClearance ? content : '[REDACTED]'
  })
}

export function stripClearanceTags(text: string): string {
  return text.replace(CLEARANCE_TAG_PATTERN, (_match, _level, content) => content)
}
