// @vitest-environment happy-dom

import {
  CLEAR_DELAY_PAD_MS,
  CURSOR_ID,
  DEFAULT_ANIMATION_DURATION,
  DEFAULT_ATTRIBUTE,
  DRAGGING_ATTR,
  DURATION_VAR,
  EL_ATTR,
  HIGHLIGHT_ATTR,
  HINT_ATTR,
  HTML_ACTIVE,
  HTML_INACTIVE,
  HTML_NO_NATIVE,
  HTML_PROGRESS,
  LOADING_ATTR,
  MAGNETIC_ATTR,
  PRESSED_ATTR,
  VISIBLE_ATTR
} from '@ts/constants'
import { collectWarmTargets, createCursor } from '@ts/core/createCursor'
import type { ICursorFollower, ITargetContext } from '@ts/interfaces'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { at, fakeMedia, fakeTicker } from '../support'

/**
 * The composition root, booted end to end. happy-dom answers
 * `(hover:hover) and (pointer:fine)` as matching and provides both observers,
 * so the engine comes up enabled — which is what makes the wiring assertable:
 * a hover crossing has to reach the effects suite AND the magnetic sessions,
 * and destroy() has to give the document back exactly as it found it.
 *
 * The ticker is injected so no test depends on a real frame ever firing;
 * fakeMedia is installed before init() where a test needs the disabled path,
 * since the pointer input reads matchMedia while the engine boots.
 */

const pointer = (el: Element, type: string, over: Record<string, unknown> = {}) => {
  const event = new Event(type, { bubbles: true })
  Object.defineProperty(event, 'pointerType', { value: 'mouse' })
  for (const [key, value] of Object.entries(over)) {
    Object.defineProperty(event, key, { value })
  }
  el.dispatchEvent(event)
}

let ticker: ReturnType<typeof fakeTicker>
let cursor: ICursorFollower

beforeEach(() => {
  document.body.innerHTML = ''
  document.documentElement.className = ''
  ticker = fakeTicker()
})

afterEach(() => {
  cursor?.destroy()
})

const boot = (markup = '') => {
  document.body.innerHTML = markup
  cursor = createCursor({ ticker: ticker.adapter })
  cursor.init()
  return cursor
}

describe('init', () => {
  it('builds the markup and flags the document active', () => {
    boot()

    expect(document.getElementById(CURSOR_ID)).not.toBeNull()
    expect(document.documentElement.classList.contains(HTML_ACTIVE)).toBe(true)
    expect(document.documentElement.classList.contains(HTML_INACTIVE)).toBe(false)
    expect(cursor.enabled).toBe(true)
  })

  it('is idempotent', () => {
    boot()

    cursor.init()

    expect(document.querySelectorAll(`#${CURSOR_ID}`)).toHaveLength(1)
  })

  /** Load-order-proof discovery for consumers that missed the global. */
  it('announces itself on the document', () => {
    const ready = vi.fn()
    document.addEventListener('arts-cursor:ready', ready)

    boot()

    expect(ready).toHaveBeenCalledOnce()
  })

  /** Hidden until the pointer is really seen, so it never glides in from the
      viewport centre. */
  it('stays invisible until the first pointer move', () => {
    boot()
    const root = cursor.el as HTMLElement

    expect(root.hasAttribute(VISIBLE_ATTR)).toBe(false)

    pointer(window as unknown as Element, 'pointermove', { clientX: 10, clientY: 10 })

    expect(root.hasAttribute(VISIBLE_ATTR)).toBe(true)
  })
})

describe('hover wiring', () => {
  it('takes a target payload into the effects suite', () => {
    boot(`<div id="box" ${DEFAULT_ATTRIBUTE}='{"highlight":true}'>x</div>`)

    pointer(at('#box'), 'pointerover')

    expect((cursor.el as HTMLElement).hasAttribute(HIGHLIGHT_ATTR)).toBe(true)
  })

  it('emits the context it entered and left', () => {
    boot('<a href="#" id="link">go</a><div id="plain">x</div>')
    const entered: ITargetContext[] = []
    const left: ITargetContext[] = []
    cursor.on('target:enter', (ctx) => entered.push(ctx))
    cursor.on('target:leave', (ctx) => left.push(ctx))

    pointer(at('#link'), 'pointerover')
    pointer(at('#link'), 'pointerout', { relatedTarget: at('#plain') })

    expect(entered).toHaveLength(1)
    expect(entered[0]?.element).toBe(at('#link'))
    expect(left[0]?.element).toBe(at('#link'))
  })

  /** The magnetic branch of the enter handler: a payload asking for it engages
      the trap, which is what raises the flag the CSS keys off. */
  it('engages the magnetic trap for a magnetic payload', () => {
    boot(`<div id="box" ${DEFAULT_ATTRIBUTE}='{"magnetic":true}'>x</div>`)

    pointer(at('#box'), 'pointerover')

    expect((cursor.el as HTMLElement).hasAttribute(MAGNETIC_ATTR)).toBe(true)
  })

  it('releases the trap on leave', () => {
    boot(`<div id="box" ${DEFAULT_ATTRIBUTE}='{"magnetic":true}'>x</div><div id="plain">y</div>`)
    pointer(at('#box'), 'pointerover')

    pointer(at('#box'), 'pointerout', { relatedTarget: at('#plain') })

    expect((cursor.el as HTMLElement).hasAttribute(MAGNETIC_ATTR)).toBe(false)
  })

  /** The press wiring: the suite's click-scale ratio reaches the trap, so the
      engaged element shrinks with the ring and recovers on release. */
  it('shrinks the engaged magnetic element while pressed', () => {
    boot(`<div id="box" ${DEFAULT_ATTRIBUTE}='{"magnetic":true}'>x</div>`)
    const box = at('#box') as HTMLElement
    pointer(box, 'pointerover')

    pointer(box, 'pointerdown', { button: 0 })
    // Default pressScale: { ref: 'cursor', factor: 0.8 }.
    expect(box.style.scale).toBe('0.8')

    pointer(box, 'pointerup', { button: 0 })
    expect(box.style.scale).toBe('')
  })

  it('leaves a non-magnetic payload alone', () => {
    boot(`<div id="box" ${DEFAULT_ATTRIBUTE}='{"label":"View"}'>x</div>`)

    pointer(at('#box'), 'pointerover')

    expect((cursor.el as HTMLElement).hasAttribute(MAGNETIC_ATTR)).toBe(false)
  })

  /** A scoped rule (not an authored attribute) runs through the active-rule
      gate — the wiring that lets a Site Settings switch mute a whole rule. */
  it('applies a scoped rule through the active-rule gate on hover', () => {
    document.body.innerHTML = '<div class="widget"><a href="#" id="link">go</a></div>'
    cursor = createCursor({
      ticker: ticker.adapter,
      targetScopes: [{ scope: '.widget', rules: [{ selector: 'a', payload: { highlight: true } }] }]
    })
    cursor.init()

    pointer(at('#link'), 'pointerover')

    expect((cursor.el as HTMLElement).hasAttribute(HIGHLIGHT_ATTR)).toBe(true)
  })

  /** The global switch: with Magnetic off the rule is inert, and the element
      falls back to its regular behaviour rather than going dead. */
  it('ignores a magnetic payload while Magnetic is switched off', () => {
    document.body.innerHTML = `<a href="#" id="link" ${DEFAULT_ATTRIBUTE}='{"magnetic":true}'>go</a>`
    cursor = createCursor({ ticker: ticker.adapter, magnetic: false })
    cursor.init()

    pointer(at('#link'), 'pointerover')

    expect((cursor.el as HTMLElement).hasAttribute(MAGNETIC_ATTR)).toBe(false)
  })
})

describe('drag wiring', () => {
  const DRAG_MARKUP = `<div id="box" ${DEFAULT_ATTRIBUTE}='{"label":"Hover","drag":{"label":"Dragging"}}'>x</div><a href="#" id="link">go</a><div id="plain">y</div>`

  /** Hover the drag target, press, and travel past the click-vs-drag threshold. */
  const startDrag = () => {
    pointer(at('#box'), 'pointerover')
    pointer(window as unknown as Element, 'pointerdown', { clientX: 0, clientY: 0, button: 0 })
    pointer(window as unknown as Element, 'pointermove', { clientX: 10, clientY: 10 })
  }

  it('suppresses hover enter and leave while a drag is in progress', () => {
    boot(DRAG_MARKUP)
    const enter = vi.fn()
    const leave = vi.fn()
    cursor.on('target:enter', enter)
    cursor.on('target:leave', leave)
    startDrag()
    enter.mockClear()

    pointer(at('#box'), 'pointerout', { relatedTarget: at('#link') })
    pointer(at('#link'), 'pointerover')

    expect(enter).not.toHaveBeenCalled()
    expect(leave).not.toHaveBeenCalled()
  })

  it('resyncs the cursor to the target under the pointer when a drag releases', () => {
    boot(DRAG_MARKUP)
    startDrag()
    pointer(at('#box'), 'pointerout', { relatedTarget: at('#link') })
    pointer(at('#link'), 'pointerover')
    const enter = vi.fn()
    cursor.on('target:enter', enter)

    pointer(window as unknown as Element, 'pointerup', { button: 0 })

    expect(enter).toHaveBeenCalledOnce()
    expect(enter.mock.calls[0]?.[0]?.element).toBe(at('#link'))
    expect((cursor.el as HTMLElement).hasAttribute(HIGHLIGHT_ATTR)).toBe(true)
  })

  it('clears the hover state when a drag releases over nothing', () => {
    boot(DRAG_MARKUP)
    startDrag()
    expect((cursor.el as HTMLElement).hasAttribute(HINT_ATTR)).toBe(true)
    pointer(at('#box'), 'pointerout', { relatedTarget: at('#plain') })
    pointer(at('#plain'), 'pointerover')

    pointer(window as unknown as Element, 'pointerup', { button: 0 })

    expect((cursor.el as HTMLElement).hasAttribute(HINT_ATTR)).toBe(false)
    expect((cursor.el as HTMLElement).hasAttribute(DRAGGING_ATTR)).toBe(false)
  })
})

describe('sessions', () => {
  it('holds a loading state until released', () => {
    boot()

    const session = cursor.loading()
    expect((cursor.el as HTMLElement).hasAttribute(LOADING_ATTR)).toBe(true)

    session.release()
    expect((cursor.el as HTMLElement).hasAttribute(LOADING_ATTR)).toBe(false)
  })

  it('flags the document while the native cursor is hidden', () => {
    boot()

    const session = cursor.hideNativeCursor()
    expect(document.documentElement.classList.contains(HTML_NO_NATIVE)).toBe(true)

    session.release()
    expect(document.documentElement.classList.contains(HTML_NO_NATIVE)).toBe(false)
  })

  it('sizes the loader from an explicit size option', () => {
    boot()

    const session = cursor.loading({ size: 40 })
    expect((cursor.el as HTMLElement).hasAttribute(LOADING_ATTR)).toBe(true)

    session.release()
    expect((cursor.el as HTMLElement).hasAttribute(LOADING_ATTR)).toBe(false)
  })

  it('holds a progress state until released', () => {
    boot()

    const session = cursor.progress()
    expect(document.documentElement.classList.contains(HTML_PROGRESS)).toBe(true)

    session.release()
    expect(document.documentElement.classList.contains(HTML_PROGRESS)).toBe(false)
  })

  /** The programmatic trap: no hover, a caller-owned anchor, released by the
      session it returns. */
  it('engages a programmatic magnetic trap and releases it with the session', () => {
    boot()

    const session = cursor.magnetize({ getAnchor: () => ({ x: 100, y: 100 }) })
    expect((cursor.el as HTMLElement).hasAttribute(MAGNETIC_ATTR)).toBe(true)

    session.release()
    expect((cursor.el as HTMLElement).hasAttribute(MAGNETIC_ATTR)).toBe(false)
  })
})

describe('press wiring', () => {
  /** A primary press reaches the effects suite through the pointer input, which
      is the wiring suite.dom.test.ts's direct handlePress cannot exercise. */
  it('marks the cursor pressed on pointerdown and clears it on pointerup', () => {
    boot()
    const root = cursor.el as HTMLElement

    pointer(window as unknown as Element, 'pointerdown', { button: 0 })
    expect(root.hasAttribute(PRESSED_ATTR)).toBe(true)

    pointer(window as unknown as Element, 'pointerup', { button: 0 })
    expect(root.hasAttribute(PRESSED_ATTR)).toBe(false)
  })

  /** A secondary button belongs to the browser: its press never scales the
      cursor, and its release must not lift a primary press still held. */
  it('ignores a secondary-button press and its release', () => {
    boot()
    const root = cursor.el as HTMLElement

    pointer(window as unknown as Element, 'pointerdown', { button: 2 })
    expect(root.hasAttribute(PRESSED_ATTR)).toBe(false)

    pointer(window as unknown as Element, 'pointerdown', { button: 0 })
    pointer(window as unknown as Element, 'pointerup', { button: 2 })
    expect(root.hasAttribute(PRESSED_ATTR)).toBe(true)

    pointer(window as unknown as Element, 'pointerup', { button: 0 })
    expect(root.hasAttribute(PRESSED_ATTR)).toBe(false)
  })
})

describe('warm', () => {
  it('pre-measures a container without throwing', () => {
    boot()
    const container = document.createElement('div')
    container.innerHTML = `<a href="#" ${DEFAULT_ATTRIBUTE}='{"label":"View"}'>go</a>`

    expect(() => cursor.warm(container)).not.toThrow()
    expect(() => cursor.warm()).not.toThrow()
  })
})

describe('the frame path', () => {
  /** A ticker step runs the assembled pipeline — the trailing-override lambda
      the composition root hands motion is read here, per frame. */
  it('drives the pipeline when the ticker steps', () => {
    boot()
    pointer(window as unknown as Element, 'pointermove', { clientX: 10, clientY: 10 })
    pointer(window as unknown as Element, 'pointermove', { clientX: 50, clientY: 50 })

    expect(() => ticker.step()).not.toThrow()
    expect(cursor.stats.active).toBe(true)
    expect(typeof cursor.stats.lag).toBe('number')
  })
})

describe('before init', () => {
  /** The public surface has to be inert, not throwing, before init() wires the
      collaborators — a consumer may hold the handle first. */
  it('is safe to touch and reads disabled', () => {
    cursor = createCursor({ ticker: ticker.adapter })

    expect(cursor.enabled).toBe(false)
    expect(cursor.el).toBeNull()
    expect(() => cursor.set({ label: 'x' }).release()).not.toThrow()
    expect(() => cursor.magnetize({ getAnchor: () => ({ x: 0, y: 0 }) }).release()).not.toThrow()
  })

  it('needs no options at all', () => {
    const zeroConfig = createCursor()

    expect(zeroConfig.enabled).toBe(false)
  })
})

describe('updateOptions', () => {
  /** The live Site Settings bridge: the gate reads the same options object the
      patch mutates, so a switch takes effect on the next crossing. */
  it('takes a magnetic switch-off on the next crossing, with no re-init', () => {
    boot(`<div id="box" ${DEFAULT_ATTRIBUTE}='{"magnetic":true}'>x</div><div id="plain">y</div>`)
    pointer(at('#box'), 'pointerover')
    expect((cursor.el as HTMLElement).hasAttribute(MAGNETIC_ATTR)).toBe(true)
    pointer(at('#box'), 'pointerout', { relatedTarget: at('#plain') })

    cursor.updateOptions({ magnetic: false })
    pointer(at('#box'), 'pointerover')

    expect((cursor.el as HTMLElement).hasAttribute(MAGNETIC_ATTR)).toBe(false)
  })
})

/**
 * The tokens the JS timings follow are the EFFECTIVE ones — measured off
 * computed CSS at init and on remeasure(), so the kit Duration control (pure
 * selector CSS) reaches the clear-delay scheduling too, not just the
 * transitions.
 */
describe('the effective animation tokens', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const stubVars = (vars: Record<string, string>) =>
    vi.stubGlobal('getComputedStyle', () => ({
      getPropertyValue: (name: string) => vars[name] ?? ''
    }))

  const releaseAndAdvancePastDefault = () => {
    const session = cursor.set({ label: 'Hi' })
    session.release()
    vi.advanceTimersByTime(DEFAULT_ANIMATION_DURATION * 1000 + CLEAR_DELAY_PAD_MS + 1)
  }

  it('times content clears from the measured duration, not the default', () => {
    stubVars({ [DURATION_VAR]: '1s' })
    boot()
    const text = document.querySelector(`[${EL_ATTR}="hint-text"]`) as HTMLElement

    releaseAndAdvancePastDefault()
    expect(text.textContent).toBe('Hi')

    vi.advanceTimersByTime(1000)
    expect(text.textContent).toBe('')
  })

  it('re-samples the tokens on remeasure()', () => {
    const vars: Record<string, string> = { [DURATION_VAR]: '0.25s' }
    stubVars(vars)
    boot()
    const text = document.querySelector(`[${EL_ATTR}="hint-text"]`) as HTMLElement

    vars[DURATION_VAR] = '1s'
    cursor.remeasure()
    releaseAndAdvancePastDefault()
    expect(text.textContent).toBe('Hi')

    vi.advanceTimersByTime(1000)
    expect(text.textContent).toBe('')
  })
})

describe('destroy', () => {
  it('removes the tree it built and clears the document flags', () => {
    boot()

    cursor.destroy()

    expect(document.getElementById(CURSOR_ID)).toBeNull()
    expect(document.documentElement.classList.contains(HTML_ACTIVE)).toBe(false)
    expect(cursor.el).toBeNull()
  })

  /** Adopted markup belongs to the page, not to the engine. */
  it('leaves adopted markup in place', () => {
    document.body.innerHTML = `<div id="${CURSOR_ID}"></div>`
    cursor = createCursor({ ticker: ticker.adapter })
    cursor.init()

    cursor.destroy()

    expect(document.getElementById(CURSOR_ID)).not.toBeNull()
  })

  it('stops resolving targets afterwards', () => {
    boot('<a href="#" id="link">go</a>')
    const enter = vi.fn()
    cursor.on('target:enter', enter)

    cursor.destroy()
    pointer(at('#link'), 'pointerover')

    expect(enter).not.toHaveBeenCalled()
  })

  it('is idempotent', () => {
    boot()

    cursor.destroy()

    expect(() => cursor.destroy()).not.toThrow()
  })

  /** An init that dies half-way — an invalid root selector throws inside
      buildMarkup, after the lifecycle exists but before any refs do — must
      still be destroyable without a second error. */
  it('destroys cleanly after an init that failed half-way', () => {
    cursor = createCursor({ ticker: ticker.adapter, root: ':::' })

    expect(() => cursor.init()).toThrow()
    expect(() => cursor.destroy()).not.toThrow()
  })

  it('unsubscribes the frame loop', () => {
    boot()
    pointer(window as unknown as Element, 'pointermove', { clientX: 10, clientY: 10 })
    pointer(window as unknown as Element, 'pointermove', { clientX: 50, clientY: 50 })
    expect(ticker.subscribed).toBe(true)

    cursor.destroy()

    expect(ticker.subscribed).toBe(false)
  })
})

describe('the device gate', () => {
  /** A hybrid device switching to touch mid-session: the engine has to hide the
      cursor, stop the frame loop and hand the document back to the native
      pointer — without being destroyed and re-created. */
  it('hides the cursor and stops the loop when the device stops being fine-pointer', () => {
    const media = fakeMedia(true)
    boot()
    pointer(window as unknown as Element, 'pointermove', { clientX: 10, clientY: 10 })
    pointer(window as unknown as Element, 'pointermove', { clientX: 50, clientY: 50 })
    const changed = vi.fn()
    cursor.on('enabled:change', changed)

    media.flip(false)

    expect(cursor.enabled).toBe(false)
    expect((cursor.el as HTMLElement).hasAttribute(VISIBLE_ATTR)).toBe(false)
    expect(document.documentElement.classList.contains(HTML_INACTIVE)).toBe(true)
    expect(ticker.subscribed).toBe(false)
    expect(changed).toHaveBeenCalledExactlyOnceWith(false)
  })

  /** Coming back re-arms the reveal rather than restoring the old position —
      the cursor materializes wherever the pointer turns up next. */
  it('waits for a fresh pointer before revealing itself again', () => {
    const media = fakeMedia(true)
    boot()
    pointer(window as unknown as Element, 'pointermove', { clientX: 10, clientY: 10 })
    media.flip(false)

    media.flip(true)

    expect(cursor.enabled).toBe(true)
    expect(document.documentElement.classList.contains(HTML_ACTIVE)).toBe(true)
    expect((cursor.el as HTMLElement).hasAttribute(VISIBLE_ATTR)).toBe(false)

    pointer(window as unknown as Element, 'pointermove', { clientX: 80, clientY: 90 })

    expect((cursor.el as HTMLElement).hasAttribute(VISIBLE_ATTR)).toBe(true)
  })
})

describe('stats', () => {
  it('exposes a stable object before init ever runs', () => {
    cursor = createCursor({ ticker: ticker.adapter })
    const stats = cursor.stats

    cursor.init()

    expect(cursor.stats).toBe(stats)
  })
})

describe('collectWarmTargets', () => {
  const container = (html: string) => {
    const root = document.createElement('div')
    root.innerHTML = html
    return root
  }

  it('collects authored elements, their resolved anchors, and rule matches', () => {
    const root = container(`
      <div class="widget"><a class="trigger">t</a><span class="icon">i</span></div>
      <div class="zone" ${DEFAULT_ATTRIBUTE}='{"anchor":".dot"}'><span class="dot">d</span></div>
    `)
    const zone = root.querySelector('.zone') as Element
    const dot = root.querySelector('.dot') as Element
    const trigger = root.querySelector('.trigger') as Element

    const set = collectWarmTargets(root, DEFAULT_ATTRIBUTE, '.widget .trigger')

    expect(set.has(zone)).toBe(true) // the authored element
    expect(set.has(dot)).toBe(true) // its anchor, resolved inside it
    expect(set.has(trigger)).toBe(true) // matched by the rule selector
    expect(set.has(root.querySelector('.icon') as Element)).toBe(false)
  })

  it('tolerates malformed payload JSON — the element is still warmed, no anchor, no throw', () => {
    const root = container(`<div class="zone" ${DEFAULT_ATTRIBUTE}='{bad json'></div>`)
    const zone = root.querySelector('.zone') as Element

    const set = collectWarmTargets(root, DEFAULT_ATTRIBUTE, '')

    expect(set.has(zone)).toBe(true)
    expect(set.size).toBe(1)
  })

  it('warms an element with an empty attribute value, no anchor lookup', () => {
    const root = container(`<div class="zone" ${DEFAULT_ATTRIBUTE}=''></div>`)
    const zone = root.querySelector('.zone') as Element

    const set = collectWarmTargets(root, DEFAULT_ATTRIBUTE, '')

    expect([...set]).toEqual([zone])
  })

  it('dedupes an element that is both authored and a rule match', () => {
    const root = container(`<a class="t" ${DEFAULT_ATTRIBUTE}='{}'>x</a>`)
    const el = root.querySelector('.t') as Element

    const set = collectWarmTargets(root, DEFAULT_ATTRIBUTE, '.t')

    expect([...set]).toEqual([el])
  })

  it('is empty when nothing is authored and no rule selector is given', () => {
    expect(collectWarmTargets(container('<a>x</a>'), DEFAULT_ATTRIBUTE, '').size).toBe(0)
  })
})
