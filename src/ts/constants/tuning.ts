export const FRAME_60 = 1000 / 60
export const CONVERGE_EPS = 0.05
export const VELOCITY_FACTOR = 0.001
export const SETTLE_EPS = 0.001
export const PULL_FACTOR = 0.5
export const ELEMENT_RETURN_EPS = 0.1
export const ELEMENT_EASE = 0.25
export const RESIZE_DEBOUNCE_MS = 150
/** Slack over the engage-time pointer distance, so a hover zone wider than the
    configured radius can't insta-release. */
export const RELEASE_RADIUS_SLACK = 1.25
export const RELEASE_RADIUS_PAD = 40
/** Cursor size when the follower has no layout box to measure. */
export const BASE_SIZE_FALLBACK = 60
/** Grace over the CSS transition before hidden content is cleared. */
export const CLEAR_DELAY_PAD_MS = 120
export const IDLE_FALLBACK_MS = 50
/** Gap (px each side) the label keeps from the ring edge when the ring
    auto-grows to contain it. */
export const LABEL_FIT_MARGIN = 4
/** Auto nudge (px, upward) applied while a label or icon is shown so its content
    clears the OS cursor; an explicit payload `offset` overrides it. */
export const CONTENT_OFFSET_Y = -28
/** Fallback padding (px) the filled pill keeps around the label on each axis,
    used when the tunable CSS vars aren't readable (e.g. no stylesheet in tests). */
export const PILL_PAD_X = 18
export const PILL_PAD_Y = 8
/** Chevron glyph geometry as RATIOS of the arrow box (path `M4 14 L12 6 L20 14`
    in a 24² viewBox, core/markup.ts — the viewBox scales with the box, so only
    the ratios are fixed): the tip juts box×¼ past the box center toward the
    point, the tail box×1/12 the other way. Mirrored by hand in the _parts.scss
    offset calcs (`size * 0.25` inside, `size / 12` outside). */
export const ARROW_TIP_RATIO = 1 / 4
export const ARROW_TAIL_RATIO = 1 / 12
/** Tip-to-tail span along the pointing axis (box×⅓) — what a reservation
    clears on top of the gap so the whole glyph, not just its near edge, stays
    off the content the shape is sized around. */
export const ARROW_DEPTH_RATIO = ARROW_TIP_RATIO + ARROW_TAIL_RATIO
/** The glyph's visible span PERPENDICULAR to its pointing axis (path x runs
    4→20, box×⅔) — floors the shape's cross axis so an arrows-only pill wraps
    the chevron instead of touching it. */
export const ARROW_BREADTH_RATIO = 2 / 3
/** Fallbacks for the tunable --arts-cursor-arrow-size/-gap when they aren't
    readable (e.g. no stylesheet in tests) — mirror the _tokens.scss defaults.
    Both vars are px-only: getPropertyValue returns the raw token, so an em
    value would parse as its number and desync the reservation. */
export const ARROW_SIZE_FALLBACK = 16
export const ARROW_GAP_FALLBACK = 8
/** Pointer travel (px, max-axis, from the press point) that promotes a press
    into a drag — the click-vs-drag threshold. */
export const DRAG_THRESHOLD_PX = 4
