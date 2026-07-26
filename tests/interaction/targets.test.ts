import {
  authoredTarget,
  expandTrigger,
  geometrySelector,
  matchRule,
  needsGeometry,
  parsePayload,
  readCssLabel,
  resolveAnchor,
  ruleGeometry,
  ruleTrigger,
  withCssContent
} from '@ts/interaction/targets'
import type { ICompiledRule, ICursorPayload, ITargetScope } from '@ts/interfaces'
import { describe, expect, it, vi } from 'vitest'

/** Stand in for the browser's getComputedStyle over a var → value map. */
const stubVars = (vars: Record<string, string>) =>
  vi.stubGlobal('getComputedStyle', () => ({
    getPropertyValue: (name: string) => vars[name] ?? ''
  }))

describe('expandTrigger', () => {
  it('substitutes the scope for every :scope in the selector', () => {
    expect(expandTrigger('.widget', ':scope .icon')).toBe('.widget .icon')
    expect(expandTrigger('.widget', ':scope > a, :scope > button')).toBe(
      '.widget > a, .widget > button'
    )
  })

  it('treats a bare selector as a descendant of the scope', () => {
    expect(expandTrigger('.widget', '.icon')).toBe('.widget .icon')
  })

  it('matches the scope itself when the trigger is only :scope', () => {
    expect(expandTrigger('.widget', ':scope')).toBe('.widget')
  })
})

describe('ruleTrigger', () => {
  it('defaults an omitted selector to the scope root', () => {
    expect(ruleTrigger('.widget', { payload: {} })).toBe('.widget')
  })

  it('expands :scope in place rather than appending the selector', () => {
    expect(ruleTrigger('.widget', { selector: ':scope .icon', payload: {} })).toBe('.widget .icon')
  })
})

describe('needsGeometry', () => {
  /** The check is `!= null`, not truthiness: a rule pinned to no pull at all is
      still a magnetic rule whose element gets measured. */
  it('counts a magnetic rule even when its strength is false or 0', () => {
    expect(needsGeometry({ magnetic: false })).toBe(true)
    expect(needsGeometry({ magnetic: 0 })).toBe(true)
  })

  it('qualifies a size referencing the target directly or as a clamp bound', () => {
    expect(needsGeometry({ scale: 'target' })).toBe(true)
    expect(needsGeometry({ scale: { ref: 'cursor', max: 'target' } })).toBe(true)
  })

  it('qualifies a highlight that scales to the target', () => {
    expect(needsGeometry({ highlight: { scale: 'target' } })).toBe(true)
  })

  it('skips a bare boolean highlight — there is no scale to measure against', () => {
    expect(needsGeometry({ highlight: true })).toBe(false)
  })

  it('skips a rule whose effect measures nothing', () => {
    expect(needsGeometry({ arrows: 'horizontal' })).toBe(false)
    expect(needsGeometry({ scale: false })).toBe(false)
    expect(needsGeometry({})).toBe(false)
  })
})

describe('ruleGeometry', () => {
  it('contributes no parts at all for a rule that measures nothing', () => {
    expect(ruleGeometry('.widget', { payload: { arrows: 'all' } })).toEqual([])
  })

  /** An empty anchor names nothing, so it must not shadow the trigger. */
  it('falls back to the trigger when the anchor is an empty string', () => {
    expect(
      ruleGeometry('.widget', { selector: ':scope a', payload: { magnetic: true, anchor: '' } })
    ).toEqual(['.widget a'])
  })
})

describe('geometrySelector', () => {
  /** The anchor is the effect element; a magnetic rule ALSO needs its trigger
      warmed — the trigger's rect is the release zone read at engage time. */
  it('emits the anchor and, for a magnetic rule, its trigger release zone', () => {
    const scopes: ITargetScope[] = [
      {
        scope: '.elementor-widget-icon-box',
        rules: [
          {
            selector: ':scope .elementor-icon-box-title a',
            payload: { magnetic: true, anchor: ':scope .elementor-icon' }
          }
        ]
      }
    ]

    expect(geometrySelector(scopes)).toBe(
      '.elementor-widget-icon-box .elementor-icon, ' +
        '.elementor-widget-icon-box .elementor-icon-box-title a'
    )
  })

  /** A non-magnetic anchored rule measures only its effect element — no zone
      is read for it, so its trigger stays out of the warm set. */
  it('keeps a non-magnetic anchored rule to the anchor alone', () => {
    const scopes: ITargetScope[] = [
      {
        scope: '.widget',
        rules: [
          {
            selector: ':scope .thumb',
            payload: { scale: 'target', anchor: ':scope .icon' }
          }
        ]
      }
    ]

    expect(geometrySelector(scopes)).toBe('.widget .icon')
  })

  it('emits the flattened trigger when the rule has no anchor', () => {
    const scopes: ITargetScope[] = [
      { scope: '.widget', rules: [{ selector: ':scope a.icon', payload: { magnetic: true } }] }
    ]

    expect(geometrySelector(scopes)).toBe('.widget a.icon')
  })

  it('qualifies a rule whose size references the target', () => {
    const scopes: ITargetScope[] = [
      {
        scope: '.carousel',
        rules: [{ selector: ':scope .dot', payload: { scale: { ref: 'target', factor: 2 } } }]
      }
    ]

    expect(geometrySelector(scopes)).toBe('.carousel .dot')
  })

  it('qualifies a rule whose highlight scales to the target', () => {
    const scopes: ITargetScope[] = [
      {
        scope: '.gallery',
        rules: [{ selector: ':scope .thumb', payload: { highlight: { scale: 'target' } } }]
      }
    ]

    expect(geometrySelector(scopes)).toBe('.gallery .thumb')
  })

  it('skips a rule that measures nothing — the bare arrows rule needs no geometry', () => {
    const scopes: ITargetScope[] = [
      { scope: '.carousel', rules: [{ payload: { arrows: 'horizontal' } }] }
    ]

    expect(geometrySelector(scopes)).toBe('')
  })

  it('defaults an omitted selector to the scope root', () => {
    const scopes: ITargetScope[] = [{ scope: '.widget', rules: [{ payload: { magnetic: 0.5 } }] }]

    expect(geometrySelector(scopes)).toBe('.widget')
  })

  it('joins every qualifying rule into one selector', () => {
    const scopes: ITargetScope[] = [
      { scope: '.a', rules: [{ selector: ':scope .x', payload: { magnetic: true } }] },
      {
        scope: '.b',
        rules: [
          { payload: { arrows: 'all' } }, // dropped
          { selector: ':scope .y', payload: { scale: 'target' } }
        ]
      }
    ]

    expect(geometrySelector(scopes)).toBe('.a .x, .b .y')
  })
})

describe('resolveAnchor', () => {
  const scopeEl = { querySelector: vi.fn(() => null) } as unknown as Element

  it('resolves :scope to the hovered instance itself, without a query', () => {
    const query = vi.fn()
    const instance = { querySelector: query } as unknown as Element

    expect(resolveAnchor(instance, ':scope')).toBe(instance)
    expect(query).not.toHaveBeenCalled()
  })

  /** Queried within the instance, so `:scope .icon` targets the widget under the
      pointer rather than the first one on the page. */
  it('queries a descendant anchor inside that instance', () => {
    const anchor = { nodeType: 1 } as unknown as Element
    const instance = { querySelector: vi.fn(() => anchor) } as unknown as Element

    expect(resolveAnchor(instance, '.icon')).toBe(anchor)
    expect(instance.querySelector).toHaveBeenCalledWith('.icon')
  })

  it('returns null when the anchor is absent, so the caller can drop the rule', () => {
    expect(resolveAnchor(scopeEl, '.missing')).toBeNull()
  })
})

describe('parsePayload', () => {
  const elementWith = (raw: string | null) =>
    ({ getAttribute: vi.fn(() => raw) }) as unknown as Element

  const ATTR = 'data-arts-cursor-follower-target'

  it('parses the attribute JSON', () => {
    const payloads = new WeakMap<Element, ICursorPayload | null>()
    const element = elementWith('{"label":"View","magnetic":0.4}')

    expect(parsePayload(payloads, ATTR, element)).toEqual({ label: 'View', magnetic: 0.4 })
  })

  it('reads the attribute once and serves the memo afterwards', () => {
    const payloads = new WeakMap<Element, ICursorPayload | null>()
    const element = elementWith('{"label":"View"}')

    const first = parsePayload(payloads, ATTR, element)
    const second = parsePayload(payloads, ATTR, element)

    expect(second).toBe(first)
    expect(element.getAttribute).toHaveBeenCalledOnce()
  })

  /** A malformed payload must not re-parse on every pointer crossing. */
  it('caches a parse failure as null rather than retrying it', () => {
    const payloads = new WeakMap<Element, ICursorPayload | null>()
    const element = elementWith('{not json')

    expect(parsePayload(payloads, ATTR, element)).toBeNull()
    expect(parsePayload(payloads, ATTR, element)).toBeNull()
    expect(element.getAttribute).toHaveBeenCalledOnce()
  })

  it('treats an absent or empty attribute as no payload', () => {
    const payloads = new WeakMap<Element, ICursorPayload | null>()

    expect(parsePayload(payloads, ATTR, elementWith(null))).toBeNull()
    expect(parsePayload(payloads, ATTR, elementWith(''))).toBeNull()
  })

  it('keeps payloads separate per element', () => {
    const payloads = new WeakMap<Element, ICursorPayload | null>()

    expect(parsePayload(payloads, ATTR, elementWith('{"label":"a"}'))).toEqual({ label: 'a' })
    expect(parsePayload(payloads, ATTR, elementWith('{"label":"b"}'))).toEqual({ label: 'b' })
  })

  /** The dev-only trace rides the same guard the shipped bundle compiles out —
      flipped on here alone, back off in the finally. */
  it('traces the parse in dev builds', () => {
    vi.stubEnv('DEV', true)
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {})
    try {
      parsePayload(new WeakMap(), ATTR, elementWith('{"label":"View"}'))
      expect(debug).toHaveBeenCalledOnce()
    } finally {
      vi.stubEnv('DEV', false)
    }
  })
})

describe('withCssContent', () => {
  const compiled = (
    vars: { labelVar?: string; iconVar?: string },
    payload: ICursorPayload
  ): ICompiledRule => ({
    scope: '.widget',
    trigger: '.widget a',
    anchor: undefined,
    payload,
    source: { payload },
    labelVar: vars.labelVar,
    iconVar: vars.iconVar,
    active: true
  })

  /** Identity, not a copy: no var named means no style read (getComputedStyle
      does not exist under node, so a read would throw) and no allocation. */
  it('hands the payload back untouched when the rule names no var', () => {
    const payload: ICursorPayload = { label: 'View' }

    expect(withCssContent(compiled({}, payload), {} as Element)).toBe(payload)
  })

  it('takes a glyph class off the element', () => {
    stubVars({ '--icon': '"fas fa-search"' })

    expect(
      withCssContent(compiled({ iconVar: '--icon' }, { shape: 'pill' }), {} as Element)
    ).toEqual({ iconClass: 'fas fa-search' })
  })

  /** One property carries both forms, so the VALUE decides which it is — a
      url() can be masked and recoloured, anything else is webfont classes. */
  it('reads a url value as a mask rather than as classes', () => {
    stubVars({ '--icon': 'url("data:image/svg+xml,%3Csvg%3E%3C/svg%3E")' })

    expect(
      withCssContent(compiled({ iconVar: '--icon' }, { shape: 'pill' }), {} as Element)
    ).toEqual({ iconUrl: 'data:image/svg+xml,%3Csvg%3E%3C/svg%3E' })
  })

  /** The wrapper is CSS's, not the payload's: the applier adds its own `url()`
      back, so keeping this one would nest a second inside it. */
  it('hands back the bare url, unquoted, whatever quoting CSS used', () => {
    stubVars({ '--icon': "url('/i/star.svg')" })

    expect(
      withCssContent(compiled({ iconVar: '--icon' }, { shape: 'pill' }), {} as Element)
    ).toEqual({ iconUrl: '/i/star.svg' })
  })

  /** The screenshot bug: picking an icon left the rule's own fallback wording
      beside it, in the stadium that had been sized to hug that wording. */
  it('drops the rule wording and its pill when an icon resolves', () => {
    stubVars({ '--icon': 'fas fa-search' })

    expect(
      withCssContent(
        compiled({ iconVar: '--icon' }, { shape: 'pill', label: 'Zoom' }),
        {} as Element
      )
    ).toEqual({ iconClass: 'fas fa-search' })
  })

  it('lets an icon win over a label the host also resolved', () => {
    stubVars({ '--l': '"Zoom"', '--icon': 'fas fa-search' })

    expect(
      withCssContent(
        compiled({ labelVar: '--l', iconVar: '--icon' }, { shape: 'pill', label: 'View' }),
        {} as Element
      )
    ).toEqual({ iconClass: 'fas fa-search' })
  })

  it('keeps the rule payload when every named var is unset', () => {
    stubVars({})
    const payload: ICursorPayload = { label: 'View' }

    expect(
      withCssContent(compiled({ labelVar: '--l', iconVar: '--i' }, payload), {} as Element)
    ).toBe(payload)
  })
})

describe('matchRule', () => {
  const rule = (over: Partial<ICompiledRule> = {}): ICompiledRule => ({
    scope: '.widget',
    trigger: '.widget .icon',
    anchor: undefined,
    payload: { label: 'View' },
    source: { selector: '.icon', payload: { label: 'View' } },
    labelVar: undefined,
    iconVar: undefined,
    active: true,
    ...over
  })

  /** The element the pointer is over, answering `closest` from a selector map. */
  const target = (map: Record<string, Element | null>, self: Partial<Element> = {}) => {
    const el = {
      nodeType: 1,
      closest: (s: string) => map[s] ?? null,
      ...self
    } as unknown as Element
    return el
  }

  it('drops the rule when the trigger does not match', () => {
    expect(matchRule(target({}), rule())).toBeNull()
  })

  it('uses the trigger itself as the effect element when the rule has no anchor', () => {
    const trigger = target({})
    expect(matchRule(target({ '.widget .icon': trigger }), rule())).toEqual({
      element: trigger,
      payload: { label: 'View' },
      trigger
    })
  })

  /** The anchor BECOMES the effect element — magnetic pull and resize key off
      it, not off the wider hover zone that triggered the rule. */
  it('promotes a resolved anchor to the effect element', () => {
    const anchor = { nodeType: 1 } as unknown as Element
    const scopeEl = target({}, { querySelector: () => anchor } as Partial<Element>)
    const trigger = target({ '.widget': scopeEl })

    expect(matchRule(target({ '.widget .icon': trigger }), rule({ anchor: '.inner' }))).toEqual({
      element: anchor,
      payload: { label: 'View' },
      trigger
    })
  })

  /** Dropping rather than falling back to the trigger: the element keeps its
      regular behavior instead of silently getting the rule's payload. */
  it('drops the rule when its anchor names nothing', () => {
    const scopeEl = target({}, { querySelector: () => null } as Partial<Element>)
    const trigger = target({ '.widget': scopeEl })

    expect(matchRule(target({ '.widget .icon': trigger }), rule({ anchor: '.missing' }))).toBeNull()
  })

  it('resolves the anchor against the trigger when the scope is not an ancestor', () => {
    const anchor = { nodeType: 1 } as unknown as Element
    const trigger = target({}, { querySelector: () => anchor } as Partial<Element>)

    expect(
      matchRule(target({ '.widget .icon': trigger }), rule({ anchor: '.inner' }))?.element
    ).toBe(anchor)
  })

  /** The drag sub-state rides along untouched — it declares an arrows AXIS, not
      wording, so a per-instance label never has to restate it. */
  it('takes the label from the var a rule names', () => {
    stubVars({ '--label': '"Swipe"' })
    const scopeEl = target({})
    const trigger = target({ '.widget': scopeEl })

    expect(
      matchRule(
        target({ '.widget .icon': trigger }),
        rule({
          payload: { shape: 'pill', label: 'Drag', drag: { arrows: 'horizontal' } },
          labelVar: '--label'
        })
      )
    ).toEqual({
      element: trigger,
      payload: { shape: 'pill', label: 'Swipe', drag: { arrows: 'horizontal' } },
      trigger
    })
  })

  /** Vars are named per rule, so a carousel's Drag label can't reach the
      magnetic arrows that share its scope root — those never read a var at all. */
  it('never reads a var for a rule that names none', () => {
    const styles = vi.fn()
    vi.stubGlobal('getComputedStyle', styles)
    const scopeEl = target({})
    const trigger = target({ '.widget': scopeEl })

    expect(
      matchRule(target({ '.widget .icon': trigger }), rule({ payload: { magnetic: true } }))
    ).toEqual({ element: trigger, payload: { magnetic: true }, trigger })
    expect(styles).not.toHaveBeenCalled()
  })

  it('keeps the rule label when the var is unset', () => {
    stubVars({})
    const scopeEl = target({})
    const trigger = target({ '.widget': scopeEl })

    expect(matchRule(target({ '.widget .icon': trigger }), rule({ labelVar: '--label' }))).toEqual({
      element: trigger,
      payload: { label: 'View' },
      trigger
    })
  })
})

describe('readCssLabel', () => {
  it('unwraps the quotes a CSS string authors and trims', () => {
    stubVars({ '--label': ' "View Project" ' })
    expect(readCssLabel({} as Element, '--label')).toBe('View Project')
  })

  it('reads an unquoted value as-is and an unset one as empty', () => {
    stubVars({ '--label': 'Swipe' })
    expect(readCssLabel({} as Element, '--label')).toBe('Swipe')
    expect(readCssLabel({} as Element, '--missing')).toBe('')
  })
})

describe('authoredTarget', () => {
  const ATTR = 'data-arts-cursor-follower-target'

  const authored = (raw: string | null, anchor: Element | null = null) =>
    ({
      nodeType: 1,
      getAttribute: () => raw,
      querySelector: () => anchor
    }) as unknown as Element

  it('is the element itself when the payload names no anchor', () => {
    const el = authored('{"label":"View"}')

    expect(authoredTarget(new WeakMap(), ATTR, el)).toEqual({
      element: el,
      payload: { label: 'View' },
      trigger: el
    })
  })

  it('promotes the anchor when it resolves inside the element', () => {
    const anchor = { nodeType: 1 } as unknown as Element
    const el = authored('{"anchor":".inner"}', anchor)

    expect(authoredTarget(new WeakMap(), ATTR, el).element).toBe(anchor)
  })

  /** Unlike a rule, an explicit opt-in always applies — a missing anchor falls
      back to the element rather than dropping the payload. */
  it('falls back to the element when the anchor names nothing', () => {
    const el = authored('{"anchor":".missing","label":"View"}')

    expect(authoredTarget(new WeakMap(), ATTR, el)).toEqual({
      element: el,
      payload: { anchor: '.missing', label: 'View' },
      trigger: el
    })
  })

  it('still targets the element when the payload is malformed', () => {
    const el = authored('{not json')

    expect(authoredTarget(new WeakMap(), ATTR, el)).toEqual({
      element: el,
      payload: null,
      trigger: el
    })
  })
})
