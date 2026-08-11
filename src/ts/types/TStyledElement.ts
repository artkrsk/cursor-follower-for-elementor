/**
 * An element the engine may write inline styles to. HTMLElement, SVGElement and
 * MathMLElement all qualify — which is deliberate: a magnetic anchor resolved
 * from a rule (`anchor: ':scope .icon'`) is often an inline <svg>, and the
 * magnetic trap only ever touches `style` and getComputedStyle.
 */
export type TStyledElement = Element & ElementCSSInlineStyle
