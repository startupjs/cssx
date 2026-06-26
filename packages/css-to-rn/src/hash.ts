// ref: https://gist.github.com/hyamamoto/fd435505d29ebfa3d9716fd2be8d42f0
export function simpleNumericHash (value: string): number {
  let i = 0
  let h = 0
  for (; i < value.length; i++) h = Math.imul(31, h) + value.charCodeAt(i) | 0
  return h
}

export function cssxHash (value: string): string {
  return `cssx_${Math.abs(simpleNumericHash(value)).toString(36)}`
}
