import { colordx, extend } from '@colordx/core'
import names from '@colordx/core/plugins/names'

extend([names])

const COLOR_FUNCTIONS = ['color-mix', 'oklch', 'oklab']

export function evaluateCssColors (input: string): string {
  let output = ''
  let index = 0

  while (index < input.length) {
    const next = findNextColorFunction(input, index)
    if (next == null) {
      output += input.slice(index)
      break
    }

    output += input.slice(index, next.start)

    const open = next.start + next.name.length
    const close = findMatchingParen(input, open)
    if (close === -1) {
      output += input.slice(next.start)
      break
    }

    const raw = input.slice(next.start, close + 1)
    const body = input.slice(open + 1, close)
    const replacement = next.name === 'color-mix'
      ? evaluateColorMix(body)
      : normalizeColor(raw)

    output += replacement ?? raw
    index = close + 1
  }

  return output
}

export function isCssColor (input: string): boolean {
  const color = colordx(evaluateCssColors(input.trim()))
  return color.isValid()
}

function evaluateColorMix (body: string): string | null {
  const parts = splitTopLevelComma(body).map(part => part.trim()).filter(Boolean)
  if (parts.length !== 3) return null

  const spaceMatch = parts[0].match(/^in\s+([_a-zA-Z][_a-zA-Z0-9-]*)/i)
  if (!spaceMatch) return null

  const first = parseColorStop(parts[1])
  const second = parseColorStop(parts[2])
  const weights = normalizeWeights(first.weight, second.weight)
  const colorA = colordx(evaluateCssColors(first.color))
  const colorB = colordx(evaluateCssColors(second.color))

  if (!colorA.isValid() || !colorB.isValid()) return null

  const space = spaceMatch[1].toLowerCase()
  if (space === 'oklch') {
    return mixOklch(colorA, colorB, weights.first)
  }

  if (space === 'oklab') {
    return mixOklab(colorA, colorB, weights.first)
  }

  if (space === 'srgb' || space === 'rgb') {
    return mixRgb(colorA, colorB, weights.first)
  }

  return null
}

function parseColorStop (input: string): { color: string, weight?: number } {
  const tokens = splitTopLevelWhitespace(input.trim())
  const last = tokens[tokens.length - 1]
  if (last?.endsWith('%')) {
    const weight = Number(last.slice(0, -1))
    if (Number.isFinite(weight)) {
      return {
        color: tokens.slice(0, -1).join(' '),
        weight: weight / 100
      }
    }
  }

  return {
    color: input.trim()
  }
}

function normalizeWeights (
  rawFirst: number | undefined,
  rawSecond: number | undefined
): { first: number, second: number } {
  const first = rawFirst ?? (rawSecond == null ? 0.5 : 1 - rawSecond)
  const second = rawSecond ?? (rawFirst == null ? 0.5 : 1 - rawFirst)
  const total = first + second

  if (!Number.isFinite(total) || total <= 0) {
    return { first: 0.5, second: 0.5 }
  }

  return {
    first: clamp(first / total, 0, 1),
    second: clamp(second / total, 0, 1)
  }
}

function mixRgb (
  colorA: ReturnType<typeof colordx>,
  colorB: ReturnType<typeof colordx>,
  firstWeight: number
): string {
  const a = colorA.toRgb()
  const b = colorB.toRgb()
  const secondWeight = 1 - firstWeight
  const alphaValue = alpha(a.alpha * firstWeight + b.alpha * secondWeight)

  if (alphaValue === 0) {
    return rgbaString({ r: 0, g: 0, b: 0, alpha: 0 })
  }

  return rgbaString({
    r: round((a.r * a.alpha * firstWeight + b.r * b.alpha * secondWeight) / alphaValue),
    g: round((a.g * a.alpha * firstWeight + b.g * b.alpha * secondWeight) / alphaValue),
    b: round((a.b * a.alpha * firstWeight + b.b * b.alpha * secondWeight) / alphaValue),
    alpha: alphaValue
  })
}

function mixOklab (
  colorA: ReturnType<typeof colordx>,
  colorB: ReturnType<typeof colordx>,
  firstWeight: number
): string | null {
  const a = colorA.toOklab()
  const b = colorB.toOklab()
  const secondWeight = 1 - firstWeight
  return normalizeColor(
    `oklab(${mix(a.l, b.l, firstWeight)} ${mix(a.a, b.a, firstWeight)} ${mix(a.b, b.b, firstWeight)} / ${mix(a.alpha, b.alpha, firstWeight, secondWeight)})`
  )
}

function mixOklch (
  colorA: ReturnType<typeof colordx>,
  colorB: ReturnType<typeof colordx>,
  firstWeight: number
): string | null {
  const a = colorA.toOklch()
  const b = colorB.toOklch()
  const secondWeight = 1 - firstWeight
  const hue = mixHue(a.h, b.h, firstWeight)
  return normalizeColor(
    `oklch(${mix(a.l, b.l, firstWeight)} ${mix(a.c, b.c, firstWeight)} ${hue} / ${mix(a.alpha, b.alpha, firstWeight, secondWeight)})`
  )
}

function normalizeColor (input: string): string | null {
  const color = colordx(input)
  return color.isValid() ? rgbaString(color.toRgb()) : null
}

function rgbaString (input: { r: number, g: number, b: number, alpha: number }): string {
  return `rgba(${round(input.r)}, ${round(input.g)}, ${round(input.b)}, ${alpha(input.alpha)})`
}

function mix (
  first: number,
  second: number,
  firstWeight: number,
  secondWeight = 1 - firstWeight
): number {
  return first * firstWeight + second * secondWeight
}

function mixHue (first: number, second: number, firstWeight: number): number {
  let delta = second - first
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360
  return (first + delta * (1 - firstWeight) + 360) % 360
}

function round (value: number): number {
  return Math.round(clamp(value, 0, 255))
}

function alpha (value: number): number {
  return Math.round(clamp(value, 0, 1) * 1000) / 1000
}

function clamp (value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function findNextColorFunction (
  input: string,
  fromIndex: number
): { name: string, start: number } | null {
  let best: { name: string, start: number } | null = null

  for (const name of COLOR_FUNCTIONS) {
    const start = input.indexOf(`${name}(`, fromIndex)
    if (start === -1) continue
    if (best == null || start < best.start) best = { name, start }
  }

  return best
}

function findMatchingParen (input: string, openIndex: number): number {
  let depth = 0
  for (let index = openIndex; index < input.length; index++) {
    const char = input[index]
    if (char === '(') depth++
    if (char === ')') {
      depth--
      if (depth === 0) return index
    }
  }
  return -1
}

function splitTopLevelComma (input: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0

  for (let index = 0; index < input.length; index++) {
    const char = input[index]
    if (char === '(') depth++
    if (char === ')') depth--
    if (char === ',' && depth === 0) {
      parts.push(input.slice(start, index))
      start = index + 1
    }
  }

  parts.push(input.slice(start))
  return parts
}

function splitTopLevelWhitespace (input: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0

  for (let index = 0; index < input.length; index++) {
    const char = input[index]
    if (char === '(') depth++
    if (char === ')') depth--
    if (/\s/.test(char) && depth === 0) {
      if (start !== index) parts.push(input.slice(start, index))
      start = index + 1
    }
  }

  if (start < input.length) parts.push(input.slice(start))
  return parts
}
