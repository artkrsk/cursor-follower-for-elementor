/**
 * The CSS state machine's contract: JS flips these on the cursor root and
 * consumers style off them — most via the `arts-cursor` layer, while
 * data-cursor-highlight/-magnetic are keyed by kit CSS (Site Settings
 * per-state colors) and data-cursor-dragging is a public hook for themes.
 * src/styles mirrors the shared strings by hand — nothing can be shared
 * across languages.
 */
export const VISIBLE_ATTR = 'data-cursor-visible'
export const HIGHLIGHT_ATTR = 'data-cursor-highlight'
export const LABEL_ATTR = 'data-cursor-label'
export const LABEL_ICON_ATTR = 'data-cursor-label-icon'
/** Which of the three icon forms filled the label's icon slot, since each needs
    different styling: injected markup sizes itself, a glyph rides font-size, and
    a masked URL needs a box to mask. */
export const ICON_KIND_ATTR = 'data-cursor-icon-kind'
export const ICON_ATTR = 'data-cursor-icon'
export const ARROWS_ATTR = 'data-cursor-arrows'
export const ARROWS_POSITION_ATTR = 'data-cursor-arrows-position'
/** Press-dot eligibility: the stylesheet scales the dot up only while this AND
    data-cursor-pressed are both set, so the dot rides the whole press-drag
    gesture with no extra JS. */
export const DOT_ATTR = 'data-cursor-dot'
export const LOADING_ATTR = 'data-cursor-loading'
export const PRESSED_ATTR = 'data-cursor-pressed'
export const MAGNETIC_ATTR = 'data-cursor-magnetic'
export const SHAPE_ATTR = 'data-cursor-shape'
/** The pill's long axis ('x' horizontal, 'y' vertical stadium), written with
    the shape: the pressed clamp squeezes only along it, holding the cross axis
    so snug-fitted arrows/dot never get pinched. Absent without a pill. */
export const SHAPE_AXIS_ATTR = 'data-cursor-shape-axis'
export const DRAGGING_ATTR = 'data-cursor-dragging'
