import assert from 'node:assert/strict'
import {
  __cssxInternals,
  compileCss,
  compileCssTemplate,
  cssx,
  setDefaultVariables,
  variables
} from '../../src/web.ts'

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
})
