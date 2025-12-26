import dimensions, { getDimensionsInitialized, setDimensionsInitialized } from '../dimensions.js'

let shownWarningGetDimensions = false
let shownWarningInitDimensionsUpdater = false

export function getDimensions () {
  if (typeof window === 'undefined' || !window.innerWidth || !window.innerHeight) {
    if (!shownWarningGetDimensions) {
      console.warn('[cssx] No "window" global variable. Falling back to constant window width and height of 1024x768')
      shownWarningGetDimensions = true
    }
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

// this is needed to trigger components rerendering to update @media queries
export function initDimensionsUpdater () {
  if (getDimensionsInitialized()) return
  setDimensionsInitialized(true)
  if (typeof window === 'undefined' || !window.innerWidth || !window.addEventListener) {
    if (!shownWarningInitDimensionsUpdater) {
      console.warn('[cssx] No "window" global variable. Setting default window width to 1024 and skipping updater.')
      shownWarningInitDimensionsUpdater = true
    }
    dimensions.width = 1024
    return
  }
  dimensions.width = window.innerWidth
  console.log('> Init dimensions updater for Web. Initial width:', dimensions.width)

  // debounce by 200ms to avoid too many updates in a short time
  let timeoutId
  window.addEventListener('resize', () => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      if (dimensions.width !== window.innerWidth) {
        console.log('> update window width:', window.innerWidth)
        dimensions.width = window.innerWidth
      }
      timeoutId = undefined
    }, 200)
  })
}
