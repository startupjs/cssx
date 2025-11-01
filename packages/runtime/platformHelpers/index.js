// injection of platformHelpers

let platformHelpers

export function setPlatformHelpers (newPlatformHelpers) {
  if (platformHelpers === newPlatformHelpers) return
  platformHelpers = newPlatformHelpers
}

export function getPlatformHelpers () {
  return platformHelpers
}

// facades to call the currently injected platform helper functions

export function getDimensions (...args) {
  try {
    return platformHelpers.getDimensions(...args)
  } catch (err) {
    console.error('[cssxjs] platform helpers \'getDimensions\' is not specified. Babel is probably misconfigured')
    throw err
  }
}

export function getPlatform (...args) {
  try {
    return platformHelpers.getPlatform(...args)
  } catch (err) {
    console.error('[cssxjs] platform helpers \'getPlatform\' is not specified. Babel is probably misconfigured')
    throw err
  }
}
