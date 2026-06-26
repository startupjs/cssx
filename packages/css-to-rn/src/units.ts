let warnedAboutU = false

export function u (value: number): number {
  if (!warnedAboutU && process.env.NODE_ENV !== 'production') {
    warnedAboutU = true
    console.warn('[cssx] u() is deprecated. Use rem, var(--spacing), or CSS instead. 1u equals 0.5rem or 8px.')
  }

  return value * 8
}

export function resetUWarningForTests (): void {
  warnedAboutU = false
}
