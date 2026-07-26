import {
  DEFAULT_CLICK_FACTOR,
  DEFAULT_ELASTIC_STRENGTH,
  DEFAULT_HIGHLIGHT_SIZE_PX,
  DEFAULT_MAGNETIC_RELEASE_RADIUS,
  DEFAULT_MAGNETIC_STRENGTH,
  DEFAULT_TRAILING
} from '@ts/constants'
import { mapKitSettings } from '@ts/kitSettings'
import { describe, expect, it } from 'vitest'

/**
 * What the editor bridge forwards is Elementor's raw control values — sliders as
 * `{ size, unit }`, switchers as 'yes' | '' — so this mapping is where the two
 * vocabularies meet. It has to survive a half-populated bag, because the editor
 * sends whatever the kit currently holds.
 */

describe('switchers', () => {
  it("enables a section only on the literal 'yes'", () => {
    expect(mapKitSettings({ arts_cursor_elastic_enabled: 'yes' }).elastic).not.toBe(false)
    expect(mapKitSettings({ arts_cursor_elastic_enabled: '' }).elastic).toBe(false)
    expect(mapKitSettings({}).elastic).toBe(false)
  })

  it('treats every section as off in an empty settings bag', () => {
    const options = mapKitSettings({})

    expect(options.elastic).toBe(false)
    expect(options.highlight).toBe(false)
    expect(options.clickScale).toBe(false)
  })

  it('is not fooled by truthy non-yes values', () => {
    expect(mapKitSettings({ arts_cursor_elastic_enabled: true }).elastic).toBe(false)
    expect(mapKitSettings({ arts_cursor_elastic_enabled: 1 }).elastic).toBe(false)
  })
})

describe('sliders', () => {
  it('unwraps the { size, unit } shape Elementor sends', () => {
    expect(mapKitSettings({ arts_cursor_trailing: { size: 0.4, unit: 'px' } }).trailing).toBe(0.4)
  })

  it('accepts a bare number too', () => {
    expect(mapKitSettings({ arts_cursor_trailing: 0.4 }).trailing).toBe(0.4)
  })

  it('falls back to the engine default when the value is unusable', () => {
    expect(mapKitSettings({ arts_cursor_trailing: 'nonsense' }).trailing).toBe(DEFAULT_TRAILING)
    expect(mapKitSettings({ arts_cursor_trailing: null }).trailing).toBe(DEFAULT_TRAILING)
    expect(mapKitSettings({ arts_cursor_trailing: Number.NaN }).trailing).toBe(DEFAULT_TRAILING)
    expect(mapKitSettings({}).trailing).toBe(DEFAULT_TRAILING)
  })

  /**
   * A cleared slider in the editor sends an empty size. Reading that as 0 would
   * set trailing to 0 and freeze the follower, and would disagree with the PHP
   * load path, whose is_numeric() check rejects a blank string.
   */
  it('falls back for a cleared slider rather than reading it as zero', () => {
    expect(mapKitSettings({ arts_cursor_trailing: { size: '', unit: 'px' } }).trailing).toBe(
      DEFAULT_TRAILING
    )
    expect(mapKitSettings({ arts_cursor_trailing: { size: '  ', unit: 'px' } }).trailing).toBe(
      DEFAULT_TRAILING
    )
    expect(mapKitSettings({ arts_cursor_trailing: { size: null, unit: 'px' } }).trailing).toBe(
      DEFAULT_TRAILING
    )
  })

  it('still honours a deliberate zero', () => {
    expect(mapKitSettings({ arts_cursor_trailing: { size: 0, unit: 'px' } }).trailing).toBe(0)
  })

  it('reads a numeric string from the size field', () => {
    expect(mapKitSettings({ arts_cursor_trailing: { size: '0.35', unit: 'px' } }).trailing).toBe(
      0.35
    )
  })
})

describe('section mapping', () => {
  it('maps elastic strength, defaulting the rest', () => {
    expect(
      mapKitSettings({
        arts_cursor_elastic_enabled: 'yes',
        arts_cursor_elastic_strength: { size: 2, unit: 'px' }
      }).elastic
    ).toEqual({ strength: 2 })

    expect(mapKitSettings({ arts_cursor_elastic_enabled: 'yes' }).elastic).toEqual({
      strength: DEFAULT_ELASTIC_STRENGTH
    })
  })

  it('maps both magnetic controls, always on', () => {
    expect(
      mapKitSettings({
        arts_cursor_magnetic_strength: { size: 0.5, unit: 'px' },
        arts_cursor_magnetic_release: { size: 200, unit: 'px' }
      }).magnetic
    ).toEqual({ strength: 0.5, releaseRadius: 200 })

    expect(mapKitSettings({}).magnetic).toEqual({
      strength: DEFAULT_MAGNETIC_STRENGTH,
      releaseRadius: DEFAULT_MAGNETIC_RELEASE_RADIUS
    })
  })

  /** The control is authored in px; the engine wants a size string. */
  it('stringifies the highlight size into the size grammar', () => {
    expect(
      mapKitSettings({
        arts_cursor_highlight_enabled: 'yes',
        arts_cursor_highlight_size: { size: 120, unit: 'px' }
      }).highlight
    ).toMatchObject({ scale: '120px' })

    expect(mapKitSettings({ arts_cursor_highlight_enabled: 'yes' }).highlight).toMatchObject({
      scale: `${DEFAULT_HIGHLIGHT_SIZE_PX}px`
    })
  })

  it('wraps the click scale as a factor of the cursor size', () => {
    expect(
      mapKitSettings({
        arts_cursor_click_enabled: 'yes',
        arts_cursor_click_scale: { size: 0.9, unit: 'px' }
      }).clickScale
    ).toEqual({ scale: { ref: 'cursor', factor: 0.9 } })

    expect(mapKitSettings({ arts_cursor_click_enabled: 'yes' }).clickScale).toEqual({
      scale: { ref: 'cursor', factor: DEFAULT_CLICK_FACTOR }
    })
  })
})
