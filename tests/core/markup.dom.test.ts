// @vitest-environment happy-dom

import {
  CURSOR_ID,
  DURATION_VAR,
  EASE_VAR,
  EL_ATTR,
  HTML_ACTIVE,
  HTML_INACTIVE
} from '@ts/constants'
import {
  applyAnimationTokens,
  buildMarkup,
  readAnimationTokens,
  setActiveClasses
} from '@ts/core/markup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Build-or-verify. Every part of the tree is flat on the 0×0 wrapper anchor, so
 * what matters here is which element each ref points at and whether the tree was
 * adopted or built — `built` is what decides if destroy() may remove it.
 *
 * The dev-only warnings (a missing part, a hijacked containing block) do not run
 * here: tests/setup.ts stubs import.meta.env.DEV false to mirror the shipped
 * bundle. The dev-diagnostics block below flips it back on for its own scope.
 */

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('buildMarkup', () => {
  it('builds the canonical tree and appends it when nothing exists', () => {
    const refs = buildMarkup()

    expect(refs.built).toBe(true)
    expect(refs.root.id).toBe(CURSOR_ID)
    expect(refs.root.parentElement).toBe(document.body)
    expect(refs.follower).not.toBeNull()
    expect(refs.label).not.toBeNull()
    expect(refs.icon).not.toBeNull()
  })

  /** Adoption is what lets a theme print its own markup and keep it. */
  it('adopts existing markup by id rather than building a second tree', () => {
    const existing = document.createElement('div')
    existing.id = CURSOR_ID
    existing.innerHTML = `<div ${EL_ATTR}="follower"></div>`
    document.body.appendChild(existing)

    const refs = buildMarkup()

    expect(refs.built).toBe(false)
    expect(refs.root).toBe(existing)
    expect(document.querySelectorAll(`#${CURSOR_ID}`)).toHaveLength(1)
  })

  it('adopts the element a selector names', () => {
    document.body.innerHTML = `<div class="mine"><div ${EL_ATTR}="label"></div></div>`
    const refs = buildMarkup('.mine')

    expect(refs.built).toBe(false)
    expect(refs.root).toBe(document.querySelector('.mine'))
    expect(refs.label).toBe(document.querySelector(`[${EL_ATTR}="label"]`))
  })

  it('adopts an element handed over directly', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)

    expect(buildMarkup(el).root).toBe(el)
  })

  /** A part that is absent must resolve to null, not throw — the effect that
      would have written to it simply no-ops. */
  it('leaves refs null for parts the adopted markup does not have', () => {
    document.body.innerHTML = `<div id="${CURSOR_ID}"><div ${EL_ATTR}="follower"></div></div>`

    const refs = buildMarkup()

    expect(refs.follower).not.toBeNull()
    expect(refs.label).toBeNull()
    expect(refs.icon).toBeNull()
  })

  it('builds a tree when the selector matches nothing', () => {
    const refs = buildMarkup('.absent')

    expect(refs.built).toBe(true)
    expect(refs.root.id).toBe(CURSOR_ID)
  })

  it('gives the built tree its four arrows, a spinner and a press dot', () => {
    const refs = buildMarkup()

    expect(refs.root.querySelectorAll('.arts-cursor__arrow')).toHaveLength(4)
    expect(refs.root.querySelectorAll('.arts-cursor__spinner')).toHaveLength(1)
    expect(refs.root.querySelectorAll('.arts-cursor__dot')).toHaveLength(1)
  })
})

describe('applyAnimationTokens', () => {
  it('writes an explicitly configured duration', () => {
    const root = document.createElement('div')

    applyAnimationTokens(root, { duration: 0.4 })

    expect(root.style.getPropertyValue(DURATION_VAR)).toBe('0.4s')
  })

  /** The stylesheet ships the default and the kit Duration control writes the
      var through selector CSS — an unconditional inline write would beat both,
      leaving the Site Settings control inert. */
  it('leaves the duration token alone when none was configured', () => {
    const root = document.createElement('div')

    applyAnimationTokens(root, {})
    applyAnimationTokens(root, undefined)

    expect(root.style.getPropertyValue(DURATION_VAR)).toBe('')
  })

  /** Left unset so the stylesheet's own back-out curve stands: an unsupported
      easing arriving through var() kills the whole transition silently. */
  it('leaves the easing token alone when none was configured', () => {
    const root = document.createElement('div')

    applyAnimationTokens(root, undefined)

    expect(root.style.getPropertyValue(EASE_VAR)).toBe('')
  })

  it('writes an explicitly configured easing', () => {
    const root = document.createElement('div')

    applyAnimationTokens(root, { easing: 'linear' })

    expect(root.style.getPropertyValue(EASE_VAR)).toBe('linear')
  })
})

/**
 * The read-back half: whatever wins the cascade for the tokens — the kit var,
 * a theme override, the stylesheet default, or the inline write above — is what
 * the JS timings (clear delay, the magnetic element's transition) must follow.
 */
describe('readAnimationTokens', () => {
  const stubVars = (vars: Record<string, string>) =>
    vi.stubGlobal('getComputedStyle', () => ({
      getPropertyValue: (name: string) => vars[name] ?? ''
    }))

  it('parses a seconds duration and reads the easing', () => {
    stubVars({ [DURATION_VAR]: '0.7s', [EASE_VAR]: 'cubic-bezier(0.34, 1.56, 0.64, 1)' })

    expect(readAnimationTokens(document.createElement('div'))).toEqual({
      duration: 0.7,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
    })
  })

  it('parses a milliseconds duration into seconds', () => {
    stubVars({ [DURATION_VAR]: '250ms' })

    expect(readAnimationTokens(document.createElement('div')).duration).toBe(0.25)
  })

  /** A DOM without the stylesheet (tests, adopted markup mid-teardown) reports
      nothing — the caller keeps its resolved defaults. */
  it('reports nothing for absent or unparseable values', () => {
    stubVars({ [DURATION_VAR]: 'fast', [EASE_VAR]: '' })

    expect(readAnimationTokens(document.createElement('div'))).toEqual({})
  })
})

describe('the dev-only diagnostics', () => {
  afterEach(() => {
    vi.stubEnv('DEV', false)
  })

  it('warns for a part missing from adopted markup, never from a built tree', () => {
    vi.stubEnv('DEV', true)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('requestAnimationFrame', () => 0)

    buildMarkup()
    expect(warn).not.toHaveBeenCalled()

    document.body.innerHTML = `<div id="${CURSOR_ID}"><div ${EL_ATTR}="follower"></div></div>`
    buildMarkup()
    expect(warn).toHaveBeenCalled()
  })

  /** offsetParent is non-null for a fixed element exactly when an ancestor
      creates a containing block; the check is deferred a frame because
      offsetParent forces layout and stylesheets may not have applied yet. */
  it('warns when an ancestor hijacks the fixed cursor, one frame later', () => {
    vi.stubEnv('DEV', true)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb))

    const refs = buildMarkup()
    Object.defineProperty(refs.root, 'offsetParent', { value: document.body, configurable: true })
    expect(warn).not.toHaveBeenCalled()

    for (const cb of frames) {
      cb(0)
    }
    expect(warn).toHaveBeenCalledOnce()
  })

  it('stays quiet while the cursor tracks the viewport', () => {
    vi.stubEnv('DEV', true)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb))

    const refs = buildMarkup()
    Object.defineProperty(refs.root, 'offsetParent', { value: null, configurable: true })
    for (const cb of frames) {
      cb(0)
    }

    expect(warn).not.toHaveBeenCalled()
  })
})

describe('setActiveClasses', () => {
  it('flags the document either way round, never both', () => {
    const html = document.createElement('html')

    setActiveClasses(html, true)
    expect(html.classList.contains(HTML_ACTIVE)).toBe(true)
    expect(html.classList.contains(HTML_INACTIVE)).toBe(false)

    setActiveClasses(html, false)
    expect(html.classList.contains(HTML_ACTIVE)).toBe(false)
    expect(html.classList.contains(HTML_INACTIVE)).toBe(true)
  })
})
