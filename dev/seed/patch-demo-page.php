<?php
/**
 * Patches the hand-built "Cursor Follower Demo" page (post 10716) on the dev
 * site: wires the six SVG posters in and fills the tablet/mobile fields that
 * were never set.
 *
 * Run after dev/seed/attachments.php:
 *   php -d mysqli.default_socket="$SOCK" "$(which wp)" eval-file \
 *     /path/to/dev/seed/patch-demo-page.php
 *
 * This PATCHES rather than builds. The page was assembled by hand in Elementor
 * and that work is the source of truth; the full builder (dev/seed/demo-page.php,
 * inlined into the Playground blueprint) was written from this page's saved
 * state, not the other way round.
 *
 * Idempotent: every change is an assignment to a known key, so re-running is a
 * no-op. Bails loudly if the document doesn't match the expected shape, because
 * silently patching the wrong widget is worse than not patching at all.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const ARTS_DEMO_POST_ID = 10716;

$raw = get_post_meta( ARTS_DEMO_POST_ID, '_elementor_data', true );

if ( ! is_string( $raw ) || '' === $raw ) {
	WP_CLI::error( 'No _elementor_data on post ' . ARTS_DEMO_POST_ID );
}

$data = json_decode( $raw, true );

if ( ! is_array( $data ) ) {
	WP_CLI::error( 'Could not decode _elementor_data: ' . json_last_error_msg() );
}

/** Poster attachments, keyed by `_arts_poster_key` (written by attachments.php). */
$posters = array();
foreach ( get_posts(
	array(
		'post_type'      => 'attachment',
		'post_status'    => 'inherit',
		'posts_per_page' => -1,
		'meta_key'       => '_arts_poster_key',
		'fields'         => 'ids',
	)
) as $id ) {
	$posters[ (string) get_post_meta( $id, '_arts_poster_key', true ) ] = array(
		'id'  => (int) $id,
		'url' => wp_get_attachment_url( $id ),
	);
}

foreach ( array( 'hint-1', 'hint-2', 'hint-3', 'slide-1', 'slide-2', 'slide-3' ) as $key ) {
	if ( empty( $posters[ $key ] ) ) {
		WP_CLI::error( "Poster '{$key}' not registered — run dev/seed/attachments.php first." );
	}
}

// Everything below is closures rather than named functions with `global`:
// `wp eval-file` includes this file inside a function scope, so the variables
// here are locals of that scope and `global $x` would reach a different,
// undefined $x. Closures capture the enclosing scope correctly.

/** A slider value at a different size, preserving unit. */
$arts_size = static function ( array $base, float $size ): array {
	return array(
		'unit'  => $base['unit'] ?? 'px',
		'size'  => $size,
		'sizes' => array(),
	);
};

/** Dimensions value (padding et al). */
$arts_dims = static function ( int $top, int $right, int $bottom, int $left ): array {
	return array(
		'unit'     => 'px',
		'top'      => (string) $top,
		'right'    => (string) $right,
		'bottom'   => (string) $bottom,
		'left'     => (string) $left,
		'isLinked' => false,
	);
};

$counts = array(
	'hint_images' => 0,
	'carousel'    => 0,
	'h1'          => 0,
	'section_h'   => 0,
	'kicker'      => 0,
	'icon_box'    => 0,
	'container'   => 0,
	'hint_row'    => 0,
);

/** Hints-band image widgets, identified by their caption. */
$hint_keys = array(
	'Opens the lightbox'     => 'hint-1',
	'Opens the lightbox too' => 'hint-2',
	'Just links elsewhere'   => 'hint-3',
);

/**
 * @param array<int, array<string, mixed>> $elements
 */
$arts_walk = static function ( array &$elements, bool $top_level = false ) use (
	&$arts_walk,
	&$counts,
	$posters,
	$hint_keys,
	$arts_size,
	$arts_dims
): void {
	foreach ( $elements as &$element ) {
		$settings = $element['settings'] ?? array();
		$type     = $element['elType'] ?? '';
		$widget   = $element['widgetType'] ?? '';

		// The row holding the three posters: stack it on phones, where three
		// 30% columns would be unreadable.
		if ( 'container' === $type && ! empty( $element['elements'] ) ) {
			foreach ( $element['elements'] as $child ) {
				if (
					'image' === ( $child['widgetType'] ?? '' )
					&& 'custom' === ( $child['settings']['caption_source'] ?? '' )
				) {
					$settings['flex_direction_mobile'] = 'column';
					++$counts['hint_row'];
					break;
				}
			}
		}

		if ( 'container' === $type && $top_level ) {
			$pad = $settings['padding'] ?? array();
			// The last band carries a shorter bottom (it closes the page); scale
			// it rather than flattening every band to the same block.
			$bottom       = (int) ( $pad['bottom'] ?? 200 );
			$short_bottom = $bottom < 100;

			$settings['padding_tablet'] = $arts_dims( 120, 32, $short_bottom ? 48 : 120, 32 );
			$settings['padding_mobile'] = $arts_dims( 80, 20, $short_bottom ? 40 : 80, 20 );
			++$counts['container'];
		}

		if ( 'heading' === $widget ) {
			$fs = $settings['typography_font_size'] ?? null;
			if ( is_array( $fs ) && isset( $fs['size'] ) ) {
				$size = (float) $fs['size'];
				if ( 96.0 === $size ) {
					$settings['typography_font_size_tablet'] = $arts_size( $fs, 64 );
					$settings['typography_font_size_mobile'] = $arts_size( $fs, 40 );
					++$counts['h1'];
				} elseif ( 64.0 === $size ) {
					$settings['typography_font_size_tablet'] = $arts_size( $fs, 48 );
					$settings['typography_font_size_mobile'] = $arts_size( $fs, 32 );
					++$counts['section_h'];
				} elseif ( 16.0 === $size ) {
					// Tablet keeps 16; only the phone needs it tighter, where
					// "Hover over controls and indicators" wraps to two lines.
					$settings['typography_font_size_mobile'] = $arts_size( $fs, 13 );
					++$counts['kicker'];
				}
			}
		}

		if ( 'icon-box' === $widget ) {
			$fs = $settings['title_typography_font_size'] ?? null;
			if ( is_array( $fs ) && isset( $fs['size'] ) ) {
				$settings['title_typography_font_size_tablet'] = $arts_size( $fs, 28 );
				$settings['title_typography_font_size_mobile'] = $arts_size( $fs, 24 );
				++$counts['icon_box'];
			}
		}

		// Keyed on the caption rather than on "has no image yet", so the script
		// stays idempotent once the posters are in. `caption_source` is what
		// separates the three Hints widgets from the settings-panel screenshot
		// further down, which carries a leftover copy of the same caption text
		// but never renders it.
		if (
			'image' === $widget
			&& 'custom' === ( $settings['caption_source'] ?? '' )
			&& isset( $hint_keys[ $settings['caption'] ?? '' ] )
		) {
			$key = $hint_keys[ $settings['caption'] ];

			$settings['image'] = array(
				'url'    => $posters[ $key ]['url'],
				'id'     => $posters[ $key ]['id'],
				'size'   => '',
				'alt'    => '',
				'source' => 'library',
			);

			// The widgets were sized for holding no image. Left alone, none of
			// the flex keywords work here: `shrink` leaves no definite width, so
			// the browser resolves the SVG against the caption's text width and
			// lands on 48px; `grow` is flex-grow with an `auto` basis, so each
			// item claims its full 1200px intrinsic width and the row blows out
			// past 3900px. An explicit percentage takes intrinsic sizing out of
			// it entirely: 3 × 30% of the 1300px row plus the two 3rem gaps
			// leaves headroom, and the image fills its widget.
			$settings['_flex_size']                   = 'shrink';
			$settings['_element_width']               = 'initial';
			$settings['_element_custom_width']        = array( 'unit' => '%', 'size' => 30, 'sizes' => array() );
			$settings['_element_custom_width_mobile'] = array( 'unit' => '%', 'size' => 100, 'sizes' => array() );
			$settings['width']                        = array( 'unit' => '%', 'size' => 100, 'sizes' => array() );

			++$counts['hint_images'];
		}

		if ( 'image-carousel' === $widget ) {
			// Swiper's spaceBetween, not CSS: the control is render_type 'none'
			// + frontend_available, so the value reaches the slider through the
			// widget's frontend settings. `image_spacing` has to be 'custom' or
			// the slider control is conditioned out and ignored.
			$settings['image_spacing']        = 'custom';
			$settings['image_spacing_custom'] = array( 'unit' => 'px', 'size' => 10, 'sizes' => array() );

			$settings['carousel'] = array(
				array( 'id' => $posters['slide-1']['id'], 'url' => $posters['slide-1']['url'] ),
				array( 'id' => $posters['slide-2']['id'], 'url' => $posters['slide-2']['url'] ),
				array( 'id' => $posters['slide-3']['id'], 'url' => $posters['slide-3']['url'] ),
			);
			++$counts['carousel'];
		}

		$element['settings'] = $settings;

		if ( ! empty( $element['elements'] ) && is_array( $element['elements'] ) ) {
			$arts_walk( $element['elements'] );
		}
	}
	unset( $element );
};

$arts_walk( $data, true );

$expected = array(
	'hint_images' => 3,
	'carousel'    => 1,
	'h1'          => 1,
	'section_h'   => 4,
	'kicker'      => 4,
	'icon_box'    => 4,
	'container'   => 5,
	'hint_row'    => 1,
);

foreach ( $expected as $what => $n ) {
	if ( $counts[ $what ] !== $n ) {
		WP_CLI::error(
			sprintf( 'Shape mismatch: expected %d %s, matched %d. Nothing saved.', $n, $what, $counts[ $what ] )
		);
	}
}

update_post_meta(
	ARTS_DEMO_POST_ID,
	'_elementor_data',
	wp_slash( wp_json_encode( $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) )
);

// Post CSS never diffs on its own (is_update_required() is hard-coded false).
\Elementor\Core\Files\CSS\Post::create( ARTS_DEMO_POST_ID )->delete();
delete_post_meta( ARTS_DEMO_POST_ID, '_elementor_element_cache' );

// The editor prefers a newer autosave revision over raw meta.
foreach ( wp_get_post_revisions( ARTS_DEMO_POST_ID, array( 'fields' => 'ids' ) ) as $revision_id ) {
	wp_delete_post_revision( $revision_id );
}

WP_CLI::log( wp_json_encode( $counts, JSON_PRETTY_PRINT ) );
WP_CLI::success( 'Demo page patched: ' . get_permalink( ARTS_DEMO_POST_ID ) );
