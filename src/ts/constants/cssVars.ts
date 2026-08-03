/**
 * The custom properties JS writes or reads — not an inventory of the engine's
 * CSS variable surface. Grouped below by who else sets them:
 *
 * Deliberately absent, because JS never touches them — contracts between
 * src/styles and Elementor kit CSS, not between src/styles and this engine:
 * `--arts-cursor-loading-color`, `--arts-cursor-blend-mode`,
 * `--arts-cursor-backdrop-filter` (the whole `blur(...)` value, not a radius —
 * unset falls back to `none`, which costs nothing), the hint family
 * (`--arts-cursor-hint-color/-background/-border-color/-border-width/
 * -backdrop-filter/-blend-mode`, read only while the cursor shows content), the
 * press dot pair (`--arts-cursor-dot-color/-size`), and
 * `--arts-cursor-hint-icon-size` — the glyph's own box, as distinct from this
 * file's HINT_CURSOR_SIZE_VAR (`--arts-cursor-hint-cursor-size`), which is how
 * big the CURSOR grows around an icon hint. Each name says what it sizes.
 */

/** Public theming vars (CLAUDE.md), set by kit CSS from Site Settings and
    overridden per payload by effects/suite.ts — written inline on the root, so
    the override wins the cascade. */
export const TEXT_COLOR_VAR = '--arts-cursor-text-color'
export const BG_VAR = '--arts-cursor-background-color'
export const BORDER_COLOR_VAR = '--arts-cursor-border-color'
export const BORDER_WIDTH_VAR = '--arts-cursor-border-width'
/** Read-only for JS: kit/theme CSS owns the value, the suite samples it as the
    scale base — the custom property rather than offsetWidth, because the
    follower transitions width/height and a pill overrides them, while an
    unregistered custom property always reports the settled value. */
export const SIZE_VAR = '--arts-cursor-size'

/** Engine channels: written only by effects/suite.ts, read only by the
    `arts-cursor` layer's transitions. Nothing outside the engine sets these. */
export const SCALE_VAR = '--arts-cursor-scale'
export const SCALE_PRESSED_VAR = '--arts-cursor-scale-pressed'

/** Auto-geometry channels: written by effects/suite.ts on the ROOT as plain
    (inheriting) custom properties, so the arrow siblings and the wrapper can
    read them. The live ring radius (base size × applied scale ÷ 2) the arrows
    seat against, and the per-state offset that shifts the cluster off the
    pointer. */
export const ARROW_RADIUS_VAR = '--arts-cursor-arrow-radius'
export const OFFSET_X_VAR = '--arts-cursor-offset-x'
export const OFFSET_Y_VAR = '--arts-cursor-offset-y'
/** How far the auto nudge shifts a hint off the pointer (signed, CSS
    convention) — kit-set, and the two vars here JS never writes: it emits
    `var()` REFERENCES to them as the offset values, so Site Settings owns both
    distances while JS keeps owning when a nudge applies. A control couldn't
    target OFFSET_X/Y_VAR directly — those are written inline on the root, and
    inline beats any stylesheet. */
export const HINT_OFFSET_X_VAR = '--arts-cursor-hint-offset-x'
export const HINT_OFFSET_Y_VAR = '--arts-cursor-hint-offset-y'
/** The press scale mirrored onto the ROOT as a plain (inheriting) var so the
    arrow siblings can track the pressed ring — the follower's registered
    `--arts-cursor-scale-pressed` is inherits:false and unreadable by them. */
export const PRESS_VAR = '--arts-cursor-press'

/** Shape channels: effects/suite.ts writes the pill's width/height on the ROOT
    (inheriting) so the follower morphs from a circle to a stadium by animating
    its own box; absent (→ the circle's --arts-cursor-size) collapses it back.
    The two padding vars run the other way: set in CSS (tunable), READ once by
    the suite to size EITHER shape around its hint content — the pill's own
    padding, and the box the circle has to grow to contain. */
export const SHAPE_WIDTH_VAR = '--arts-cursor-shape-width'
export const SHAPE_HEIGHT_VAR = '--arts-cursor-shape-height'
export const HINT_PAD_X_VAR = '--arts-cursor-hint-padding-x'
export const HINT_PAD_Y_VAR = '--arts-cursor-hint-padding-y'
/** Same READ direction as the hint paddings: the theme's arrow box size and
    breathing room (declared in _tokens.scss, px only), sampled once by the
    suite to size the room an inside arrow pair reserves in the shape — never
    written by JS. The size var is the one arrow knob: the CSS box, the glyph
    ratios and the reservation all derive from it. */
export const ARROW_SIZE_VAR = '--arts-cursor-arrow-size'
export const ARROW_GAP_VAR = '--arts-cursor-arrow-gap'

/** Read-only for JS, kit-set: how big the cursor grows for an icon hint. It has
    to reach the payload rather than CSS, because the circle sizes itself to its
    content through a scale this engine computes — and `floorScale` then treats
    this as a floor, so it can grow the cursor but never clip the icon. */
export const HINT_CURSOR_SIZE_VAR = '--arts-cursor-hint-cursor-size'

/** The image masked into the hint's icon slot, written by effects/suite.ts from
    a payload `iconUrl` — a mask rather than a background so the icon takes the
    cursor's text colour like the hint text does. */
export const ICON_MASK_VAR = '--arts-cursor-icon-mask'

/** Animation tokens, written once at init by applyAnimationTokens (core/markup.ts)
    from options.animation. `-duration` is also a kit control; `-ease` is not. */
export const DURATION_VAR = '--arts-cursor-duration'
export const EASE_VAR = '--arts-cursor-ease'
