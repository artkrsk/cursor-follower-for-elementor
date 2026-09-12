import type { ICursorElementAttachment, ICursorElementFrame, ICursorFollower } from '@engine'

/** Consumer-owned content. No image selection or media rendering in the cursor API. */
export function installElementExamples(root: HTMLElement, cursor: ICursorFollower): () => void {
  const lifecycle = new AbortController()
  const attachments: ICursorElementAttachment[] = []
  for (const trigger of root.querySelectorAll<HTMLElement>('.element-home-card')) {
    const element = trigger.querySelector<HTMLElement>('.element-badge')
    if (!element) continue
    const attachment = cursor.attachElement({ element, trigger })
    attachments.push(attachment)
    trigger.addEventListener('click', () => attachment.hide(), { signal: lifecycle.signal })
  }
  root.querySelector('.element-restore')?.addEventListener(
    'click',
    () => {
      for (const attachment of attachments) attachment.show()
    },
    { signal: lifecycle.signal }
  )

  for (const region of root.querySelectorAll<HTMLElement>('.element-preview-example')) {
    const panel = region.querySelector<HTMLElement>('.element-preview')
    const content = region.querySelector<HTMLElement>('.element-preview-content')
    if (!panel || !content) continue
    const images = ['#d4b79b', '#98afa2', '#b8bac5', '#c0a778'].map((color, index) => {
      const image = document.createElement('img')
      image.alt = ''
      image.src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220"><rect width="320" height="220" fill="${color}"/><rect x="${30 + index * 25}" y="35" width="160" height="160" fill="#f0e9dd"/><path d="M0 220L160 120L320 220" fill="#36483d"/><circle cx="250" cy="50" r="22" fill="#faf1d0"/></svg>`)}`
      content.append(image)
      return image
    })
    const title = document.createElement('span')
    content.append(title)
    let index = 0
    let lastX = 0
    let lastY = 0
    const select = (next: number) => {
      index = next
      images.forEach((image, i) => {
        image.classList.toggle('is-current', i === next)
      })
    }
    const activate = (frame: ICursorElementFrame) => {
      title.textContent = frame.trigger?.textContent ?? ''
      lastX = frame.pointer.x
      lastY = frame.pointer.y
      select(0)
    }
    const attachment = cursor.attachElement({
      element: panel,
      trigger: { root: region, selector: '.element-preview-row' },
      rest: 'hidden',
      container: region,
      anchor: [0, 0],
      offset: [24, 16],
      elastic: false,
      reveal: 'custom'
    })
    attachment.on('enter', activate)
    attachment.on('target:change', activate)
    attachment.on('move', (frame) => {
      if (region.dataset.selection === 'scrub') {
        select(Math.min(images.length - 1, Math.floor(frame.progress.x * images.length)))
      } else if (
        Math.hypot(frame.pointer.x - lastX, frame.pointer.y - lastY) >
        window.innerWidth * 0.075
      ) {
        select((index + 1) % images.length)
        lastX = frame.pointer.x
        lastY = frame.pointer.y
      }
    })
    attachment.on('frame', ({ reveal }) => {
      // The cursor owns the OUTER motion. This consumer owns its INNER reveal.
      const inset = (1 - Math.min(1, reveal)) * 50
      content.style.clipPath = `inset(${inset}%)`
    })
    attachments.push(attachment)
  }
  return () => {
    lifecycle.abort()
    for (const attachment of attachments) attachment.destroy()
  }
}
