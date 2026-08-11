<?php
/**
 * Registers the six abstract SVG posters used by the demo page as media
 * attachments.
 *
 * Run against the Local dev site (Homebrew PHP needs Local's mysql socket):
 *   php -d mysqli.default_socket="$SOCK" "$(which wp)" eval-file \
 *     /path/to/dev/seed/attachments.php
 *
 * Why a script and not an upload: WordPress rejects `image/svg+xml` from the
 * media uploader by default, and the site runs no Safe SVG. Inserting the
 * attachment directly bypasses the mime whitelist, which only guards uploads.
 *
 * Why the metadata is hand-written: `getimagesize()` cannot read an SVG, so
 * WordPress records width/height 0 and Elementor's image size resolution has
 * nothing to work with. The numbers below come from each file's own viewBox.
 * No `sizes` array — both consuming widgets are set to `full`.
 *
 * Idempotent: keyed on the `_arts_poster_key` meta, so re-running refreshes the
 * files in place and reuses the same attachment IDs.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** key => [ filename, width, height, title ] */
const ARTS_POSTERS = array(
	'hint-1'  => array( 'poster-hint-1.svg', 1200, 900, 'Cursor Follower — Poster Hint 1' ),
	'hint-2'  => array( 'poster-hint-2.svg', 1200, 900, 'Cursor Follower — Poster Hint 2' ),
	'hint-3'  => array( 'poster-hint-3.svg', 1200, 900, 'Cursor Follower — Poster Hint 3' ),
	'slide-1' => array( 'poster-slide-1.svg', 1200, 800, 'Cursor Follower — Poster Slide 1' ),
	'slide-2' => array( 'poster-slide-2.svg', 1200, 800, 'Cursor Follower — Poster Slide 2' ),
	'slide-3' => array( 'poster-slide-3.svg', 1200, 800, 'Cursor Follower — Poster Slide 3' ),
);

$source_dir = __DIR__ . '/posters';
$upload     = wp_upload_dir();

if ( ! empty( $upload['error'] ) ) {
	WP_CLI::error( $upload['error'] );
}

/** Existing posters, keyed by their `_arts_poster_key`. */
$existing = array();
foreach ( get_posts(
	array(
		'post_type'      => 'attachment',
		'post_status'    => 'inherit',
		'posts_per_page' => -1,
		'meta_key'       => '_arts_poster_key',
		'fields'         => 'ids',
	)
) as $id ) {
	$existing[ (string) get_post_meta( $id, '_arts_poster_key', true ) ] = $id;
}

$result = array();

foreach ( ARTS_POSTERS as $key => list( $filename, $width, $height, $title ) ) {
	$source = "{$source_dir}/{$filename}";

	if ( ! file_exists( $source ) ) {
		WP_CLI::error( "Missing poster source: {$source}" );
	}

	$target = "{$upload['path']}/{$filename}";
	$url    = "{$upload['url']}/{$filename}";

	if ( ! copy( $source, $target ) ) {
		WP_CLI::error( "Could not copy {$source} → {$target}" );
	}

	// Path relative to uploads root — what _wp_attached_file stores.
	$relative = ltrim( str_replace( $upload['basedir'], '', $target ), '/' );

	$id = $existing[ $key ] ?? 0;

	if ( $id ) {
		wp_update_post(
			array(
				'ID'             => $id,
				'post_title'     => $title,
				'post_mime_type' => 'image/svg+xml',
			)
		);
		update_post_meta( $id, '_wp_attached_file', $relative );
	} else {
		$id = wp_insert_attachment(
			array(
				'post_mime_type' => 'image/svg+xml',
				'post_title'     => $title,
				'post_content'   => '',
				'post_status'    => 'inherit',
			),
			$target,
			0,
			true
		);

		if ( is_wp_error( $id ) ) {
			WP_CLI::error( $id->get_error_message() );
		}

		update_post_meta( $id, '_arts_poster_key', $key );
	}

	// Never generate_attachment_metadata() here: it would hand the SVG to the
	// image editor, which cannot size it, and overwrite these values with zeros.
	wp_update_attachment_metadata(
		$id,
		array(
			'width'  => $width,
			'height' => $height,
			'file'   => $relative,
			'sizes'  => array(),
		)
	);

	$result[ $key ] = array(
		'id'  => (int) $id,
		'url' => $url,
	);
}

WP_CLI::log( wp_json_encode( $result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) );
WP_CLI::success( sprintf( 'Registered %d posters.', count( $result ) ) );
