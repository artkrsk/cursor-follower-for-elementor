<?php

namespace Arts\CursorFollower\Elementor;

use Elementor\Controls_Manager;
use Elementor\Controls_Stack;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Cursor controls for Elementor's LIGHTBOX, added to Elementor's own Lightbox
 * tab in Site Settings rather than to ours.
 *
 * The lightbox is the one target here that isn't a widget: it's runtime UI that
 * Elementor builds client-side and appends to <body>, shared by Image, Basic
 * Gallery, Video and Media Carousel. So there is no widget Style tab to anchor
 * on — and no reason to invent one, since Elementor already publishes a Lightbox
 * tab and a setting for the lightbox belongs beside the rest of them.
 *
 * That also keeps it out of our own Site Settings tab, which is for the cursor's
 * own appearance and motion — nothing there is scoped to one piece of host UI.
 *
 * ONE hook, one method, no registry — the opposite of WidgetControls, and
 * deliberately: that class carries a lookup table because it has eleven widgets
 * and eleven anchor sections to reach, several of them measured rather than
 * read. This has exactly one anchor and will only ever have one.
 */
class LightboxControls {

	/**
	 * `settings-lightbox` is the tab id Elementor's kit registers
	 * (`core/kits/documents/kit.php`), which Controls_Stack turns into the
	 * section id `section_settings-lightbox` for hook purposes.
	 */
	private const ANCHOR = 'elementor/element/kit/section_settings-lightbox/before_section_end';

	public function register(): void {
		add_action( self::ANCHOR, array( $this, 'add_controls' ), 10, 2 );
	}

	/**
	 * Appended to the end of Elementor's own Lightbox section. No
	 * `start_injection()`: that exists to place a control BETWEEN two of
	 * Elementor's, which would tie us to one of their control ids for nothing —
	 * an addition from another plugin reads fine as the last thing in the group.
	 *
	 * Only the magnet is a setting. Zoom and fullscreen also get an effect (see
	 * Options::build) but no control, because they carry `role="switch"` and so
	 * answer the pointer with nothing at all today — restoring that is a fix,
	 * the same call already made for Portfolio's non-anchor filter buttons.
	 *
	 * @param Controls_Stack        $element
	 * @param array<string, mixed> $args
	 */
	public function add_controls( $element, $args = array() ): void {
		$element->add_control(
			'arts_cursor_lightbox',
			array(
				'label'       => esc_html__( 'Magnetic Navigation', 'cursor-follower-for-elementor' ),
				'description' => esc_html__( 'Pull the cursor to the previous/next arrows while the lightbox is open.', 'cursor-follower-for-elementor' ),
				'type'        => Controls_Manager::SWITCHER,
				'default'     => 'yes',
				'separator'   => 'before',
			)
		);

		// Kit-level twins of the per-widget Drag Hint controls (WidgetControls):
		// the lightbox has no widget wrapper to stamp marker classes on, so the
		// style is read straight off the kit in Options::lightbox_scope() and
		// branched server-side instead. Only multi-slide lightboxes show it —
		// the rule itself gates on a second slide existing.
		$element->add_control(
			'arts_cursor_lightbox_drag',
			array(
				'label'       => esc_html__( 'Drag Hint', 'cursor-follower-for-elementor' ),
				'description' => esc_html__( 'Show a hint over the slideshow while it can be dragged.', 'cursor-follower-for-elementor' ),
				'type'        => Controls_Manager::SWITCHER,
				'default'     => 'yes',
			)
		);

		$element->add_control(
			'arts_cursor_lightbox_drag_style',
			array(
				'label'       => esc_html__( 'Style', 'cursor-follower-for-elementor' ),
				'description' => esc_html__( 'Text gains arrows while dragging. Arrows Only adds a dot on press and hides the native cursor.', 'cursor-follower-for-elementor' ),
				'type'        => Controls_Manager::SELECT,
				'default'     => 'label',
				'options'     => array(
					'label'  => esc_html__( 'Text', 'cursor-follower-for-elementor' ),
					'always' => esc_html__( 'Text + Arrows', 'cursor-follower-for-elementor' ),
					'arrows' => esc_html__( 'Arrows Only', 'cursor-follower-for-elementor' ),
				),
				'condition'   => array( 'arts_cursor_lightbox_drag' => 'yes' ),
			)
		);
	}
}
