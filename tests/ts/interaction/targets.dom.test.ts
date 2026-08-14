// @vitest-environment happy-dom

import { DEFAULT_ATTRIBUTE } from '@ts/constants'
import { createTargets } from '@ts/interaction/targets'
import type { ITargetContext, ITargetRule, ITargetScope } from '@ts/interfaces'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { at } from '../support'

/**
 * The delegated tier: one resolveTarget() pass shared by pointerover and
 * pointerout, so enter and leave always compare the same element. The pure
 * pieces it calls (expandTrigger, resolveAnchor, parsePayload, matchRule,
 * authoredTarget) are covered against no DOM in targets.test.ts.
 *
 * Events are plain bubbling Events rather than PointerEvents: the module reads
 * only `target`, `relatedTarget` and `pointerType`, and happy-dom's
 * PointerEvent constructor would add nothing the assertions depend on.
 */

let lifecycle: AbortController

const mount = (markup: string) => {
  document.body.innerHTML = markup
}

const fire = (
  el: Element,
  type: string,
  relatedTarget: Element | null = null,
  pointerType = 'mouse'
) => {
  const event = new Event(type, { bubbles: true })
  Object.defineProperty(event, 'relatedTarget', { value: relatedTarget })
  Object.defineProperty(event, 'pointerType', { value: pointerType })
  el.dispatchEvent(event)
}

const start = (
  over: { scopes?: ITargetScope[]; isRuleActive?: (r: ITargetRule) => boolean } = {}
) =>
  createTargets({
    attribute: DEFAULT_ATTRIBUTE,
    scopes: over.scopes ?? [],
    ...(over.isRuleActive ? { isRuleActive: over.isRuleActive } : {}),
    signal: lifecycle.signal
  })

beforeEach(() => {
  lifecycle = new AbortController()
  document.body.innerHTML = ''
})

afterEach(() => {
  lifecycle.abort()
})

describe('bare interactive elements', () => {
  it('enters a link with no payload of its own', () => {
    mount('<a href="#" id="link">go</a>')
    const targets = start()
    const enter = vi.fn()
    targets.on('enter', enter)

    fire(at('#link'), 'pointerover')

    expect(enter).toHaveBeenCalledOnce()
    expect(targets.current).toEqual({ element: at('#link'), payload: null, trigger: at('#link') })
  })

  it('resolves from a descendant up to the interactive ancestor', () => {
    mount('<a href="#" id="link"><span id="inner">go</span></a>')
    const targets = start()

    fire(at('#inner'), 'pointerover')

    expect(targets.current?.element).toBe(at('#link'))
  })

  it('stays outside anything non-interactive', () => {
    mount('<div id="plain">text</div>')
    const targets = start()

    fire(at('#plain'), 'pointerover')

    expect(targets.current).toBeNull()
  })

  /** The author opt-out has to win over the element's own interactivity. */
  it('honours an opt-out ancestor over a real link', () => {
    mount('<div class="no-cursor-target"><a href="#" id="link">go</a></div>')
    const targets = start()

    fire(at('#link'), 'pointerover')

    expect(targets.current).toBeNull()
  })
})

describe('authored payloads', () => {
  it('parses the attribute and enters with it', () => {
    mount(`<div id="box" ${DEFAULT_ATTRIBUTE}='{"label":"View"}'>x</div>`)
    const targets = start()

    fire(at('#box'), 'pointerover')

    expect(targets.current?.payload).toEqual({ label: 'View' })
  })

  /** The anchor BECOMES the effect element, so magnetic pull keys off the icon
      rather than off the wide hover zone that carried the attribute. */
  it('promotes the payload anchor to the effect element', () => {
    mount(
      `<div id="box" ${DEFAULT_ATTRIBUTE}='{"anchor":".icon"}'><i class="icon" id="icon"></i></div>`
    )
    const targets = start()

    fire(at('#box'), 'pointerover')

    expect(targets.current?.element).toBe(at('#icon'))
  })

  /** The zone stays on the context even when the anchor redirects the effect
      element — it is the magnetic release zone (the trap holds inside it). */
  it('carries the hover zone that produced the context', () => {
    mount(
      `<div id="box" ${DEFAULT_ATTRIBUTE}='{"anchor":".icon"}'><i class="icon" id="icon"></i></div>`
    )
    const targets = start()

    fire(at('#box'), 'pointerover')

    expect(targets.current?.trigger).toBe(at('#box'))
    expect(targets.current?.element).toBe(at('#icon'))
  })

  it('falls back to the element when the anchor names nothing', () => {
    mount(`<div id="box" ${DEFAULT_ATTRIBUTE}='{"anchor":".missing"}'>x</div>`)
    const targets = start()

    fire(at('#box'), 'pointerover')

    expect(targets.current?.element).toBe(at('#box'))
  })

  it('outranks a rule that also matches', () => {
    mount(
      `<div class="widget"><a href="#" id="link" ${DEFAULT_ATTRIBUTE}='{"label":"authored"}'>go</a></div>`
    )
    const targets = start({
      scopes: [{ scope: '.widget', rules: [{ selector: 'a', payload: { label: 'rule' } }] }]
    })

    fire(at('#link'), 'pointerover')

    expect(targets.current?.payload).toEqual({ label: 'authored' })
  })
})

describe('scoped rules', () => {
  const scopes: ITargetScope[] = [
    { scope: '.widget', rules: [{ selector: ':scope .trigger', payload: { label: 'from rule' } }] }
  ]

  it('applies a rule whose trigger matches inside its scope', () => {
    mount('<div class="widget"><div class="trigger" id="t">x</div></div>')
    const targets = start({ scopes })

    fire(at('#t'), 'pointerover')

    expect(targets.current?.payload).toEqual({ label: 'from rule' })
  })

  it('ignores the same trigger outside the scope', () => {
    mount('<div class="trigger" id="t">x</div>')
    const targets = start({ scopes })

    fire(at('#t'), 'pointerover')

    expect(targets.current).toBeNull()
  })

  /** A rule with no selector of its own defaults its trigger to the scope root. */
  it('defaults a selectorless rule to the scope element itself', () => {
    mount('<div class="widget" id="w">x</div>')
    const targets = start({
      scopes: [{ scope: '.widget', rules: [{ payload: { label: 'whole widget' } }] }]
    })

    fire(at('#w'), 'pointerover')

    expect(targets.current?.payload).toEqual({ label: 'whole widget' })
  })

  /** Rules are tried in authored order; one whose trigger does not contain the
      resolved target is skipped, not an error. */
  it('skips a rule whose trigger does not match and takes the next', () => {
    mount('<div class="widget"><div class="other">o</div><div class="trigger" id="t">x</div></div>')
    const targets = start({
      scopes: [
        {
          scope: '.widget',
          rules: [
            { selector: ':scope .other', payload: { label: 'other' } },
            { selector: ':scope .trigger', payload: { label: 'from rule' } }
          ]
        }
      ]
    })

    fire(at('#t'), 'pointerover')

    expect(targets.current?.payload).toEqual({ label: 'from rule' })
  })

  /** A dropped rule must not leave its non-interactive trigger highlighting as
      if it were a link — matching the selector is not being interactive. */
  it('leaves a non-interactive trigger out when its rule anchor names nothing', () => {
    mount('<div class="widget"><div class="trigger" id="t">x</div></div>')
    const targets = start({
      scopes: [
        {
          scope: '.widget',
          rules: [{ selector: ':scope .trigger', payload: { magnetic: true, anchor: '.missing' } }]
        }
      ]
    })

    fire(at('#t'), 'pointerover')

    expect(targets.current).toBeNull()
  })

  /** Resolved against the hovered INSTANCE — the second widget's icon, not the
      first one on the page. */
  it('resolves a rule anchor within the hovered scope instance', () => {
    mount(`
      <div class="widget"><i class="icon" id="first"></i><div class="trigger">a</div></div>
      <div class="widget"><i class="icon" id="second"></i><div class="trigger" id="t">b</div></div>
    `)
    const targets = start({
      scopes: [
        {
          scope: '.widget',
          rules: [{ selector: ':scope .trigger', payload: { anchor: '.icon' } }]
        }
      ]
    })

    fire(at('#t'), 'pointerover')

    expect(targets.current?.element).toBe(at('#second'))
  })
})

/**
 * The priority principle: an element that is itself interactive (link, button,
 * role=button, opt-in class) never inherits a rule matched on an ANCESTOR —
 * only a rule whose trigger is the element itself can claim it, else it drops
 * to a later rule or the bare-interactive fallback. Keeps a carousel's
 * whole-widget drag rule from swallowing a link nested in a slide.
 */
describe('interactive descendants of an ancestor-matched rule', () => {
  it('drops an ancestor rule on a link and falls back to bare interactive', () => {
    mount('<div class="widget"><a href="#" id="link">go</a></div>')
    const targets = start({
      scopes: [{ scope: '.widget', rules: [{ payload: { label: 'Drag' } }] }]
    })

    fire(at('#link'), 'pointerover')

    expect(targets.current).toEqual({ element: at('#link'), payload: null, trigger: at('#link') })
  })

  it('still applies the ancestor rule to a non-interactive descendant', () => {
    mount('<div class="widget"><div class="slide" id="s">x</div></div>')
    const targets = start({
      scopes: [{ scope: '.widget', rules: [{ payload: { label: 'Drag' } }] }]
    })

    fire(at('#s'), 'pointerover')

    expect(targets.current?.payload).toEqual({ label: 'Drag' })
  })

  /** The arrows/dots shape: their rule names the control itself, which is no
      ancestor match, so it keeps winning over the interactive fallback. */
  it('keeps a rule whose own trigger is the interactive element', () => {
    mount('<div class="widget"><a href="#" class="ctrl" id="arrow">go</a></div>')
    const targets = start({
      scopes: [
        {
          scope: '.widget',
          rules: [
            { selector: ':scope .ctrl', payload: { magnetic: true } },
            { payload: { label: 'Drag' } }
          ]
        }
      ]
    })

    fire(at('#arrow'), 'pointerover')

    expect(targets.current?.payload).toEqual({ magnetic: true })
  })

  /** Skipping must continue the loop, not abort it — an ancestor rule ordered
      first cannot shadow a later rule that names the element itself. */
  it('continues past a skipped ancestor rule to a later rule matching the element itself', () => {
    mount('<div class="widget"><a href="#" id="link">go</a></div>')
    const targets = start({
      scopes: [
        {
          scope: '.widget',
          rules: [
            { payload: { label: 'Drag' } },
            { selector: ':scope a', payload: { label: 'View' } }
          ]
        }
      ]
    })

    fire(at('#link'), 'pointerover')

    expect(targets.current?.payload).toEqual({ label: 'View' })
  })
})

/**
 * The Site Settings switches: a rule whose effect is globally off is treated as
 * if it does not exist, so the element drops to its regular behaviour rather
 * than going inert.
 */
describe('rule gating', () => {
  const scopes: ITargetScope[] = [
    { scope: '.widget', rules: [{ selector: ':scope a', payload: { magnetic: true } }] }
  ]

  it('drops an inactive rule and lets a link behave like a link', () => {
    mount('<div class="widget"><a href="#" id="link">go</a></div>')
    const targets = start({ scopes, isRuleActive: () => false })

    fire(at('#link'), 'pointerover')

    expect(targets.current).toEqual({ element: at('#link'), payload: null, trigger: at('#link') })
  })

  it('leaves a non-interactive trigger out entirely once its rule drops', () => {
    mount('<div class="widget"><div class="trigger" id="t">x</div></div>')
    const targets = start({
      scopes: [{ scope: '.widget', rules: [{ selector: ':scope .trigger', payload: {} }] }],
      isRuleActive: () => false
    })

    fire(at('#t'), 'pointerover')

    expect(targets.current).toBeNull()
  })

  it('picks up a toggle flipped between crossings', () => {
    mount('<div class="widget"><a href="#" id="link">go</a></div>')
    let active = false
    const targets = start({ scopes, isRuleActive: () => active })

    fire(at('#link'), 'pointerover')
    expect(targets.current?.payload).toBeNull()

    fire(at('#link'), 'pointerout', null)
    active = true
    fire(at('#link'), 'pointerover')

    expect(targets.current?.payload).toEqual({ magnetic: true })
  })

  /** The crossing memo must not serve a resolve computed under the old toggle
      state when the flip lands between pointerout and pointerover. */
  it('picks up a toggle flipped inside a single crossing', () => {
    mount('<div class="widget"><a href="#" id="a">a</a><a href="#" id="b">b</a></div>')
    let active = false
    const targets = start({
      scopes: [
        { scope: '.widget', rules: [{ selector: ':scope a', payload: { magnetic: true } }] }
      ],
      isRuleActive: () => active
    })

    fire(at('#a'), 'pointerover')
    fire(at('#a'), 'pointerout', at('#b'))
    active = true
    fire(at('#b'), 'pointerover')

    expect(targets.current?.payload).toEqual({ magnetic: true })
  })
})

describe('enter and leave pairing', () => {
  it('does not re-enter while the pointer stays on the same element', () => {
    mount('<a href="#" id="link"><span id="inner">go</span></a>')
    const targets = start()
    const enter = vi.fn()
    targets.on('enter', enter)

    fire(at('#link'), 'pointerover')
    fire(at('#inner'), 'pointerover')

    expect(enter).toHaveBeenCalledOnce()
  })

  it('leaves the old element before entering the new one', () => {
    mount('<a href="#" id="a">a</a><a href="#" id="b">b</a>')
    const targets = start()
    const order: string[] = []
    targets.on('enter', () => order.push('enter'))
    targets.on('leave', () => order.push('leave'))

    fire(at('#a'), 'pointerover')
    fire(at('#b'), 'pointerover')

    expect(order).toEqual(['enter', 'leave', 'enter'])
    expect(targets.current?.element).toBe(at('#b'))
  })

  it('leaves when the pointer moves out to nothing', () => {
    mount('<a href="#" id="link">go</a><div id="plain">x</div>')
    const targets = start()
    const leave = vi.fn()
    targets.on('leave', leave)
    fire(at('#link'), 'pointerover')

    fire(at('#link'), 'pointerout', at('#plain'))

    expect(leave).toHaveBeenCalledOnce()
    expect(targets.current).toBeNull()
  })

  it('ignores a pointerout while nothing is current', () => {
    mount('<a href="#" id="link">go</a>')
    const targets = start()
    const leave = vi.fn()
    targets.on('leave', leave)

    fire(at('#link'), 'pointerout', null)

    expect(leave).not.toHaveBeenCalled()
  })

  /** Moving between children of the same target fires pointerout too — the
      resolved element is what decides, not the event. */
  it('stays entered when pointerout lands inside the same target', () => {
    mount('<a href="#" id="link"><span id="inner">go</span></a>')
    const targets = start()
    const leave = vi.fn()
    targets.on('leave', leave)
    fire(at('#link'), 'pointerover')

    fire(at('#inner'), 'pointerout', at('#link'))

    expect(leave).not.toHaveBeenCalled()
    expect(targets.current?.element).toBe(at('#link'))
  })
})

describe('crossing resolve reuse', () => {
  /** A crossing dispatches pointerout (with the entered element as
      relatedTarget) and then pointerover (with it as target) — the same element
      resolved twice. The second pass must reuse the first. */
  it('reuses the pointerout resolve for the pointerover completing the crossing', () => {
    mount('<a href="#" id="a">a</a><a href="#" id="b">b</a>')
    const targets = start()
    fire(at('#a'), 'pointerover')
    fire(at('#a'), 'pointerout', at('#b'))

    const closest = vi.spyOn(Element.prototype, 'closest')
    fire(at('#b'), 'pointerover')
    const resolved = closest.mock.calls.length
    closest.mockRestore()

    expect(resolved).toBe(0)
    expect(targets.current?.element).toBe(at('#b'))
  })
})

describe('press and release', () => {
  it('emits only while a target is current', () => {
    mount('<a href="#" id="link">go</a>')
    const targets = start()
    const press = vi.fn()
    const release = vi.fn()
    targets.on('press', press)
    targets.on('release', release)

    targets.handleDown()
    targets.handleUp()
    expect(press).not.toHaveBeenCalled()

    fire(at('#link'), 'pointerover')
    targets.handleDown()
    targets.handleUp()

    expect(press).toHaveBeenCalledOnce()
    expect(release).toHaveBeenCalledOnce()
  })

  it('hands the press the context it entered with', () => {
    mount(`<div id="box" ${DEFAULT_ATTRIBUTE}='{"label":"View"}'>x</div>`)
    const targets = start()
    let seen: ITargetContext | null = null
    targets.on('press', (ctx) => {
      seen = ctx
    })
    fire(at('#box'), 'pointerover')

    targets.handleDown()

    expect(seen).toEqual({ element: at('#box'), payload: { label: 'View' }, trigger: at('#box') })
  })
})

describe('the pointer-type gate', () => {
  it('ignores a touch crossing', () => {
    mount('<a href="#" id="link">go</a>')
    const targets = start()
    const enter = vi.fn()
    targets.on('enter', enter)

    fire(at('#link'), 'pointerover', null, 'touch')

    expect(enter).not.toHaveBeenCalled()
    expect(targets.current).toBeNull()
  })

  it('accepts a pen crossing', () => {
    mount('<a href="#" id="link">go</a>')
    const targets = start()

    fire(at('#link'), 'pointerover', null, 'pen')

    expect(targets.current?.element).toBe(at('#link'))
  })

  /** A tap elsewhere fires touch pointerout on the hovered element; the mouse
      hover it would tear down is still physically there. */
  it('keeps the active mouse hover through a touch pointerout', () => {
    mount('<a href="#" id="link">go</a>')
    const targets = start()
    fire(at('#link'), 'pointerover')

    fire(at('#link'), 'pointerout', null, 'touch')

    expect(targets.current?.element).toBe(at('#link'))
  })

  it('keeps the crossing state consistent across an interleaved touch event', () => {
    mount('<a href="#" id="a">a</a><a href="#" id="b">b</a>')
    const targets = start()
    const enter = vi.fn()
    targets.on('enter', enter)

    fire(at('#a'), 'pointerover')
    fire(at('#a'), 'pointerout', at('#b'))
    fire(at('#b'), 'pointerover', null, 'touch')
    fire(at('#b'), 'pointerover')

    expect(targets.current?.element).toBe(at('#b'))
    expect(enter).toHaveBeenCalledTimes(2)
  })
})

describe('lifecycle', () => {
  it('stops resolving once the lifecycle signal aborts', () => {
    mount('<a href="#" id="link">go</a>')
    const targets = start()
    const enter = vi.fn()
    targets.on('enter', enter)

    lifecycle.abort()
    fire(at('#link'), 'pointerover')

    expect(enter).not.toHaveBeenCalled()
    expect(targets.current).toBeNull()
  })
})

describe('refresh', () => {
  it('re-resolves the hovered element when its rule stops applying', () => {
    // Rules resolve on a crossing and are held while the pointer sits still,
    // so a class toggled by the host — a lightbox changing slides, a state
    // its own CSS tracks — left the cursor promising the old element's
    // payload until the pointer left and came back.
    mount('<div class="zone"><img id="pic" alt=""></div>')
    const scopes: ITargetScope[] = [
      {
        scope: '.zone',
        rules: [{ selector: ':scope.ready img', payload: { label: 'Zoom' } }]
      }
    ]
    const targets = start({ scopes })
    at('.zone').classList.add('ready')
    fire(at('#pic'), 'pointerover')
    expect(targets.current?.payload?.label).toBe('Zoom')

    const leave = vi.fn()
    targets.on('leave', leave)
    at('.zone').classList.remove('ready')
    targets.refresh()

    expect(leave).toHaveBeenCalledTimes(1)
    expect(targets.current).toBeNull()
  })

  it('costs nothing when the same rule still resolves', () => {
    // Re-emitting would rebuild the hint markup (the icon slot is written
    // wholesale on every recompute), so an unchanged verdict must be silent.
    mount('<div class="zone ready"><img id="pic" alt=""></div>')
    const scopes: ITargetScope[] = [
      {
        scope: '.zone',
        rules: [{ selector: ':scope.ready img', payload: { label: 'Zoom' } }]
      }
    ]
    const targets = start({ scopes })
    fire(at('#pic'), 'pointerover')

    const enter = vi.fn()
    const leave = vi.fn()
    targets.on('enter', enter)
    targets.on('leave', leave)
    targets.refresh()

    expect(enter).not.toHaveBeenCalled()
    expect(leave).not.toHaveBeenCalled()
    expect(targets.current?.payload?.label).toBe('Zoom')
  })

  it('is a no-op with nothing hovered', () => {
    mount('<a href="#" id="link">go</a>')
    const targets = start()
    expect(() => targets.refresh()).not.toThrow()
    expect(targets.current).toBeNull()
  })
})
