export type CssPlatform = 'react-native' | 'web'

export type TransformStyleValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | TransformStyle
  | TransformStyleValue[]

export interface TransformStyle {
  [property: string]: TransformStyleValue
}

export interface CssDeclaration {
  property: string
  raw?: string
  value?: string
  order?: number
}

export interface TransformDeclarationOptions {
  platform?: CssPlatform
  keyframes?: Record<string, TransformStyle>
  onInvalid?: 'diagnose' | 'throw'
  shorthandBlacklist?: readonly string[]
}

export type TransformDiagnosticCode =
  | 'INVALID_DECLARATION'
  | 'UNSUPPORTED_BACKGROUND_IMAGE'
  | 'UNSUPPORTED_BACKGROUND_SHORTHAND'

export interface TransformDiagnostic {
  code: TransformDiagnosticCode
  property: string
  value: string
  message: string
  order?: number
}

export interface TransformDeclarationResult {
  style: TransformStyle
  diagnostics: TransformDiagnostic[]
}

interface PropertyTransformContext {
  platform: CssPlatform
  keyframes: Record<string, TransformStyle>
}

interface PropertyTransformResult {
  style: TransformStyle
  diagnostics?: TransformDiagnostic[]
}

type PropertyTransform = (
  property: string,
  value: string,
  declaration: CssDeclaration,
  context: PropertyTransformContext
) => PropertyTransformResult

const numberPattern =
  '[+-]?(?:(?:\\d+\\.\\d+)|(?:\\d+\\.)|(?:\\.\\d+)|(?:\\d+))(?:e[+-]?\\d+)?'
const numberRe = new RegExp(`^${numberPattern}$`, 'i')
const numberOrLengthRe = new RegExp(`^(${numberPattern})([a-z%]*)$`, 'i')
const timeRe = new RegExp(`^${numberPattern}(?:ms|s)$`, 'i')
const angleRe = new RegExp(`^${numberPattern}(?:deg|rad|grad|turn)$`, 'i')
const hexColorRe = /^(?:#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8}))$/i
const colorFunctionRe =
  /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|gray|color)\(/i
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

const shorthandTransforms: Record<string, PropertyTransform> = {
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

export function transformDeclarations (
  declarations: readonly CssDeclaration[],
  options: TransformDeclarationOptions = {}
): TransformDeclarationResult {
  const style: TransformStyle = {}
  const diagnostics: TransformDiagnostic[] = []
  const shorthandBlacklist = new Set(options.shorthandBlacklist ?? [])
  const context: PropertyTransformContext = {
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

    if (property.startsWith('--')) continue
    if (value.length === 0) continue

    try {
      const transformer = shorthandBlacklist.has(property)
        ? undefined
        : shorthandTransforms[property]
      const result =
        transformer == null
          ? transformRawProperty(property, value)
          : transformer(property, value, declaration, context)

      Object.assign(style, result.style)
      if (result.diagnostics != null) diagnostics.push(...result.diagnostics)
    } catch (error) {
      if (options.onInvalid === 'throw') throw error
      diagnostics.push({
        code: 'INVALID_DECLARATION',
        property: declaration.property,
        value,
        message:
          error instanceof Error
            ? error.message
            : `Failed to parse declaration "${declaration.property}: ${value}"`,
        order: declaration.order,
      })
    }
  }

  inlineAnimationKeyframes(style, context.keyframes)

  return { style, diagnostics }
}

export function getPropertyName (property: string): string {
  const trimmed = property.trim()
  if (trimmed.startsWith('--')) return trimmed

  return trimmed.replace(/-([a-z])/g, (_, character: string) =>
    character.toUpperCase()
  )
}

export function transformRawValue (value: string): TransformStyleValue {
  const trimmed = value.trim()
  const numberMatch = trimmed.match(numberOrLengthRe)

  if (numberMatch != null) {
    const number = Number(numberMatch[1])
    const unit = numberMatch[2].toLowerCase()

    if (unit === '' || unit === 'px') return number
    if (unit === 'u') return number * 8
  }

  if (/^(?:true|false)$/i.test(trimmed)) {
    return trimmed.toLowerCase() === 'true'
  }
  if (/^null$/i.test(trimmed)) return null
  if (/^undefined$/i.test(trimmed)) return undefined

  return trimmed
}

function getDeclarationValue (declaration: CssDeclaration): string {
  if (typeof declaration.value === 'string') return declaration.value.trim()
  if (typeof declaration.raw === 'string') {
    const raw = declaration.raw.trim()
    const colonIndex = raw.indexOf(':')
    if (colonIndex === -1) return raw
    return raw.slice(colonIndex + 1).replace(/;$/, '').trim()
  }
  return ''
}

function transformRawProperty (
  property: string,
  value: string
): PropertyTransformResult {
  return { style: { [property]: transformRawValue(value) } }
}

function passthroughString (
  property: string,
  value: string
): PropertyTransformResult {
  return { style: { [property]: value.trim() } }
}

function transformMargin (
  property: string,
  value: string
): PropertyTransformResult {
  return {
    style: expandDirectionalValues({
      directions: ['Top', 'Right', 'Bottom', 'Left'],
      prefix: property,
      values: parseDirectionalValues(value, valueToken =>
        parseLength(valueToken, { allowAuto: true, allowPercent: true })
      ),
    }),
  }
}

function transformPadding (
  property: string,
  value: string
): PropertyTransformResult {
  return {
    style: expandDirectionalValues({
      directions: ['Top', 'Right', 'Bottom', 'Left'],
      prefix: property,
      values: parseDirectionalValues(value, valueToken =>
        parseLength(valueToken, { allowPercent: true })
      ),
    }),
  }
}

function transformDirectionalWidth (
  property: string,
  value: string
): PropertyTransformResult {
  return {
    style: expandDirectionalValues({
      directions: ['Top', 'Right', 'Bottom', 'Left'],
      prefix: 'border',
      suffix: 'Width',
      values: parseDirectionalValues(value, valueToken =>
        parseLength(valueToken, { allowPercent: false })
      ),
    }),
  }
}

function transformDirectionalColor (
  property: string,
  value: string
): PropertyTransformResult {
  return {
    style: expandDirectionalValues({
      directions: ['Top', 'Right', 'Bottom', 'Left'],
      prefix: 'border',
      suffix: 'Color',
      values: parseDirectionalValues(value, parseColor),
    }),
  }
}

function transformDirectionalBorderStyle (
  property: string,
  value: string
): PropertyTransformResult {
  return {
    style: expandDirectionalValues({
      directions: ['Top', 'Right', 'Bottom', 'Left'],
      prefix: 'border',
      suffix: 'Style',
      values: parseDirectionalValues(value, parseBorderStyle),
    }),
  }
}

function transformBorderRadius (
  property: string,
  value: string
): PropertyTransformResult {
  if (value.includes('/')) {
    throw new Error(`Unsupported elliptical border-radius "${value}"`)
  }

  return {
    style: expandDirectionalValues({
      directions: ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'],
      prefix: 'border',
      suffix: 'Radius',
      values: parseDirectionalValues(value, valueToken =>
        parseLength(valueToken, { allowPercent: false })
      ),
    }),
  }
}

function transformBorder (
  property: string,
  value: string
): PropertyTransformResult {
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

  let borderWidth: TransformStyleValue | undefined
  let borderColor: string | undefined
  let borderStyle: string | undefined

  for (const token of tokens) {
    if (borderWidth === undefined && isLength(token, false)) {
      borderWidth = parseLength(token, { allowPercent: false })
    } else if (borderColor === undefined && isColor(token)) {
      borderColor = token
    } else if (
      borderStyle === undefined &&
      borderStyles.has(token.toLowerCase())
    ) {
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

function transformTransform (
  property: string,
  value: string
): PropertyTransformResult {
  if (value.trim().toLowerCase() === 'none') {
    return { style: { transform: [] } }
  }

  const parts = parseFunctionSequence(value)
  const transforms: TransformStyleValue[] = []

  for (const part of parts) {
    const args = parseFunctionArguments(part.arguments)
    const transformed = transformTransformFunction(part.name, args)
    transforms.unshift(...transformed)
  }

  return { style: { transform: transforms } }
}

function transformTransformFunction (
  name: string,
  args: readonly string[]
): TransformStyle[] {
  if (name === 'perspective') {
    expectArgumentCount(name, args, 1, 1)
    return [{ perspective: parseNumber(args[0]) }]
  }

  if (name === 'scale') {
    expectArgumentCount(name, args, 1, 2)
    const x = parseNumber(args[0])
    if (args.length === 1) return [{ scale: x }]
    return [{ scaleY: parseNumber(args[1]) }, { scaleX: x }]
  }

  if (name === 'scaleX' || name === 'scaleY') {
    expectArgumentCount(name, args, 1, 1)
    return [{ [name]: parseNumber(args[0]) }]
  }

  if (name === 'translate') {
    expectArgumentCount(name, args, 1, 2)
    const x = parseLength(args[0], { allowPercent: true })
    const y =
      args.length === 2 ? parseLength(args[1], { allowPercent: true }) : 0
    return [{ translateY: y }, { translateX: x }]
  }

  if (name === 'translateX' || name === 'translateY') {
    expectArgumentCount(name, args, 1, 1)
    return [{ [name]: parseLength(args[0], { allowPercent: true }) }]
  }

  if (
    name === 'rotate' ||
    name === 'rotateX' ||
    name === 'rotateY' ||
    name === 'rotateZ' ||
    name === 'skewX' ||
    name === 'skewY'
  ) {
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

function transformTextShadow (
  property: string,
  value: string
): PropertyTransformResult {
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
  let color: string | undefined
  const lengths: TransformStyleValue[] = []

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

function transformAnimation (
  property: string,
  value: string
): PropertyTransformResult {
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
      animationName: singleOrArray(
        animations.map(animation => animation.name),
        isSingle
      ),
      animationDuration: singleOrArray(
        animations.map(animation => animation.duration),
        isSingle
      ),
      animationTimingFunction: singleOrArray(
        animations.map(animation => animation.timingFunction),
        isSingle
      ),
      animationDelay: singleOrArray(
        animations.map(animation => animation.delay),
        isSingle
      ),
      animationIterationCount: singleOrArray(
        animations.map(animation => animation.iterationCount),
        isSingle
      ),
      animationDirection: singleOrArray(
        animations.map(animation => animation.direction),
        isSingle
      ),
      animationFillMode: singleOrArray(
        animations.map(animation => animation.fillMode),
        isSingle
      ),
      animationPlayState: singleOrArray(
        animations.map(animation => animation.playState),
        isSingle
      ),
    },
  }
}

function transformAnimationLonghand (
  property: string,
  value: string
): PropertyTransformResult {
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
        animationTimingFunction: parseCommaSeparated(
          value,
          parseTimingFunction
        ),
      },
    }
  }
  if (property === 'animationDelay') {
    return { style: { animationDelay: parseCommaSeparated(value, parseTime) } }
  }
  if (property === 'animationIterationCount') {
    return {
      style: {
        animationIterationCount: parseCommaSeparated(
          value,
          parseIterationCount
        ),
      },
    }
  }
  if (property === 'animationDirection') {
    return {
      style: {
        animationDirection: parseCommaSeparated(value, valueToken =>
          parseKeyword(valueToken, animationDirectionKeywords)
        ),
      },
    }
  }
  if (property === 'animationFillMode') {
    return {
      style: {
        animationFillMode: parseCommaSeparated(value, valueToken =>
          parseKeyword(valueToken, animationFillModeKeywords)
        ),
      },
    }
  }
  if (property === 'animationPlayState') {
    return {
      style: {
        animationPlayState: parseCommaSeparated(value, valueToken =>
          parseKeyword(valueToken, animationPlayStateKeywords)
        ),
      },
    }
  }

  throw new Error(`Unsupported animation property "${property}"`)
}

function transformTransition (
  property: string,
  value: string
): PropertyTransformResult {
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
      transitionProperty: singleOrArray(
        transitions.map(transition => transition.property),
        isSingle
      ),
      transitionDuration: singleOrArray(
        transitions.map(transition => transition.duration),
        isSingle
      ),
      transitionTimingFunction: singleOrArray(
        transitions.map(transition => transition.timingFunction),
        isSingle
      ),
      transitionDelay: singleOrArray(
        transitions.map(transition => transition.delay),
        isSingle
      ),
    },
  }
}

function transformTransitionLonghand (
  property: string,
  value: string
): PropertyTransformResult {
  if (property === 'transitionProperty') {
    return {
      style: {
        transitionProperty: parseCommaSeparated(
          value,
          parseTransitionProperty
        ),
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
        transitionTimingFunction: parseCommaSeparated(
          value,
          parseTimingFunction
        ),
      },
    }
  }
  if (property === 'transitionDelay') {
    return { style: { transitionDelay: parseCommaSeparated(value, parseTime) } }
  }

  throw new Error(`Unsupported transition property "${property}"`)
}

function transformBackgroundImage (
  property: string,
  value: string,
  declaration: CssDeclaration,
  context: PropertyTransformContext
): PropertyTransformResult {
  const trimmed = value.trim()
  if (!isSupportedBackgroundImageValue(trimmed)) {
    return {
      style: {},
      diagnostics: [
        createDiagnostic(
          'UNSUPPORTED_BACKGROUND_IMAGE',
          property,
          value,
          `Unsupported background image "${value}"`,
          declaration
        ),
      ],
    }
  }

  return {
    style: {
      [backgroundImageProperty(context.platform)]: trimmed,
    },
  }
}

function transformBackground (
  property: string,
  value: string,
  declaration: CssDeclaration,
  context: PropertyTransformContext
): PropertyTransformResult {
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
        createDiagnostic(
          'UNSUPPORTED_BACKGROUND_IMAGE',
          property,
          value,
          `Unsupported background image "${value}"`,
          declaration
        ),
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
      createDiagnostic(
        'UNSUPPORTED_BACKGROUND_SHORTHAND',
        property,
        value,
        `Unsupported background shorthand "${value}"`,
        declaration
      ),
    ],
  }
}

function parseSingleAnimation (value: string): {
  name: string
  duration: string
  timingFunction: string
  delay: string
  iterationCount: string | number
  direction: string
  fillMode: string
  playState: string
} {
  const tokens = splitByWhitespace(value)
  let name: string | undefined
  let duration: string | undefined
  let timingFunction: string | undefined
  let delay: string | undefined
  let iterationCount: string | number | undefined
  let direction: string | undefined
  let fillMode: string | undefined
  let playState: string | undefined

  for (const token of tokens) {
    const lower = token.toLowerCase()

    if (isTime(token)) {
      if (duration == null) duration = token
      else if (delay == null) delay = token
      else throw new Error(`Unsupported animation "${value}"`)
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

function parseSingleTransition (value: string): {
  property: string
  duration: string
  timingFunction: string
  delay: string
} {
  const tokens = splitByWhitespace(value)
  let property: string | undefined
  let duration: string | undefined
  let timingFunction: string | undefined
  let delay: string | undefined

  for (const token of tokens) {
    if (isTime(token)) {
      if (duration == null) duration = token
      else if (delay == null) delay = token
      else throw new Error(`Unsupported transition "${value}"`)
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

function parseDirectionalValues (
  value: string,
  parseValue: (value: string) => TransformStyleValue
): TransformStyleValue[] {
  const tokens = splitByWhitespace(value)
  if (tokens.length < 1 || tokens.length > 4) {
    throw new Error(`Expected 1 to 4 values, got "${value}"`)
  }
  return tokens.map(parseValue)
}

function expandDirectionalValues (options: {
  directions: readonly string[]
  prefix: string
  suffix?: string
  values: readonly TransformStyleValue[]
}): TransformStyle {
  const [top, right = top, bottom = top, left = right] = options.values
  const suffix = options.suffix ?? ''
  const values = [top, right, bottom, left]
  const style: TransformStyle = {}

  for (let index = 0; index < options.directions.length; index += 1) {
    style[`${options.prefix}${options.directions[index]}${suffix}`] =
      values[index]
  }

  return style
}

function parseLength (
  value: string,
  options: { allowAuto?: boolean; allowPercent?: boolean } = {}
): TransformStyleValue {
  const trimmed = value.trim()
  const lower = trimmed.toLowerCase()

  if (options.allowAuto === true && lower === 'auto') return 'auto'
  if (isCalc(trimmed)) return trimmed

  const match = trimmed.match(numberOrLengthRe)
  if (match == null) {
    throw new Error(`Expected length value, got "${value}"`)
  }

  const number = Number(match[1])
  const unit = match[2].toLowerCase()

  if (unit === '') {
    if (number === 0) return 0
    throw new Error(`Expected length unit in "${value}"`)
  }
  if (unit === 'px') return number
  if (unit === 'u') return number * 8
  if (unit === '%') {
    if (options.allowPercent === true) return `${match[1]}%`
    throw new Error(`Percentage is not supported in "${value}"`)
  }
  if (supportedLengthUnits.has(unit)) return trimmed

  throw new Error(`Unsupported length unit in "${value}"`)
}

function parseNumber (value: string): number {
  const trimmed = value.trim()
  if (!numberRe.test(trimmed)) {
    throw new Error(`Expected number value, got "${value}"`)
  }
  return Number(trimmed)
}

function parseAngle (value: string): string {
  const trimmed = value.trim()
  if (!angleRe.test(trimmed)) {
    throw new Error(`Expected angle value, got "${value}"`)
  }
  return trimmed.toLowerCase()
}

function parseColor (value: string): string {
  const trimmed = value.trim()
  if (!isColor(trimmed)) throw new Error(`Expected color value, got "${value}"`)
  return trimmed
}

function parseBorderStyle (value: string): string {
  const lower = value.trim().toLowerCase()
  if (!borderStyles.has(lower)) {
    throw new Error(`Expected border style value, got "${value}"`)
  }
  return lower
}

function parseTime (value: string): string {
  const trimmed = value.trim()
  if (!isTime(trimmed)) throw new Error(`Expected time value, got "${value}"`)
  return trimmed
}

function parseTimingFunction (value: string): string {
  const trimmed = value.trim()
  if (!isTimingFunction(trimmed)) {
    throw new Error(`Expected timing function value, got "${value}"`)
  }
  return trimmed
}

function parseIterationCount (value: string): string | number {
  const trimmed = value.trim()
  if (trimmed.toLowerCase() === 'infinite') return 'infinite'
  if (numberRe.test(trimmed)) return Number(trimmed)
  throw new Error(`Expected iteration count value, got "${value}"`)
}

function parseIdentifier (value: string): string {
  const trimmed = value.trim()
  if (!/^[-_a-z][-_a-z0-9]*$/i.test(trimmed) && trimmed !== 'none') {
    throw new Error(`Expected identifier value, got "${value}"`)
  }
  return trimmed
}

function parseKeyword (value: string, keywords: ReadonlySet<string>): string {
  const lower = value.trim().toLowerCase()
  if (!keywords.has(lower)) {
    throw new Error(`Expected one of ${Array.from(keywords).join(', ')}`)
  }
  return lower
}

function parseTransitionProperty (value: string): string {
  const trimmed = value.trim()
  if (trimmed === 'all' || trimmed === 'none') return trimmed
  return getPropertyName(trimmed)
}

function parseCommaSeparated<T> (
  value: string,
  parseValue: (value: string) => T
): T | T[] {
  const values = splitTopLevel(value, ',').map(parseValue)
  return values.length === 1 ? values[0] : values
}

function singleOrArray<T> (values: T[], isSingle: boolean): T | T[] {
  return isSingle ? values[0] : values
}

function inlineAnimationKeyframes (
  style: TransformStyle,
  keyframes: Record<string, TransformStyle>
): void {
  if (style.animationName == null) return

  if (Array.isArray(style.animationName)) {
    style.animationName = style.animationName.map(value =>
      typeof value === 'string' && value !== 'none' && keyframes[value] != null
        ? keyframes[value]
        : value
    )
    return
  }

  if (
    typeof style.animationName === 'string' &&
    style.animationName !== 'none' &&
    keyframes[style.animationName] != null
  ) {
    style.animationName = keyframes[style.animationName]
  }
}

function isLength (value: string, allowPercent: boolean): boolean {
  try {
    parseLength(value, { allowPercent })
    return true
  } catch {
    return false
  }
}

function isColor (value: string): boolean {
  const trimmed = value.trim()
  const lower = trimmed.toLowerCase()
  return (
    hexColorRe.test(trimmed) ||
    colorFunctionRe.test(trimmed) ||
    cssColorKeywords.has(lower) ||
    lower === 'currentcolor'
  )
}

function isTime (value: string): boolean {
  return timeRe.test(value.trim())
}

function isTimingFunction (value: string): boolean {
  const trimmed = value.trim()
  const lower = trimmed.toLowerCase()

  return (
    timingFunctionKeywords.has(lower) ||
    isFunctionToken(trimmed, 'cubic-bezier') ||
    isFunctionToken(trimmed, 'steps') ||
    isFunctionToken(trimmed, 'linear')
  )
}

function isCalc (value: string): boolean {
  return isFunctionToken(value.trim(), 'calc')
}

function isSupportedBackgroundImageValue (value: string): boolean {
  const trimmed = value.trim()
  if (trimmed.toLowerCase() === 'none') return true

  const layers = splitTopLevel(trimmed, ',')
  return (
    layers.length > 0 &&
    layers.every(
      layer =>
        isFunctionToken(layer, 'linear-gradient') ||
        isFunctionToken(layer, 'radial-gradient')
    )
  )
}

function containsUnsupportedBackgroundImage (value: string): boolean {
  return /\b(?:url|image-set|cross-fade|element|paint)\s*\(/i.test(value)
}

function backgroundImageProperty (platform: CssPlatform): string {
  return platform === 'web' ? 'backgroundImage' : 'experimental_backgroundImage'
}

function isFunctionToken (value: string, functionName: string): boolean {
  const trimmed = value.trim()
  if (!trimmed.toLowerCase().startsWith(`${functionName.toLowerCase()}(`)) {
    return false
  }
  const openIndex = trimmed.indexOf('(')
  return findMatchingParen(trimmed, openIndex) === trimmed.length - 1
}

function parseFunctionSequence (
  value: string
): Array<{ name: string; arguments: string }> {
  const functions: Array<{ name: string; arguments: string }> = []
  let index = 0
  const source = value.trim()

  while (index < source.length) {
    while (/\s/.test(source[index] ?? '')) index += 1
    if (index >= source.length) break

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

function parseFunctionArguments (value: string): string[] {
  const commaParts = splitTopLevel(value, ',')
  if (commaParts.length > 1) return commaParts
  return splitByWhitespace(value)
}

function expectArgumentCount (
  functionName: string,
  args: readonly string[],
  min: number,
  max: number
): void {
  if (args.length < min || args.length > max) {
    throw new Error(
      `Expected ${functionName}() to have ${min === max ? min : `${min}-${max}`} arguments`
    )
  }
}

function splitByWhitespace (value: string): string[] {
  const parts: string[] = []
  let current = ''
  let depth = 0
  let quote: string | null = null
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
      if (character === quote) quote = null
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
      if (depth < 0) throw new Error(`Unexpected ")" in "${value}"`)
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

  if (quote != null) throw new Error(`Unclosed string in "${value}"`)
  if (depth !== 0) throw new Error(`Unclosed function in "${value}"`)
  if (current.length > 0) parts.push(current)

  return parts
}

function splitTopLevel (value: string, separator: string): string[] {
  const parts: string[] = []
  let current = ''
  let depth = 0
  let quote: string | null = null
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
      if (character === quote) quote = null
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
      if (depth < 0) throw new Error(`Unexpected ")" in "${value}"`)
      current += character
      continue
    }

    if (depth === 0 && character === separator) {
      const part = current.trim()
      if (part.length === 0) throw new Error(`Empty value in "${value}"`)
      parts.push(part)
      current = ''
      continue
    }

    current += character
  }

  if (quote != null) throw new Error(`Unclosed string in "${value}"`)
  if (depth !== 0) throw new Error(`Unclosed function in "${value}"`)

  const part = current.trim()
  if (part.length === 0) throw new Error(`Empty value in "${value}"`)
  parts.push(part)

  return parts
}

function findMatchingParen (value: string, openIndex: number): number {
  let depth = 0
  let quote: string | null = null
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
      if (character === quote) quote = null
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
      if (depth === 0) return index
      if (depth < 0) return -1
    }
  }

  return -1
}

function createDiagnostic (
  code: TransformDiagnosticCode,
  property: string,
  value: string,
  message: string,
  declaration: CssDeclaration
): TransformDiagnostic {
  return {
    code,
    property,
    value,
    message,
    order: declaration.order,
  }
}
