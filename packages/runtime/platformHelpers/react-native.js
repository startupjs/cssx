import { Dimensions, Platform } from 'react-native'
import dimensions, { getDimensionsInitialized, setDimensionsInitialized } from '../dimensions.js'

export function getDimensions () {
  return Dimensions.get('window')
}

export function getPlatform () {
  return Platform.OS
}

export function isPureReact () {
  return false
}

// this is needed to trigger components rerendering to update @media queries
export function initDimensionsUpdater () {
  if (getDimensionsInitialized()) return
  setDimensionsInitialized(true)
  dimensions.width = Dimensions.get('window').width
  console.log('> Init dimensions updater for React Native. Initial width:', dimensions.width)

  // debounce by 200ms to avoid too many updates in a short time
  let timeoutId
  Dimensions.addEventListener('change', ({ window }) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      if (dimensions.width !== window.width) {
        console.log('> update window width:', window.width)
        dimensions.width = window.width
      }
      timeoutId = undefined
    }, 200)
  })
}
