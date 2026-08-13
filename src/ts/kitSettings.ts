import {
  DEFAULT_ELASTIC_STRENGTH,
  DEFAULT_HIGHLIGHT_SIZE_PX,
  DEFAULT_MAGNETIC_ELEMENT_SCALE,
  DEFAULT_MAGNETIC_RELEASE_RADIUS,
  DEFAULT_MAGNETIC_STRENGTH,
  DEFAULT_PRESS_FACTOR,
  DEFAULT_TRAILING
} from './constants'
import type { ICursorOptions } from './interfaces'
import type { TKitSettings } from './types'

/**
 * Editor live-preview mapping: raw `arts_cursor_*` kit settings (as forwarded
 * by the PHP-printed editor bridge) → an ICursorOptions partial. Sliders
 * arrive as `{ size, unit }`; switchers as 'yes' | ''. Mirrors Options::build()
 * — the load path itself needs no TS mapping because PHP prints the final
 * shape.
 */

/**
 * Mirrors PHP `Options::is_on()`, and the distinction it makes is the point: a
 * switcher stores '' once it has been touched and turned off, but a never-saved
 * kit has no key at all. Collapsing both to false would disable a section in
 * the editor preview that the front end — which reads the control's own
 * `'default' => 'yes'` — renders enabled.
 */
const isOn = (value: unknown, fallback: boolean): boolean =>
  value === undefined || value === null ? fallback : value === 'yes'

/**
 * Mirrors PHP `is_numeric()` as Options::size_of uses it — and the part that
 * matters is that a blank string is NOT numeric. A cleared Elementor slider
 * sends `{ size: '' }`; reading that as 0 would set trailing to 0 and freeze the
 * follower outright, while the load path fell back to the default — so the
 * editor preview and the front end would disagree about the same kit.
 */
const numeric = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value !== 'string' || value.trim() === '') {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const sizeOf = (value: unknown, fallback: number): number => {
  if (typeof value === 'object' && value !== null && 'size' in value) {
    return numeric(value.size) ?? fallback
  }
  return numeric(value) ?? fallback
}

export function mapKitSettings(settings: TKitSettings): ICursorOptions {
  return {
    trailing: sizeOf(settings.arts_cursor_trailing, DEFAULT_TRAILING),
    elastic: isOn(settings.arts_cursor_elastic_enabled, true)
      ? { strength: sizeOf(settings.arts_cursor_elastic_strength, DEFAULT_ELASTIC_STRENGTH) }
      : false,
    // Magnetic enable is per-widget now; the global option is always on.
    magnetic: {
      strength: sizeOf(settings.arts_cursor_magnetic_strength, DEFAULT_MAGNETIC_STRENGTH),
      releaseRadius: sizeOf(settings.arts_cursor_magnetic_release, DEFAULT_MAGNETIC_RELEASE_RADIUS),
      elementScale: sizeOf(
        settings.arts_cursor_magnetic_element_scale,
        DEFAULT_MAGNETIC_ELEMENT_SCALE
      )
    },
    highlight: isOn(settings.arts_cursor_highlight_enabled, true)
      ? { scale: `${sizeOf(settings.arts_cursor_highlight_size, DEFAULT_HIGHLIGHT_SIZE_PX)}px` }
      : false,
    pressScale: isOn(settings.arts_cursor_press_enabled, true)
      ? {
          scale: {
            ref: 'cursor',
            factor: sizeOf(settings.arts_cursor_press_scale, DEFAULT_PRESS_FACTOR)
          }
        }
      : false
  }
}
