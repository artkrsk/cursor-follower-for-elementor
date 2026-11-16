import { POINTER_FULL_MOTION_MEDIA_QUERY, POINTER_MEDIA_QUERY } from '../constants'

/** The capability gate for a reduced-motion verdict, honoured unless it is `false`.
    Importing the gate must not pull in pointer listeners, hence its own module. */
export const pointerMediaQuery = (reducedMotion: boolean | undefined): string =>
  reducedMotion === false ? POINTER_MEDIA_QUERY : POINTER_FULL_MOTION_MEDIA_QUERY
