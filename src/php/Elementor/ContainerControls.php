<?php

namespace Arts\CursorFollower\Elementor;

use Elementor\Controls_Manager;
use Elementor\Controls_Stack;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Cursor controls for Elementor's CONTAINER — a hint over a whole region rather
 * than over a link: the section-wide "Scroll" circle.
 *
 * ONE hook, one method, no registry, the same shape as LightboxControls and the
 * opposite of WidgetControls: there is exactly one anchor and only ever will be.
 *
 * Everything except the enable switch rides `selectors` as an --arts-cursor-*
 * custom property, NOT a prefix_class marker like the widget controls do — and
 * that is the whole design, not a stylistic choice. A container nests inside a
 * container as a matter of course, and a marker class in a rule's trigger cannot
 * survive that: `closest()` walks straight past a nearer container that lacks
 * the class and matches a farther one that has it, so an inner container would
 * silently render its ancestor's look and wording. A custom property is read off
 * the NEAREST matching scope (targets.ts resolves it from `trigger.closest(scope)`),
 * so nesting comes out right by construction. The engine side is `stateVars` on
 * the rule; Options::container_scope() names the properties.
 *
 * That also collapses the rule set: one rule covers every container on the site,
 * whatever each is set to, instead of one per combination of choices.
 */
class ContainerControls {

	use HintControls;

	/**
	 * The Container's last Style-tab section. MEASURED off the registered stack,
	 * not read off container.php — start_injection() re-splices the controls
	 * array, so the section registered last in source routinely isn't the one
	 * that ends up last. Re-measure rather than reason if an Elementor release
	 * moves it; the failure mode is our section sitting mid-panel, not breaking.
	 */
	private const ANCHOR = 'elementor/element/container/section_shape_divider/after_section_end';

	public function register(): void {
		add_action( self::ANCHOR, array( $this, 'add_controls' ), 10 );
	}

	/**
	 * @param Controls_Stack $element
	 */
	public function add_controls( $element ): void {
		$this->start_section( $element );

		$gate = array( 'arts_cursor_container' => 'yes' );

		// The one marker class, and the only thing here that has to be one: the
		// scope selector needs something to match on, and a custom property can't
		// be selected for. Off maps to no class at all, so every container on a
		// site that never touches this stays exactly as it renders today —
		// prefix_class is applied on the front end with no visibility check
		// (Element_Base::add_render_attributes), and only the empty value keeps
		// it quiet there.
		$element->add_control(
			'arts_cursor_container',
			array(
				'label'              => esc_html__( 'Cursor Hint', 'cursor-follower-for-elementor' ),
				'description'        => esc_html__( 'Show a hint while the pointer is anywhere over this container. Links and buttons inside keep their own effect.', 'cursor-follower-for-elementor' ),
				'type'               => Controls_Manager::SWITCHER,
				'default'            => '',
				'classes_dictionary' => array( 'yes' => 'on' ),
				'prefix_class'       => 'arts-cursor-container-',
			)
		);

		// Both option keys ARE the payload values the engine expects, so {{VALUE}}
		// needs no mapping. Written even for the default: Elementor generates CSS
		// from settings merged with control defaults, so an enabled container
		// always states its own shape — which is what keeps it from inheriting an
		// enclosing container's.
		$element->add_control(
			'arts_cursor_container_shape',
			array(
				'label'     => esc_html__( 'Shape', 'cursor-follower-for-elementor' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'circle',
				'options'   => array(
					'circle' => esc_html__( 'Circle', 'cursor-follower-for-elementor' ),
					'pill'   => esc_html__( 'Pill', 'cursor-follower-for-elementor' ),
				),
				'condition' => $gate,
				'selectors' => array(
					'{{WRAPPER}}' => '--arts-cursor-container-shape: {{VALUE}};',
				),
			)
		);

		// `none` is a token the engine reads as "drop the key", written out rather
		// than omitted for the same reason Shape always writes: an absent property
		// inherits, so leaving it out is how an inner container would be forced to
		// wear its ancestor's arrows.
		$element->add_control(
			'arts_cursor_container_arrows',
			array(
				'label'     => esc_html__( 'Arrows', 'cursor-follower-for-elementor' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'none',
				'options'   => array(
					'none'       => esc_html__( 'None', 'cursor-follower-for-elementor' ),
					'horizontal' => esc_html__( 'Horizontal', 'cursor-follower-for-elementor' ),
					'vertical'   => esc_html__( 'Vertical', 'cursor-follower-for-elementor' ),
					'all'        => esc_html__( 'All', 'cursor-follower-for-elementor' ),
				),
				'condition' => $gate,
				'selectors' => array(
					'{{WRAPPER}}' => '--arts-cursor-container-arrows: {{VALUE}};',
				),
			)
		);

		$this->add_hint_controls(
			$element,
			'container',
			esc_html__( 'Scroll', 'cursor-follower-for-elementor' ),
			'fas fa-arrow-down',
			$gate,
			true
		);

		// Plain CSS rather than the payload's hideNativeCursor, because the cascade
		// is nesting-safe for free where a rule would need another marker class.
		// Mirrors the stylesheet's own no-native-cursor rule, :hover scoping
		// included — the browser renders the cursor of the hovered chain only, so
		// the bare wrapper covers the container's own background where no
		// descendant is hovered and :hover covers the rest.
		//
		// Scoped to has-cursor-follower because it is a REPLACEMENT, not a
		// removal: on a touch device, or a page the enabled filter turned the
		// plugin off for, there would be no cursor to see it with.
		//
		// It deliberately covers links inside too. Over one the container's hint
		// steps aside for the link's own highlight, but that highlight is still a
		// cursor — bringing the OS pointer back for it would read as a flicker,
		// and "hide the native cursor here" means here.
		$element->add_control(
			'arts_cursor_container_hide_native',
			array(
				'label'     => esc_html__( 'Hide Native Cursor', 'cursor-follower-for-elementor' ),
				'type'      => Controls_Manager::SWITCHER,
				'default'   => '',
				'condition' => $gate,
				'selectors' => array(
					'html.has-cursor-follower {{WRAPPER}}, html.has-cursor-follower {{WRAPPER}} :hover' => 'cursor: none;',
				),
			)
		);

		$element->end_controls_section();
	}
}
