import { observable } from '@nx-js/observer-util'

let dimensionsInitialized = false

export function setDimensionsInitialized (value) {
  dimensionsInitialized = value
}

export function getDimensionsInitialized () {
  return dimensionsInitialized
}

export default observable({
  width: 0
})
