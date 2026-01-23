import { process as dynamicProcess } from './vendor/react-native-dynamic-style-processor/index.js'
import dimensions from './dimensions.js'
import singletonVariables, { defaultVariables } from './variables.js'
import matcher from './matcher.js'
import { isPureReact } from './platformHelpers/index.js'

const VARS_REGEX = /"var\(\s*(--[A-Za-z0-9_-]+)\s*,?\s*(.*?)\s*\)"/g
const SUPPORT_UNIT = true

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
  for (const propName in res) {
    // flatten styles into single objects
    if (Array.isArray(res[propName])) {
      res[propName] = res[propName].flat(10)
      res[propName] = Object.assign({}, ...res[propName])
    }
    if (typeof res[propName] !== 'object') continue
    // force transform to 'px' some units in pure React environment
    if (isPureReact()) {
      // atm it's only 'lineHeight' property
      if (typeof res[propName].lineHeight === 'number') {
        res[propName].lineHeight = `${res[propName].lineHeight}px`
      }
    }
    // add 'u' unit support (1u = 8px)
    // replace in string values `{NUMBER}u` with the `{NUMBER*8}`
    // (pure number without any units - which will be treated as 'px' by React Native and pure React)
    if (SUPPORT_UNIT) {
      for (const property in res[propName]) {
        if (typeof res[propName][property] !== 'string') continue
        if (!/\du/.test(res[propName][property])) continue // quick check for potential presence of 'u' unit
        while (true) {
          const match = res[propName][property].match(/(\(|,| |^)([+-]?(?:\d*\.)?\d+)u(\)|,| |$)/)
          if (!match) break
          const fullMatch = match[0]
          const number = parseFloat(match[2])
          const replacedValue = number * 8
          // if left and right don't exist (pure value), then assign the pure number
          if (!match[1] && !match[3]) {
            res[propName][property] = replacedValue
            break
          }
          res[propName][property] = res[propName][property].replace(fullMatch, `${match[1]}${replacedValue}${match[3]}`)
        }
      }
    }
  }
  return res
}

function replaceVariables (strStyles) {
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

const stringifiedStylesCache = new WeakMap()
function transformStyles (styles) {
  if (!styles) return {}

  // IMPORTANT: this will use cached stringified styles from the original styles object
  // which are singletons. That's why it must be first before other transformations take place
  // which will modify the styles object.
  if (styles.__vars) {
    let strStyles = stringifiedStylesCache.get(styles)
    if (!strStyles) {
      strStyles = JSON.stringify(styles)
      stringifiedStylesCache.set(styles, strStyles)
    }

    // Dynamically process css variables.
    // This will also auto-trigger rerendering on variable change when cache is not used
    styles = replaceVariables(strStyles)
  }

  // trigger rerender when cache is NOT used
  if (styles.__hasMedia) listenForDimensionsChange()

  // dynamically process @media queries and vh/vw units
  styles = dynamicProcess(styles)

  return styles
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
