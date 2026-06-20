import assert from 'node:assert/strict'

import { transformDeclarations } from '../../src/transform/index.ts'
import type {
  CssDeclaration,
  TransformDeclarationOptions,
} from '../../src/transform/index.ts'

function declarations (
  input: ReadonlyArray<readonly [string, string]>
): CssDeclaration[] {
  return input.map(([property, value], order) => ({
    property,
    value,
    raw: `${property}: ${value}`,
    order,
  }))
}

function transform (
  input: ReadonlyArray<readonly [string, string]>,
  options?: TransformDeclarationOptions
) {
  return transformDeclarations(declarations(input), options)
}

describe('@cssxjs/css-to-rn declaration transformer', () => {
  it('normalizes raw declarations and expands margin, padding, and border shorthands', () => {
    const result = transform([
      ['opacity', '0.5'],
      ['display', 'flex'],
      ['margin', '1px 2px auto 4px'],
      ['padding', '2u 8px'],
      ['border', '2px dashed #f00'],
      ['border-radius', '4px 8px 12px 16px'],
      ['border-width', '1px 2px 3px 4px'],
      ['border-color', 'red green blue black'],
    ])

    assert.deepEqual(result.diagnostics, [])
    assert.deepEqual(result.style, {
      opacity: 0.5,
      display: 'flex',
      marginTop: 1,
      marginRight: 2,
      marginBottom: 'auto',
      marginLeft: 4,
      paddingTop: 16,
      paddingRight: 8,
      paddingBottom: 16,
      paddingLeft: 8,
      borderWidth: 2,
      borderColor: '#f00',
      borderStyle: 'dashed',
      borderTopLeftRadius: 4,
      borderTopRightRadius: 8,
      borderBottomRightRadius: 12,
      borderBottomLeftRadius: 16,
      borderTopWidth: 1,
      borderRightWidth: 2,
      borderBottomWidth: 3,
      borderLeftWidth: 4,
      borderTopColor: 'red',
      borderRightColor: 'green',
      borderBottomColor: 'blue',
      borderLeftColor: 'black',
    })
  })

  it('transforms transform and text-shadow values', () => {
    const result = transform([
      ['transform', 'scale(2, 3) translate(4px, 50%) rotate(5deg)'],
      ['text-shadow', '10px 20px 30px rgba(0, 0, 0, 0.4)'],
    ])

    assert.deepEqual(result.diagnostics, [])
    assert.deepEqual(result.style, {
      transform: [
        { rotate: '5deg' },
        { translateY: '50%' },
        { translateX: 4 },
        { scaleY: 3 },
        { scaleX: 2 },
      ],
      textShadowOffset: { width: 10, height: 20 },
      textShadowRadius: 30,
      textShadowColor: 'rgba(0, 0, 0, 0.4)',
    })
  })

  it('passes through box-shadow and filter strings', () => {
    const result = transform([
      ['box-shadow', '0 2px 8px rgba(0,0,0,.2), 0 1px 2px #333'],
      ['filter', 'blur(4px) brightness(0.8)'],
    ])

    assert.deepEqual(result.diagnostics, [])
    assert.deepEqual(result.style, {
      boxShadow: '0 2px 8px rgba(0,0,0,.2), 0 1px 2px #333',
      filter: 'blur(4px) brightness(0.8)',
    })
  })

  it('maps background-image by platform and supports limited background shorthand', () => {
    const nativeResult = transform([
      ['background-image', 'linear-gradient(90deg, red, blue)'],
      ['background', 'red radial-gradient(circle, white, black)'],
    ])
    const webResult = transform(
      [['background-image', 'linear-gradient(90deg, red, blue)']],
      { platform: 'web' }
    )

    assert.deepEqual(nativeResult.diagnostics, [])
    assert.deepEqual(nativeResult.style, {
      experimental_backgroundImage: 'radial-gradient(circle, white, black)',
      backgroundColor: 'red',
    })
    assert.deepEqual(webResult.style, {
      backgroundImage: 'linear-gradient(90deg, red, blue)',
    })
  })

  it('diagnoses unsupported background images without emitting style', () => {
    const result = transform([
      ['background-image', 'url(foo.png)'],
      ['background', 'no-repeat center/cover red'],
    ])

    assert.deepEqual(result.style, {})
    assert.deepEqual(
      result.diagnostics.map(diagnostic => diagnostic.code),
      ['UNSUPPORTED_BACKGROUND_IMAGE', 'UNSUPPORTED_BACKGROUND_SHORTHAND']
    )
  })

  it('transforms animations, transitions, and animation keyframe names', () => {
    const result = transform(
      [
        ['animation', 'fadeIn 300ms ease, slideIn 500ms ease-out 100ms'],
        [
          'transition',
          'background-color 200ms linear, opacity 1s ease-in 50ms',
        ],
      ],
      {
        keyframes: {
          fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        },
      }
    )

    assert.deepEqual(result.diagnostics, [])
    assert.deepEqual(result.style, {
      animationName: [
        { from: { opacity: 0 }, to: { opacity: 1 } },
        'slideIn',
      ],
      animationDuration: ['300ms', '500ms'],
      animationTimingFunction: ['ease', 'ease-out'],
      animationDelay: ['0s', '100ms'],
      animationIterationCount: [1, 1],
      animationDirection: ['normal', 'normal'],
      animationFillMode: ['none', 'none'],
      animationPlayState: ['running', 'running'],
      transitionProperty: ['backgroundColor', 'opacity'],
      transitionDuration: ['200ms', '1s'],
      transitionTimingFunction: ['linear', 'ease-in'],
      transitionDelay: ['0s', '50ms'],
    })
  })
})
