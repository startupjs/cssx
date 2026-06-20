import { diagnostic } from './diagnostics.js'
const PART_RE = /::?part\(([^)]+)\)$/
const PSEUDO_PARTS = {
  ':hover': 'hover',
  ':active': 'active'
}
export function parseSelector (selector, position) {
  const original = selector.trim()
  let current = original
  let part = null
  const partMatch = current.match(PART_RE)
  if (partMatch) {
    part = partMatch[1].trim()
    current = current.slice(0, partMatch.index).trim()
  } else {
    for (const pseudo of Object.keys(PSEUDO_PARTS)) {
      if (current.endsWith(pseudo)) {
        part = PSEUDO_PARTS[pseudo]
        current = current.slice(0, -pseudo.length).trim()
        break
      }
    }
  }
  if (!current.startsWith('.')) {
    return unsupported(original, position)
  }
  if (current.includes(' ') ||
        current.includes('>') ||
        current.includes('+') ||
        current.includes('~') ||
        current.includes('[') ||
        current.includes('#') ||
        current.includes(':')) {
    return unsupported(original, position)
  }
  const classes = current.split('.').filter(Boolean)
  if (classes.length === 0 || classes.some(name => !/^[_a-zA-Z][-_a-zA-Z0-9]*$/.test(name))) {
    return unsupported(original, position)
  }
  return {
    result: {
      selector: original,
      classes,
      part,
      specificity: classes.length
    }
  }
}
function unsupported (selector, position) {
  return {
    diagnostic: diagnostic('UNSUPPORTED_SELECTOR', `Unsupported selector "${selector}" ignored. CSSX supports class combinations and :part()/:hover/:active only.`, 'warning', position)
  }
}
