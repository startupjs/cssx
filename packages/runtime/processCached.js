import { singletonMemoize } from 'teamplay/cache'
import dimensions from './dimensions.js'
import singletonVariables from './variables.js'
import { process as _process, listenForDimensionsChange } from './process.js'

export const process = singletonMemoize(_process, {
  cacheName: 'styles',
  // IMPORTANT: This should be the same as the ones which go into the singletonMemoize function
  normalizer: (styleName, fileStyles, globalStyles, localStyles, inlineStyleProps) => simpleNumericHash(JSON.stringify([
    styleName,
    fileStyles?.__hash__ || fileStyles,
    globalStyles?.__hash__ || globalStyles,
    localStyles?.__hash__ || localStyles,
    inlineStyleProps
  ])),
  // IMPORTANT: This should be the same as the ones which go into the singletonMemoize function
  forceUpdateWhenChanged: (styleName, fileStyles, globalStyles, localStyles, inlineStyleProps) => {
    const args = {}
    const watchWidthChange = fileStyles?.__hasMedia || globalStyles?.__hasMedia || localStyles?.__hasMedia
    if (watchWidthChange) {
      // trigger rerender when cache is used
      listenForDimensionsChange()
      // Return the dimensionsWidth value itself to force
      // the affected cache to recalculate
      args.dimensionsWidth = dimensions.width
    }
    if (fileStyles?.__vars || globalStyles?.__vars || localStyles?.__vars) {
      const variableNames = getVariableNames(fileStyles, globalStyles, localStyles)
      // trigger rerender when cache is used
      listenForVariablesChange(variableNames)
      // Return the variable values themselves to force
      // the affected cache to recalculate
      for (const variableName of variableNames) {
        args['VAR_' + variableName] = singletonVariables[variableName]
      }
    }
    return simpleNumericHash(JSON.stringify(args))
  }
})

function getVariableNames (...styleObjects) {
  const vars = []
  for (const styleObject of styleObjects) {
    if (!styleObject?.__vars) continue
    for (const varName of styleObject.__vars) {
      if (!vars.includes(varName)) vars.push(varName)
    }
  }
  return vars.sort()
}

// If var() is used, force trigger access to the observable value.
// `singletonVariables` is an observed Proxy so
// whenever its value changes the according components will
// automatically rerender.
function listenForVariablesChange (variables = []) {
  for (const variable of variables) {
    // eslint-disable-next-line no-unused-expressions
    if (singletonVariables[variable]) true
  }
}

// ref: https://gist.github.com/hyamamoto/fd435505d29ebfa3d9716fd2be8d42f0?permalink_comment_id=2694461#gistcomment-2694461
function simpleNumericHash (s) {
  let i, h
  for (i = 0, h = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0
  return h
}
