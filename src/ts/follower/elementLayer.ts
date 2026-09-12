import type { ICursorElementOptions } from '../interfaces'
import { createTransformWriter } from './transformWriter'

/** Remove identity/activation channels from the invisible layout replica. */
export function layoutReplica(element: HTMLElement): HTMLElement {
  // Template contents are inert: sanitize before custom elements can upgrade.
  const template = document.createElement('template')
  template.innerHTML = element.outerHTML
  const replica = template.content.firstElementChild as HTMLElement
  for (const node of [...replica.querySelectorAll('script, style, link, iframe, object, embed')])
    node.remove()
  for (const node of [...replica.querySelectorAll('*')]) {
    if (!node.tagName.includes('-')) continue
    const replacement = document.createElement('span')
    for (const attribute of [...node.attributes])
      replacement.setAttribute(attribute.name, attribute.value)
    replacement.append(...node.childNodes)
    node.replaceWith(replacement)
  }
  for (const node of [replica, ...replica.querySelectorAll('*')]) {
    for (const attribute of [...node.attributes]) {
      if (
        /^(id|name|href|tabindex|autoplay|is)$/i.test(attribute.name) ||
        /^(on|data-)/i.test(attribute.name)
      )
        node.removeAttribute(attribute.name)
    }
    for (const name of [...node.classList]) if (name.startsWith('js-')) node.classList.remove(name)
    if (node.tagName === 'VIDEO' || node.tagName === 'AUDIO' || node.tagName === 'SOURCE') {
      node.removeAttribute('src')
    }
  }
  replica.setAttribute('aria-hidden', 'true')
  replica.setAttribute('inert', '')
  replica.setAttribute('data-cursor-element-placeholder', '')
  replica.style.setProperty('visibility', 'hidden', 'important')
  replica.style.setProperty('pointer-events', 'none', 'important')
  return replica
}

/** Local coordinates outside the source clip; the real content keeps its identity. */
export function createElementLayer(options: ICursorElementOptions) {
  const { element } = options
  const scope = 'root' in options.trigger ? options.trigger.root : options.trigger
  const container = options.container ?? scope
  const home = options.rest !== 'hidden'
  const [ax, ay] = options.anchor ?? [0.5, 0.5]
  const parent = element.parentNode
  const next = element.nextSibling
  const names = [
    'position',
    'left',
    'right',
    'top',
    'bottom',
    'inset-inline-start',
    'inset-inline-end',
    'inset-block-start',
    'inset-block-end',
    'margin',
    'translate',
    'transform',
    'transform-origin',
    'scale',
    'visibility',
    'pointer-events',
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left'
  ]
  const initial = names.map(
    (name) =>
      [name, element.style.getPropertyValue(name), element.style.getPropertyPriority(name)] as const
  )
  const initialHidden = element.hasAttribute('hidden')
  let layer: HTMLElement | null = null
  let placeholder: HTMLElement | null = null
  let motion: HTMLElement | null = null
  let appearance: HTMLElement | null = null
  let writer: ReturnType<typeof createTransformWriter> | null = null
  let observer: MutationObserver | null = null
  const box = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    scaleX: 1,
    scaleY: 1,
    left: 0,
    top: 0,
    layerX: 1,
    layerY: 1
  }

  const restoreStyles = () => {
    for (const [name, value, priority] of initial) element.style.setProperty(name, value, priority)
  }
  const measure = () => {
    const source = placeholder ?? element
    const rect = source.getBoundingClientRect()
    box.x = rect.left + rect.width * ax
    box.y = rect.top + rect.height * ay
    box.width = source.offsetWidth
    box.height = source.offsetHeight
    if (home || !layer) {
      box.scaleX = rect.width / (box.width || 1) || 1
      box.scaleY = rect.height / (box.height || 1) || 1
    }
    if (layer) {
      const bounds = layer.getBoundingClientRect()
      box.left = bounds.left
      box.top = bounds.top
      box.layerX = bounds.width / (layer.offsetWidth || 1) || 1
      box.layerY = bounds.height / (layer.offsetHeight || 1) || 1
    }
    return box
  }
  const dock = () => {
    observer?.disconnect()
    observer = null
    if (layer) {
      if (placeholder?.parentNode) placeholder.replaceWith(element)
      else if (parent) parent.insertBefore(element, next?.parentNode === parent ? next : null)
      else element.remove()
      layer.remove()
    }
    placeholder = null
    layer = null
    motion = null
    appearance = null
    writer = null
    restoreStyles()
    element.toggleAttribute('hidden', initialHidden)
  }

  return {
    measure,
    get box() {
      return box
    },
    get floating() {
      return layer !== null
    },
    get writer() {
      return writer
    },
    float() {
      if (layer) return
      element.removeAttribute('hidden')
      measure()
      if (home && element.parentNode) {
        placeholder = layoutReplica(element)
        element.replaceWith(placeholder)
        observer = new MutationObserver(() => {
          if (!placeholder) return
          const copy = layoutReplica(element)
          placeholder.replaceChildren(...copy.childNodes)
        })
        observer.observe(element, { childList: true, characterData: true, subtree: true })
      }
      layer = document.createElement('span')
      layer.className = 'arts-cursor-element-layer'
      layer.setAttribute('aria-hidden', 'true')
      layer.setAttribute('inert', '')
      layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2;'
      motion = document.createElement('span')
      motion.style.cssText =
        'position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0;pointer-events:none;will-change:transform;'
      appearance = document.createElement('span')
      appearance.style.cssText =
        'position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0;pointer-events:none;'
      layer.append(motion)
      container.append(layer)
      motion.append(appearance)
      appearance.append(element)
      element.style.setProperty('position', 'absolute')
      element.style.setProperty('inset-inline-start', 'auto')
      element.style.setProperty('inset-inline-end', 'auto')
      element.style.setProperty('inset-block-start', 'auto')
      element.style.setProperty('inset-block-end', 'auto')
      element.style.setProperty('left', '0px')
      element.style.setProperty('top', '0px')
      element.style.setProperty('right', 'auto')
      element.style.setProperty('bottom', 'auto')
      element.style.setProperty('margin', '0')
      element.style.setProperty('translate', `${-ax * 100}% ${-ay * 100}%`)
      element.style.setProperty('transform', 'none')
      element.style.setProperty('scale', '1')
      element.style.setProperty('visibility', 'visible')
      element.style.setProperty('transform-origin', `${ax * 100}% ${ay * 100}%`)
      element.style.setProperty('pointer-events', 'none')
      writer = createTransformWriter(motion)
      measure()
    },
    render(x: number, y: number, reveal: number) {
      if (!motion || !appearance || !writer) return
      // Cancel the local layer's scale BEFORE the viewport-space motion matrix.
      motion.style.scale = `${1 / box.layerX} ${1 / box.layerY}`
      writer.setTranslate(x - box.left, y - box.top)
      const scale = options.reveal === 'custom' ? 1 : Math.max(0, reveal)
      appearance.style.scale = `${box.scaleX * scale} ${box.scaleY * scale}`
      appearance.style.visibility = reveal > 0 ? 'visible' : 'hidden'
      writer.flush()
    },
    dock,
    visibility(visible: boolean) {
      if (visible) {
        for (const [name, value, priority] of initial) {
          if (name === 'visibility') element.style.setProperty(name, value, priority)
        }
      } else element.style.setProperty('visibility', 'hidden')
    },
    destroy(revert: boolean) {
      observer?.disconnect()
      if (revert) dock()
      else if (!scope.contains(container)) layer?.remove()
      layer = null
      motion = null
      appearance = null
      writer = null
      placeholder = null
    }
  }
}
