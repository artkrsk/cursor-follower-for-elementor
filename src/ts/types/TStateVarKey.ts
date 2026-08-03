/** Payload keys a host can supply per instance through a CSS custom property.
    Deliberately a closed list of TOKEN-valued keys: a property's value maps onto
    them verbatim, so the channel needs no coercion and no validation table. A
    key whose value is a number, an object or a colour does not belong here —
    those are what the rule's own payload is for. */
export type TStateVarKey = 'shape' | 'arrows'
