<?php

namespace Arts\CursorFollower\Elementor;

use Elementor\Controls_Manager;
use Elementor\Controls_Stack;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The "Cursor Effects" section and the hint pair inside it, shared by every
 * element type that can carry a hint — the curated widgets (WidgetControls) and
 * the Container (ContainerControls).
 *
 * A trait rather than a base class because the two consumers share these
 * controls and nothing else: WidgetControls is a registry of fourteen widgets
 * and their measured anchor sections, ContainerControls is one hook.
 */
trait HintControls {

	/** Open the shared "Cursor Effects" section (last in the Style tab). */
	private function start_section( Controls_Stack $element ): void {
		$element->start_controls_section(
			'arts_cursor_section',
			array(
				'label' => esc_html__( 'Cursor Effects', 'cursor-follower-for-elementor' ),
				'tab'   => Controls_Manager::TAB_STYLE,
			)
		);
	}

	/**
	 * The hint an element shows: WHAT it is, then the one field for that choice. A
	 * hint is text or an icon, never both, so each field is conditioned on the
	 * chooser. Both ride a per-element var prefix, kept distinct because custom
	 * properties inherit — a widget nested inside another must not pick up its
	 * ancestor's hint.
	 *
	 * ONE var carries the icon, not two, because a host substitutes a single
	 * value per property: the value itself says which form it is, and the engine
	 * reads a `url(…)` as a mask and anything else as webfont classes.
	 *
	 * Every id is DERIVED from the prefix, which is what lets one widget carry two
	 * groups: Media Carousel has both a drag hint and a slide-link hint, and a
	 * shared `arts_cursor_content` would be the same control declared twice.
	 *
	 * @param Controls_Stack $element
	 * @param string         $prefix       Names both the ids and the vars — `drag`
	 *                                     → `arts_cursor_drag_*`, --arts-cursor-drag-*.
	 * @param string         $placeholder  The rule's own default, shown as the hint.
	 * @param string         $default_icon Font Awesome class the icon choice starts on.
	 * @param array<string, string> $gate  The element's own enable switcher.
	 * @param bool           $reset_vars   Clear inherited hint vars on this element
	 *                                     first — for an element type that nests
	 *                                     inside itself. See below.
	 */
	private function add_hint_controls(
		Controls_Stack $element,
		string $prefix,
		string $placeholder,
		string $default_icon,
		array $gate,
		bool $reset_vars = false
	): void {
		$chooser = "arts_cursor_{$prefix}_content";

		// A distinct prefix is enough to keep one WIDGET's hint off another's,
		// since no widget here nests inside a widget of its own type. Containers
		// do, all the time, and they all share the `container` prefix — so an
		// inner container that leaves Text empty (writing no var of its own)
		// would inherit the outer one's wording. Resetting both vars on the
		// chooser fixes it: the chooser is active whenever the section is
		// enabled, Elementor emits style rules in control-registration order, and
		// whichever of the two fields below is active writes the same property
		// again on the same selector — so the reset only survives where the
		// field is genuinely blank, which is exactly where the rule's own default
		// should take over.
		$chooser_args = array(
			'label'     => esc_html__( 'Show', 'cursor-follower-for-elementor' ),
			'type'      => Controls_Manager::SELECT,
			'default'   => 'label',
			'options'   => array(
				'label' => esc_html__( 'Text', 'cursor-follower-for-elementor' ),
				'icon'  => esc_html__( 'Icon', 'cursor-follower-for-elementor' ),
			),
			'condition' => $gate,
		);

		if ( $reset_vars ) {
			$chooser_args['selectors'] = array(
				'{{WRAPPER}}' => "--arts-cursor-{$prefix}-label: initial; --arts-cursor-{$prefix}-icon: initial;",
			);
		}

		$element->add_control( $chooser, $chooser_args );

		// Elementor skips the rule entirely when the field is empty, so an
		// untouched element reads no var and keeps the rule's own default.
		$element->add_control(
			"arts_cursor_{$prefix}_label",
			array(
				'label'       => esc_html__( 'Text', 'cursor-follower-for-elementor' ),
				'description' => esc_html__( 'Empty keeps the default wording.', 'cursor-follower-for-elementor' ),
				'type'        => Controls_Manager::TEXT,
				'placeholder' => $placeholder,
				'condition'   => array_merge( $gate, array( $chooser => 'label' ) ),
				'selectors'   => array(
					'{{WRAPPER}}' => "--arts-cursor-{$prefix}-label: \"{{VALUE}}\";",
				),
			)
		);

		// Library only, no SVG upload: an uploaded SVG stores an {id,url} array,
		// which {{VALUE}} stringifies to "Array" on both the PHP and the editor-JS
		// side, so it cannot ride selectors at all. A font icon stores its class
		// string and rides them cleanly. Offering an option that could never update
		// live would be worse than leaving it out.
		//
		// Unquoted on purpose — the value may come back as a url() from
		// WidgetControls::inline_font_icon_svg(), which could not live inside quotes.
		//
		// None is excluded as well as SVG, because it duplicates a choice already
		// made one control up: "no icon" is what Show → Text means. Left in, it
		// gives a third state that silently falls back to the rule's wording, so
		// the panel says Icon while the cursor shows a word. Ruling it out means
		// picking Icon always yields one, which is why there's a default.
		$element->add_control(
			"arts_cursor_{$prefix}_icon",
			array(
				'label'                  => esc_html__( 'Icon', 'cursor-follower-for-elementor' ),
				'type'                   => Controls_Manager::ICONS,
				'skin'                   => 'inline',
				'default'                => array(
					'value'   => $default_icon,
					'library' => 'fa-solid',
				),
				'exclude_inline_options' => array( 'svg', 'none' ),
				'condition'              => array_merge( $gate, array( $chooser => 'icon' ) ),
				'selectors'              => array(
					'{{WRAPPER}}' => "--arts-cursor-{$prefix}-icon: {{VALUE}};",
				),
			)
		);
	}
}
