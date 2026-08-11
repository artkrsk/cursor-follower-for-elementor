// @vitest-environment happy-dom

import { GATE_CSS_ID, GATE_JS_ID, HTML_ACTIVE, HTML_INACTIVE } from '@ts/constants'
import type { ICursorFollower, IGateGlobal } from '@ts/interfaces'
import type { TGateBoot } from '@ts/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeMedia } from './support'

/**
 * The gate is a side-effect module: every test stubs the environment first
 * (matchMedia via arm(), the boot config), then imports a fresh copy via
 * vi.resetModules(). Injection is driven by firing the injected elements'
 * onload/onerror BY HAND — that is what makes the css-before-js serialization
 * assertable. happy-dom's own resource auto-loader is left at defaults on
 * purpose: every setting that silences it (disableCSSFileLoading &co) makes
 * it dispatch load/error SYNCHRONOUSLY during appendChild, racing the
 * hand-fired events; at defaults its consequences are async (a fetch of the
 * fake .test host that never resolves) and land after each test's sync
 * assertions. Its stderr complaints about the fake host are expected noise —
 * they bypass every vitest console filter (happy-dom-internal reporting).
 *
 * The gate deliberately has no teardown (it is a page-lifetime script), so a
 * test that armed listeners leaves them on this file's shared window. The
 * afterEach flip(false) neutralizes them: a stale closure re-checks its own
 * mql.matches at event time and can never load again.
 */

const pointer = (type: string, over: Record<string, unknown> = { pointerType: 'mouse' }) => {
  const event = new Event(type, { bubbles: true })
  for (const [key, value] of Object.entries(over)) {
    Object.defineProperty(event, key, { value })
  }
  window.dispatchEvent(event)
}

const bootConfig = (over: Partial<TGateBoot> = {}) => {
  window.artsCursorFollowerBoot = {
    js: 'https://site.test/engine.js?ver=1',
    css: 'https://site.test/engine.css?ver=1',
    editor: false,
    ...over
  }
}

const importGate = () => import('@ts/gate')

const injectedLink = () => document.getElementById(GATE_CSS_ID) as HTMLLinkElement | null
const injectedScript = () => document.getElementById(GATE_JS_ID) as HTMLScriptElement | null
const html = () => document.documentElement

let media: ReturnType<typeof fakeMedia> | null = null

const arm = (matches: boolean) => {
  const m = fakeMedia(matches)
  media = m
  return m
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  media?.flip(false)
  media = null
  delete window.artsCursor
  delete window.artsCursorFollowerBoot
  for (const el of document.querySelectorAll(`#${GATE_CSS_ID}, #${GATE_JS_ID}`)) {
    el.remove()
  }
  html().className = ''
})

describe('parse-time install', () => {
  it('installs the pending global with a claimable resolver', async () => {
    arm(true)
    bootConfig()

    await importGate()

    const gate = window.artsCursor as IGateGlobal
    expect(gate.get()).toBeNull()
    expect(gate.version).toBe('0.0.0-test')
    expect(gate.__resolveReady).toBeTypeOf('function')
  })

  it('resolves the gate-era promise for early consumers once claimed', async () => {
    arm(true)
    bootConfig()
    await importGate()
    const gate = window.artsCursor as IGateGlobal
    const held = gate.ready

    const cursor = { fake: true } as unknown as ICursorFollower
    gate.__resolveReady(cursor)

    await expect(held).resolves.toBe(cursor)
  })

  it('predicts has-cursor-follower when the query matches', async () => {
    arm(true)
    bootConfig()

    await importGate()

    expect(html().classList.contains(HTML_ACTIVE)).toBe(true)
    expect(html().classList.contains(HTML_INACTIVE)).toBe(false)
  })

  it('predicts no-cursor-follower when it does not', async () => {
    arm(false)
    bootConfig()

    await importGate()

    expect(html().classList.contains(HTML_INACTIVE)).toBe(true)
    expect(html().classList.contains(HTML_ACTIVE)).toBe(false)
  })

  /** Double wp_head themes and replayed inline scripts must not clobber the
      live global or re-arm a second trigger set. */
  it('bails when a global already exists', async () => {
    arm(true)
    bootConfig()
    const existing = { ready: Promise.resolve(null), get: () => null, version: 'x' }
    window.artsCursor = existing as unknown as IGateGlobal

    await importGate()

    expect(window.artsCursor).toBe(existing)
    pointer('pointermove')
    expect(injectedLink()).toBeNull()
  })
})

describe('the load trigger', () => {
  it('injects the stylesheet, then the engine only after css onload', async () => {
    arm(true)
    bootConfig()
    await importGate()

    pointer('pointermove')

    const link = injectedLink()
    expect(link?.rel).toBe('stylesheet')
    expect(link?.href).toContain('engine.css')
    expect(injectedScript()).toBeNull()

    link?.onload?.(new Event('load') as never)

    expect(injectedScript()?.src).toContain('engine.js')
  })

  it('accepts a pen', async () => {
    arm(true)
    bootConfig()
    await importGate()

    pointer('pointermove', { pointerType: 'pen' })

    expect(injectedLink()).not.toBeNull()
  })

  it('ignores touch moves', async () => {
    arm(true)
    bootConfig()
    await importGate()

    pointer('pointermove', { pointerType: 'touch' })

    expect(injectedLink()).toBeNull()
  })

  /** The mq is re-checked at event time — a mouse-type move on a device whose
      query does not match (touch emulation quirks) must not load. */
  it('ignores a mouse move while the query does not match', async () => {
    arm(false)
    bootConfig()
    await importGate()

    pointer('pointermove')

    expect(injectedLink()).toBeNull()
  })

  /** Trackpad users often scroll before moving the pointer. */
  it('loads on wheel', async () => {
    arm(true)
    bootConfig()
    await importGate()

    pointer('wheel', {})

    expect(injectedLink()).not.toBeNull()
  })

  it('loads only once', async () => {
    arm(true)
    bootConfig()
    await importGate()

    pointer('pointermove')
    pointer('pointermove')

    expect(document.querySelectorAll(`#${GATE_CSS_ID}`)).toHaveLength(1)
  })

  it('does nothing without a boot config', async () => {
    arm(true)

    await importGate()
    pointer('pointermove')

    expect(injectedLink()).toBeNull()
  })

  it('skips injection when the engine tag already exists', async () => {
    arm(true)
    bootConfig()
    const marker = document.createElement('script')
    marker.id = GATE_JS_ID
    document.head.appendChild(marker)

    await importGate()
    pointer('pointermove')

    expect(injectedLink()).toBeNull()
  })
})

describe('capability transitions', () => {
  /** Touch emulation enabled before the first move: without this the page
      would keep a stale has-cursor-follower forever. */
  it('revises the prediction on a flip away from matching', async () => {
    const m = arm(true)
    bootConfig()
    await importGate()

    m.flip(false)

    expect(html().classList.contains(HTML_INACTIVE)).toBe(true)
    expect(injectedLink()).toBeNull()
  })

  /** Exiting DevTools responsive mode / docking a pointer: an OS-level
      re-evaluation is a stronger signal than a move — load right away. */
  it('revises and loads on a flip to matching', async () => {
    const m = arm(false)
    bootConfig()
    await importGate()

    m.flip(true)

    expect(html().classList.contains(HTML_ACTIVE)).toBe(true)
    expect(injectedLink()).not.toBeNull()
  })
})

describe('failure', () => {
  /** A broken deploy degrades to "no cursor", never "suppressed hovers with
      no cursor behind them". */
  it('falls back to no-cursor-follower when the stylesheet fails', async () => {
    arm(true)
    bootConfig()
    await importGate()

    pointer('pointermove')
    injectedLink()?.onerror?.(new Event('error') as never)

    expect(html().classList.contains(HTML_INACTIVE)).toBe(true)
    expect(injectedScript()).toBeNull()
  })

  it('falls back to no-cursor-follower when the engine fails', async () => {
    arm(true)
    bootConfig()
    await importGate()

    pointer('pointermove')
    injectedLink()?.onload?.(new Event('load') as never)
    injectedScript()?.onerror?.(new Event('error') as never)

    expect(html().classList.contains(HTML_INACTIVE)).toBe(true)
  })
})

describe('editor mode', () => {
  /** The preview is the showroom, and boot.ts's kit-change listener must
      exist before the first Site Settings change — no lazy loading there. */
  it('loads immediately without waiting for a pointer', async () => {
    arm(true)
    bootConfig({ editor: true })

    await importGate()

    expect(injectedLink()).not.toBeNull()
  })
})
