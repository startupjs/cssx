const { spawnSync } = require('child_process')
const { existsSync } = require('fs')
const { createRequire } = require('module')
const { join } = require('path')
const { pathToFileURL } = require('url')
const cssToRn = requireCssToRn()
const { compileCss, compileCssTemplate } = cssToRn
const resolveCssx = cssToRn.resolveCssx
const hashCssObject = cssToRn.simpleNumericHash ?? simpleNumericHash

const EXPORT_REGEX = /:export\s*\{/

module.exports = function cssToReactNative (source) {
  source = escapeExport(source)
  const compile = this.query?.template ? compileCssTemplate : compileCss
  const cssObject = compile(source, {
    mode: 'build',
    target: this.query?.platform,
    sourceIdentity: this.resourcePath
  })
  for (const key in cssObject.exports || {}) {
    cssObject[key] = parseStylValue(cssObject.exports[key])
  }
  addLegacyStaticStyles(cssObject, this.query?.platform)
  const stringifiedCss = JSON.stringify(cssObject)
  // save hash to keep compatibility with existing generated code and tests
  cssObject.__hash__ = hashCssObject(stringifiedCss)
  return 'module.exports = ' + JSON.stringify(cssObject)
}

function addLegacyStaticStyles (cssObject, target) {
  if (typeof resolveCssx !== 'function') return

  for (const className of getLegacyStaticClassNames(cssObject)) {
    if (Object.prototype.hasOwnProperty.call(cssObject, className)) continue

    const style = resolveCssx({
      styleName: className,
      layers: cssObject,
      target,
      cache: false
    }).props.style

    if (style && typeof style === 'object' && Object.keys(style).length > 0) {
      cssObject[className] = style
    }
  }
}

function getLegacyStaticClassNames (cssObject) {
  const classNames = new Set()

  for (const rule of cssObject.rules || []) {
    if (rule.part || rule.media || rule.classes?.length !== 1) continue
    classNames.add(rule.classes[0])
  }

  return classNames
}

function requireCssToRn () {
  const nativeRequire = createRequire(__filename)
  try {
    return nativeRequire('@cssxjs/css-to-rn')
  } catch (error) {
    const sourceEntrypoint = join(__dirname, '../css-to-rn/src/index.ts')
    if (
      existsSync(sourceEntrypoint) &&
      (
        error.code === 'MODULE_NOT_FOUND' ||
        error instanceof SyntaxError ||
        /Must use import to load ES Module/.test(error.message)
      )
    ) {
      return createChildCompiler(sourceEntrypoint)
    }
    throw error
  }
}

function createChildCompiler (sourceEntrypoint) {
  return {
    compileCss: (source, options) =>
      compileInChildProcess('compileCss', sourceEntrypoint, source, options),
    compileCssTemplate: (source, options) =>
      compileInChildProcess('compileCssTemplate', sourceEntrypoint, source, options),
    simpleNumericHash
  }
}

function compileInChildProcess (method, sourceEntrypoint, source, options) {
  const script = `
    import { ${method} } from ${JSON.stringify(pathToFileURL(sourceEntrypoint).href)}
    let input = ''
    process.stdin.setEncoding('utf8')
    for await (const chunk of process.stdin) input += chunk
    const payload = JSON.parse(input)
    process.stdout.write(JSON.stringify(${method}(payload.source, payload.options)))
  `
  const result = spawnSync(process.execPath, [
    '-C',
    'cssx-ts',
    '--input-type=module',
    '--eval',
    script
  ], {
    input: JSON.stringify({ source, options }),
    encoding: 'utf8'
  })

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout)
  }

  return JSON.parse(result.stdout)
}

// ref: https://gist.github.com/hyamamoto/fd435505d29ebfa3d9716fd2be8d42f0?permalink_comment_id=2694461#gistcomment-269461
function simpleNumericHash (s) {
  let i, h
  for (i = 0, h = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0
  return h
}

function parseStylValue (value) {
  if (typeof value !== 'string') return value
  // strip single quotes (stylus adds it for the topmost value)
  // and parens (stylus adds them for values in a hash)
  // Instead of doing a simple regex replace for both beginning and end,
  // we only find beginning chars and then cut string from both sides.
  // This is needed to prevent false-replacing the paren at the end of
  // values like 'rgba(...)'
  if (/^['"(]/.test(value)) {
    const wrapsLength = value.match(/^['"(]+/)[0].length
    value = value.slice(wrapsLength).slice(0, -wrapsLength)
  }
  // hash
  if (value.charAt(0) === '{') {
    const hash = JSON.parse(value)
    for (const key in hash) {
      hash[key] = parseStylValue(hash[key])
    }
    return hash
  } else if (!isNaN(parseFloat(value))) {
    return parseFloat(value)
  } else {
    return value
  }
}

// Process :export properties by wrapping their values in quotes
function escapeExport (source) {
  const match = source.match(EXPORT_REGEX)
  if (!match) return source

  // 1. find closing bracket of :export { ... }
  const matchIndex = match.index
  const matchStr = match[0]
  const matchLength = matchStr.length
  const start = matchIndex + matchLength
  let openBr = 1 // Count opened brackets, we start from one already opened
  let end

  for (let i = start; i < source.length; i++) {
    if (source.charAt(i) === '}') {
      --openBr
    } else if (source.charAt(i) === '{') {
      ++openBr
    }

    if (openBr <= 0) {
      end = i
      break
    }
  }
  if (!end) return source

  // 2. escape all exported values
  const properties = source
    .slice(start, end)
    .split(';')
    .map(line => line.replace(/(:\s+)([^'"].*[^'"])$/, '$1\'$2\''))
    .join(';')

  source = source.slice(0, start) + properties + source.slice(end)

  return source
}
