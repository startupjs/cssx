const ROOT_STYLE_PROP_NAME = 'style'
const PART_REGEX = /::?part\(([^)]+)\)/
const isArray = Array.isArray

// Backward-compatibility export for libraries built against the old cssxjs
// runtime surface. New code should use cssx()/useRuntimeCss().
export default function matcher (
  styleName,
  fileStyles,
  globalStyles,
  localStyles,
  inlineStyleProps
) {
  const legacy = !inlineStyleProps
  const classNames = toClassName(styleName).split(' ').filter(Boolean)
  const result = getStyleProps(classNames, fileStyles, legacy)

  if (legacy) return result[ROOT_STYLE_PROP_NAME]

  appendStyleProps(result, getStyleProps(classNames, globalStyles))
  appendStyleProps(result, getStyleProps(classNames, localStyles))
  appendStyleProps(result, inlineStyleProps)
  return result
}

function appendStyleProps (target, appendProps) {
  if (!appendProps) return

  for (const propName in appendProps) {
    if (target[propName]) {
      if (isArray(appendProps[propName])) {
        target[propName] = target[propName].concat(appendProps[propName])
      } else {
        target[propName].push(appendProps[propName])
      }
    } else {
      target[propName] = appendProps[propName]
    }
  }
}

function getStyleProps (classNames, styles, legacyRootOnly) {
  const result = {}
  if (!styles) return result

  for (const selector in styles) {
    const match = selector.match(PART_REGEX)
    const propName = match ? getPropName(match[1]) : ROOT_STYLE_PROP_NAME
    if (legacyRootOnly && propName !== ROOT_STYLE_PROP_NAME) continue

    const pureSelector = selector.replace(PART_REGEX, '')
    const cssClasses = pureSelector.split('.')
    if (!classesContainedInClasses(cssClasses, classNames)) continue

    const specificity = cssClasses.length - 1
    result[propName] ??= []
    result[propName][specificity] ??= []
    result[propName][specificity].push(styles[selector])
  }

  return result
}

function getPropName (name) {
  return `${name}Style`
}

function classesContainedInClasses (cssClasses, classNames) {
  for (let i = 0; i < cssClasses.length; i++) {
    if (classNames.indexOf(cssClasses[i]) === -1) return false
  }
  return true
}

function toClassName (names) {
  let i
  let tmp
  let output = ''

  tmp = typeof names
  if (tmp === 'string' || tmp === 'number') return names || ''

  if (isArray(names) && names.length > 0) {
    for (i = 0; i < names.length; i++) {
      tmp = toClassName(names[i])
      if (tmp !== '') output += (output && ' ') + tmp
    }
  } else if (names && typeof names === 'object') {
    for (i in names) {
      if (Object.prototype.hasOwnProperty.call(names, i) && names[i]) {
        output += (output && ' ') + i
      }
    }
  }

  return output
}
