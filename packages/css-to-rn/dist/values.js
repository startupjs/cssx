import { diagnostic } from './diagnostics.js'
const DYNAMIC_SLOT_RE = /var\(\s*--__cssx_dynamic_(\d+)\s*\)/g
const VAR_NAME_RE = /^--[A-Za-z0-9_-]+$/
const VIEWPORT_UNIT_RE = /(^|[^\w.-])([+-]?(?:\d*\.)?\d+)(vh|vw|vmin|vmax)\b/g
const U_UNIT_RE = /(^|[^\w.-])([+-]?(?:\d*\.)?\d+)u\b/g
const CALC_RE = /calc\(/g
export function resolveCssValue (input, options = {}) {
  const diagnostics = []
  const dependencies = {
    vars: new Set(),
    dimensions: false
  }
  const maxVarDepth = options.maxVarDepth ?? 20
  const interpolation = replaceDynamicSlots(input, options.values ?? [], diagnostics)
  if (!interpolation.valid) {
    return invalid(diagnostics, dependencies)
  }
  const variableResolution = resolveVars(interpolation.value, options, dependencies.vars, diagnostics, [], maxVarDepth)
  if (!variableResolution.valid) {
    return invalid(diagnostics, dependencies)
  }
  const units = resolveUnits(variableResolution.value, options, dependencies)
  const calc = resolveCalcs(units.value, diagnostics)
  if (!calc.valid) {
    return invalid(diagnostics, dependencies)
  }
  return {
    value: calc.value.trim(),
    valid: true,
    dependencies: serializeDependencies(dependencies),
    diagnostics
  }
}
function replaceDynamicSlots (input, values, diagnostics) {
  DYNAMIC_SLOT_RE.lastIndex = 0
  let valid = true
  const value = input.replace(DYNAMIC_SLOT_RE, (_match, rawIndex) => {
    const index = Number(rawIndex)
    const interpolation = values[index]
    if (typeof interpolation === 'string') { return interpolation }
    if (typeof interpolation === 'number') { return String(interpolation) }
    if (interpolation === null || interpolation === undefined || interpolation === false) {
      diagnostics.push(diagnostic('INVALID_INTERPOLATION_VALUE', `Interpolation slot ${index} resolved to an omitted value, so the declaration is invalid.`, 'warning'))
      valid = false
      return ''
    }
    diagnostics.push(diagnostic('INVALID_INTERPOLATION_VALUE', `Interpolation slot ${index} resolved to unsupported value type "${typeof interpolation}".`, 'warning'))
    valid = false
    return ''
  })
  return valid ? { valid: true, value } : { valid: false }
}
function resolveVars (input, options, deps, diagnostics, stack, maxDepth) {
  if (stack.length > maxDepth) {
    diagnostics.push(diagnostic('VARIABLE_DEPTH_LIMIT', `CSS variable resolution exceeded max depth ${maxDepth}.`, 'warning'))
    return { valid: false }
  }
  let output = input
  while (true) {
    const start = output.indexOf('var(')
    if (start === -1) { return { valid: true, value: output } }
    const open = start + 3
    const close = findMatchingParen(output, open)
    if (close === -1) {
      diagnostics.push(diagnostic('UNRESOLVED_VARIABLE', 'Malformed var() expression.', 'warning'))
      return { valid: false }
    }
    const body = output.slice(open + 1, close)
    const parts = splitTopLevelComma(body)
    const name = parts[0]?.trim()
    if (!name || !VAR_NAME_RE.test(name)) {
      diagnostics.push(diagnostic('UNRESOLVED_VARIABLE', `Invalid CSS variable name "${name ?? ''}".`, 'warning'))
      return { valid: false }
    }
    deps.add(name)
    if (stack.includes(name)) {
      diagnostics.push(diagnostic('VARIABLE_CYCLE', `CSS variable cycle detected: ${stack.concat(name).join(' -> ')}.`, 'warning'))
      return { valid: false }
    }
    const fallback = parts.length > 1 ? parts.slice(1).join(',').trim() : undefined
    const rawReplacement = valueFromRecord(options.variables, name) ??
            valueFromRecord(options.defaultVariables, name) ??
            fallback
    if (rawReplacement === undefined) {
      diagnostics.push(diagnostic('UNRESOLVED_VARIABLE', `CSS variable "${name}" is not defined and has no fallback.`, 'warning'))
      return { valid: false }
    }
    const nested = resolveVars(String(rawReplacement), options, deps, diagnostics, stack.concat(name), maxDepth)
    if (!nested.valid) { return { valid: false } }
    output = output.slice(0, start) + nested.value + output.slice(close + 1)
  }
}
function resolveUnits (input, options, dependencies) {
  let value = input.replace(U_UNIT_RE, (_match, prefix, rawNumber) => {
    return `${prefix}${Number(rawNumber) * 8}px`
  })
  const width = options.dimensions?.width ?? 0
  const height = options.dimensions?.height ?? 0
  value = value.replace(VIEWPORT_UNIT_RE, (_match, prefix, rawNumber, unit) => {
    dependencies.dimensions = true
    const number = Number(rawNumber)
    const basis = unit === 'vw'
      ? width
      : unit === 'vh'
        ? height
        : unit === 'vmin'
          ? Math.min(width, height)
          : Math.max(width, height)
    return `${prefix}${number * basis / 100}px`
  })
  return { value }
}
function resolveCalcs (input, diagnostics) {
  let output = input
  CALC_RE.lastIndex = 0
  while (true) {
    const start = output.indexOf('calc(')
    if (start === -1) { return { valid: true, value: output } }
    const open = start + 4
    const close = findMatchingParen(output, open)
    if (close === -1) {
      diagnostics.push(diagnostic('UNSUPPORTED_CALC', 'Malformed calc() expression.', 'warning'))
      return { valid: false }
    }
    const expression = output.slice(open + 1, close).trim()
    const result = evaluateCalc(expression)
    if (result == null) {
      diagnostics.push(diagnostic('UNSUPPORTED_CALC', `Unsupported calc() expression "${expression}".`, 'warning'))
      return { valid: false }
    }
    output = output.slice(0, start) + String(result) + output.slice(close + 1)
  }
}
function evaluateCalc (expression) {
  if (expression.includes('%')) { return null }
  const hasPx = /(?:^|[^\w.-])[+-]?(?:\d*\.)?\d+px\b/.test(expression)
  const normalized = expression.replace(/([+-]?(?:\d*\.)?\d+)px\b/g, '$1')
  if (!/^[0-9+\-*/().\s]+$/.test(normalized)) { return null }
  let index = 0
  const skipWhitespace = () => {
    while (/\s/.test(normalized[index] ?? '')) { index++ }
  }
  const parseNumber = () => {
    skipWhitespace()
    const match = normalized.slice(index).match(/^(?:(?:\d+\.\d+)|(?:\d+\.)|(?:\.\d+)|(?:\d+))/)
    if (match == null) { return null }
    index += match[0].length
    return Number(match[0])
  }
  const parseFactor = () => {
    skipWhitespace()
    if (normalized[index] === '+') {
      index++
      return parseFactor()
    }
    if (normalized[index] === '-') {
      index++
      const value = parseFactor()
      return value == null ? null : -value
    }
    if (normalized[index] === '(') {
      index++
      const value = parseAdditive()
      skipWhitespace()
      if (normalized[index] !== ')') { return null }
      index++
      return value
    }
    return parseNumber()
  }
  const parseMultiplicative = () => {
    let value = parseFactor()
    if (value == null) { return null }
    while (true) {
      skipWhitespace()
      const operator = normalized[index]
      if (operator !== '*' && operator !== '/') { return value }
      index++
      const right = parseFactor()
      if (right == null) { return null }
      value = operator === '*' ? value * right : value / right
    }
  }
  function parseAdditive () {
    let value = parseMultiplicative()
    if (value == null) { return null }
    while (true) {
      skipWhitespace()
      const operator = normalized[index]
      if (operator !== '+' && operator !== '-') { return value }
      index++
      const right = parseMultiplicative()
      if (right == null) { return null }
      value = operator === '+' ? value + right : value - right
    }
  }
  const result = parseAdditive()
  skipWhitespace()
  return result != null && index === normalized.length && Number.isFinite(result)
    ? hasPx ? `${result}px` : String(result)
    : null
}
function findMatchingParen (input, openIndex) {
  let depth = 0
  for (let index = openIndex; index < input.length; index++) {
    const char = input[index]
    if (char === '(') { depth++ }
    if (char === ')') {
      depth--
      if (depth === 0) { return index }
    }
  }
  return -1
}
function splitTopLevelComma (input) {
  const parts = []
  let depth = 0
  let start = 0
  for (let index = 0; index < input.length; index++) {
    const char = input[index]
    if (char === '(') { depth++ }
    if (char === ')') { depth-- }
    if (char === ',' && depth === 0) {
      parts.push(input.slice(start, index))
      start = index + 1
    }
  }
  parts.push(input.slice(start))
  return parts
}
function valueFromRecord (record, key) {
  if (!record || !Object.prototype.hasOwnProperty.call(record, key)) { return undefined }
  return record[key]
}
function serializeDependencies (dependencies) {
  return {
    vars: Array.from(dependencies.vars).sort(),
    dimensions: dependencies.dimensions
  }
}
function invalid (diagnostics, dependencies) {
  return {
    valid: false,
    dependencies: serializeDependencies(dependencies),
    diagnostics
  }
}
