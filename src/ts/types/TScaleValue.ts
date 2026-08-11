/**
 * Cursor size grammar (one resolver: resolveScale). Every field means exactly
 * one thing — a reference × a factor, clamped in px:
 *  - '40px'   → absolute pixels
 *  - '120%'   → percent of the base cursor size (120% = 1.2× base)
 *  - 'cursor' → the base cursor size (Site Settings)
 *  - 'target' → the hovered element's size
 *  - { ref: 'cursor'|'target', factor?, min?, max? }
 *       → ref × factor, clamped to [min, max] — each itself a size string
 *         ('40px' | '120%' | 'cursor' | 'target')
 * Everything resolves to a ratio of the base cursor size.
 */
export type TScaleValue =
  | string
  | { ref: 'cursor' | 'target'; factor?: number; min?: string; max?: string }
