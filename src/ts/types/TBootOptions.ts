import type { ICursorOptions } from '../interfaces'

/**
 * What the WordPress boot path can actually receive. `Plugin.php` writes the
 * global through `wp_json_encode`, so PHP can never supply the injectables:
 * `ticker` carries a method, and an `Element` root cannot exist before the
 * script that reads this runs.
 *
 * `ticker` stays typed here because its handoff is script-side by design: a
 * pre-bundle script may set it on the global to hand the booted engine a
 * foreign frame loop (see the ticker note in CLAUDE.md) — best-effort under
 * lazy loading, since a pointer signal that beats the theme's deferred script
 * boots the engine on its own rAF. Library consumers pass both injectables
 * directly to createCursor instead.
 */
export type TBootOptions = Omit<ICursorOptions, 'root'> & {
  root?: string | null
}
