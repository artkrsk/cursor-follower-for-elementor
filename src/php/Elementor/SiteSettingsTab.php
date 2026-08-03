<?php

namespace Arts\CursorFollower\Elementor;

use Elementor\Controls_Manager;
use Elementor\Group_Control_Typography;
use Elementor\Core\Kits\Documents\Tabs\Tab_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * "Cursor Follower" tab in Elementor Site Settings.
 *
 * Two value channels:
 * - Appearance, hint styling and duration are selectors-based: Elementor
 *   prints them into kit CSS as the public --arts-cursor-* variables (live
 *   preview for free).
 * - Everything else is JS-bound: read by Options::build() and printed inline
 *   for the boot script. In the editor the inline bridge live-forwards ANY
 *   `arts_cursor_*` change — the JS-bound keys re-tune the engine, and a
 *   selectors-based change prompts it to re-sample what it measures (size,
 *   border width, label boxes).
 */
class SiteSettingsTab extends Tab_Base {

	const TAB_ID = 'arts-cursor';

	public function get_id(): string {
		return self::TAB_ID;
	}

	public function get_title(): string {
		return esc_html__( 'Cursor Follower', 'cursor-follower-for-elementor' );
	}

	public function get_group(): string {
		return 'settings';
	}

	public function get_icon(): string {
		return 'eicon-click';
	}

	protected function register_tab_controls(): void {
		$this->add_section_cursor();
		$this->add_section_motion();
		$this->add_section_hints();
		$this->add_section_highlight();
		$this->add_section_magnetic();
		$this->add_section_loading();
	}

	/** @return array<string, string> */
	private function condition_effect( string $switcher ): array {
		return array( $switcher => 'yes' );
	}

	private function add_section_cursor(): void {
		$this->start_controls_section(
			'arts_cursor_section_cursor',
			array(
				'label' => esc_html__( 'Cursor', 'cursor-follower-for-elementor' ),
				'tab'   => $this->get_id(),
			)
		);

		$this->add_control(
			'arts_cursor_size',
			array(
				'label'      => esc_html__( 'Size', 'cursor-follower-for-elementor' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => array( 'px' ),
				'range'      => array(
					'px' => array(
						'min'  => 0,
						'max'  => 200,
						'step' => 1,
					),
				),
				'default'    => array(
					'unit' => 'px',
					'size' => 60,
				),
				// Emitted on the kit wrapper rather than the cursor itself: the
				// cursor is a child of <body> so it still inherits, and this way
				// host markup can read the size too — the carousel hit areas floor
				// themselves at it. A theme setting the var directly on .arts-cursor
				// still wins, since a direct declaration beats an inherited one.
				'selectors'  => array(
					'{{WRAPPER}}' => '--arts-cursor-size: {{SIZE}}{{UNIT}};',
				),
			)
		);

		$this->add_control(
			'arts_cursor_background_color',
			array(
				'label'     => esc_html__( 'Background Color', 'cursor-follower-for-elementor' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => array(
					'{{WRAPPER}} .arts-cursor' => '--arts-cursor-background-color: {{VALUE}};',
				),
			)
		);

		// The var carries the whole `blur(...)` value, not a radius: unset, the
		// stylesheet falls back to `none` and the property costs nothing. Frosts
		// every state — for content only, use the hint sections' own blur.
		$this->add_control(
			'arts_cursor_backdrop_blur',
			array(
				'label'       => esc_html__( 'Backdrop Blur', 'cursor-follower-for-elementor' ),
				'description' => esc_html__( 'Empty applies no blur.', 'cursor-follower-for-elementor' ),
				'type'        => Controls_Manager::SLIDER,
				'size_units'  => array( 'px' ),
				'range'       => array(
					'px' => array(
						'min'  => 0,
						'max'  => 40,
						'step' => 1,
					),
				),
				'selectors'   => array(
					'{{WRAPPER}} .arts-cursor' => '--arts-cursor-backdrop-filter: blur({{SIZE}}{{UNIT}});',
				),
			)
		);

		$this->add_control(
			'arts_cursor_border_width',
			array(
				'label'      => esc_html__( 'Border Width', 'cursor-follower-for-elementor' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => array( 'px' ),
				'range'      => array(
					'px' => array(
						'min'  => 0,
						'max'  => 10,
						'step' => 1,
					),
				),
				'default'    => array(
					'unit' => 'px',
					'size' => 1,
				),
				'selectors'  => array(
					'{{WRAPPER}} .arts-cursor' => '--arts-cursor-border-width: {{SIZE}}{{UNIT}};',
				),
			)
		);

		$this->add_control(
			'arts_cursor_border_color',
			array(
				'label'     => esc_html__( 'Border Color', 'cursor-follower-for-elementor' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => array(
					'{{WRAPPER}} .arts-cursor' => '--arts-cursor-border-color: {{VALUE}};',
				),
			)
		);

		$this->add_control(
			'arts_cursor_blend_mode',
			array(
				'label'     => esc_html__( 'Blend Mode', 'cursor-follower-for-elementor' ),
				'type'      => Controls_Manager::SELECT,
				'options'   => array(
					'normal'     => esc_html__( 'Normal', 'cursor-follower-for-elementor' ),
					'difference' => esc_html__( 'Difference', 'cursor-follower-for-elementor' ),
					'exclusion'  => esc_html__( 'Exclusion', 'cursor-follower-for-elementor' ),
				),
				'default'   => 'normal',
				// On the kit wrapper rather than the cursor, like Size — but for a
				// different reason: the state sections' Blend Mode "Inherit" maps to
				// the CSS `inherit` keyword, which needs the base value to live on an
				// ANCESTOR. (Mapping Inherit to a var() of this same property would
				// self-reference on .arts-cursor and invalidate the declaration.)
				// A theme setting the var directly on .arts-cursor still wins.
				'selectors' => array(
					'{{WRAPPER}}' => '--arts-cursor-blend-mode: {{VALUE}};',
				),
			)
		);

		$this->add_control(
			'arts_cursor_text_color',
			array(
				'label'       => esc_html__( 'Content Color', 'cursor-follower-for-elementor' ),
				'description' => esc_html__( 'Labels, icons and arrows shown inside the cursor.', 'cursor-follower-for-elementor' ),
				'type'        => Controls_Manager::COLOR,
				'separator'   => 'before',
				'selectors'   => array(
					'{{WRAPPER}} .arts-cursor' => '--arts-cursor-text-color: {{VALUE}};',
				),
			)
		);

		$this->end_controls_section();
	}

	private function add_section_hints(): void {
		$this->start_controls_section(
			'arts_cursor_section_hints',
			array(
				'label' => esc_html__( 'Hints', 'cursor-follower-for-elementor' ),
				'tab'   => $this->get_id(),
			)
		);

		// Typography prints straight onto the label element (falls back to the
		// engine's own 14px when unset).
		$this->add_group_control(
			Group_Control_Typography::get_type(),
			array(
				'name'     => 'arts_cursor_hint_typography',
				'selector' => '{{WRAPPER}} .arts-cursor__hint',
			)
		);

		$this->add_control(
			'arts_cursor_hint_text_color',
			array(
				'label'     => esc_html__( 'Text Color', 'cursor-follower-for-elementor' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => array(
					'{{WRAPPER}} .arts-cursor' => '--arts-cursor-hint-color: {{VALUE}};',
				),
			)
		);

		$this->add_control(
			'arts_cursor_hint_background_color',
			array(
				'label'     => esc_html__( 'Background Color', 'cursor-follower-for-elementor' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => array(
					'{{WRAPPER}} .arts-cursor' => '--arts-cursor-hint-background: {{VALUE}};',
				),
			)
		);

		// Its own var, like the label colours: the stylesheet reads it only while
		// the cursor shows content, so this governs every hint — pill, circle
		// grown around text, drag and card hints alike. Empty emits nothing, so
		// the base Border Width stands until one is set.
		$this->add_control(
			'arts_cursor_hint_border_width',
			array(
				'label'      => esc_html__( 'Border Width', 'cursor-follower-for-elementor' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => array( 'px' ),
				'range'      => array(
					'px' => array(
						'min'  => 0,
						'max'  => 10,
						'step' => 1,
					),
				),
				'selectors'  => array(
					'{{WRAPPER}} .arts-cursor' => '--arts-cursor-hint-border-width: {{SIZE}}{{UNIT}};',
				),
			)
		);

		$this->add_control(
			'arts_cursor_hint_border_color',
			array(
				'label'     => esc_html__( 'Border Color', 'cursor-follower-for-elementor' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => array(
					'{{WRAPPER}} .arts-cursor' => '--arts-cursor-hint-border-color: {{VALUE}};',
				),
			)
		);

		// Frosts the shape only while a hint shows, so the free-roam ring can stay
		// a bare outline. Transitions in and out with the fill.
		$this->add_control(
			'arts_cursor_hint_backdrop_blur',
			array(
				'label'       => esc_html__( 'Backdrop Blur', 'cursor-follower-for-elementor' ),
				'description' => esc_html__( 'Empty uses the base Backdrop Blur.', 'cursor-follower-for-elementor' ),
				'type'        => Controls_Manager::SLIDER,
				'size_units'  => array( 'px' ),
				'range'       => array(
					'px' => array(
						'min'  => 0,
						'max'  => 40,
						'step' => 1,
					),
				),
				'selectors'   => array(
					'{{WRAPPER}} .arts-cursor' => '--arts-cursor-hint-backdrop-filter: blur({{SIZE}}{{UNIT}});',
				),
			)
		);

		$this->add_control(
			'arts_cursor_hint_blend_mode',
			array(
				'label'                => esc_html__( 'Blend Mode', 'cursor-follower-for-elementor' ),
				'type'                 => Controls_Manager::SELECT,
				'options'              => array(
					'inherit'    => esc_html__( 'Inherit', 'cursor-follower-for-elementor' ),
					'normal'     => esc_html__( 'Normal', 'cursor-follower-for-elementor' ),
					'difference' => esc_html__( 'Difference', 'cursor-follower-for-elementor' ),
					'exclusion'  => esc_html__( 'Exclusion', 'cursor-follower-for-elementor' ),
				),
				'default'              => 'normal',
				'selectors_dictionary' => array(
					'inherit'    => 'var(--arts-cursor-blend-mode, normal)',
					'normal'     => 'normal',
					'difference' => 'difference',
					'exclusion'  => 'exclusion',
				),
				'selectors'            => array(
					'{{WRAPPER}} .arts-cursor' => '--arts-cursor-hint-blend-mode: {{VALUE}};',
				),
			)
		);

		$this->add_control(
			'arts_cursor_hint_icon_size',
			array(
				'label'       => esc_html__( 'Icon Size', 'cursor-follower-for-elementor' ),
				'description' => esc_html__( 'Empty matches the text hint size, so an icon sits where a word would.', 'cursor-follower-for-elementor' ),
				'type'        => Controls_Manager::SLIDER,
				'size_units'  => array( 'px' ),
				'range'       => array(
					'px' => array(
						'min'  => 8,
						'max'  => 80,
						'step' => 1,
					),
				),
				'selectors'   => array(
					'{{WRAPPER}} .arts-cursor' => '--arts-cursor-hint-icon-size: {{SIZE}}{{UNIT}};',
				),
			)
		);

		// A floor, not a fixed size: the cursor already grows to contain whatever
		// it shows, so this raises that floor and never clips a larger icon.
		//
		// On the kit wrapper, NOT on the cursor, for the same reason as Size above:
		// unlike every other var here this one is read off the HOVERED ELEMENT, and
		// the cursor is nowhere in that element's ancestry, so a value scoped to the
		// cursor would never be visible to the read.
		$this->add_control(
			'arts_cursor_hint_cursor_size',
			array(
				'label'       => esc_html__( 'Cursor Size', 'cursor-follower-for-elementor' ),
				'description' => esc_html__( 'How big the cursor grows around an icon. Empty hugs it, as it does a text hint.', 'cursor-follower-for-elementor' ),
				'type'        => Controls_Manager::SLIDER,
				'size_units'  => array( 'px' ),
				'range'       => array(
					'px' => array(
						'min'  => 20,
						'max'  => 200,
						'step' => 1,
					),
				),
				'selectors'   => array(
					'{{WRAPPER}}' => '--arts-cursor-hint-cursor-size: {{SIZE}}{{UNIT}};',
				),
			)
		);

		// Signed, CSS convention (+x right, +y down). The engine emits these
		// vars as its auto-nudge values, so they only ever apply where a nudge
		// applies; the -28 default keeps the label lifted above the pointer.
		$this->add_control(
			'arts_cursor_hint_offset_x',
			array(
				'label'      => esc_html__( 'Offset X', 'cursor-follower-for-elementor' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => array( 'px' ),
				'range'      => array(
					'px' => array(
						'min'  => -150,
						'max'  => 150,
						'step' => 1,
					),
				),
				'default'    => array(
					'unit' => 'px',
					'size' => 0,
				),
				'selectors'  => array(
					'{{WRAPPER}} .arts-cursor' => '--arts-cursor-hint-offset-x: {{SIZE}}{{UNIT}};',
				),
			)
		);

		$this->add_control(
			'arts_cursor_hint_offset_y',
			array(
				'label'      => esc_html__( 'Offset Y', 'cursor-follower-for-elementor' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => array( 'px' ),
				'range'      => array(
					'px' => array(
						'min'  => -150,
						'max'  => 150,
						'step' => 1,
					),
				),
				'default'    => array(
					'unit' => 'px',
					'size' => -28,
				),
				'selectors'  => array(
					'{{WRAPPER}} .arts-cursor' => '--arts-cursor-hint-offset-y: {{SIZE}}{{UNIT}};',
				),
			)
		);

		$this->end_controls_section();
	}


	private function add_section_motion(): void {
		$this->start_controls_section(
			'arts_cursor_section_motion',
			array(
				'label' => esc_html__( 'Motion', 'cursor-follower-for-elementor' ),
				'tab'   => $this->get_id(),
			)
		);

		$this->add_control(
			'arts_cursor_trailing',
			array(
				'label'       => esc_html__( 'Follow Smoothing', 'cursor-follower-for-elementor' ),
				'description' => esc_html__( 'Lower values trail further behind the pointer; 1 sticks to it.', 'cursor-follower-for-elementor' ),
				'type'        => Controls_Manager::SLIDER,
				'size_units'  => array( 'x' ),
				'range'       => array(
					'x' => array(
						'min'  => 0.02,
						'max'  => 1,
						'step' => 0.01,
					),
				),
				'default'     => array(
					'unit' => 'x',
					'size' => 0.2,
				),
				'frontend_available' => true,
			)
		);

		$this->add_control(
			'arts_cursor_duration',
			array(
				'label'       => esc_html__( 'Transition Duration', 'cursor-follower-for-elementor' ),
				'description' => esc_html__( 'Reveals, hover states and effect transitions.', 'cursor-follower-for-elementor' ),
				'type'        => Controls_Manager::SLIDER,
				'size_units'  => array( 's' ),
				'range'       => array(
					's' => array(
						'min'  => 0,
						'max'  => 2,
						'step' => 0.01,
					),
				),
				'default'     => array(
					'unit' => 's',
					'size' => 0.25,
				),
				'selectors'   => array(
					'{{WRAPPER}} .arts-cursor' => '--arts-cursor-duration: {{SIZE}}s;',
				),
			)
		);

		$this->add_control(
			'arts_cursor_elastic_enabled',
			array(
				'label'       => esc_html__( 'Elastic Squash', 'cursor-follower-for-elementor' ),
				'description' => esc_html__( 'The cursor stretches along its movement direction.', 'cursor-follower-for-elementor' ),
				'type'        => Controls_Manager::SWITCHER,
				'default'     => 'yes',
				'separator'   => 'before',
				'frontend_available' => true,
			)
		);

		$this->add_control(
			'arts_cursor_elastic_strength',
			array(
				'label'      => esc_html__( 'Elastic Strength', 'cursor-follower-for-elementor' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => array( 'x' ),
				'range'      => array(
					'x' => array(
						'min'  => 0,
						'max'  => 5,
						'step' => 0.1,
					),
				),
				'default'    => array(
					'unit' => 'x',
					'size' => 1.5,
				),
				'condition'  => $this->condition_effect( 'arts_cursor_elastic_enabled' ),
				'frontend_available' => true,
			)
		);

		$this->add_control(
			'arts_cursor_press_enabled',
			array(
				'label'       => esc_html__( 'Press Feedback', 'cursor-follower-for-elementor' ),
				'description' => esc_html__( 'The cursor scales while the mouse button is pressed.', 'cursor-follower-for-elementor' ),
				'type'        => Controls_Manager::SWITCHER,
				'default'     => 'yes',
				'separator'   => 'before',
				'frontend_available' => true,
			)
		);

		$this->add_control(
			'arts_cursor_press_scale',
			array(
				'label'      => esc_html__( 'Press Scale', 'cursor-follower-for-elementor' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => array( 'x' ),
				'range'      => array(
					'x' => array(
						'min'  => 0.5,
						'max'  => 1.5,
						'step' => 0.05,
					),
				),
				'default'    => array(
					'unit' => 'x',
					'size' => 0.8,
				),
				'condition'  => $this->condition_effect( 'arts_cursor_press_enabled' ),
				'frontend_available' => true,
			)
		);

		$this->end_controls_section();
	}

	private function add_section_highlight(): void {
		$this->start_controls_section(
			'arts_cursor_section_highlight',
			array(
				'label' => esc_html__( 'Link Highlight', 'cursor-follower-for-elementor' ),
				'tab'   => $this->get_id(),
			)
		);

		$this->add_control(
			'arts_cursor_highlight_enabled',
			array(
				'label'       => esc_html__( 'Enable', 'cursor-follower-for-elementor' ),
				'description' => esc_html__( 'The cursor grows and fades over links and buttons.', 'cursor-follower-for-elementor' ),
				'type'        => Controls_Manager::SWITCHER,
				'default'     => 'yes',
				'frontend_available' => true,
			)
		);

		$this->add_control(
			'arts_cursor_highlight_size',
			array(
				'label'      => esc_html__( 'Size', 'cursor-follower-for-elementor' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => array( 'px' ),
				'range'      => array(
					'px' => array(
						'min'  => 20,
						'max'  => 200,
						'step' => 1,
					),
				),
				'default'    => array(
					'unit' => 'px',
					'size' => 80,
				),
				'condition'  => $this->condition_effect( 'arts_cursor_highlight_enabled' ),
				'frontend_available' => true,
			)
		);

		$this->add_control(
			'arts_cursor_highlight_background_color',
			array(
				'label'     => esc_html__( 'Background Color', 'cursor-follower-for-elementor' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => array(
					'{{WRAPPER}} .arts-cursor[data-cursor-highlight]' => '--arts-cursor-background-color: {{VALUE}};',
				),
				'condition' => $this->condition_effect( 'arts_cursor_highlight_enabled' ),
			)
		);

		$this->add_control(
			'arts_cursor_highlight_border_width',
			array(
				'label'      => esc_html__( 'Border Width', 'cursor-follower-for-elementor' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => array( 'px' ),
				'range'      => array(
					'px' => array(
						'min'  => 0,
						'max'  => 10,
						'step' => 1,
					),
				),
				'selectors'  => array(
					'{{WRAPPER}} .arts-cursor[data-cursor-highlight]' => '--arts-cursor-border-width: {{SIZE}}{{UNIT}};',
				),
				'condition'  => $this->condition_effect( 'arts_cursor_highlight_enabled' ),
			)
		);

		$this->add_control(
			'arts_cursor_highlight_border_color',
			array(
				'label'     => esc_html__( 'Border Color', 'cursor-follower-for-elementor' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => array(
					'{{WRAPPER}} .arts-cursor[data-cursor-highlight]' => '--arts-cursor-border-color: {{VALUE}};',
				),
				'condition' => $this->condition_effect( 'arts_cursor_highlight_enabled' ),
			)
		);

		// Default Inherit: the highlight is the same circle, so its blend follows
		// the base unless deliberately changed. `inherit` (the CSS keyword) pulls
		// the wrapper-level base value — see the base Blend Mode control.
		$this->add_control(
			'arts_cursor_highlight_blend_mode',
			array(
				'label'                => esc_html__( 'Blend Mode', 'cursor-follower-for-elementor' ),
				'type'                 => Controls_Manager::SELECT,
				'options'              => array(
					'inherit'    => esc_html__( 'Inherit', 'cursor-follower-for-elementor' ),
					'normal'     => esc_html__( 'Normal', 'cursor-follower-for-elementor' ),
					'difference' => esc_html__( 'Difference', 'cursor-follower-for-elementor' ),
					'exclusion'  => esc_html__( 'Exclusion', 'cursor-follower-for-elementor' ),
				),
				'default'              => 'inherit',
				'selectors_dictionary' => array(
					'inherit'    => 'inherit',
					'normal'     => 'normal',
					'difference' => 'difference',
					'exclusion'  => 'exclusion',
				),
				'selectors'            => array(
					'{{WRAPPER}} .arts-cursor[data-cursor-highlight]' => '--arts-cursor-blend-mode: {{VALUE}};',
				),
				'condition'            => $this->condition_effect( 'arts_cursor_highlight_enabled' ),
			)
		);

		$this->end_controls_section();
	}

	private function add_section_magnetic(): void {
		$this->start_controls_section(
			'arts_cursor_section_magnetic',
			array(
				'label' => esc_html__( 'Magnetic', 'cursor-follower-for-elementor' ),
				'tab'   => $this->get_id(),
			)
		);

		$this->add_control(
			'arts_cursor_magnetic_strength',
			array(
				'label'       => esc_html__( 'Strength', 'cursor-follower-for-elementor' ),
				'description' => esc_html__( 'Tunes every magnet on the site. Magnetism itself is switched on per widget, in its Cursor Effects section.', 'cursor-follower-for-elementor' ),
				'type'        => Controls_Manager::SLIDER,
				'size_units'  => array( 'x' ),
				'range'       => array(
					'x' => array(
						'min'  => 0.05,
						'max'  => 1,
						'step' => 0.05,
					),
				),
				'default'     => array(
					'unit' => 'x',
					'size' => 0.25,
				),
				'frontend_available' => true,
			)
		);

		$this->add_control(
			'arts_cursor_magnetic_release',
			array(
				'label'      => esc_html__( 'Release Distance', 'cursor-follower-for-elementor' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => array( 'px' ),
				'range'      => array(
					'px' => array(
						'min'  => 40,
						'max'  => 400,
						'step' => 10,
					),
				),
				'default'    => array(
					'unit' => 'px',
					'size' => 120,
				),
				'frontend_available' => true,
			)
		);

		// Re-point the cursor's OWN colour vars, scoped to the state attribute, the
		// way the Link Highlight section does — rather than inventing a magnetic var
		// and a stylesheet rule to consume it. That keeps the whole override inside
		// kit CSS, which Elementor regenerates live; a rule in the plugin's own
		// stylesheet would only arrive when that file is re-fetched.
		// Empty emits nothing, so the normal colours stand until one is set.
		$this->add_control(
			'arts_cursor_magnetic_background_color',
			array(
				'label'       => esc_html__( 'Background Color', 'cursor-follower-for-elementor' ),
				'description' => esc_html__( 'Set Border Color too if you set this — the default ring borrows the background color and would vanish with it.', 'cursor-follower-for-elementor' ),
				'type'        => Controls_Manager::COLOR,
				'selectors'   => array(
					'{{WRAPPER}} .arts-cursor[data-cursor-magnetic]' => '--arts-cursor-background-color: {{VALUE}};',
				),
			)
		);

		$this->add_control(
			'arts_cursor_magnetic_border_width',
			array(
				'label'      => esc_html__( 'Border Width', 'cursor-follower-for-elementor' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => array( 'px' ),
				'range'      => array(
					'px' => array(
						'min'  => 0,
						'max'  => 10,
						'step' => 1,
					),
				),
				'selectors'  => array(
					'{{WRAPPER}} .arts-cursor[data-cursor-magnetic]' => '--arts-cursor-border-width: {{SIZE}}{{UNIT}};',
				),
			)
		);

		$this->add_control(
			'arts_cursor_magnetic_border_color',
			array(
				'label'     => esc_html__( 'Border Color', 'cursor-follower-for-elementor' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => array(
					'{{WRAPPER}} .arts-cursor[data-cursor-magnetic]' => '--arts-cursor-border-color: {{VALUE}};',
				),
			)
		);

		// Default Inherit, like the highlight blend. No condition: magnetic has no
		// global toggle — enabling is per widget.
		$this->add_control(
			'arts_cursor_magnetic_blend_mode',
			array(
				'label'                => esc_html__( 'Blend Mode', 'cursor-follower-for-elementor' ),
				'type'                 => Controls_Manager::SELECT,
				'options'              => array(
					'inherit'    => esc_html__( 'Inherit', 'cursor-follower-for-elementor' ),
					'normal'     => esc_html__( 'Normal', 'cursor-follower-for-elementor' ),
					'difference' => esc_html__( 'Difference', 'cursor-follower-for-elementor' ),
					'exclusion'  => esc_html__( 'Exclusion', 'cursor-follower-for-elementor' ),
				),
				'default'              => 'inherit',
				'selectors_dictionary' => array(
					'inherit'    => 'inherit',
					'normal'     => 'normal',
					'difference' => 'difference',
					'exclusion'  => 'exclusion',
				),
				'selectors'            => array(
					'{{WRAPPER}} .arts-cursor[data-cursor-magnetic]' => '--arts-cursor-blend-mode: {{VALUE}};',
				),
			)
		);

		$this->end_controls_section();
	}

	/**
	 * Loading is a state like the others, so it gets the states treatment. The
	 * uniform appearance kit is deliberately absent: while loading, the stylesheet
	 * blanks the circle with literal `transparent` (not var-driven), so
	 * background/border overrides here would be dead declarations. Future loading
	 * features land in this section when built.
	 */
	private function add_section_loading(): void {
		$this->start_controls_section(
			'arts_cursor_section_loading',
			array(
				'label' => esc_html__( 'Loading', 'cursor-follower-for-elementor' ),
				'tab'   => $this->get_id(),
			)
		);

		$this->add_control(
			'arts_cursor_loading_color',
			array(
				'label'     => esc_html__( 'Spinner Color', 'cursor-follower-for-elementor' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => array(
					'{{WRAPPER}} .arts-cursor' => '--arts-cursor-loading-color: {{VALUE}};',
				),
			)
		);

		$this->end_controls_section();
	}
}
