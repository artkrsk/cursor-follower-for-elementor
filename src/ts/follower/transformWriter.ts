import type { ITransformWriter } from '../interfaces'
import { round1, round3 } from '../utils'

/**
 * Transform writes on the cursor root.
 *
 * The JS-driven motion (position + elastic squash) is ONE `transform` value
 * on the root: translate · [R(θ)·S·R(−θ)] — the squash and its
 * counter-rotation folded into a single symmetric matrix, so no child element
 * is ever written on the frame path (a per-frame write to the non-promoted
 * wrapper used to re-raster the whole cursor layer). Where CSS Typed OM is
 * available (Chromium/WebKit) the components are preallocated and mutated in
 * place — zero strings, zero parsing on the hot path. Trap: the
 * CSSMatrixComponent constructor COPIES the DOMMatrix it is given; the live
 * object is the one behind `.matrix` (a stable reference), which is what gets
 * mutated each frame. Engines without Typed OM (stable Firefox at the time of
 * writing) fall back to transform strings. Sub-precision deltas are skipped.
 *
 * setTranslate and setElastic only update components and mark dirty; flush()
 * commits once per frame. So a frame that moves the cursor AND squashes it — the
 * common case — costs a single attributeStyleMap.set (or one string write on the
 * fallback), not two, and an idle-but-subscribed frame writes nothing at all.
 */

const supportsTypedOM = (el: HTMLElement) =>
  typeof el.attributeStyleMap !== 'undefined' &&
  typeof CSSTransformValue === 'function' &&
  typeof CSSTranslate === 'function' &&
  typeof CSSMatrixComponent === 'function' &&
  typeof CSSUnitValue === 'function'

/** Preallocated Typed OM value tree — mutated in place, committed as a whole. */
const createTypedTarget = (root: HTMLElement) => {
  const tx = new CSSUnitValue(0, 'px')
  const ty = new CSSUnitValue(0, 'px')
  const component = new CSSMatrixComponent(new DOMMatrix())
  const transform = new CSSTransformValue([new CSSTranslate(tx, ty), component])
  return {
    tx,
    ty,
    matrix: component.matrix,
    commit: () => root.attributeStyleMap.set('transform', transform)
  }
}

export function createTransformWriter(root: HTMLElement): ITransformWriter {
  let lastX = Number.NaN
  let lastY = Number.NaN
  let lastA = 1
  let lastB = 0
  let lastD = 1
  let dirty = false

  const typed = supportsTypedOM(root) ? createTypedTarget(root) : null
  // NaN guard covers the degenerate flush-before-first-setTranslate; the pipeline
  // always renders position before elastic, so in practice lastX/Y are real here.
  const apply = typed
    ? () => {
        typed.tx.value = Number.isNaN(lastX) ? 0 : lastX
        typed.ty.value = Number.isNaN(lastY) ? 0 : lastY
        typed.matrix.a = lastA
        typed.matrix.b = lastB
        typed.matrix.c = lastB
        typed.matrix.d = lastD
        typed.commit()
      }
    : () => {
        const x = Number.isNaN(lastX) ? 0 : lastX
        const y = Number.isNaN(lastY) ? 0 : lastY
        root.style.transform = `translate(${x}px, ${y}px) matrix(${lastA}, ${lastB}, ${lastB}, ${lastD}, 0, 0)`
      }

  return {
    setTranslate(x, y) {
      const rx = round1(x)
      const ry = round1(y)
      if (rx === lastX && ry === lastY) {
        return
      }
      lastX = rx
      lastY = ry
      dirty = true
    },
    setElastic(scaleX, scaleY, cos, sin) {
      const a = round3(scaleX * cos * cos + scaleY * sin * sin)
      const b = round3((scaleX - scaleY) * sin * cos)
      const d = round3(scaleX * sin * sin + scaleY * cos * cos)
      if (a === lastA && b === lastB && d === lastD) {
        return
      }
      lastA = a
      lastB = b
      lastD = d
      dirty = true
    },
    resetElastic() {
      this.setElastic(1, 1, 1, 0)
    },
    flush() {
      if (!dirty) {
        return
      }
      dirty = false
      apply()
    }
  }
}
