import assert from 'node:assert/strict'

import {
  compileCss,
  compileCssTemplate,
  createCssxCache,
  resolveCssx
} from '../../src/index.ts'

describe('@cssxjs/css-to-rn resolver', () => {
  it('resolves matched root and part styles with specificity and inline overrides', () => {
    const sheet = compileCss(`
      .button { color: red; padding: 1u; }
      .button.primary { color: blue; }
      .button:part(root) { background-color: yellow; }
      .button:part(label) { color: white; }
      .button:hover { opacity: 0.5; }
    `)

    const result = resolveCssx({
      styleName: ['button', { primary: true }],
      layers: sheet,
      inlineStyleProps: { color: 'green' }
    })

    assert.deepEqual(result.props, {
      style: {
        color: 'green',
        backgroundColor: 'yellow',
        paddingTop: 8,
        paddingRight: 8,
        paddingBottom: 8,
        paddingLeft: 8
      },
      labelStyle: { color: 'white' },
      hoverStyle: { opacity: 0.5 }
    })
  })

  it('applies later layers after earlier layers', () => {
    const base = compileCss('.button { color: red; padding: 8px; }')
    const local = compileCss('.button { color: blue; }')

    const result = resolveCssx({
      styleName: 'button',
      layers: [base, local]
    })

    assert.deepEqual(result.props, {
      style: {
        color: 'blue',
        paddingTop: 8,
        paddingRight: 8,
        paddingBottom: 8,
        paddingLeft: 8
      }
    })
  })

  it('returns compile diagnostics from runtime sheet inputs', () => {
    const result = resolveCssx({
      styleName: 'button',
      layers: `
        #ignored { color: red; }
        .button { color: blue; }
      `
    })

    assert.deepEqual(result.props, { style: { color: 'blue' } })
    assert.equal(result.diagnostics[0].code, 'UNSUPPORTED_SELECTOR')
  })

  it('drops only invalid dynamic declarations and keeps fallback declarations', () => {
    const sheet = compileCss(`
      .button {
        color: red;
        color: var(--button-color);
        border: var(--border-width, 2px) solid var(--border-color, blue);
      }
    `)

    const result = resolveCssx({
      styleName: 'button',
      layers: sheet,
      variables: { '--border-color': 'green' }
    })

    assert.deepEqual(result.props, {
      style: {
        color: 'red',
        borderWidth: 2,
        borderColor: 'green',
        borderStyle: 'solid'
      }
    })
    assert.deepEqual(result.dependencies.vars, [
      '--border-color',
      '--border-width',
      '--button-color'
    ])
    assert.equal(result.diagnostics[0].code, 'UNRESOLVED_VARIABLE')
  })

  it('does not subscribe to variables in inactive media rules', () => {
    const sheet = compileCss(`
      .button { color: red; }
      @media (min-width: 600px) {
        .button { color: var(--wide-color); }
      }
    `)

    const result = resolveCssx({
      styleName: 'button',
      layers: sheet,
      variables: { '--wide-color': 'blue' },
      dimensions: { width: 320, height: 640 }
    })

    assert.deepEqual(result.props, { style: { color: 'red' } })
    assert.deepEqual(result.dependencies.vars, [])
    assert.deepEqual(result.dependencies.media, ['(min-width: 600px)'])
  })

  it('activates media rules and resolves viewport units from dimensions', () => {
    const sheet = compileCss(`
      .button { width: 10vw; }
      @media (min-width: 600px) {
        .button { width: calc(20vw + 1u); }
      }
    `)

    const result = resolveCssx({
      styleName: 'button',
      layers: sheet,
      dimensions: { width: 800, height: 600 }
    })

    assert.deepEqual(result.props, { style: { width: 168 } })
    assert.equal(result.dependencies.dimensions, true)
    assert.deepEqual(result.dependencies.media, ['(min-width: 600px)'])
  })

  it('resolves active theme variables and invalidates cache by theme', () => {
    const sheet = compileCss(`
      :root { --surface: white; }
      :root.dark { --surface: black; }
      .button { color: var(--surface); }
    `)
    const cache = createCssxCache()

    const light = resolveCssx({
      styleName: 'button',
      layers: sheet,
      theme: 'default',
      cache
    })
    const dark = resolveCssx({
      styleName: 'button',
      layers: sheet,
      theme: 'dark',
      cache
    })
    const darkAgain = resolveCssx({
      styleName: 'button',
      layers: sheet,
      theme: 'dark',
      cache
    })

    assert.deepEqual(light.props, { style: { color: 'white' } })
    assert.deepEqual(dark.props, { style: { color: 'black' } })
    assert.notEqual(dark.props, light.props)
    assert.equal(darkAgain.cacheHit, true)
    assert.equal(darkAgain.props, dark.props)
  })

  it('matches built-in theme media aliases', () => {
    const sheet = compileCss(`
      .button { color: red; }
      @media (--theme-dark) {
        .button { color: white; }
      }
      @media (--theme-dark) and (min-width: 600px) {
        .button { padding: 2u; }
      }
    `)

    const light = resolveCssx({
      styleName: 'button',
      layers: sheet,
      theme: 'default',
      dimensions: { width: 800, height: 600 }
    })
    const darkNarrow = resolveCssx({
      styleName: 'button',
      layers: sheet,
      theme: 'dark',
      dimensions: { width: 320, height: 600 }
    })
    const darkWide = resolveCssx({
      styleName: 'button',
      layers: sheet,
      theme: 'dark',
      dimensions: { width: 800, height: 600 }
    })

    assert.deepEqual(light.props, { style: { color: 'red' } })
    assert.deepEqual(darkNarrow.props, { style: { color: 'white' } })
    assert.deepEqual(darkWide.props, {
      style: {
        color: 'white',
        paddingTop: 16,
        paddingRight: 16,
        paddingBottom: 16,
        paddingLeft: 16
      }
    })
    assert.deepEqual(darkWide.dependencies.media, ['(min-width: 600px)'])
  })

  it('expands custom media aliases with provider variables', () => {
    const sheet = compileCss(`
      :root { --tablet: 40rem; }
      @custom-media --breakpoint-tablet (width >= var(--tablet));
      .button { color: red; }
      @media (--breakpoint-tablet) {
        .button { color: blue; }
      }
    `)

    const narrow = resolveCssx({
      styleName: 'button',
      layers: sheet,
      dimensions: { width: 600, height: 800 }
    })
    const wide = resolveCssx({
      styleName: 'button',
      layers: sheet,
      dimensions: { width: 700, height: 800 }
    })

    assert.deepEqual(narrow.props, { style: { color: 'red' } })
    assert.deepEqual(wide.props, { style: { color: 'blue' } })
    assert.deepEqual(wide.dependencies.vars, ['--tablet'])
    assert.equal(wide.dependencies.dimensions, true)
    assert.deepEqual(wide.dependencies.media, [])
    assert.deepEqual(wide.dependencies.mediaMatches, {})
  })

  it('evaluates width and height range media syntax', () => {
    const sheet = compileCss(`
      .button { color: red; }
      @media (width >= 48rem) {
        .button { color: blue; }
      }
      @media (height < 40rem) {
        .button { opacity: 0.5; }
      }
    `)

    const small = resolveCssx({
      styleName: 'button',
      layers: sheet,
      dimensions: { width: 767, height: 640 }
    })
    const large = resolveCssx({
      styleName: 'button',
      layers: sheet,
      dimensions: { width: 768, height: 639 }
    })

    assert.deepEqual(small.props, { style: { color: 'red' } })
    assert.deepEqual(large.props, { style: { color: 'blue', opacity: 0.5 } })
  })

  it('resolves template interpolation values through one cache slot', () => {
    const sheet = compileCssTemplate('.button { color: var(--__cssx_dynamic_0); }')
    const cache = createCssxCache()

    const red = resolveCssx({
      styleName: 'button',
      layers: { sheet, values: ['red'] },
      cache
    })
    const redAgain = resolveCssx({
      styleName: 'button',
      layers: { sheet, values: ['red'] },
      cache
    })
    const green = resolveCssx({
      styleName: 'button',
      layers: { sheet, values: ['green'] },
      cache
    })
    const greenAgain = resolveCssx({
      styleName: 'button',
      layers: { sheet, values: ['green'] },
      cache
    })
    const redAfterGreen = resolveCssx({
      styleName: 'button',
      layers: { sheet, values: ['red'] },
      cache
    })

    assert.equal(redAgain.cacheHit, true)
    assert.equal(redAgain.props, red.props)
    assert.notEqual(green.props, red.props)
    assert.equal(greenAgain.cacheHit, true)
    assert.equal(greenAgain.props, green.props)
    assert.notEqual(redAfterGreen.props, red.props)
    assert.equal(cache.entries.size, 1)
  })

  it('reuses cached references for equal inline style values', () => {
    const sheet = compileCss('.button { color: red; }')
    const cache = createCssxCache()

    const first = resolveCssx({
      styleName: 'button',
      layers: sheet,
      inlineStyleProps: { opacity: 0.5 },
      cache
    })
    const second = resolveCssx({
      styleName: 'button',
      layers: sheet,
      inlineStyleProps: { opacity: 0.5 },
      cache
    })

    assert.equal(second.cacheHit, true)
    assert.equal(second.props, first.props)
    assert.equal(second.props.style, first.props.style)
  })

  it('does not invalidate cache when unused variables change', () => {
    const sheet = compileCss('.button { color: var(--text); }')
    const cache = createCssxCache()

    const first = resolveCssx({
      styleName: 'button',
      layers: sheet,
      variables: { '--text': 'red', '--unused': 1 },
      cache
    })
    const second = resolveCssx({
      styleName: 'button',
      layers: sheet,
      variables: { '--text': 'red', '--unused': 2 },
      cache
    })
    const changed = resolveCssx({
      styleName: 'button',
      layers: sheet,
      variables: { '--text': 'green', '--unused': 2 },
      cache
    })

    assert.equal(second.cacheHit, true)
    assert.equal(second.props, first.props)
    assert.notEqual(changed.props, first.props)
    assert.deepEqual(changed.props, { style: { color: 'green' } })
  })

  it('keeps separate cache entries for different elements', () => {
    const sheet = compileCss(`
      .button { color: red; }
      .label { color: blue; }
    `)
    const cache = createCssxCache()

    const button = resolveCssx({ styleName: 'button', layers: sheet, cache })
    const label = resolveCssx({ styleName: 'label', layers: sheet, cache })
    const buttonAgain = resolveCssx({ styleName: 'button', layers: sheet, cache })
    const labelAgain = resolveCssx({ styleName: 'label', layers: sheet, cache })

    assert.equal(buttonAgain.props, button.props)
    assert.equal(labelAgain.props, label.props)
    assert.notEqual(button.props, label.props)
    assert.equal(cache.entries.size, 2)
  })

  it('matches component tag selectors and resolves sheet root variables', () => {
    const sheet = compileCss(`
      :root {
        --button-color: oklch(62% 0.18 250 / 0.5);
      }
      Button { color: var(--button-color); }
      Button.primary:part(label) { color: white; }
      Link { color: green; }
      .utility { padding: 1u; }
    `)

    const result = resolveCssx({
      componentTag: 'Button',
      styleName: ['primary', 'utility'],
      layers: sheet
    })

    assert.deepEqual(result.props, {
      style: {
        color: 'rgba(0, 137, 237, 0.5)',
        paddingTop: 8,
        paddingRight: 8,
        paddingBottom: 8,
        paddingLeft: 8
      },
      labelStyle: { color: 'white' }
    })
    assert.deepEqual(result.dependencies.vars, ['--button-color'])
  })

  it('keeps component tag and scoped variables in cache invalidation', () => {
    const sheet = compileCss(`
      Button { color: var(--color); }
      Link { color: var(--color); }
    `)
    const cache = createCssxCache()
    const button = resolveCssx({
      componentTag: 'Button',
      styleName: '',
      layers: sheet,
      scopedVariables: [{ '--color': 'red' }],
      cache
    })
    const link = resolveCssx({
      componentTag: 'Link',
      styleName: '',
      layers: sheet,
      scopedVariables: [{ '--color': 'red' }],
      cache
    })
    const buttonAgain = resolveCssx({
      componentTag: 'Button',
      styleName: '',
      layers: sheet,
      scopedVariables: [{ '--color': 'red' }],
      cache
    })
    const buttonChanged = resolveCssx({
      componentTag: 'Button',
      styleName: '',
      layers: sheet,
      scopedVariables: [{ '--color': 'blue' }],
      cache
    })

    assert.equal(buttonAgain.cacheHit, true)
    assert.equal(buttonAgain.props, button.props)
    assert.notEqual(link.props, button.props)
    assert.notEqual(buttonChanged.props, button.props)
    assert.deepEqual(buttonChanged.props, { style: { color: 'blue' } })
  })

  it('resolves variables in inline style props', () => {
    const sheet = compileCss('.button { color: red; }')
    const result = resolveCssx({
      styleName: 'button',
      layers: sheet,
      inlineStyleProps: {
        style: {
          color: 'var(--inline-color)',
          paddingTop: 'var(--inline-space)'
        }
      },
      variables: {
        '--inline-color': 'oklch(62% 0.18 250 / 0.5)',
        '--inline-space': '2u'
      }
    })

    assert.deepEqual(result.props, {
      style: {
        color: 'rgba(0, 137, 237, 0.5)',
        paddingTop: 16
      }
    })
    assert.deepEqual(result.dependencies.vars, ['--inline-color', '--inline-space'])
  })

  it('preserves non-plain inline style objects such as animated values', () => {
    class AnimatedValue {
      current: number

      constructor (current: number) {
        this.current = current
      }
    }

    const animatedTranslateX = new AnimatedValue(1)
    const sheet = compileCss('.button { color: red; }')
    const result = resolveCssx({
      styleName: 'button',
      layers: sheet,
      inlineStyleProps: {
        style: {
          opacity: 'var(--opacity)',
          transform: [{ translateX: animatedTranslateX }]
        }
      } as any,
      variables: {
        '--opacity': 0.5
      }
    })

    assert.equal(
      (result.props.style as any).transform[0].translateX,
      animatedTranslateX
    )
    assert.deepEqual(result.props, {
      style: {
        color: 'red',
        opacity: 0.5,
        transform: [{ translateX: animatedTranslateX }]
      }
    })
  })

  it('resolves partial variables inside complex property values', () => {
    const sheet = compileCss(`
      .button {
        box-shadow: var(--shadow-x, 0) 2px var(--shadow-blur, 4px) var(--shadow-color);
        filter: blur(var(--blur, 2px)) brightness(var(--brightness, 0.8));
        text-shadow: var(--text-x, 1px) 2px 3px var(--text-color, red);
        transform: translateX(var(--tx, 4px)) scale(var(--scale, 2));
        background: var(--bg-color, red) var(--bg-image, radial-gradient(circle, white, black));
      }
    `)

    const result = resolveCssx({
      styleName: 'button',
      layers: sheet,
      variables: {
        '--shadow-x': '1px',
        '--shadow-blur': '8px',
        '--shadow-color': 'rgba(0,0,0,.2)',
        '--blur': '4px',
        '--brightness': 0.9,
        '--text-x': '5px',
        '--text-color': 'blue',
        '--tx': '10px',
        '--scale': 1.5,
        '--bg-color': 'green',
        '--bg-image': 'linear-gradient(90deg, white, black)'
      }
    })

    assert.deepEqual(result.dependencies.vars, [
      '--bg-color',
      '--bg-image',
      '--blur',
      '--brightness',
      '--scale',
      '--shadow-blur',
      '--shadow-color',
      '--shadow-x',
      '--text-color',
      '--text-x',
      '--tx'
    ])
    assert.deepEqual(result.props, {
      style: {
        boxShadow: '1px 2px 8px rgba(0,0,0,.2)',
        filter: 'blur(4px) brightness(0.9)',
        textShadowOffset: { width: 5, height: 2 },
        textShadowRadius: 3,
        textShadowColor: 'blue',
        transform: [
          { scale: 1.5 },
          { translateX: 10 }
        ],
        backgroundColor: 'green',
        experimental_backgroundImage: 'linear-gradient(90deg, white, black)'
      }
    })
  })

  it('evicts raw CSS resolved cache entries when a caller requests a single cache slot', () => {
    const cache = createCssxCache({ maxEntries: 1 })
    const redCss = '.root { color: red; }'
    const greenCss = '.root { color: green; }'

    const red = resolveCssx({ styleName: 'root', layers: redCss, cache })
    const redAgain = resolveCssx({ styleName: 'root', layers: redCss, cache })
    const green = resolveCssx({ styleName: 'root', layers: greenCss, cache })
    const redAfterGreen = resolveCssx({ styleName: 'root', layers: redCss, cache })

    assert.equal(redAgain.cacheHit, true)
    assert.equal(redAgain.props, red.props)
    assert.equal(green.cacheHit, false)
    assert.equal(redAfterGreen.cacheHit, false)
    assert.notEqual(redAfterGreen.props, red.props)
    assert.equal(cache.entries.size, 1)
  })

  it('inlines only keyframes used by matched animation styles', () => {
    const sheet = compileCss(`
      @keyframes fade {
        from { opacity: var(--from-opacity, 0); }
        to { opacity: 1; }
      }
      @keyframes unused {
        from { color: var(--unused-color); }
        to { color: black; }
      }
      .button { animation: fade 200ms ease; }
    `)

    const result = resolveCssx({
      styleName: 'button',
      layers: sheet
    })

    assert.deepEqual(result.dependencies.vars, ['--from-opacity'])
    assert.deepEqual(result.props.style, {
      animationName: {
        from: { opacity: 0 },
        to: { opacity: 1 }
      },
      animationDuration: '200ms',
      animationTimingFunction: 'ease',
      animationDelay: '0s',
      animationIterationCount: 1,
      animationDirection: 'normal',
      animationFillMode: 'none',
      animationPlayState: 'running'
    })
  })

  it('resolves variables and interpolation inside animation and transition values', () => {
    const sheet = compileCssTemplate(`
      @keyframes fade {
        from { opacity: var(--from-opacity, 0); }
        to { opacity: var(--target-opacity, 1); }
      }
      .button {
        animation: var(--animation-name, fade) var(--__cssx_dynamic_0) ease;
        transition: opacity var(--transition-duration, 150ms);
      }
    `)

    const result = resolveCssx({
      styleName: 'button',
      layers: {
        sheet,
        values: ['300ms']
      },
      variables: {
        '--from-opacity': 0.25,
        '--target-opacity': 0.75,
        '--transition-duration': '250ms'
      }
    })

    assert.deepEqual(result.dependencies.vars, [
      '--animation-name',
      '--from-opacity',
      '--target-opacity',
      '--transition-duration'
    ])
    assert.deepEqual(result.props.style, {
      animationName: {
        from: { opacity: 0.25 },
        to: { opacity: 0.75 }
      },
      animationDuration: '300ms',
      animationTimingFunction: 'ease',
      animationDelay: '0s',
      animationIterationCount: 1,
      animationDirection: 'normal',
      animationFillMode: 'none',
      animationPlayState: 'running',
      transitionProperty: 'opacity',
      transitionDuration: '250ms',
      transitionTimingFunction: 'ease',
      transitionDelay: '0s'
    })
  })
})
