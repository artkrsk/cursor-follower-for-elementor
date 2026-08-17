import {
  ARROW_ROTATION,
  CURSOR_ID,
  DURATION_VAR,
  EASE_VAR,
  EL_ATTR,
  HTML_ACTIVE,
  HTML_INACTIVE,
  SVG_NS
} from '../constants'
import type { IAnimationConfig, ICursorOptions, ICursorRefs } from '../interfaces'
import type { TArrowAxis, TArrowDirection } from '../types'
import { isHTMLElement } from '../utils'

const ref = (root: Element, name: string, warnMissing: boolean) => {
  const el = root.querySelector<HTMLElement>(`[${EL_ATTR}="${name}"]`)
  if (!el && warnMissing && import.meta.env?.DEV) {
    console.warn(`[cursor] markup is missing [${EL_ATTR}="${name}"] — that effect will no-op`)
  }
  return el
}

/**
 * Build-or-verify: adopts existing #arts-cursor markup when present,
 * otherwise builds the canonical tree and appends it to <body>.
 */
export function buildMarkup(target?: Element | string | null): ICursorRefs {
  let root: HTMLElement | null = null
  if (typeof target === 'string') {
    root = document.querySelector<HTMLElement>(target)
  } else if (isHTMLElement(target)) {
    root = target
  } else {
    root = document.getElementById(CURSOR_ID)
  }

  const built = !root
  if (!root) {
    root = createTree()
    document.body.appendChild(root)
  }

  warnIfContainingBlockHijacked(root)

  return {
    root,
    follower: ref(root, 'follower', !built),
    hint: ref(root, 'hint', !built),
    // Optional sub-slots — no warning when an adopter's hint lacks them.
    hintText: ref(root, 'hint-text', false),
    hintIcon: ref(root, 'hint-icon', false),
    built
  }
}

/** Feed the CSS transition tokens the `arts-cursor` layer reads — only the
    EXPLICITLY configured ones. The stylesheet ships the defaults, and the kit
    Duration control writes the var through selector CSS; an unconditional
    inline write would beat both and leave the Site Settings control inert. */
export function applyAnimationTokens(
  root: HTMLElement,
  animation: ICursorOptions['animation']
): void {
  if (animation?.duration != null) {
    root.style.setProperty(DURATION_VAR, `${animation.duration}s`)
  }
  if (animation?.easing) {
    root.style.setProperty(EASE_VAR, animation.easing)
  }
}

/** The effective animation tokens as computed CSS reports them — the kit var, a
    theme override, the stylesheet default, or the inline write above, whichever
    wins the cascade. Returns only what parses: a DOM without the stylesheet
    (tests) reports nothing and the caller keeps its resolved defaults. */
export function readAnimationTokens(root: HTMLElement): Partial<IAnimationConfig> {
  const styles = getComputedStyle(root)
  const out: Partial<IAnimationConfig> = {}
  const duration = styles.getPropertyValue(DURATION_VAR).trim()
  const parsed = Number.parseFloat(duration)
  if (Number.isFinite(parsed) && parsed >= 0 && duration.endsWith('s')) {
    out.duration = duration.endsWith('ms') ? parsed / 1000 : parsed
  }
  const easing = styles.getPropertyValue(EASE_VAR).trim()
  if (easing) {
    out.easing = easing
  }
  return out
}

/** Document-level flags for consumer CSS: is the engine live on this device?
    The target arrives from the caller like the effects suite's — the
    composition root is the one place that resolves the documentElement. */
export function setActiveClasses(html: HTMLElement, active: boolean): void {
  html.classList.toggle(HTML_ACTIVE, active)
  html.classList.toggle(HTML_INACTIVE, !active)
}

/** Dev-only: an ancestor with transform/filter/will-change/contain/perspective
    makes `position: fixed` track that ancestor instead of the viewport — the
    classic silent breakage when themes wrap the printed markup. A fixed
    element's offsetParent is non-null exactly in that case. Deferred a frame:
    offsetParent forces layout, and stylesheets may not have applied yet. */
function warnIfContainingBlockHijacked(root: HTMLElement): void {
  if (!import.meta.env?.DEV) {
    return
  }
  requestAnimationFrame(() => {
    const ancestor = root.offsetParent
    if (ancestor) {
      console.warn(
        '[cursor] an ancestor creates a containing block (transform, filter, will-change, ' +
          'contain or perspective), so the fixed-position cursor tracks it instead of the ' +
          'viewport. Move the cursor markup outside it, or drop that property from:',
        ancestor
      )
    }
  })
}

/** The canonical tree. Every BEM class here is mirrored by hand in src/styles —
    nothing can be shared across languages, and they are written from this one
    function, so they stay inline rather than becoming constants. The `arts-cursor`
    class and CURSOR_ID share a value but not a contract: the class is the style
    block (also targeted by the Elementor kit selectors), the id is the hook
    buildMarkup adopts through. */
function createTree(): HTMLElement {
  const root = div('arts-cursor', { id: CURSOR_ID })
  const wrapper = div('arts-cursor__wrapper')
  wrapper.append(
    div('arts-cursor__follower', { [EL_ATTR]: 'follower' }),
    arrow('up', 'vertical'),
    arrow('right', 'horizontal'),
    arrow('down', 'vertical'),
    arrow('left', 'horizontal'),
    hint(),
    div('arts-cursor__dot'),
    spinner()
  )
  root.appendChild(wrapper)
  return root
}

/** The hint: an inline-flex row with a text slot and an icon slot, so a payload
    icon renders before/after the label text and the pill (or circle) auto-sizes
    to fit both. The engine ships no icon — the slot is filled per payload. */
function hint(): HTMLElement {
  const el = div('arts-cursor__hint', { [EL_ATTR]: 'hint' })
  el.append(
    div('arts-cursor__hint-text', { [EL_ATTR]: 'hint-text' }),
    div('arts-cursor__hint-icon', { [EL_ATTR]: 'hint-icon' })
  )
  return el
}

function div(className: string, attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('div')
  el.className = className
  for (const [name, value] of Object.entries(attrs)) {
    el.setAttribute(name, value)
  }
  return el
}

function arrow(direction: TArrowDirection, axis: TArrowAxis): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute(
    'class',
    `arts-cursor__arrow arts-cursor__arrow_${axis} arts-cursor__arrow_${direction}`
  )
  svg.setAttribute('viewBox', '0 0 24 24')
  const path = document.createElementNS(SVG_NS, 'path')
  path.setAttribute('d', 'M4 14 L12 6 L20 14')
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke', 'currentColor')
  path.setAttribute('stroke-width', '2')
  path.setAttribute('stroke-linecap', 'round')
  path.setAttribute('stroke-linejoin', 'round')
  if (direction !== 'up') {
    path.setAttribute('transform', `rotate(${ARROW_ROTATION[direction]} 12 12)`)
  }
  svg.appendChild(path)
  return svg
}

function spinner(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('class', 'arts-cursor__spinner')
  svg.setAttribute('viewBox', '0 0 50 50')
  const circle = document.createElementNS(SVG_NS, 'circle')
  circle.setAttribute('fill', 'none')
  circle.setAttribute('cx', '25')
  circle.setAttribute('cy', '25')
  circle.setAttribute('r', '24')
  svg.appendChild(circle)
  return svg
}
