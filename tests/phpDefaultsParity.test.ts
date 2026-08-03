import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  DEFAULT_ELASTIC_STRENGTH,
  DEFAULT_HIGHLIGHT_SIZE_PX,
  DEFAULT_MAGNETIC_RELEASE_RADIUS,
  DEFAULT_MAGNETIC_STRENGTH,
  DEFAULT_PRESS_FACTOR,
  DEFAULT_TRAILING
} from '@ts/constants'
import { describe, expect, it } from 'vitest'

/**
 * The one cross-language invariant nothing else can catch. Options::build() is
 * the LOAD path (PHP prints the final options into the page) and defaults.ts is
 * the live-patch path (the editor bridge maps kit settings in TS) — the same
 * numbers, stated twice, in two languages that share no build step. PHPStan is
 * type analysis and can't see a value drift; the rest of this suite never reads
 * PHP at all. So a default silently changing on one side only would ship as
 * "the editor preview disagrees with the published page", which is exactly the
 * class of bug this file exists to make impossible.
 *
 * Parsed by regex rather than executed: booting WordPress to call the method
 * would cost the suite a PHP runtime for six numbers.
 */

const OPTIONS_PHP = readFileSync(resolve(__dirname, '../src/php/Options.php'), 'utf8')

/** The literal fallback in a `self::size_of( 'key', <default> )` call. */
const phpFallback = (key: string): number => {
  const match = OPTIONS_PHP.match(
    new RegExp(`size_of\\(\\s*'${key}'\\s*,\\s*(-?[0-9]*\\.?[0-9]+)\\s*\\)`)
  )
  if (!match?.[1]) {
    throw new Error(`no size_of() fallback found for '${key}' in Options.php`)
  }
  return Number(match[1])
}

describe('PHP and TS state the same defaults', () => {
  it.each([
    ['arts_cursor_trailing', DEFAULT_TRAILING],
    ['arts_cursor_elastic_strength', DEFAULT_ELASTIC_STRENGTH],
    ['arts_cursor_magnetic_strength', DEFAULT_MAGNETIC_STRENGTH],
    ['arts_cursor_magnetic_release', DEFAULT_MAGNETIC_RELEASE_RADIUS],
    ['arts_cursor_highlight_size', DEFAULT_HIGHLIGHT_SIZE_PX],
    ['arts_cursor_press_scale', DEFAULT_PRESS_FACTOR]
  ])('%s', (key, tsDefault) => {
    expect(phpFallback(key as string)).toBe(tsDefault)
  })

  /** The switcher defaults are the other half of the same contract: PHP passes
      `true` to is_on(), and kitSettings.ts's isOn() takes the matching fallback.
      A never-saved kit has to read as ON on both paths. */
  it('defaults every switcher on, on the load path', () => {
    for (const key of [
      'arts_cursor_elastic_enabled',
      'arts_cursor_highlight_enabled',
      'arts_cursor_press_enabled'
    ]) {
      expect(OPTIONS_PHP).toMatch(new RegExp(`is_on\\(\\s*'${key}'\\s*,\\s*true\\s*\\)`))
    }
  })
})
