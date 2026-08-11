// @vitest-environment happy-dom

import { createTransformWriter } from '@ts/follower/transformWriter'
import type { ITransformWriter } from '@ts/interfaces'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Most suites run the string fallback — the path stable Firefox takes — because
 * no non-browser DOM implements CSS Typed OM, so `supportsTypedOM` answers false
 * by default. The matrix maths and the sub-precision dedupe are shared between
 * both paths, so the fallback exercises them; the typed commit mechanism is
 * driven by the stub constructors below, whose one load-bearing semantic is the
 * CSSMatrixComponent copy trap the module header documents. The docs site stays
 * the check against the real browser API.
 *
 * setTranslate/setElastic only mark dirty now — flush() is the write — so every
 * assertion on the transform follows a flush.
 */

let root: HTMLElement

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>'
  root = document.getElementById('root') as HTMLElement
})

describe('setTranslate', () => {
  it('writes position and identity squash as one transform on flush', () => {
    const writer = createTransformWriter(root)
    writer.setTranslate(10, 20)
    writer.flush()

    expect(root.style.transform).toBe('translate(10px, 20px) matrix(1, 0, 0, 1, 0, 0)')
  })

  it('rounds to a tenth of a pixel', () => {
    const writer = createTransformWriter(root)
    writer.setTranslate(10.04, 20.06)
    writer.flush()

    expect(root.style.transform).toContain('translate(10px, 20.1px)')
  })

  /** The dedupe is what keeps an idle-but-subscribed frame free of style writes. */
  it('skips a write the rounding made identical', () => {
    const writer = createTransformWriter(root)
    writer.setTranslate(10, 20)
    writer.flush()
    root.style.transform = 'sentinel'

    writer.setTranslate(10.01, 20.02)
    writer.flush()

    expect(root.style.transform).toBe('sentinel')
  })

  it('writes again as soon as the rounded position actually moves', () => {
    const writer = createTransformWriter(root)
    writer.setTranslate(10, 20)
    writer.flush()
    root.style.transform = 'sentinel'

    writer.setTranslate(10.1, 20)
    writer.flush()

    expect(root.style.transform).toContain('translate(10.1px, 20px)')
  })
})

describe('setElastic', () => {
  /** Along the x axis (cos 1, sin 0) the matrix is a plain axis-aligned scale. */
  it('folds an axis-aligned squash into the diagonal', () => {
    const writer = createTransformWriter(root)
    writer.setTranslate(0, 0)
    writer.setElastic(1.2, 0.8, 1, 0)
    writer.flush()

    expect(root.style.transform).toContain('matrix(1.2, 0, 0, 0.8, 0, 0)')
  })

  /** The matrix is quadratic in the direction vector, so a flipped sign has to
      produce exactly the same squash — that is why the writer takes a vector
      rather than an angle. The second setElastic dedupes (identical a/b/d), which
      IS the proof the values matched, so the flush leaves the transform untouched. */
  it('is invariant to the sign of the direction vector', () => {
    const writer = createTransformWriter(root)
    writer.setTranslate(0, 0)
    writer.setElastic(1.2, 0.8, 0.6, 0.8)
    writer.flush()
    const forward = root.style.transform

    writer.setElastic(1.2, 0.8, -0.6, -0.8)
    writer.flush()

    expect(root.style.transform).toBe(forward)
  })

  it('stays symmetric — b and c are the same term', () => {
    const writer = createTransformWriter(root)
    writer.setTranslate(0, 0)
    writer.setElastic(1.5, 0.5, 0.6, 0.8)
    writer.flush()

    const [, a, b, c] = /matrix\(([^,]+), ([^,]+), ([^,]+),/.exec(root.style.transform) ?? []
    expect(b).toBe(c)
    expect(a).not.toBe(b)
  })

  it('skips a write when the rounded matrix has not changed', () => {
    const writer = createTransformWriter(root)
    writer.setElastic(1.2, 0.8, 1, 0)
    writer.flush()
    root.style.transform = 'sentinel'

    writer.setElastic(1.2, 0.8, 1, 0)
    writer.flush()

    expect(root.style.transform).toBe('sentinel')
  })

  it('returns to the identity matrix on reset, keeping the position', () => {
    const writer = createTransformWriter(root)
    writer.setTranslate(5, 6)
    writer.setElastic(1.2, 0.8, 1, 0)
    writer.resetElastic()
    writer.flush()

    expect(root.style.transform).toBe('translate(5px, 6px) matrix(1, 0, 0, 1, 0, 0)')
  })
})

describe('the CSS Typed OM path', () => {
  class FakeDOMMatrix {
    a = 1
    b = 0
    c = 0
    d = 1
  }
  class FakeCSSUnitValue {
    value: number
    unit: string
    constructor(value: number, unit: string) {
      this.value = value
      this.unit = unit
    }
  }
  class FakeCSSTranslate {
    x: FakeCSSUnitValue
    y: FakeCSSUnitValue
    constructor(x: FakeCSSUnitValue, y: FakeCSSUnitValue) {
      this.x = x
      this.y = y
    }
  }
  /** Copies its source like the real constructor — the live matrix is the one
      behind `.matrix`, which is the trap the writer's header documents. */
  class FakeCSSMatrixComponent {
    matrix: FakeDOMMatrix
    constructor(source: FakeDOMMatrix) {
      this.matrix = Object.assign(new FakeDOMMatrix(), source)
    }
  }
  class FakeCSSTransformValue {
    parts: [FakeCSSTranslate, FakeCSSMatrixComponent]
    constructor(parts: [FakeCSSTranslate, FakeCSSMatrixComponent]) {
      this.parts = parts
    }
  }

  /** Makes `supportsTypedOM` answer true and captures every commit. Relies on
      the config's `unstubGlobals: true` for teardown. */
  const enableTypedOM = () => {
    vi.stubGlobal('CSSTransformValue', FakeCSSTransformValue)
    vi.stubGlobal('CSSTranslate', FakeCSSTranslate)
    vi.stubGlobal('CSSMatrixComponent', FakeCSSMatrixComponent)
    vi.stubGlobal('CSSUnitValue', FakeCSSUnitValue)
    vi.stubGlobal('DOMMatrix', FakeDOMMatrix)
    const set = vi.fn<(prop: string, value: FakeCSSTransformValue) => void>()
    Object.defineProperty(root, 'attributeStyleMap', { value: { set }, configurable: true })
    return set
  }

  const committed = (set: ReturnType<typeof enableTypedOM>) =>
    set.mock.calls[set.mock.calls.length - 1]?.[1] as FakeCSSTransformValue

  it('commits through attributeStyleMap and never builds a transform string', () => {
    const set = enableTypedOM()
    const writer = createTransformWriter(root)

    writer.setTranslate(10.04, 20.06)
    writer.setElastic(1.2, 0.8, 1, 0)
    writer.flush()

    expect(set).toHaveBeenCalledExactlyOnceWith('transform', expect.any(FakeCSSTransformValue))
    expect(root.style.transform).toBe('')
    const [translate, component] = committed(set).parts
    expect(translate.x.value).toBe(10)
    expect(translate.y.value).toBe(20.1)
    expect(component.matrix).toMatchObject({ a: 1.2, b: 0, c: 0, d: 0.8 })
  })

  /** Zero allocation per frame: the same preallocated value tree is mutated in
      place and re-committed, never rebuilt. */
  it('mutates the one preallocated value tree across flushes', () => {
    const set = enableTypedOM()
    const writer = createTransformWriter(root)
    writer.setTranslate(1, 2)
    writer.flush()
    const first = committed(set)

    writer.setTranslate(30, 40)
    writer.flush()

    expect(set).toHaveBeenCalledTimes(2)
    expect(committed(set)).toBe(first)
    expect(first.parts[0].x.value).toBe(30)
  })

  /** The header's trap: CSSMatrixComponent COPIES the DOMMatrix it is given, so
      writing the seed instead of `.matrix` would leave the committed matrix at
      identity. b lands in both off-diagonal cells — the squash is symmetric. */
  it('writes the copied matrix the component holds, not the seed it was built from', () => {
    const set = enableTypedOM()
    const writer = createTransformWriter(root)

    writer.setTranslate(0, 0)
    writer.setElastic(1.5, 0.5, 0.6, 0.8)
    writer.flush()

    const matrix = committed(set).parts[1].matrix
    expect(matrix.a).not.toBe(1)
    expect(matrix.b).toBe(matrix.c)
    expect(matrix.b).not.toBe(0)
  })

  /** The degenerate flush-before-first-setTranslate: the NaN sentinel must not
      reach the unit values. */
  it('zeroes an unset translate instead of committing NaN', () => {
    const set = enableTypedOM()
    const writer = createTransformWriter(root)

    writer.setElastic(1.2, 0.8, 1, 0)
    writer.flush()

    const [translate] = committed(set).parts
    expect(translate.x.value).toBe(0)
    expect(translate.y.value).toBe(0)
  })

  it('writes nothing on a clean flush', () => {
    const set = enableTypedOM()
    const writer = createTransformWriter(root)
    writer.setTranslate(1, 2)
    writer.flush()

    writer.flush()

    expect(set).toHaveBeenCalledOnce()
  })
})

describe('flush', () => {
  /** A translate and an elastic change in the same frame — the common case — must
      commit as ONE write, which is the whole point of deferring to flush. */
  it('commits translate and elastic from one frame as a single write', () => {
    let writes = 0
    let committed = ''
    const counting = {
      style: {
        get transform() {
          return committed
        },
        set transform(v: string) {
          writes++
          committed = v
        }
      }
    } as unknown as HTMLElement
    const writer = createTransformWriter(counting)

    writer.setTranslate(10, 20)
    writer.setElastic(1.2, 0.8, 1, 0)
    writer.flush()

    expect(writes).toBe(1)
    expect(committed).toBe('translate(10px, 20px) matrix(1.2, 0, 0, 0.8, 0, 0)')
  })

  /** An idle-but-subscribed frame: nothing changed, so flush writes nothing. */
  it('writes nothing when nothing is dirty', () => {
    const writer: ITransformWriter = createTransformWriter(root)
    root.style.transform = 'sentinel'

    writer.flush()

    expect(root.style.transform).toBe('sentinel')
  })
})
