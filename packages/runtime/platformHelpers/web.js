export function getDimensions () {
  if (typeof window === 'undefined' || !window.innerWidth || !window.innerHeight) {
    console.warn('[cssx] No "window" global variable. Falling back to constant window width and height of 1024x768')
    return { width: 1024, height: 768 }
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight
  }
}

export function getPlatform () {
  return 'web'
}

export function isPureReact () {
  return true
}
