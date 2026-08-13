/**
 * The JS-bound kit controls mapKitSettings() reads off the forwarded settings
 * bag — the feel keys Options::build() in src/php/Options.php also reads by
 * name (its lightbox keys build targetScopes, which the live patch never
 * touches); the two lists are kept in step by hand. The bridge itself forwards on ANY
 * `arts_cursor_*` change (the bag always carries every kit attribute), so
 * selectors-based controls need no entry here.
 */
export type TKitSettingKey =
  | 'arts_cursor_trailing'
  | 'arts_cursor_elastic_enabled'
  | 'arts_cursor_elastic_strength'
  | 'arts_cursor_magnetic_strength'
  | 'arts_cursor_magnetic_release'
  | 'arts_cursor_magnetic_element_scale'
  | 'arts_cursor_highlight_enabled'
  | 'arts_cursor_highlight_size'
  | 'arts_cursor_press_enabled'
  | 'arts_cursor_press_scale'
