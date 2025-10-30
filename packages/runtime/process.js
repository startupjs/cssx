import { process as dynamicProcess } from './vendor/react-native-dynamic-style-processor/index.js'
import dimensions from './dimensions.js'
import singletonVariables, { defaultVariables } from './variables.js'
import matcher from './matcher.js'

// TODO: Improve css variables performance. Instead of rerunning finding variables each time
//       it has to work as a pipeline and pass the variables from one step to the next.

const VARS_REGEX = /"var\(\s*(--[A-Za-z0-9_-]+)\s*,?\s*(.*?)\s*\)"/g
const HAS_VAR_REGEX = /"var\(/

export function process (
  styleName,
  fileStyles,
  globalStyles,
  localStyles,
  inlineStyleProps
) {
  fileStyles = transformStyles(fileStyles)
  globalStyles = transformStyles(globalStyles)
  localStyles = transformStyles(localStyles)

  const res = matcher(
    styleName, fileStyles, globalStyles, localStyles, inlineStyleProps
  )
  // flatten styles into single objects
  for (const propName in res) {
    if (Array.isArray(res[propName])) {
      res[propName] = res[propName].flat(10)
      res[propName] = Object.assign({}, ...res[propName])
    }
  }
  return res
}

export function hasMedia (styles = {}) {
  for (const selector in styles) {
    if (/^@media/.test(selector)) {
      return true
    }
  }
}

export function hasVariables (...styleObjects) {
  for (const styleObject of styleObjects) {
    if (_hasVariables(styleObject)) return true
  }
}

function _hasVariables (styles = {}) {
  return HAS_VAR_REGEX.test(JSON.stringify(styles))
}

function replaceVariables (styles = {}) {
  let strStyles = JSON.stringify(styles)
  strStyles = strStyles.replace(VARS_REGEX, (match, varName, varDefault) => {
    let res
    res = singletonVariables[varName] ?? defaultVariables[varName] ?? varDefault
    if (typeof res === 'string') {
      res = res.trim()
      // replace 'px' value with a pure number
      res = res.replace(/px$/, '')
      // sometimes compiler returns wrapped brackets. Remove them
      const bracketsCount = res.match(/^\(+/)?.[0]?.length || 0
      res = res.substring(bracketsCount, res.length - bracketsCount)
    }
    if (!isNumeric(res)) {
      res = `"${res}"`
    }
    return res
  })
  return JSON.parse(strStyles)
}

function transformStyles (styles) {
  if (styles) {
    // trigger rerender when cache is NOT used
    if (hasMedia(styles)) listenForDimensionsChange()

    // dynamically process @media queries and vh/vw units
    styles = dynamicProcess(styles)

    if (hasVariables(styles)) {
      // Dynamically process css variables.
      // This will also auto-trigger rerendering on variable change when cache is not used
      styles = replaceVariables(styles)
    }

    return styles
  } else {
    return {}
  }
}

// If @media is used, force trigger access to the observable value.
// `dimensions` is an observed Proxy so
// whenever its value changes the according components will
// automatically rerender.
// The change is triggered globally in startupjs/plugins/cssMediaUpdater.plugin.js
export function listenForDimensionsChange () {
  // eslint-disable-next-line no-unused-expressions
  if (dimensions.width) true
}

function isNumeric (num) {
  return (typeof num === 'number' || (typeof num === 'string' && num.trim() !== '')) && !isNaN(num)
}
