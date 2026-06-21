import { diagnostic } from './diagnostics.ts'
import type { CssxDiagnostic, SelectorParseResult } from './types.ts'

const PART_RE = /::?part\(([^)]+)\)/
const CLASS_RE = /\.([_a-zA-Z][-_a-zA-Z0-9]*)/g
const TAG_RE = /^[_a-zA-Z][-_a-zA-Z0-9]*/
const PSEUDO_PARTS: Record<string, string> = {
  ':hover': 'hover',
  ':active': 'active'
}

export function parseSelector (selector: string, position?: { line?: number, column?: number }): {
  result?: SelectorParseResult
  diagnostic?: CssxDiagnostic
} {
  const original = selector.trim()
  let current = original
  let part: string | null = null

  const partMatch = current.match(PART_RE)
  if (partMatch) {
    part = partMatch[1].trim()
    current = (
      current.slice(0, partMatch.index) +
      current.slice((partMatch.index ?? 0) + partMatch[0].length)
    ).trim()
  } else {
    for (const pseudo of Object.keys(PSEUDO_PARTS)) {
      if (current.endsWith(pseudo)) {
        part = PSEUDO_PARTS[pseudo]
        current = current.slice(0, -pseudo.length).trim()
        break
      }
    }
  }

  if (
    current.includes(' ') ||
    current.includes('>') ||
    current.includes('+') ||
    current.includes('~') ||
    current.includes('[') ||
    current.includes('#') ||
    current.includes(':')
  ) {
    return unsupported(original, position)
  }

  const tagMatch = current.startsWith('.') ? null : current.match(TAG_RE)
  const tag = tagMatch?.[0] ?? null
  const classPart = tag == null ? current : current.slice(tag.length)

  if (classPart && !classPart.startsWith('.')) {
    return unsupported(original, position)
  }

  const classes: string[] = []
  CLASS_RE.lastIndex = 0
  let consumed = ''
  let match: RegExpExecArray | null
  while ((match = CLASS_RE.exec(classPart)) != null) {
    classes.push(match[1])
    consumed += match[0]
  }

  if (consumed !== classPart || (tag == null && classes.length === 0)) {
    return unsupported(original, position)
  }

  return {
    result: {
      selector: original,
      tag,
      classes,
      part,
      specificity: classes.length
    }
  }
}

function unsupported (selector: string, position?: { line?: number, column?: number }) {
  return {
    diagnostic: diagnostic(
      'UNSUPPORTED_SELECTOR',
      `Unsupported selector "${selector}" ignored. CSSX supports class selectors, component tag selectors, and :part()/:hover/:active only.`,
      'warning',
      position
    )
  }
}
