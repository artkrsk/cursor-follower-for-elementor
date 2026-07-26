/**
 * Engine defaults — the single TS source. Both the initial resolve
 * (core/options.ts) and the Elementor kit mapping (kitSettings.ts) read
 * these, so a default moves in exactly one place. src/php/Options.php holds
 * the load-path mirror; nothing can be shared across languages.
 */
export const DEFAULT_TRAILING = 0.2
export const DEFAULT_ELASTIC_STRENGTH = 1.5
export const DEFAULT_ELASTIC_MAX = 0.1
export const DEFAULT_MAGNETIC_STRENGTH = 0.25
export const DEFAULT_MAGNETIC_RELEASE_RADIUS = 120
/** The highlight size is authored in px; the engine wants a size string. */
export const DEFAULT_HIGHLIGHT_SIZE_PX = 80
/** Press-scale multiplier of the cursor size. The kit slider (Press Scale,
    'x' unit, 0.5–1.5) stores the same factor verbatim — no conversion on
    either mapping path. */
export const DEFAULT_CLICK_FACTOR = 0.8
export const DEFAULT_ANIMATION_DURATION = 0.25
/** Mirrors the stylesheet's `--arts-cursor-ease` fallback (the canonical
    back-out curve) for inline transitions on PAGE elements — the token is
    scoped to `.arts-cursor`, so an arbitrary element can't `var()` it. */
export const DEFAULT_EASING = 'cubic-bezier(0.34, 1.56, 0.64, 1)'
