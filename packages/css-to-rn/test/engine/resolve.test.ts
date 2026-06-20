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
