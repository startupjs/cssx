import assert from 'node:assert/strict'
import { resolveCssValue } from '../../src/index.ts'

describe('@cssxjs/css-to-rn value resolver', () => {
  it('resolves runtime variables, defaults, and inline fallbacks by priority', () => {
    assert.equal(resolveCssValue('var(--color, red)', {
      defaultVariables: { '--color': 'blue' },
      variables: { '--color': 'green' }
    }).value, 'green')

    assert.equal(resolveCssValue('var(--color, red)', {
      defaultVariables: { '--color': 'blue' }
    }).value, 'blue')

    assert.equal(resolveCssValue('var(--color, red)').value, 'red')
  })

  it('resolves nested var fallbacks and records dependencies', () => {
    const result = resolveCssValue('var(--a, var(--b, red))', {
      defaultVariables: { '--b': 'blue' }
    })

    assert.equal(result.valid, true)
    assert.equal(result.value, 'blue')
    assert.deepEqual(result.dependencies.vars, ['--a', '--b'])
  })

  it('invalidates unresolved variables', () => {
    const result = resolveCssValue('1px solid var(--missing)')

    assert.equal(result.valid, false)
    assert.equal(result.diagnostics[0].code, 'UNRESOLVED_VARIABLE')
    assert.deepEqual(result.dependencies.vars, ['--missing'])
  })

  it('detects variable cycles', () => {
    const result = resolveCssValue('var(--a)', {
      defaultVariables: {
        '--a': 'var(--b)',
        '--b': 'var(--a)'
      }
    })

    assert.equal(result.valid, false)
    assert.equal(result.diagnostics[0].code, 'VARIABLE_CYCLE')
  })

  it('replaces interpolation slots before resolving variables', () => {
    const result = resolveCssValue('color-mix(in srgb, var(--__cssx_dynamic_0), white)', {
      values: ['var(--color, red)'],
      variables: { '--color': 'green' }
    })

    assert.equal(result.valid, true)
    assert.equal(result.value, 'rgba(128, 192, 128, 1)')
    assert.deepEqual(result.dependencies.vars, ['--color'])
  })

  it('resolves scoped variables before defaults', () => {
    const result = resolveCssValue('var(--color)', {
      scopedVariables: [
        { '--color': 'red' },
        { '--color': 'oklch(62% 0.18 250 / 0.5)' }
      ],
      defaultVariables: { '--color': 'blue' }
    })

    assert.equal(result.valid, true)
    assert.equal(result.value, 'rgba(0, 137, 237, 0.5)')
    assert.deepEqual(result.dependencies.vars, ['--color'])
  })

  it('invalidates omitted interpolation values', () => {
    const result = resolveCssValue('var(--__cssx_dynamic_0)', {
      values: [false]
    })

    assert.equal(result.valid, false)
    assert.equal(result.diagnostics[0].code, 'INVALID_INTERPOLATION_VALUE')
  })

  it('resolves u and viewport units', () => {
    const result = resolveCssValue('calc(10vw + 2u)', {
      dimensions: { width: 200, height: 100 }
    })

    assert.equal(result.valid, true)
    assert.equal(result.value, '36px')
    assert.equal(result.dependencies.dimensions, true)
  })

  it('resolves percentage and unitless calc expressions for color channels', () => {
    assert.equal(resolveCssValue('calc(50% + 10%)').value, '60%')
    assert.equal(resolveCssValue('calc(0.2 * 0.5)').value, '0.1')
    assert.equal(resolveCssValue('oklch(calc(50% + 10%) calc(0.2 * 0.5) 250)').value, 'rgba(79, 132, 186, 1)')
  })

  it('mixes srgb colors with transparent using premultiplied alpha', () => {
    assert.equal(
      resolveCssValue('color-mix(in srgb, rgb(24 107 236) 5%, transparent)').value,
      'rgba(24, 107, 236, 0.05)'
    )
  })

  it('rejects unsupported calc expressions', () => {
    const result = resolveCssValue('calc(100% - 16px)')

    assert.equal(result.valid, false)
    assert.equal(result.diagnostics[0].code, 'UNSUPPORTED_CALC')
  })
})
