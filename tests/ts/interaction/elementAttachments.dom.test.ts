// @vitest-environment happy-dom
import { createCursor } from '@ts/core/createCursor'
import { layoutReplica } from '@ts/follower/elementLayer'
import type { ICursorElementFrame, ICursorElementOptions, ICursorFollower } from '@ts/interfaces'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeTicker } from '../support'

const cursors: ICursorFollower[] = []
let homeX = 100
let homeY = 100

beforeEach(() => {
  homeX = homeY = 100
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement
  ) {
    if (this.classList.contains('badge')) return new DOMRect(homeX, homeY, 100, 60)
    return new DOMRect(0, 0, 600, 400)
  })
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
    this: HTMLElement
  ) {
    return this.classList.contains('badge') ? 100 : 600
  })
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (
    this: HTMLElement
  ) {
    return this.classList.contains('badge') ? 60 : 400
  })
})
afterEach(() => {
  for (const cursor of cursors.splice(0)) cursor.destroy()
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

function fixture(over: Partial<ICursorElementOptions> = {}) {
  const ticker = fakeTicker()
  const cursor = createCursor({
    ticker: ticker.adapter,
    trailing: 1,
    elastic: false,
    animation: { duration: 0.2 }
  })
  cursors.push(cursor)
  cursor.init()
  const host = document.createElement('div')
  host.innerHTML =
    '<a class="item"><span class="badge" id="original">Play</span></a><a class="item">Other</a>'
  document.body.append(host)
  const element = host.querySelector<HTMLElement>('.badge') as HTMLElement
  const first = host.firstElementChild as HTMLElement
  const second = host.lastElementChild as HTMLElement
  vi.spyOn(document, 'elementFromPoint').mockReturnValue(first)
  const attachment = cursor.attachElement({ element, trigger: host, offset: [0, 0], ...over })
  const frames: { x: number; y: number; reveal: number }[] = []
  attachment.on('frame', (frame) =>
    frames.push({ x: frame.position.x, y: frame.position.y, reveal: frame.reveal })
  )
  const move = (x: number, y: number, target: HTMLElement = first, type = 'mouse') => {
    target.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, clientX: x, clientY: y, pointerType: type })
    )
  }
  return { ticker, cursor, host, element, first, second, attachment, frames, move }
}

describe('element attachments', () => {
  it('moves the original node, preserves the layout slot, and composes full-graphic hiding', () => {
    const f = fixture()
    const under = f.cursor.set({ hidden: false, label: 'Still here', arrows: 'all' })
    f.move(400, 300)
    f.ticker.step()
    expect(f.element.closest('.arts-cursor-element-layer')).not.toBeNull()
    expect(f.first.querySelector('[data-cursor-element-placeholder]')).not.toBeNull()
    expect(document.querySelectorAll('#original')).toHaveLength(1)
    expect(f.cursor.el?.hasAttribute('data-cursor-hidden')).toBe(true)
    expect(f.frames.at(-1)).toEqual({ x: 400, y: 300, reveal: 1 })
    f.attachment.pause()
    expect(f.cursor.el?.hasAttribute('data-cursor-hidden')).toBe(false)
    f.ticker.step(200)
    expect(f.element.parentElement).toBe(f.first)
    expect(f.host.querySelector('.arts-cursor-element-layer')).toBeNull()
    under.release()
  })

  it('collapses toward the live home rather than freezing at the pointer', () => {
    const f = fixture()
    f.move(500, 350)
    f.ticker.step()
    f.attachment.hide()
    f.ticker.step(100)
    const mid = f.frames.at(-1)
    expect(mid?.x).toBeLessThan(500)
    expect(mid?.x).toBeGreaterThan(150)
    expect(mid?.reveal).toBeGreaterThanOrEqual(0)
    expect(mid?.reveal).toBeLessThan(1)
    homeX = 250
    homeY = 200
    f.ticker.step(100)
    expect(f.frames.at(-1)).toEqual({ x: 300, y: 230, reveal: 0 })
    expect(f.element.parentElement).toBe(f.first)
    expect(f.element.style.visibility).toBe('hidden')
    f.attachment.show()
    f.ticker.step(200)
    expect(f.frames.at(-1)).toEqual({ x: 300, y: 230, reveal: 1 })
    expect(f.attachment.following).toBe(false)
    f.cursor.refresh()
    expect(f.attachment.following).toBe(false)
    f.move(400, 300)
    expect(f.attachment.following).toBe(true)
  })

  it('can collapse in place without returning to home', () => {
    const f = fixture()
    f.move(500, 350)
    f.ticker.step()
    f.attachment.hide({ position: 'current' })
    f.ticker.step(100)
    expect(f.frames.at(-1)).toMatchObject({ x: 500, y: 350 })
    expect(f.frames.at(-1)?.reveal).toBeGreaterThan(0)
    expect(f.frames.at(-1)?.reveal).toBeLessThan(1)
    f.ticker.step(100)
    expect(f.element.parentElement).toBe(f.first)
    expect(f.element.style.visibility).toBe('hidden')
  })

  it('retargets an interrupted collapse without jumping to home', () => {
    const f = fixture()
    f.move(500, 350)
    f.ticker.step()
    f.attachment.hide()
    f.ticker.step(60)
    const before = f.frames.at(-1)
    f.attachment.show()
    f.ticker.step(0)
    expect(f.frames.at(-1)).toEqual(before)
    f.ticker.step(200)
    expect(f.element.parentElement).toBe(f.first)
  })

  it('does not restart a preview reveal on every pointer move', () => {
    const f = fixture({ rest: 'hidden' })
    f.move(400, 300)
    f.ticker.step(100)
    f.move(420, 300)
    f.ticker.step(100)
    expect(f.frames.at(-1)?.reveal).toBe(1)
    f.attachment.pause()
    f.ticker.step(100)
    expect(f.frames.at(-1)?.x).toBe(420)
    f.ticker.step(100)
    expect(f.element.style.visibility).toBe('hidden')
  })

  it('shares a preview across delegated targets and aborts stale content work', () => {
    const f = fixture()
    f.attachment.destroy()
    const attachment = f.cursor.attachElement({
      element: f.element,
      trigger: { root: f.host, selector: '.item' },
      rest: 'hidden'
    })
    const enter = vi.fn()
    const leave = vi.fn()
    let signal: AbortSignal | undefined
    attachment.on('enter', (frame) => {
      signal = frame.signal
      enter()
    })
    attachment.on('leave', leave)
    const change = vi.fn()
    attachment.on('target:change', change)
    f.move(400, 300)
    f.ticker.step()
    f.move(430, 300, f.second)
    expect(signal?.aborted).toBe(true)
    expect(enter).toHaveBeenCalledOnce()
    expect(change).toHaveBeenCalledOnce()
    expect(change.mock.calls[0]?.[1]).toBe(f.first)
    expect(leave).not.toHaveBeenCalled()
    const added = document.createElement('a')
    added.className = 'item'
    f.host.append(added)
    f.move(440, 300, added)
    expect(change).toHaveBeenCalledTimes(2)
  })

  it('coalesces raw movement and exposes progress independently of trailing', () => {
    const f = fixture({ trailing: 0.2 })
    let sample: ICursorElementFrame | undefined
    const moves = vi.fn((frame: ICursorElementFrame) => {
      sample = frame
    })
    f.attachment.on('move', moves)
    f.move(300, 200)
    f.ticker.step()
    f.move(450, 100)
    f.move(600, 400)
    f.ticker.step()
    expect(moves).toHaveBeenCalledOnce()
    expect(sample?.pointer).toEqual({ x: 600, y: 400 })
    expect(sample?.progress).toEqual({ x: 1, y: 1 })
    expect(sample?.delta).toEqual({ x: 300, y: 200 })
    expect(sample?.position.x).toBeLessThan(600)
  })

  it('inherits live instance motion and respects attachment overrides', () => {
    const f = fixture()
    f.cursor.updateOptions({ trailing: 0.5 })
    f.move(450, 330)
    f.ticker.step()
    expect(f.frames.at(-1)?.x).toBe(300)
    f.cursor.updateOptions({ trailing: 1 })
    f.ticker.step()
    expect(f.frames.at(-1)?.x).toBe(450)
  })

  it('can suppress without following and can follow without suppressing', () => {
    const f = fixture({ follow: false })
    f.move(400, 300)
    expect(f.attachment.following).toBe(false)
    expect(f.element.parentElement).toBe(f.first)
    expect(f.cursor.el?.hasAttribute('data-cursor-hidden')).toBe(true)
    f.attachment.destroy()
    f.cursor.attachElement({ element: f.element, trigger: f.host, cursor: false })
    f.move(400, 300)
    expect(f.cursor.el?.hasAttribute('data-cursor-hidden')).toBe(false)
  })

  it('ignores touch and releases on iframe entry and blur', () => {
    const f = fixture()
    f.move(400, 300, f.first, 'touch')
    expect(f.attachment.following).toBe(false)
    f.move(400, 300)
    const iframe = document.createElement('iframe')
    f.host.append(iframe)
    f.move(400, 300, iframe)
    expect(f.cursor.el?.hasAttribute('data-cursor-hidden')).toBe(false)
    f.move(400, 300)
    window.dispatchEvent(new Event('blur'))
    expect(f.element.parentElement).toBe(f.first)
    expect(f.cursor.el?.hasAttribute('data-cursor-hidden')).toBe(false)
  })

  it('stops callbacks on silent teardown while leaving outgoing local DOM untouched', () => {
    const f = fixture()
    f.move(400, 300)
    f.ticker.step()
    const parent = f.element.parentNode
    const html = f.host.innerHTML
    const frame = vi.fn()
    f.attachment.on('frame', frame)
    f.attachment.destroy(false)
    f.ticker.step()
    expect(f.host.innerHTML).toBe(html)
    expect(f.element.parentNode).toBe(parent)
    expect(frame).not.toHaveBeenCalled()
    expect(f.cursor.el?.hasAttribute('data-cursor-hidden')).toBe(false)
  })

  it('restores authored inline properties and supports idempotent disposal', () => {
    const f = fixture()
    f.attachment.destroy()
    f.element.style.setProperty('scale', '.8', 'important')
    const attachment = f.cursor.attachElement({ element: f.element, trigger: f.host })
    f.move(400, 300)
    attachment.destroy()
    attachment.destroy()
    expect(f.element.style.scale).toBe('.8')
    expect(f.element.style.getPropertyPriority('scale')).toBe('important')
    expect(f.element.parentElement).toBe(f.first)
  })

  it('rejects duplicate ownership of the same node', () => {
    const f = fixture()
    expect(() => f.cursor.attachElement({ element: f.element, trigger: f.host })).toThrow('already')
  })

  it('docks immediately for reduced motion and releases on capability loss', () => {
    const fine = Object.assign(new EventTarget(), { matches: true })
    const reduced = Object.assign(new EventTarget(), { matches: false })
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) => (query.includes('prefers-reduced-motion') ? reduced : fine) as MediaQueryList
    )
    const f = fixture()
    f.move(400, 300)
    f.ticker.step()
    reduced.matches = true
    reduced.dispatchEvent(new Event('change'))
    expect(f.attachment.following).toBe(false)
    expect(f.element.parentElement).toBe(f.first)
    fine.matches = false
    fine.dispatchEvent(Object.assign(new Event('change'), { matches: false }))
    expect(f.cursor.enabled).toBe(false)
    expect(f.cursor.el?.hasAttribute('data-cursor-hidden')).toBe(false)
  })

  it('gives the deepest trigger ownership and does not release another attachment', () => {
    const f = fixture()
    f.move(400, 300)
    const inner = document.createElement('span')
    f.first.append(inner)
    const attachment = f.cursor.attachElement({ element: inner, trigger: f.first })
    f.move(400, 300)
    expect(f.attachment.following).toBe(false)
    expect(attachment.following).toBe(true)
    f.attachment.pause()
    expect(f.cursor.el?.hasAttribute('data-cursor-hidden')).toBe(true)
    attachment.pause()
    expect(f.cursor.el?.hasAttribute('data-cursor-hidden')).toBe(false)
  })

  it('removes external overlays even during silent teardown', () => {
    const f = fixture({ container: document.body })
    f.move(400, 300)
    f.ticker.step()
    expect(document.body.querySelector('.arts-cursor-element-layer')).not.toBeNull()
    f.attachment.destroy(false)
    expect(document.body.querySelector('.arts-cursor-element-layer')).toBeNull()
  })

  it('allows destruction from an entry hook without creating a zombie layer', () => {
    const f = fixture({ rest: 'hidden' })
    f.attachment.on('enter', () => f.attachment.destroy())
    f.move(400, 300)
    f.ticker.step()
    expect(f.host.querySelector('.arts-cursor-element-layer')).toBeNull()
    expect(f.cursor.el?.hasAttribute('data-cursor-hidden')).toBe(false)
  })

  it('custom reveal leaves media transforms to the consumer', () => {
    const f = fixture({ rest: 'hidden', reveal: 'custom' })
    const image = document.createElement('img')
    image.style.transform = 'scale(1.8)'
    f.element.append(image)
    f.move(400, 300)
    f.ticker.step(100)
    expect(image.style.transform).toBe('scale(1.8)')
    expect(f.element.parentElement?.style.scale).toBe('1 1')
    expect(f.frames.at(-1)?.reveal).toBeGreaterThan(0)
  })

  it('sanitizes identity, inline handlers and discovery hooks on layout replicas', () => {
    const element = document.createElement('span')
    element.innerHTML =
      '<span id="icon" data-arts-component-name="Button" onclick="bad()" class="icon js-icon">Text</span>'
    const copy = layoutReplica(element)
    expect(copy.querySelector('[id], [onclick], [data-arts-component-name], .js-icon')).toBeNull()
    expect(copy.textContent).toBe('Text')
    expect(copy.hasAttribute('inert')).toBe(true)
  })
})
