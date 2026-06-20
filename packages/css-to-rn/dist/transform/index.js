const numberPattern = '[+-]?(?:(?:\\d+\\.\\d+)|(?:\\d+\\.)|(?:\\.\\d+)|(?:\\d+))(?:e[+-]?\\d+)?'
const numberRe = new RegExp(`^${numberPattern}$`, 'i')
const numberOrLengthRe = new RegExp(`^(${numberPattern})([a-z%]*)$`, 'i')
const timeRe = new RegExp(`^${numberPattern}(?:ms|s)$`, 'i')
const angleRe = new RegExp(`^${numberPattern}(?:deg|rad|grad|turn)$`, 'i')
const hexColorRe = /^(?:#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8}))$/i
const colorFunctionRe = /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|gray|color)\(/i
const supportedLengthUnits = new Set([
  'ch',
  'cm',
  'em',
  'ex',
  'in',
  'mm',
  'pc',
  'pt',
  'rem',
  'vh',
  'vmax',
  'vmin',
  'vw',
])
const borderStyles = new Set([
  'solid',
  'dashed',
  'dotted',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
])
const timingFunctionKeywords = new Set([
  'ease',
  'linear',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'step-start',
  'step-end',
])
const animationDirectionKeywords = new Set([
  'normal',
  'reverse',
  'alternate',
  'alternate-reverse',
])
const animationFillModeKeywords = new Set([
  'none',
  'forwards',
  'backwards',
  'both',
])
const animationPlayStateKeywords = new Set(['running', 'paused'])
const cssColorKeywords = new Set([
  'aliceblue',
  'antiquewhite',
  'aqua',
  'aquamarine',
  'azure',
  'beige',
  'bisque',
  'black',
  'blanchedalmond',
  'blue',
  'blueviolet',
  'brown',
  'burlywood',
  'cadetblue',
  'chartreuse',
  'chocolate',
  'coral',
  'cornflowerblue',
  'cornsilk',
  'crimson',
  'cyan',
  'darkblue',
  'darkcyan',
  'darkgoldenrod',
  'darkgray',
  'darkgreen',
  'darkgrey',
  'darkkhaki',
  'darkmagenta',
  'darkolivegreen',
  'darkorange',
  'darkorchid',
  'darkred',
  'darksalmon',
  'darkseagreen',
  'darkslateblue',
  'darkslategray',
  'darkslategrey',
  'darkturquoise',
  'darkviolet',
  'deeppink',
  'deepskyblue',
  'dimgray',
  'dimgrey',
  'dodgerblue',
  'firebrick',
  'floralwhite',
  'forestgreen',
  'fuchsia',
  'gainsboro',
  'ghostwhite',
  'gold',
  'goldenrod',
  'gray',
  'green',
  'greenyellow',
  'grey',
  'honeydew',
  'hotpink',
  'indianred',
  'indigo',
  'ivory',
  'khaki',
  'lavender',
  'lavenderblush',
  'lawngreen',
  'lemonchiffon',
  'lightblue',
  'lightcoral',
  'lightcyan',
  'lightgoldenrodyellow',
  'lightgray',
  'lightgreen',
  'lightgrey',
  'lightpink',
  'lightsalmon',
  'lightseagreen',
  'lightskyblue',
  'lightslategray',
  'lightslategrey',
  'lightsteelblue',
  'lightyellow',
  'lime',
  'limegreen',
  'linen',
  'magenta',
  'maroon',
  'mediumaquamarine',
  'mediumblue',
  'mediumorchid',
  'mediumpurple',
  'mediumseagreen',
  'mediumslateblue',
  'mediumspringgreen',
  'mediumturquoise',
  'mediumvioletred',
  'midnightblue',
  'mintcream',
  'mistyrose',
  'moccasin',
  'navajowhite',
  'navy',
  'oldlace',
  'olive',
  'olivedrab',
  'orange',
  'orangered',
  'orchid',
  'palegoldenrod',
  'palegreen',
  'paleturquoise',
  'palevioletred',
  'papayawhip',
  'peachpuff',
  'peru',
  'pink',
  'plum',
  'powderblue',
  'purple',
  'rebeccapurple',
  'red',
  'rosybrown',
  'royalblue',
  'saddlebrown',
  'salmon',
  'sandybrown',
  'seagreen',
  'seashell',
  'sienna',
  'silver',
  'skyblue',
  'slateblue',
  'slategray',
  'slategrey',
  'snow',
  'springgreen',
  'steelblue',
  'tan',
  'teal',
  'thistle',
  'tomato',
  'transparent',
  'turquoise',
  'violet',
  'wheat',
  'white',
  'whitesmoke',
  'yellow',
  'yellowgreen',
])
const shorthandTransforms = {
  animation: transformAnimation,
  animationDelay: transformAnimationLonghand,
  animationDirection: transformAnimationLonghand,
  animationDuration: transformAnimationLonghand,
  animationFillMode: transformAnimationLonghand,
  animationIterationCount: transformAnimationLonghand,
  animationName: transformAnimationLonghand,
  animationPlayState: transformAnimationLonghand,
  animationTimingFunction: transformAnimationLonghand,
  background: transformBackground,
  backgroundImage: transformBackgroundImage,
  border: transformBorder,
  borderColor: transformDirectionalColor,
  borderRadius: transformBorderRadius,
  borderStyle: transformDirectionalBorderStyle,
  borderWidth: transformDirectionalWidth,
  boxShadow: passthroughString,
  filter: passthroughString,
  margin: transformMargin,
  padding: transformPadding,
  textShadow: transformTextShadow,
  transform: transformTransform,
  transition: transformTransition,
  transitionDelay: transformTransitionLonghand,
  transitionDuration: transformTransitionLonghand,
  transitionProperty: transformTransitionLonghand,
  transitionTimingFunction: transformTransitionLonghand,
}
export function transformDeclarations (declarations, options = {}) {
  const style = {}
  const diagnostics = []
  const shorthandBlacklist = new Set(options.shorthandBlacklist ?? [])
  const context = {
    platform: options.platform ?? 'react-native',
    keyframes: options.keyframes ?? {},
  }
  const orderedDeclarations = declarations
    .map((declaration, index) => ({ declaration, index }))
    .sort((left, right) => {
      const leftOrder = left.declaration.order ?? left.index
      const rightOrder = right.declaration.order ?? right.index
      return leftOrder - rightOrder || left.index - right.index
    })
  for (const { declaration } of orderedDeclarations) {
    const property = getPropertyName(declaration.property)
    const value = getDeclarationValue(declaration)
    if (property.startsWith('--')) { continue }
    if (value.length === 0) { continue }
    try {
      const transformer = shorthandBlacklist.has(property)
        ? undefined
        : shorthandTransforms[property]
      const result = transformer == null
        ? transformRawProperty(property, value)
        : transformer(property, value, declaration, context)
      Object.assign(style, result.style)
      if (result.diagnostics != null) { diagnostics.push(...result.diagnostics) }
    } catch (error) {
      if (options.onInvalid === 'throw') { throw error }
      diagnostics.push({
        code: 'INVALID_DECLARATION',
        property: declaration.property,
        value,
        message: error instanceof Error
          ? error.message
          : `Failed to parse declaration "${declaration.property}: ${value}"`,
        order: declaration.order,
      })
    }
  }
  inlineAnimationKeyframes(style, context.keyframes)
  return { style, diagnostics }
}
export function getPropertyName (property) {
  const trimmed = property.trim()
  if (trimmed.startsWith('--')) { return trimmed }
  return trimmed.replace(/-([a-z])/g, (_, character) => character.toUpperCase())
}
export function transformRawValue (value) {
  const trimmed = value.trim()
  const numberMatch = trimmed.match(numberOrLengthRe)
  if (numberMatch != null) {
    const number = Number(numberMatch[1])
    const unit = numberMatch[2].toLowerCase()
    if (unit === '' || unit === 'px') { return number }
    if (unit === 'u') { return number * 8 }
  }
  if (/^(?:true|false)$/i.test(trimmed)) {
    return trimmed.toLowerCase() === 'true'
  }
  if (/^null$/i.test(trimmed)) { return null }
  if (/^undefined$/i.test(trimmed)) { return undefined }
  return trimmed
}
function getDeclarationValue (declaration) {
  if (typeof declaration.value === 'string') { return declaration.value.trim() }
  if (typeof declaration.raw === 'string') {
    const raw = declaration.raw.trim()
    const colonIndex = raw.indexOf(':')
    if (colonIndex === -1) { return raw }
    return raw.slice(colonIndex + 1).replace(/;$/, '').trim()
  }
  return ''
}
function transformRawProperty (property, value) {
  return { style: { [property]: transformRawValue(value) } }
}
function passthroughString (property, value) {
  return { style: { [property]: value.trim() } }
}
function transformMargin (property, value) {
  return {
    style: expandDirectionalValues({
      directions: ['Top', 'Right', 'Bottom', 'Left'],
      prefix: property,
      values: parseDirectionalValues(value, valueToken => parseLength(valueToken, { allowAuto: true, allowPercent: true })),
    }),
  }
}
function transformPadding (property, value) {
  return {
    style: expandDirectionalValues({
      directions: ['Top', 'Right', 'Bottom', 'Left'],
      prefix: property,
      values: parseDirectionalValues(value, valueToken => parseLength(valueToken, { allowPercent: true })),
    }),
  }
}
function transformDirectionalWidth (property, value) {
  return {
    style: expandDirectionalValues({
      directions: ['Top', 'Right', 'Bottom', 'Left'],
      prefix: 'border',
      suffix: 'Width',
      values: parseDirectionalValues(value, valueToken => parseLength(valueToken, { allowPercent: false })),
    }),
  }
}
function transformDirectionalColor (property, value) {
  return {
    style: expandDirectionalValues({
      directions: ['Top', 'Right', 'Bottom', 'Left'],
      prefix: 'border',
      suffix: 'Color',
      values: parseDirectionalValues(value, parseColor),
    }),
  }
}
function transformDirectionalBorderStyle (property, value) {
  return {
    style: expandDirectionalValues({
      directions: ['Top', 'Right', 'Bottom', 'Left'],
      prefix: 'border',
      suffix: 'Style',
      values: parseDirectionalValues(value, parseBorderStyle),
    }),
  }
}
function transformBorderRadius (property, value) {
  if (value.includes('/')) {
    throw new Error(`Unsupported elliptical border-radius "${value}"`)
  }
  return {
    style: expandDirectionalValues({
      directions: ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'],
      prefix: 'border',
      suffix: 'Radius',
      values: parseDirectionalValues(value, valueToken => parseLength(valueToken, { allowPercent: false })),
    }),
  }
}
function transformBorder (property, value) {
  const trimmed = value.trim()
  if (trimmed.toLowerCase() === 'none') {
    return {
      style: {
        borderWidth: 0,
        borderColor: 'black',
        borderStyle: 'solid',
      },
    }
  }
  const tokens = splitByWhitespace(trimmed)
  if (tokens.length === 0 || tokens.length > 3) {
    throw new Error(`Unsupported border shorthand "${value}"`)
  }
  let borderWidth
  let borderColor
  let borderStyle
  for (const token of tokens) {
    if (borderWidth === undefined && isLength(token, false)) {
      borderWidth = parseLength(token, { allowPercent: false })
    } else if (borderColor === undefined && isColor(token)) {
      borderColor = token
    } else if (borderStyle === undefined &&
            borderStyles.has(token.toLowerCase())) {
      borderStyle = token.toLowerCase()
    } else {
      throw new Error(`Unsupported border shorthand "${value}"`)
    }
  }
  return {
    style: {
      borderWidth: borderWidth ?? 1,
      borderColor: borderColor ?? 'black',
      borderStyle: borderStyle ?? 'solid',
    },
  }
}
function transformTransform (property, value) {
  const parts = parseFunctionSequence(value)
  const transforms = []
  for (const part of parts) {
    const args = parseFunctionArguments(part.arguments)
    const transformed = transformTransformFunction(part.name, args)
    transforms.unshift(...transformed)
  }
  return { style: { transform: transforms } }
}
function transformTransformFunction (name, args) {
  if (name === 'perspective') {
    expectArgumentCount(name, args, 1, 1)
    return [{ perspective: parseNumber(args[0]) }]
  }
  if (name === 'scale') {
    expectArgumentCount(name, args, 1, 2)
    const x = parseNumber(args[0])
    if (args.length === 1) { return [{ scale: x }] }
    return [{ scaleY: parseNumber(args[1]) }, { scaleX: x }]
  }
  if (name === 'scaleX' || name === 'scaleY') {
    expectArgumentCount(name, args, 1, 1)
    return [{ [name]: parseNumber(args[0]) }]
  }
  if (name === 'translate') {
    expectArgumentCount(name, args, 1, 2)
    const x = parseLength(args[0], { allowPercent: true })
    const y = args.length === 2 ? parseLength(args[1], { allowPercent: true }) : 0
    return [{ translateY: y }, { translateX: x }]
  }
  if (name === 'translateX' || name === 'translateY') {
    expectArgumentCount(name, args, 1, 1)
    return [{ [name]: parseLength(args[0], { allowPercent: true }) }]
  }
  if (name === 'rotate' ||
        name === 'rotateX' ||
        name === 'rotateY' ||
        name === 'rotateZ' ||
        name === 'skewX' ||
        name === 'skewY') {
    expectArgumentCount(name, args, 1, 1)
    return [{ [name]: parseAngle(args[0]) }]
  }
  if (name === 'skew') {
    expectArgumentCount(name, args, 1, 2)
    return [
      { skewY: args.length === 2 ? parseAngle(args[1]) : '0deg' },
      { skewX: parseAngle(args[0]) },
    ]
  }
  throw new Error(`Unsupported transform function "${name}"`)
}
function transformTextShadow (property, value) {
  const trimmed = value.trim()
  if (trimmed.toLowerCase() === 'none') {
    return {
      style: {
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 0,
        textShadowColor: 'black',
      },
    }
  }
  const tokens = splitByWhitespace(trimmed)
  let color
  const lengths = []
  for (const token of tokens) {
    if (color === undefined && isColor(token)) {
      color = token
    } else if (isLength(token, false)) {
      lengths.push(parseLength(token, { allowPercent: false }))
    } else {
      throw new Error(`Unsupported text-shadow "${value}"`)
    }
  }
  if (lengths.length < 2 || lengths.length > 3) {
    throw new Error(`Unsupported text-shadow "${value}"`)
  }
  return {
    style: {
      textShadowOffset: { width: lengths[0], height: lengths[1] },
      textShadowRadius: lengths[2] ?? 0,
      textShadowColor: color ?? 'black',
    },
  }
}
function transformAnimation (property, value) {
  const trimmed = value.trim()
  if (trimmed.toLowerCase() === 'none') {
    return {
      style: {
        animationName: 'none',
        animationDuration: '0s',
        animationTimingFunction: 'ease',
        animationDelay: '0s',
        animationIterationCount: 1,
        animationDirection: 'normal',
        animationFillMode: 'none',
        animationPlayState: 'running',
      },
    }
  }
  const animations = splitTopLevel(trimmed, ',').map(parseSingleAnimation)
  const isSingle = animations.length === 1
  return {
    style: {
      animationName: singleOrArray(animations.map(animation => animation.name), isSingle),
      animationDuration: singleOrArray(animations.map(animation => animation.duration), isSingle),
      animationTimingFunction: singleOrArray(animations.map(animation => animation.timingFunction), isSingle),
      animationDelay: singleOrArray(animations.map(animation => animation.delay), isSingle),
      animationIterationCount: singleOrArray(animations.map(animation => animation.iterationCount), isSingle),
      animationDirection: singleOrArray(animations.map(animation => animation.direction), isSingle),
      animationFillMode: singleOrArray(animations.map(animation => animation.fillMode), isSingle),
      animationPlayState: singleOrArray(animations.map(animation => animation.playState), isSingle),
    },
  }
}
function transformAnimationLonghand (property, value) {
  if (property === 'animationName') {
    return {
      style: { animationName: parseCommaSeparated(value, parseIdentifier) },
    }
  }
  if (property === 'animationDuration') {
    return {
      style: { animationDuration: parseCommaSeparated(value, parseTime) },
    }
  }
  if (property === 'animationTimingFunction') {
    return {
      style: {
        animationTimingFunction: parseCommaSeparated(value, parseTimingFunction),
      },
    }
  }
  if (property === 'animationDelay') {
    return { style: { animationDelay: parseCommaSeparated(value, parseTime) } }
  }
  if (property === 'animationIterationCount') {
    return {
      style: {
        animationIterationCount: parseCommaSeparated(value, parseIterationCount),
      },
    }
  }
  if (property === 'animationDirection') {
    return {
      style: {
        animationDirection: parseCommaSeparated(value, valueToken => parseKeyword(valueToken, animationDirectionKeywords)),
      },
    }
  }
  if (property === 'animationFillMode') {
    return {
      style: {
        animationFillMode: parseCommaSeparated(value, valueToken => parseKeyword(valueToken, animationFillModeKeywords)),
      },
    }
  }
  if (property === 'animationPlayState') {
    return {
      style: {
        animationPlayState: parseCommaSeparated(value, valueToken => parseKeyword(valueToken, animationPlayStateKeywords)),
      },
    }
  }
  throw new Error(`Unsupported animation property "${property}"`)
}
function transformTransition (property, value) {
  const trimmed = value.trim()
  if (trimmed.toLowerCase() === 'none') {
    return {
      style: {
        transitionProperty: 'none',
        transitionDuration: '0s',
        transitionTimingFunction: 'ease',
        transitionDelay: '0s',
      },
    }
  }
  const transitions = splitTopLevel(trimmed, ',').map(parseSingleTransition)
  const isSingle = transitions.length === 1
  return {
    style: {
      transitionProperty: singleOrArray(transitions.map(transition => transition.property), isSingle),
      transitionDuration: singleOrArray(transitions.map(transition => transition.duration), isSingle),
      transitionTimingFunction: singleOrArray(transitions.map(transition => transition.timingFunction), isSingle),
      transitionDelay: singleOrArray(transitions.map(transition => transition.delay), isSingle),
    },
  }
}
function transformTransitionLonghand (property, value) {
  if (property === 'transitionProperty') {
    return {
      style: {
        transitionProperty: parseCommaSeparated(value, parseTransitionProperty),
      },
    }
  }
  if (property === 'transitionDuration') {
    return {
      style: { transitionDuration: parseCommaSeparated(value, parseTime) },
    }
  }
  if (property === 'transitionTimingFunction') {
    return {
      style: {
        transitionTimingFunction: parseCommaSeparated(value, parseTimingFunction),
      },
    }
  }
  if (property === 'transitionDelay') {
    return { style: { transitionDelay: parseCommaSeparated(value, parseTime) } }
  }
  throw new Error(`Unsupported transition property "${property}"`)
}
function transformBackgroundImage (property, value, declaration, context) {
  const trimmed = value.trim()
  if (!isSupportedBackgroundImageValue(trimmed)) {
    return {
      style: {},
      diagnostics: [
        createDiagnostic('UNSUPPORTED_BACKGROUND_IMAGE', property, value, `Unsupported background image "${value}"`, declaration),
      ],
    }
  }
  return {
    style: {
      [backgroundImageProperty(context.platform)]: trimmed,
    },
  }
}
function transformBackground (property, value, declaration, context) {
  const trimmed = value.trim()
  if (isColor(trimmed)) {
    return { style: { backgroundColor: trimmed } }
  }
  if (isSupportedBackgroundImageValue(trimmed)) {
    return {
      style: { [backgroundImageProperty(context.platform)]: trimmed },
    }
  }
  if (containsUnsupportedBackgroundImage(trimmed)) {
    return {
      style: {},
      diagnostics: [
        createDiagnostic('UNSUPPORTED_BACKGROUND_IMAGE', property, value, `Unsupported background image "${value}"`, declaration),
      ],
    }
  }
  const tokens = splitByWhitespace(trimmed)
  if (tokens.length === 2) {
    const firstIsColor = isColor(tokens[0])
    const secondIsColor = isColor(tokens[1])
    const firstIsImage = isSupportedBackgroundImageValue(tokens[0])
    const secondIsImage = isSupportedBackgroundImageValue(tokens[1])
    if (firstIsColor && secondIsImage) {
      return {
        style: {
          backgroundColor: tokens[0],
          [backgroundImageProperty(context.platform)]: tokens[1],
        },
      }
    }
    if (firstIsImage && secondIsColor) {
      return {
        style: {
          backgroundColor: tokens[1],
          [backgroundImageProperty(context.platform)]: tokens[0],
        },
      }
    }
  }
  return {
    style: {},
    diagnostics: [
      createDiagnostic('UNSUPPORTED_BACKGROUND_SHORTHAND', property, value, `Unsupported background shorthand "${value}"`, declaration),
    ],
  }
}
function parseSingleAnimation (value) {
  const tokens = splitByWhitespace(value)
  let name
  let duration
  let timingFunction
  let delay
  let iterationCount
  let direction
  let fillMode
  let playState
  for (const token of tokens) {
    const lower = token.toLowerCase()
    if (isTime(token)) {
      if (duration == null) { duration = token } else if (delay == null) { delay = token } else { throw new Error(`Unsupported animation "${value}"`) }
    } else if (isTimingFunction(token)) {
      timingFunction = token
    } else if (animationDirectionKeywords.has(lower)) {
      direction = lower
    } else if (animationFillModeKeywords.has(lower)) {
      fillMode = lower
    } else if (animationPlayStateKeywords.has(lower)) {
      playState = lower
    } else if (lower === 'infinite') {
      iterationCount = 'infinite'
    } else if (numberRe.test(token)) {
      iterationCount = Number(token)
    } else {
      name = token
    }
  }
  return {
    name: name ?? 'none',
    duration: duration ?? '0s',
    timingFunction: timingFunction ?? 'ease',
    delay: delay ?? '0s',
    iterationCount: iterationCount ?? 1,
    direction: direction ?? 'normal',
    fillMode: fillMode ?? 'none',
    playState: playState ?? 'running',
  }
}
function parseSingleTransition (value) {
  const tokens = splitByWhitespace(value)
  let property
  let duration
  let timingFunction
  let delay
  for (const token of tokens) {
    if (isTime(token)) {
      if (duration == null) { duration = token } else if (delay == null) { delay = token } else { throw new Error(`Unsupported transition "${value}"`) }
    } else if (isTimingFunction(token)) {
      timingFunction = token
    } else {
      property = token
    }
  }
  return {
    property: parseTransitionProperty(property ?? 'all'),
    duration: duration ?? '0s',
    timingFunction: timingFunction ?? 'ease',
    delay: delay ?? '0s',
  }
}
function parseDirectionalValues (value, parseValue) {
  const tokens = splitByWhitespace(value)
  if (tokens.length < 1 || tokens.length > 4) {
    throw new Error(`Expected 1 to 4 values, got "${value}"`)
  }
  return tokens.map(parseValue)
}
function expandDirectionalValues (options) {
  const [top, right = top, bottom = top, left = right] = options.values
  const suffix = options.suffix ?? ''
  const values = [top, right, bottom, left]
  const style = {}
  for (let index = 0; index < options.directions.length; index += 1) {
    style[`${options.prefix}${options.directions[index]}${suffix}`] =
            values[index]
  }
  return style
}
function parseLength (value, options = {}) {
  const trimmed = value.trim()
  const lower = trimmed.toLowerCase()
  if (options.allowAuto === true && lower === 'auto') { return 'auto' }
  if (isCalc(trimmed)) { return trimmed }
  const match = trimmed.match(numberOrLengthRe)
  if (match == null) {
    throw new Error(`Expected length value, got "${value}"`)
  }
  const number = Number(match[1])
  const unit = match[2].toLowerCase()
  if (unit === '') {
    if (number === 0) { return 0 }
    throw new Error(`Expected length unit in "${value}"`)
  }
  if (unit === 'px') { return number }
  if (unit === 'u') { return number * 8 }
  if (unit === '%') {
    if (options.allowPercent === true) { return `${match[1]}%` }
    throw new Error(`Percentage is not supported in "${value}"`)
  }
  if (supportedLengthUnits.has(unit)) { return trimmed }
  throw new Error(`Unsupported length unit in "${value}"`)
}
function parseNumber (value) {
  const trimmed = value.trim()
  if (!numberRe.test(trimmed)) {
    throw new Error(`Expected number value, got "${value}"`)
  }
  return Number(trimmed)
}
function parseAngle (value) {
  const trimmed = value.trim()
  if (!angleRe.test(trimmed)) {
    throw new Error(`Expected angle value, got "${value}"`)
  }
  return trimmed.toLowerCase()
}
function parseColor (value) {
  const trimmed = value.trim()
  if (!isColor(trimmed)) { throw new Error(`Expected color value, got "${value}"`) }
  return trimmed
}
function parseBorderStyle (value) {
  const lower = value.trim().toLowerCase()
  if (!borderStyles.has(lower)) {
    throw new Error(`Expected border style value, got "${value}"`)
  }
  return lower
}
function parseTime (value) {
  const trimmed = value.trim()
  if (!isTime(trimmed)) { throw new Error(`Expected time value, got "${value}"`) }
  return trimmed
}
function parseTimingFunction (value) {
  const trimmed = value.trim()
  if (!isTimingFunction(trimmed)) {
    throw new Error(`Expected timing function value, got "${value}"`)
  }
  return trimmed
}
function parseIterationCount (value) {
  const trimmed = value.trim()
  if (trimmed.toLowerCase() === 'infinite') { return 'infinite' }
  if (numberRe.test(trimmed)) { return Number(trimmed) }
  throw new Error(`Expected iteration count value, got "${value}"`)
}
function parseIdentifier (value) {
  const trimmed = value.trim()
  if (!/^[-_a-z][-_a-z0-9]*$/i.test(trimmed) && trimmed !== 'none') {
    throw new Error(`Expected identifier value, got "${value}"`)
  }
  return trimmed
}
function parseKeyword (value, keywords) {
  const lower = value.trim().toLowerCase()
  if (!keywords.has(lower)) {
    throw new Error(`Expected one of ${Array.from(keywords).join(', ')}`)
  }
  return lower
}
function parseTransitionProperty (value) {
  const trimmed = value.trim()
  if (trimmed === 'all' || trimmed === 'none') { return trimmed }
  return getPropertyName(trimmed)
}
function parseCommaSeparated (value, parseValue) {
  const values = splitTopLevel(value, ',').map(parseValue)
  return values.length === 1 ? values[0] : values
}
function singleOrArray (values, isSingle) {
  return isSingle ? values[0] : values
}
function inlineAnimationKeyframes (style, keyframes) {
  if (style.animationName == null) { return }
  if (Array.isArray(style.animationName)) {
    style.animationName = style.animationName.map(value => typeof value === 'string' && value !== 'none' && keyframes[value] != null
      ? keyframes[value]
      : value)
    return
  }
  if (typeof style.animationName === 'string' &&
        style.animationName !== 'none' &&
        keyframes[style.animationName] != null) {
    style.animationName = keyframes[style.animationName]
  }
}
function isLength (value, allowPercent) {
  try {
    parseLength(value, { allowPercent })
    return true
  } catch {
    return false
  }
}
function isColor (value) {
  const trimmed = value.trim()
  const lower = trimmed.toLowerCase()
  return (hexColorRe.test(trimmed) ||
        colorFunctionRe.test(trimmed) ||
        cssColorKeywords.has(lower) ||
        lower === 'currentcolor')
}
function isTime (value) {
  return timeRe.test(value.trim())
}
function isTimingFunction (value) {
  const trimmed = value.trim()
  const lower = trimmed.toLowerCase()
  return (timingFunctionKeywords.has(lower) ||
        isFunctionToken(trimmed, 'cubic-bezier') ||
        isFunctionToken(trimmed, 'steps') ||
        isFunctionToken(trimmed, 'linear'))
}
function isCalc (value) {
  return isFunctionToken(value.trim(), 'calc')
}
function isSupportedBackgroundImageValue (value) {
  const trimmed = value.trim()
  if (trimmed.toLowerCase() === 'none') { return true }
  const layers = splitTopLevel(trimmed, ',')
  return (layers.length > 0 &&
        layers.every(layer => isFunctionToken(layer, 'linear-gradient') ||
            isFunctionToken(layer, 'radial-gradient')))
}
function containsUnsupportedBackgroundImage (value) {
  return /\b(?:url|image-set|cross-fade|element|paint)\s*\(/i.test(value)
}
function backgroundImageProperty (platform) {
  return platform === 'web' ? 'backgroundImage' : 'experimental_backgroundImage'
}
function isFunctionToken (value, functionName) {
  const trimmed = value.trim()
  if (!trimmed.toLowerCase().startsWith(`${functionName.toLowerCase()}(`)) {
    return false
  }
  const openIndex = trimmed.indexOf('(')
  return findMatchingParen(trimmed, openIndex) === trimmed.length - 1
}
function parseFunctionSequence (value) {
  const functions = []
  let index = 0
  const source = value.trim()
  while (index < source.length) {
    while (/\s/.test(source[index] ?? '')) { index += 1 }
    if (index >= source.length) { break }
    const nameMatch = source.slice(index).match(/^[-_a-z][-_a-z0-9]*/i)
    if (nameMatch == null) {
      throw new Error(`Expected transform function in "${value}"`)
    }
    const name = nameMatch[0]
    index += name.length
    if (source[index] !== '(') {
      throw new Error(`Expected "(" after transform function "${name}"`)
    }
    const closeIndex = findMatchingParen(source, index)
    if (closeIndex === -1) {
      throw new Error(`Unclosed transform function "${name}"`)
    }
    functions.push({
      name,
      arguments: source.slice(index + 1, closeIndex),
    })
    index = closeIndex + 1
  }
  if (functions.length === 0) {
    throw new Error(`Expected transform value, got "${value}"`)
  }
  return functions
}
function parseFunctionArguments (value) {
  const commaParts = splitTopLevel(value, ',')
  if (commaParts.length > 1) { return commaParts }
  return splitByWhitespace(value)
}
function expectArgumentCount (functionName, args, min, max) {
  if (args.length < min || args.length > max) {
    throw new Error(`Expected ${functionName}() to have ${min === max ? min : `${min}-${max}`} arguments`)
  }
}
function splitByWhitespace (value) {
  const parts = []
  let current = ''
  let depth = 0
  let quote = null
  let escaped = false
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    if (escaped) {
      current += character
      escaped = false
      continue
    }
    if (character === '\\') {
      current += character
      escaped = true
      continue
    }
    if (quote != null) {
      current += character
      if (character === quote) { quote = null }
      continue
    }
    if (character === '"' || character === "'") {
      current += character
      quote = character
      continue
    }
    if (character === '(') {
      depth += 1
      current += character
      continue
    }
    if (character === ')') {
      depth -= 1
      if (depth < 0) { throw new Error(`Unexpected ")" in "${value}"`) }
      current += character
      continue
    }
    if (depth === 0 && /\s/.test(character)) {
      if (current.length > 0) {
        parts.push(current)
        current = ''
      }
      continue
    }
    current += character
  }
  if (quote != null) { throw new Error(`Unclosed string in "${value}"`) }
  if (depth !== 0) { throw new Error(`Unclosed function in "${value}"`) }
  if (current.length > 0) { parts.push(current) }
  return parts
}
function splitTopLevel (value, separator) {
  const parts = []
  let current = ''
  let depth = 0
  let quote = null
  let escaped = false
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    if (escaped) {
      current += character
      escaped = false
      continue
    }
    if (character === '\\') {
      current += character
      escaped = true
      continue
    }
    if (quote != null) {
      current += character
      if (character === quote) { quote = null }
      continue
    }
    if (character === '"' || character === "'") {
      current += character
      quote = character
      continue
    }
    if (character === '(') {
      depth += 1
      current += character
      continue
    }
    if (character === ')') {
      depth -= 1
      if (depth < 0) { throw new Error(`Unexpected ")" in "${value}"`) }
      current += character
      continue
    }
    if (depth === 0 && character === separator) {
      const part = current.trim()
      if (part.length === 0) { throw new Error(`Empty value in "${value}"`) }
      parts.push(part)
      current = ''
      continue
    }
    current += character
  }
  if (quote != null) { throw new Error(`Unclosed string in "${value}"`) }
  if (depth !== 0) { throw new Error(`Unclosed function in "${value}"`) }
  const part = current.trim()
  if (part.length === 0) { throw new Error(`Empty value in "${value}"`) }
  parts.push(part)
  return parts
}
function findMatchingParen (value, openIndex) {
  let depth = 0
  let quote = null
  let escaped = false
  for (let index = openIndex; index < value.length; index += 1) {
    const character = value[index]
    if (escaped) {
      escaped = false
      continue
    }
    if (character === '\\') {
      escaped = true
      continue
    }
    if (quote != null) {
      if (character === quote) { quote = null }
      continue
    }
    if (character === '"' || character === "'") {
      quote = character
      continue
    }
    if (character === '(') {
      depth += 1
      continue
    }
    if (character === ')') {
      depth -= 1
      if (depth === 0) { return index }
      if (depth < 0) { return -1 }
    }
  }
  return -1
}
function createDiagnostic (code, property, value, message, declaration) {
  return {
    code,
    property,
    value,
    message,
    order: declaration.order,
  }
}
