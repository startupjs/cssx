import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import React, { Suspense, act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  __cssxInternals,
  compileCss,
  compileCssTemplate,
  CssxProvider,
  cssx,
  defaultVariables,
  getCssVariable,
  getCssVariableRaw,
  setDefaultVariables,
  themed,
  useCssVariable,
  useCssVariableRaw,
  useCssxLayer,
  useCssxTemplate,
  variables
} from '../../src/web.ts'

(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}).IS_REACT_ACT_ENVIRONMENT = true

const dom = new JSDOM('<!doctype html><html><body></body></html>')
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  Node: dom.window.Node
})

describe('@cssxjs/css-to-rn React tracking prototype', () => {
  function reset (): void {
    __cssxInternals.resetStoreForTests()
    __cssxInternals.clearRawCssCacheForTests()
  }

  it('batches variable notifications in one microtask', async () => {
    reset()
    const calls: string[][] = []
    const unsubscribe = __cssxInternals.subscribeVariablesForTests(
      ['--bg', '--text'],
      names => calls.push([...names].sort())
    )

    variables['--bg'] = 'black'
    Object.assign(variables, {
      '--text': 'white'
    })

    assert.equal(calls.length, 0)
    await __cssxInternals.flushMicrotasksForTests()

    assert.deepEqual(calls, [['--bg', '--text']])
    unsubscribe()
    reset()
  })

  it('records dependencies only for matched active selectors', () => {
    reset()
    const sheet = compileCss(`
      .root { color: var(--root-color, red); }
      .label { color: var(--label-color, blue); }
    `)
    const tracked = __cssxInternals.createTrackedCssxSheet(sheet, { target: 'web' })

    tracked.startRender()
    const props = cssx('root', tracked)
    const dependencies = tracked.getPendingDependenciesForTests()

    assert.deepEqual(props, {
      style: {
        color: 'red'
      }
    })
    assert.deepEqual(
      Array.from(dependencies?.vars.keys() ?? []),
      ['--root-color']
    )
    reset()
  })

  it('notifies tracked wrappers only for committed variable dependencies', async () => {
    reset()
    const sheet = compileCss(`
      .root { color: var(--root-color, red); }
      .root.active { background-color: var(--active-bg, blue); }
    `)
    const tracked = __cssxInternals.createTrackedCssxSheet(sheet, { target: 'web' })
    let calls = 0
    const unsubscribe = tracked.subscribe(() => {
      calls += 1
    })

    tracked.startRender()
    cssx('root', tracked)
    tracked.commitRender()

    variables['--active-bg'] = 'green'
    await __cssxInternals.flushMicrotasksForTests()
    assert.equal(calls, 0)

    variables['--root-color'] = 'black'
    await __cssxInternals.flushMicrotasksForTests()
    assert.equal(calls, 1)

    unsubscribe()
    assert.equal(__cssxInternals.getRuntimeSubscriberCountForTests(), 0)
    reset()
  })

  it('unions dependencies from multiple cssx calls in one render', () => {
    reset()
    const sheet = compileCss(`
      .root { color: var(--root-color, red); }
      .label { color: var(--label-color, blue); }
    `)
    const tracked = __cssxInternals.createTrackedCssxSheet(sheet, { target: 'web' })

    tracked.startRender()
    cssx('root', tracked)
    cssx('label', tracked)

    assert.deepEqual(
      Array.from(tracked.getPendingDependenciesForTests()?.vars.keys() ?? []),
      ['--root-color', '--label-color']
    )
    reset()
  })

  it('does not subscribe to dependencies collected by an aborted render', async () => {
    reset()
    const sheet = compileCss(`
      .root { color: var(--root-color, red); }
      .root.active { background-color: var(--active-bg, blue); }
    `)
    const tracked = __cssxInternals.createTrackedCssxSheet(sheet, { target: 'web' })
    let calls = 0
    const unsubscribe = tracked.subscribe(() => {
      calls += 1
    })

    tracked.startRender()
    cssx('root', tracked)
    tracked.commitRender()

    tracked.startRender()
    cssx(['root', 'active'], tracked)

    variables['--active-bg'] = 'green'
    await __cssxInternals.flushMicrotasksForTests()
    assert.equal(calls, 0)

    variables['--root-color'] = 'black'
    await __cssxInternals.flushMicrotasksForTests()
    assert.equal(calls, 1)

    unsubscribe()
    reset()
  })

  it('commits the dependency snapshot captured for that render', async () => {
    reset()
    const sheet = compileCss(`
      .root { color: var(--root-color, red); }
      .root.active { background-color: var(--active-bg, blue); }
    `)
    const tracked = __cssxInternals.createTrackedCssxSheet(sheet, { target: 'web' })
    let calls = 0
    const unsubscribe = tracked.subscribe(() => {
      calls += 1
    })

    const rootRender = tracked.startRender()
    cssx('root', tracked)

    tracked.startRender()
    cssx(['root', 'active'], tracked)

    tracked.commitRender(rootRender)

    variables['--active-bg'] = 'green'
    await __cssxInternals.flushMicrotasksForTests()
    assert.equal(calls, 0)

    variables['--root-color'] = 'black'
    await __cssxInternals.flushMicrotasksForTests()
    assert.equal(calls, 1)

    unsubscribe()
    reset()
  })

  it('reuses tracked cache references for identical render inputs', () => {
    reset()
    const sheet = compileCss('.root { color: var(--root-color, red); }')
    const tracked = __cssxInternals.createTrackedCssxSheet(sheet, { target: 'web' })

    tracked.startRender()
    const first = cssx('root', tracked, { style: { opacity: 0.5 } })
    tracked.commitRender()

    tracked.startRender()
    const second = cssx('root', tracked, { style: { opacity: 0.5 } })
    tracked.commitRender()

    assert.equal(second, first)
    assert.equal(second.style, first.style)
    reset()
  })

  it('passes tracked template values into the shared resolver', () => {
    reset()
    const sheet = compileCssTemplate('.root { color: var(--__cssx_dynamic_0); }')
    const tracked = __cssxInternals.createTrackedCssxSheet(sheet, {
      target: 'web',
      values: ['red']
    })

    tracked.startRender()
    const red = cssx('root', tracked)
    tracked.commitRender()

    tracked.update(sheet, {
      target: 'web',
      values: ['green']
    })
    tracked.startRender()
    const green = cssx('root', tracked)
    tracked.commitRender()

    assert.deepEqual(red, { style: { color: 'red' } })
    assert.deepEqual(green, { style: { color: 'green' } })
    assert.notEqual(green, red)
    reset()
  })

  it('notifies default variable replacements and removed defaults', async () => {
    reset()
    const sheet = compileCss('.root { color: var(--root-color, red); }')
    const tracked = __cssxInternals.createTrackedCssxSheet(sheet, { target: 'web' })
    let calls = 0
    const unsubscribe = tracked.subscribe(() => {
      calls += 1
    })

    setDefaultVariables({ '--root-color': 'blue' })
    tracked.startRender()
    assert.deepEqual(cssx('root', tracked), { style: { color: 'blue' } })
    tracked.commitRender()

    setDefaultVariables({ '--other': 'green' })
    await __cssxInternals.flushMicrotasksForTests()
    assert.equal(calls, 1)

    tracked.startRender()
    assert.deepEqual(cssx('root', tracked), { style: { color: 'red' } })
    tracked.commitRender()

    unsubscribe()
    reset()
  })

  it('supports variable store bulk methods and validation', () => {
    reset()

    variables.assign({
      '--text': 'red',
      '--space': '2u'
    })
    assert.equal(variables['--text'], 'red')
    assert.equal(getCssVariable('--space'), 16)

    variables.set({
      '--text': 'blue'
    })
    assert.equal(variables['--text'], 'blue')
    assert.equal(variables['--space'], undefined)

    variables.clear()
    assert.equal(variables['--text'], undefined)

    defaultVariables.set({ '--fallback': 'oklch(62% 0.18 250 / 0.5)' })
    assert.equal(getCssVariableRaw('--fallback'), 'rgba(0, 137, 237, 0.5)')

    assert.throws(() => {
      variables.assign({ color: 'red' })
    }, /Invalid CSS custom property name/)
    assert.throws(() => {
      variables.color = 'red'
    }, /Invalid CSS custom property name/)

    reset()
  })

  it('resolves provider styles and themed component tag selectors', async () => {
    reset()
    let latest: unknown
    let latestVar: unknown
    let root: Root | undefined
    const container = document.createElement('div')
    document.body.appendChild(container)

    const Button = themed('Button', function Button (): React.ReactNode {
      latest = cssx(['primary', 'utility'], [])
      latestVar = useCssVariable('--brand')
      return createElement('div')
    })

    await act(async () => {
      root = createRoot(container)
      root.render(createElement(
        CssxProvider,
        {
          style: `
            :root { --brand: oklch(62% 0.18 250 / 0.5); }
            Button { color: var(--brand); }
            Button.primary:part(label) { color: white; }
            Link { color: green; }
            .utility { padding: 1u; }
          `
        },
        createElement(Button)
      ))
    })

    assert.deepEqual(latest, {
      style: {
        color: 'rgba(0, 137, 237, 0.5)',
        paddingTop: 8,
        paddingRight: 8,
        paddingBottom: 8,
        paddingLeft: 8
      },
      labelStyle: { color: 'white' }
    })
    assert.equal(latestVar, 'rgba(0, 137, 237, 0.5)')

    await act(async () => {
      root?.unmount()
    })
    container.remove()
    reset()
  })

  it('uses nearest provider root variables over outer provider roots', async () => {
    reset()
    let latest: unknown
    let root: Root | undefined
    const container = document.createElement('div')
    document.body.appendChild(container)

    function Component (): React.ReactNode {
      latest = useCssVariable('--space')
      return createElement('div')
    }

    await act(async () => {
      root = createRoot(container)
      root.render(createElement(
        CssxProvider,
        { style: ':root { --space: 1u; }' },
        createElement(
          CssxProvider,
          { style: ':root { --space: 3u; }' },
          createElement(Component)
        )
      ))
    })

    assert.equal(latest, 24)

    await act(async () => {
      root?.unmount()
    })
    container.remove()
    reset()
  })

  it('updates auto provider theme from color scheme changes', async () => {
    reset()
    __cssxInternals.setColorSchemeForTests('light')
    let latest: unknown
    let latestVar: unknown
    let renders = 0
    let root: Root | undefined
    const container = document.createElement('div')
    document.body.appendChild(container)

    function Component (): React.ReactNode {
      renders += 1
      latest = cssx('root', [])
      latestVar = useCssVariable('--surface')
      return createElement('div')
    }

    await act(async () => {
      root = createRoot(container)
      root.render(createElement(
        CssxProvider,
        {
          style: `
            :root { --surface: white; }
            :root.dark { --surface: black; }
            .root { color: var(--surface); }
          `
        },
        createElement(Component)
      ))
    })

    assert.deepEqual(latest, { style: { color: 'white' } })
    assert.equal(latestVar, 'white')
    assert.equal(renders, 1)

    await act(async () => {
      __cssxInternals.setColorSchemeForTests('dark')
    })

    assert.deepEqual(latest, { style: { color: 'black' } })
    assert.equal(latestVar, 'black')
    assert.equal(renders, 2)

    await act(async () => {
      root?.unmount()
    })
    container.remove()
    reset()
  })

  it('resolves provider root variables from compiled layers and template values', async () => {
    reset()
    const providerSheet = compileCss(':root { --tone: blue; }')
    const providerTemplate = compileCssTemplate(':root { --space: var(--__cssx_dynamic_0); }')
    let renders = 0
    let latestTone: unknown
    let latestSpace: unknown
    let root: Root | undefined
    const container = document.createElement('div')
    document.body.appendChild(container)

    setDefaultVariables({
      '--tone': 'red',
      '--space': '1u'
    })

    function Component (): React.ReactNode {
      renders += 1
      latestTone = useCssVariable('--tone')
      latestSpace = useCssVariable('--space')
      return createElement('div')
    }

    await act(async () => {
      root = createRoot(container)
      root.render(createElement(
        CssxProvider,
        {
          style: [
            providerSheet,
            {
              sheet: providerTemplate,
              values: ['2u']
            }
          ]
        },
        createElement(Component)
      ))
    })

    assert.equal(renders, 1)
    assert.equal(latestTone, 'blue')
    assert.equal(latestSpace, 16)

    variables['--tone'] = 'green'
    await act(async () => {
      await __cssxInternals.flushMicrotasksForTests()
    })

    assert.equal(renders, 2)
    assert.equal(latestTone, 'green')
    assert.equal(latestSpace, 16)

    await act(async () => {
      root?.unmount()
    })
    container.remove()
    reset()
  })

  it('tracks provider style dependencies from themed components without local sheets', async () => {
    reset()
    let renders = 0
    let latest: unknown
    let root: Root | undefined
    const container = document.createElement('div')
    document.body.appendChild(container)
    variables['--brand'] = 'red'

    const Button = themed('Button', function Button (): React.ReactNode {
      renders += 1
      latest = cssx('', [])
      return createElement('div')
    })

    await act(async () => {
      root = createRoot(container)
      root.render(createElement(
        CssxProvider,
        { style: 'Button { color: var(--brand); }' },
        createElement(Button)
      ))
    })

    assert.equal(renders, 1)
    assert.deepEqual(latest, { style: { color: 'red' } })

    variables['--brand'] = 'blue'
    await act(async () => {
      await __cssxInternals.flushMicrotasksForTests()
    })

    assert.equal(renders, 2)
    assert.deepEqual(latest, { style: { color: 'blue' } })

    await act(async () => {
      root?.unmount()
    })
    container.remove()
    assert.equal(__cssxInternals.getRuntimeSubscriberCountForTests(), 0)
    reset()
  })

  it('subscribes useCssVariable only to variables it resolves', async () => {
    reset()
    let renders = 0
    let latest: unknown
    let latestRaw: unknown
    let root: Root | undefined
    const container = document.createElement('div')
    document.body.appendChild(container)

    variables.set({
      '--space': '2u',
      '--tone': 'oklch(62% 0.18 250 / 0.5)',
      '--unused': 'red'
    })

    function Component (): React.ReactNode {
      renders += 1
      latest = useCssVariable('--space')
      latestRaw = useCssVariableRaw('--tone')
      return createElement('div')
    }

    await act(async () => {
      root = createRoot(container)
      root.render(createElement(Component))
    })

    assert.equal(renders, 1)
    assert.equal(latest, 16)
    assert.equal(latestRaw, 'rgba(0, 137, 237, 0.5)')

    variables['--unused'] = 'blue'
    await act(async () => {
      await __cssxInternals.flushMicrotasksForTests()
    })
    assert.equal(renders, 1)

    variables['--space'] = '3u'
    await act(async () => {
      await __cssxInternals.flushMicrotasksForTests()
    })
    assert.equal(renders, 2)
    assert.equal(latest, 24)

    await act(async () => {
      root?.unmount()
    })
    container.remove()
    assert.equal(__cssxInternals.getRuntimeSubscriberCountForTests(), 0)
    reset()
  })

  it('uses dimension adapter values for media queries and viewport units', async () => {
    reset()
    let dimensions = { width: 320, height: 640 }
    const listeners = new Set<() => void>()

    __cssxInternals.configureDimensionsAdapterForTests({
      get: () => dimensions,
      subscribe: listener => {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      }
    })

    const sheet = compileCss(`
      .root {
        width: 100vw;
        height: 50vh;
      }
      @media (max-width: 480px) {
        .root { color: red; }
      }
      @media (orientation: portrait) {
        .root { background-color: blue; }
      }
    `)
    const tracked = __cssxInternals.createTrackedCssxSheet(sheet, { target: 'web' })
    let calls = 0
    const unsubscribe = tracked.subscribe(() => {
      calls += 1
    })

    tracked.startRender()
    assert.deepEqual(cssx('root', tracked), {
      style: {
        width: 320,
        height: 320,
        color: 'red',
        backgroundColor: 'blue'
      }
    })
    tracked.commitRender()

    dimensions = { width: 800, height: 400 }
    for (const listener of Array.from(listeners)) listener()
    await __cssxInternals.flushMicrotasksForTests()
    assert.equal(calls, 1)

    tracked.startRender()
    assert.deepEqual(cssx('root', tracked), {
      style: {
        width: 800,
        height: 200
      }
    })
    tracked.commitRender()

    unsubscribe()
    reset()
  })

  it('invalidates media dependencies using the same dimensions as resolution', async () => {
    reset()
    let dimensions = { width: 320, height: 640 }
    const listeners = new Set<() => void>()

    __cssxInternals.configureDimensionsAdapterForTests({
      get: () => dimensions,
      subscribe: listener => {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      }
    })

    const sheet = compileCss(`
      .root { color: black; }
      @media (orientation: portrait) {
        .root { color: red; }
      }
    `)
    const tracked = __cssxInternals.createTrackedCssxSheet(sheet, { target: 'web' })
    let calls = 0
    const unsubscribe = tracked.subscribe(() => {
      calls += 1
    })

    tracked.startRender()
    assert.deepEqual(cssx('root', tracked), {
      style: {
        color: 'red'
      }
    })
    tracked.commitRender()

    dimensions = { width: 800, height: 400 }
    for (const listener of Array.from(listeners)) listener()
    await __cssxInternals.flushMicrotasksForTests()
    assert.equal(calls, 1)

    tracked.startRender()
    assert.deepEqual(cssx('root', tracked), {
      style: {
        color: 'black'
      }
    })
    tracked.commitRender()

    unsubscribe()
    reset()
  })

  it('invalidates matchMedia-only dependencies through the media adapter', async () => {
    reset()
    let scheme = 'light'
    const listeners = new Map<string, Set<() => void>>()

    __cssxInternals.configureMediaQueryAdapterForTests({
      evaluate: query => query === '(prefers-color-scheme: dark)' && scheme === 'dark',
      subscribe: (query, listener) => {
        let queryListeners = listeners.get(query)
        if (queryListeners == null) {
          queryListeners = new Set()
          listeners.set(query, queryListeners)
        }
        queryListeners.add(listener)
        return () => {
          queryListeners?.delete(listener)
          if (queryListeners?.size === 0) listeners.delete(query)
        }
      }
    })

    const sheet = compileCss(`
      .root { color: black; }
      @media (prefers-color-scheme: dark) {
        .root { color: white; }
      }
    `)
    const tracked = __cssxInternals.createTrackedCssxSheet(sheet, { target: 'web' })
    let calls = 0
    const unsubscribe = tracked.subscribe(() => {
      calls += 1
    })

    tracked.startRender()
    assert.deepEqual(cssx('root', tracked), {
      style: {
        color: 'black'
      }
    })
    tracked.commitRender()
    assert.equal(listeners.get('(prefers-color-scheme: dark)')?.size, 1)

    scheme = 'dark'
    for (const listener of Array.from(listeners.get('(prefers-color-scheme: dark)') ?? [])) {
      listener()
    }
    await __cssxInternals.flushMicrotasksForTests()
    assert.equal(calls, 1)

    tracked.startRender()
    assert.deepEqual(cssx('root', tracked), {
      style: {
        color: 'white'
      }
    })
    tracked.commitRender()

    unsubscribe()
    assert.equal(listeners.size, 0)
    reset()
  })

  it('does not retain media query listeners from aborted renders', () => {
    reset()
    const listeners = new Map<string, Set<() => void>>()

    __cssxInternals.configureMediaQueryAdapterForTests({
      evaluate: () => true,
      subscribe: (query, listener) => {
        let queryListeners = listeners.get(query)
        if (queryListeners == null) {
          queryListeners = new Set()
          listeners.set(query, queryListeners)
        }
        queryListeners.add(listener)
        return () => {
          queryListeners?.delete(listener)
          if (queryListeners?.size === 0) listeners.delete(query)
        }
      }
    })

    const sheet = compileCss(`
      @media (hover: hover) {
        .root { color: red; }
      }
    `)
    const tracked = __cssxInternals.createTrackedCssxSheet(sheet, { target: 'web' })
    const unsubscribe = tracked.subscribe(() => {})

    tracked.startRender()
    cssx('root', tracked)

    assert.equal(listeners.size, 0)

    unsubscribe()
    reset()
  })

  it('subscribes React hook users only to committed dependencies', async () => {
    reset()
    const sheet = compileCss(`
      .root { color: var(--root-color, red); }
      .root.active { background-color: var(--active-bg, blue); }
    `)
    let renders = 0
    let latest: unknown
    let root: Root | undefined
    const container = document.createElement('div')
    document.body.appendChild(container)

    function Component (props: { active?: boolean }): React.ReactNode {
      renders += 1
      const layer = useCssxLayer(sheet, { target: 'web' })
      latest = cssx(['root', { active: props.active }], layer as Parameters<typeof cssx>[1])
      return createElement('div', latest as Record<string, unknown>)
    }

    await act(async () => {
      root = createRoot(container)
      root.render(createElement(Component))
    })

    assert.deepEqual(latest, {
      style: {
        color: 'red'
      }
    })

    variables['--active-bg'] = 'green'
    await act(async () => {
      await __cssxInternals.flushMicrotasksForTests()
    })
    assert.equal(renders, 1)

    variables['--root-color'] = 'black'
    await act(async () => {
      await __cssxInternals.flushMicrotasksForTests()
    })
    assert.equal(renders, 2)
    assert.deepEqual(latest, {
      style: {
        color: 'black'
      }
    })

    await act(async () => {
      root?.unmount()
    })
    container.remove()
    assert.equal(__cssxInternals.getRuntimeSubscriberCountForTests(), 0)
    reset()
  })

  it('does not subscribe React hook dependencies from a Suspense-aborted initial render', async () => {
    reset()
    const pending = new Promise(() => {})
    const sheet = compileCss(`
      .root { color: var(--root-color, red); }
      .root.active { background-color: var(--active-bg, blue); }
    `)
    let renders = 0
    let root: Root | undefined
    const container = document.createElement('div')
    document.body.appendChild(container)

    function Suspender (): React.ReactNode {
      renders += 1
      const layer = useCssxLayer(sheet, { target: 'web' })
      cssx(['root', 'active'], layer as Parameters<typeof cssx>[1])
      throw pending
    }

    await act(async () => {
      root = createRoot(container)
      root.render(createElement(
        Suspense,
        { fallback: createElement('span', null, 'loading') },
        createElement(Suspender)
      ))
    })

    assert.equal(container.textContent, 'loading')
    assert.equal(__cssxInternals.getRuntimeSubscriberCountForTests(), 0)
    const rendersAfterFallback = renders

    variables['--active-bg'] = 'green'
    await act(async () => {
      await __cssxInternals.flushMicrotasksForTests()
    })
    assert.equal(renders, rendersAfterFallback)
    assert.equal(__cssxInternals.getRuntimeSubscriberCountForTests(), 0)

    await act(async () => {
      root?.unmount()
    })
    container.remove()
    reset()
  })

  it('does not promote template values from a Suspense-aborted update', async () => {
    reset()
    const pending = new Promise(() => {})
    const sheet = compileCssTemplate('.root { color: var(--__cssx_dynamic_0); }')
    let latest: unknown
    let committedLayer: Parameters<typeof cssx>[1] | undefined
    let root: Root | undefined
    const container = document.createElement('div')
    document.body.appendChild(container)

    function Component (props: { color: string, suspend?: boolean }): React.ReactNode {
      const layer = useCssxTemplate(sheet, [props.color], { target: 'web' })
      latest = cssx('root', layer)
      React.useLayoutEffect(() => {
        committedLayer = layer
      }, [layer])
      if (props.suspend) throw pending
      return createElement('div')
    }

    await act(async () => {
      root = createRoot(container)
      root.render(createElement(
        Suspense,
        { fallback: createElement('span', null, 'loading') },
        createElement(Component, { color: 'red' })
      ))
    })

    assert.deepEqual(latest, { style: { color: 'red' } })
    assert.deepEqual(cssx('root', committedLayer!), { style: { color: 'red' } })

    await act(async () => {
      root?.render(createElement(
        Suspense,
        { fallback: createElement('span', null, 'loading') },
        createElement(Component, { color: 'green', suspend: true })
      ))
    })

    assert.deepEqual(latest, { style: { color: 'green' } })
    assert.deepEqual(cssx('root', committedLayer!), { style: { color: 'red' } })

    await act(async () => {
      root?.unmount()
    })
    container.remove()
    reset()
  })

  it('keeps useCssVariable dependencies from a Suspense-aborted update uncommitted', async () => {
    reset()
    const pending = new Promise(() => {})
    let renders = 0
    let latest: unknown
    let root: Root | undefined
    const container = document.createElement('div')
    document.body.appendChild(container)

    variables.set({
      '--root': 'red',
      '--active': 'blue'
    })

    function Component (props: { name: string, suspend?: boolean }): React.ReactNode {
      renders += 1
      latest = useCssVariable(props.name)
      if (props.suspend) throw pending
      return createElement('div')
    }

    await act(async () => {
      root = createRoot(container)
      root.render(createElement(
        Suspense,
        { fallback: createElement('span', null, 'loading') },
        createElement(Component, { name: '--root' })
      ))
    })

    assert.equal(latest, 'red')

    await act(async () => {
      root?.render(createElement(
        Suspense,
        { fallback: createElement('span', null, 'loading') },
        createElement(Component, { name: '--active', suspend: true })
      ))
    })

    const rendersAfterAbortedUpdate = renders

    variables['--active'] = 'green'
    await act(async () => {
      await __cssxInternals.flushMicrotasksForTests()
    })
    assert.equal(renders, rendersAfterAbortedUpdate)

    await act(async () => {
      root?.unmount()
    })
    container.remove()
    reset()
  })

  it('keeps useCssxLayer hook order stable when disabled input toggles', async () => {
    reset()
    const sheet = compileCss('.root { color: red; }')
    let latest: unknown
    let root: Root | undefined
    const container = document.createElement('div')
    document.body.appendChild(container)

    function Component (props: { enabled: boolean }): React.ReactNode {
      const layer = useCssxLayer(props.enabled ? sheet : false, { target: 'web' })
      latest = props.enabled ? cssx('root', layer as Parameters<typeof cssx>[1]) : null
      return createElement('div')
    }

    await act(async () => {
      root = createRoot(container)
      root.render(createElement(Component, { enabled: false }))
    })
    assert.equal(latest, null)

    await act(async () => {
      root?.render(createElement(Component, { enabled: true }))
    })
    assert.deepEqual(latest, { style: { color: 'red' } })

    await act(async () => {
      root?.render(createElement(Component, { enabled: false }))
    })
    assert.equal(latest, null)

    await act(async () => {
      root?.unmount()
    })
    container.remove()
    reset()
  })
})
