<?php

namespace Arts\CursorFollower\Elementor;

use Elementor\Controls_Manager;
use Elementor\Controls_Stack;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Per-widget "Cursor Effects" controls, injected into a curated set of
 * Elementor widgets as the last section of the Style tab.
 *
 * Each control reflects onto the widget's OUTER wrapper (.elementor-widget-{name},
 * always printed regardless of the Optimized Markup experiment) as an
 * `arts-cursor-*` marker class via prefix_class + classes_dictionary — off adds
 * the class, on adds nothing, and Elementor toggles it live in the editor with
 * no re-render. Options::build()'s scope selectors key off those classes.
 *
 * Label text can't ride a class, so it goes through `selectors` as an
 * --arts-cursor-* custom property the engine reads off the hovered element. Same
 * reason: Elementor regenerates that CSS live in the editor, whereas an attribute
 * printed by PHP never reaches the preview at all (the editor builds the element
 * itself, so only Elementor's own class/CSS channels cross over).
 *
 * Placement: a curated (per-widget, different-controls) section can only anchor
 * on the widget's OWN sections, which all precede the hidden `common`
 * pseudo-widget's Advanced sections (Layout, Motion Effects, etc.) in
 * get_stack()'s merge — so in Advanced it would land *above* Layout,
 * unreorderable. The Style tab has no common sections, so anchoring on the
 * widget's last own section there places us cleanly last.
 */
class WidgetControls {

	use HintControls;

	/** widget name => [ the widget's own last section id, builder method ]. */
	private const WIDGETS = array(
		'icon-box'             => array( 'section_style_content', 'add_icon_box_controls' ),
		'icon'                 => array( 'section_style_icon', 'add_icon_controls' ),
		// Button_Trait only FILLS these sections; button.php opens and closes them
		// itself, so this fires under the widget's own stack name.
		'button'               => array( 'section_style', 'add_button_controls' ),
		'image-carousel'       => array( 'section_caption', 'add_carousel_controls' ),
		// section_design_filter is last despite carrying a `condition`: that gates
		// the section's VISIBILITY on show_filter_bar, not its registration, so
		// end_controls_section() always runs and this hook always fires.
		'portfolio'            => array( 'section_design_filter', 'add_portfolio_controls' ),
		'image'                => array( 'section_style_caption', 'add_image_controls' ),
		// The two Pro carousels. Both anchors were MEASURED off the registered stack,
		// not read off the widget file, because start_injection() re-splices the
		// controls array — the section a widget registers last in source routinely
		// isn't the one that ends up last. Reading the source alone gets Testimonial
		// wrong: its two injected sections look like they both land before
		// section_navigation, and section_image_style actually ends up dead last,
		// after the skin section. Re-measure rather than reason if a Pro release
		// moves them; the failure is our section sitting mid-panel, not breaking.
		'media-carousel'       => array( 'section_lightbox_style', 'add_media_carousel_controls' ),
		'testimonial-carousel' => array( 'section_image_style', 'add_carousel_controls' ),
		// Slides opens no injections at all, so unlike the two above its order is
		// simply the order it reads — measured anyway, and the two do agree here.
		// The anchor's own `condition` (navigation != none) hides IT, not ours.
		'slides'               => array( 'section_style_navigation', 'add_slides_controls' ),
		// Neither opens an injection either, and nothing else hooks them, so their
		// order reads straight — measured all the same, and both agreed.
		'call-to-action'       => array( 'hover_effects', 'add_box_button_controls' ),
		'flip-box'             => array( 'section_style_b', 'add_box_button_controls' ),
		// No injections in this one either, so its order reads straight — measured
		// anyway, and it agreed.
		'social-icons'         => array( 'section_social_hover', 'add_social_icons_controls' ),
		// Pro's newer "Carousel", built on the nested-elements base. The hook keys
		// off get_name() and so uses `nested-carousel` here — but its wrapper class
		// ISN'T `elementor-widget-{name}`: it overrides get_html_wrapper_class() to
		// `elementor-widget-n-carousel`, which is what Options::build() has to scope
		// on. Don't "tidy" either to match the other.
		//
		// This is how the whole nested-elements FAMILY behaves, not a quirk of this
		// one widget: `nested-accordion` → `elementor-widget-n-accordion`,
		// `nested-tabs` → `elementor-widget-n-tabs`. Measure the wrapper class of any
		// nested widget rather than deriving it from the name — a scope built from
		// the name matches nothing and reports nothing.
		'nested-carousel'      => array( 'section_pagination_design', 'add_carousel_controls' ),
		'image-box'            => array( 'section_style_content', 'add_image_box_controls' ),
	);

	public function register(): void {
		foreach ( self::WIDGETS as $widget => $config ) {
			list( $anchor, $method ) = $config;
			add_action( "elementor/element/{$widget}/{$anchor}/after_section_end", array( $this, $method ), 10 );
		}
		add_filter( 'elementor/files/css/property', array( $this, 'inline_font_icon_svg' ), 10, 4 );
		add_filter( 'elementor/files/css/property', array( $this, 'sanitize_hint_label' ), 10, 4 );
	}

	/**
	 * Swap a font icon's class string for its SVG, as a data-URI the engine masks.
	 *
	 * Normally the glyph is enough and costs nothing: ours is an ICONS control, so
	 * Elementor's own bookkeeping enqueues whichever icon library the page uses.
	 * But the Inline Font Icons experiment — on by default for sites first
	 * installed at 3.17+ — deliberately stops loading that webfont on the FRONT
	 * END, and a glyph with no font behind it is a blank cursor. In exactly that
	 * mode Elementor will hand back the icon's SVG, so this takes it.
	 *
	 * Runs wherever CSS is generated in PHP, which covers the front-end file. The
	 * editor's live regeneration is JS and never reaches here — which is the point:
	 * there the webfont IS loaded, so the class string is both correct and live.
	 *
	 * @param mixed                      $value        The whole control value: { value, library }.
	 * @param string                     $css_property The placeholder being resolved.
	 * @param array<int|string, string>  $matches      Placeholder match parts.
	 * @param array<string, mixed>       $control      The control's own args.
	 * @return mixed
	 */
	public function inline_font_icon_svg( $value, $css_property, $matches, $control ) {
		$name = $control['name'] ?? '';
		if ( ! is_string( $name ) || ! str_starts_with( $name, 'arts_cursor_' ) || ! str_ends_with( $name, '_icon' ) ) {
			return $value;
		}
		if ( ! is_array( $value ) ) {
			return $value;
		}
		if ( empty( $value['value'] ) || ! is_string( $value['value'] ) ) {
			return $value;
		}
		// Both guards are load-bearing, not optimisations, and each one is a fatal
		// if skipped. The data manager behind get_font_icon_svg() is only
		// constructed while the experiment is active...
		if ( ! \Elementor\Plugin::$instance->experiments->is_feature_active( 'e_font_icon_svg' ) ) {
			return $value;
		}
		// ...and it reads a `font_family` the CALLER has to resolve and set first.
		// Handed a raw control value it indexes an undefined key and calls a method
		// on null, so resolve it the way Icons_Manager::render_font_icon() does and
		// bail when the library has no SVG data behind it at all.
		$library = $value['library'] ?? '';
		if ( ! is_string( $library ) ) {
			return $value;
		}
		$family = \Elementor\Core\Page_Assets\Data_Managers\Font_Icon_Svg\Manager::get_font_family( $library );
		if ( ! $family ) {
			return $value;
		}
		$icon                = $value;
		$icon['font_family'] = $family;

		// Caught rather than left to bubble, which is not the usual house style but
		// is warranted by the blast radius: this runs while Elementor builds the CSS
		// for every page, so anything thrown here is a white screen on the whole
		// site rather than one wrong icon. The data behind this call is Elementor
		// internals — bundled Font Awesome metadata reached through a manager that
		// is not a stability-guaranteed surface — so degrade to the class string and
		// let the glyph render instead.
		try {
			$svg = \Elementor\Icons_Manager::get_font_icon_svg( $icon );
		} catch ( \Throwable $e ) {
			return $value;
		}
		if ( ! $svg || ! is_string( $svg ) ) {
			return $value;
		}
		// Percent-encoded, NOT base64, and the difference is the whole rule surviving.
		// Elementor splits a declaration block on `;` and drops the ENTIRE rule the
		// moment a fragment has no `:` in it (Stylesheet::add_rules). A base64 URI
		// carries `;base64` in its own header, so it splits into a fragment that
		// fails that test and the widget's CSS silently never gets written — no
		// warning, no partial output. rawurlencode() leaves no `;` anywhere, and the
		// `:` it does leave is harmless: the property split takes only the first one.
		$value['value'] = 'url("data:image/svg+xml,' . rawurlencode( $svg ) . '")';
		return $value;
	}

	/**
	 * Drop the three characters a typed hint cannot carry to the front end.
	 *
	 * The label rides `selectors` as a quoted CSS string, and Elementor builds
	 * that stylesheet by splitting each declaration block on ';' and discarding
	 * the WHOLE block if any fragment then has no ':' in it. So one semicolon in
	 * the wording silently costs the declaration — the engine finds no var and
	 * falls back to the rule's own wording, which reads as the editor and the
	 * front end disagreeing. A quote or a backslash gets that far but ends the
	 * CSS string early, and the browser drops the declaration instead.
	 *
	 * Removed rather than escaped, because an escape does not survive the round
	 * trip: getComputedStyle hands `"a\3B b"` back with the escape UNRESOLVED, so
	 * the cursor would display the escape sequence itself. Losing one character
	 * beats losing the whole label, and these three are the only ones at risk —
	 * every other value we emit comes from a colour picker, a slider or a select.
	 *
	 * @param mixed                      $value        The control's value; the wording, for a label.
	 * @param string                     $css_property The declaration being resolved.
	 * @param array<int|string, string>  $matches      Placeholder match parts.
	 * @param array<string, mixed>       $control      The control's own args.
	 * @return mixed
	 */
	public function sanitize_hint_label( $value, $css_property, $matches, $control ) {
		$name = $control['name'] ?? '';
		if ( ! is_string( $value ) || ! is_string( $name ) || ! str_starts_with( $name, 'arts_cursor_' ) || ! str_ends_with( $name, '_label' ) ) {
			return $value;
		}
		return str_replace( array( '\\', '"', ';' ), '', $value );
	}

	/** @param Controls_Stack $element */
	public function add_social_icons_controls( $element ): void {
		$this->start_section( $element );
		// On by default, unlike the bare Icon widget: a social row is a deliberate
		// cluster of small controls someone placed as a set, not a glyph that turns
		// up incidentally all over a page.
		$this->add_magnetic_control(
			$element,
			true,
			esc_html__( 'Pull the cursor toward each icon on hover.', 'cursor-follower-for-elementor' )
		);
		$element->end_controls_section();
	}

	/** @param Controls_Stack $element */
	public function add_icon_box_controls( $element ): void {
		$this->start_section( $element );
		$this->add_magnetic_control(
			$element,
			true,
			esc_html__( 'Pull the cursor toward the linked icon on hover.', 'cursor-follower-for-elementor' )
		);
		$element->end_controls_section();
	}

	/** @param Controls_Stack $element */
	public function add_icon_controls( $element ): void {
		$this->start_section( $element );
		// Off by default: an icon is a generic atom that turns up all over a page,
		// and magnetism suits a deliberate accent, not every glyph on the site.
		$this->add_magnetic_control(
			$element,
			false,
			esc_html__( 'Pull the cursor toward the icon on hover. Needs a link.', 'cursor-follower-for-elementor' )
		);
		$element->end_controls_section();
	}

	/**
	 * Call to Action and Flip Box: the same button magnet, worded for a widget
	 * that can move its link OFF the button.
	 *
	 * Both let the site owner put the link on the whole box instead, and when they
	 * do, the button stops being a link at all — so this control genuinely does
	 * nothing there, and the description has to say so rather than leave someone
	 * toggling a dead switch.
	 *
	 * @param Controls_Stack $element
	 */
	public function add_box_button_controls( $element ): void {
		$this->start_section( $element );
		$this->add_magnetic_control(
			$element,
			false,
			esc_html__( 'Pull the cursor toward the button on hover. Has no effect while the link is set on the whole box.', 'cursor-follower-for-elementor' )
		);
		$element->end_controls_section();
	}

	/** @param Controls_Stack $element */
	public function add_button_controls( $element ): void {
		$this->start_section( $element );
		// Off by default, like the bare icon: a button already answers the pointer
		// with the link highlight, and magnetising every one would be presumptuous.
		$this->add_magnetic_control(
			$element,
			false,
			esc_html__( 'Pull the cursor toward the button on hover.', 'cursor-follower-for-elementor' )
		);
		$element->end_controls_section();
	}

	/** @param Controls_Stack $element */
	public function add_carousel_controls( $element ): void {
		$this->start_section( $element );
		$this->add_carousel_core_controls( $element );
		$element->end_controls_section();
	}

	/**
	 * Slides: the shared carousel set, plus the standalone Button's magnet for
	 * the CTA button. On by default, unlike that widget: on a drag surface the
	 * button is the one certain click target, and the pull is what tells it
	 * apart from the draggable ground it sits on.
	 *
	 * @param Controls_Stack $element
	 */
	public function add_slides_controls( $element ): void {
		$this->start_section( $element );
		$this->add_carousel_core_controls( $element );
		$this->add_magnetic_control(
			$element,
			true,
			esc_html__( 'Pull the cursor toward the slide button on hover. When off, the button keeps the usual link highlight.', 'cursor-follower-for-elementor' )
		);
		$element->end_controls_section();
	}

	/**
	 * Media Carousel: the shared carousel set, plus a hint for a slide that links.
	 *
	 * @param Controls_Stack $element
	 */
	public function add_media_carousel_controls( $element ): void {
		$this->start_section( $element );
		$this->add_carousel_core_controls( $element );

		// Opt-in, for the same reason the Image widget's is: this REPLACES the drag
		// pill on the slides that carry a link rather than adding to nothing. Left
		// off, a linked slide behaves exactly as one in an Image Carousel does.
		$element->add_control(
			'arts_cursor_media',
			array(
				'label'              => esc_html__( 'Hint On Linked Slides', 'cursor-follower-for-elementor' ),
				'description'        => esc_html__( 'Show a hint over a slide that opens a lightbox or a link, instead of the drag hint.', 'cursor-follower-for-elementor' ),
				'type'               => Controls_Manager::SWITCHER,
				'default'            => '',
				'classes_dictionary' => array( 'yes' => 'on' ),
				'prefix_class'       => 'arts-cursor-media-',
			)
		);

		// One group for both link states, as on the Image widget: a slide is only
		// ever in one of them, so whichever it is picks the override up.
		$this->add_hint_controls(
			$element,
			'media',
			esc_html__( 'Zoom', 'cursor-follower-for-elementor' ),
			'fas fa-search',
			array( 'arts_cursor_media' => 'yes' )
		);

		$element->end_controls_section();
	}

	/**
	 * The set every carousel shares: magnetic arrows, magnetic dots, drag hint.
	 * No section of its own, so a widget can add to it before closing.
	 *
	 * @param Controls_Stack $element
	 */
	private function add_carousel_core_controls( Controls_Stack $element ): void {
		$element->add_control(
			'arts_cursor_arrows',
			array(
				'label'              => esc_html__( 'Magnetic Arrows', 'cursor-follower-for-elementor' ),
				'description'        => esc_html__( 'Pull the cursor to the prev/next arrows on hover.', 'cursor-follower-for-elementor' ),
				'type'               => Controls_Manager::SWITCHER,
				'default'            => 'yes',
				'classes_dictionary' => array(
					'yes' => '',
					''    => 'off',
				),
				'prefix_class'       => 'arts-cursor-arrows-',
			)
		);

		$element->add_control(
			'arts_cursor_dots',
			array(
				'label'              => esc_html__( 'Magnetic Dots', 'cursor-follower-for-elementor' ),
				'type'               => Controls_Manager::SWITCHER,
				'default'            => 'yes',
				'classes_dictionary' => array(
					'yes' => '',
					''    => 'off',
				),
				'prefix_class'       => 'arts-cursor-dots-',
			)
		);

		// Its own switch rather than "clear the text to disable": an empty label
		// means "use the default wording", which can't also mean "no effect".
		$element->add_control(
			'arts_cursor_drag',
			array(
				'label'              => esc_html__( 'Drag Hint', 'cursor-follower-for-elementor' ),
				'description'        => esc_html__( 'Show a hint over the slides while they can be dragged.', 'cursor-follower-for-elementor' ),
				'type'               => Controls_Manager::SWITCHER,
				'default'            => 'yes',
				'classes_dictionary' => array(
					'yes' => '',
					''    => 'off',
				),
				'prefix_class'       => 'arts-cursor-drag-',
			)
		);

		// Each style is a marker class Options.php branches its drag payloads on
		// (first matching rule wins there, so the styled selectors sit before the
		// default one). 'label' maps to NO class so existing sites keep rendering
		// the exact markup they had before this control existed.
		$element->add_control(
			'arts_cursor_drag_style',
			array(
				'label'              => esc_html__( 'Style', 'cursor-follower-for-elementor' ),
				'description'        => esc_html__( 'Text gains arrows while dragging. Arrows Only adds a dot on press and hides the native cursor.', 'cursor-follower-for-elementor' ),
				'type'               => Controls_Manager::SELECT,
				'default'            => 'label',
				'options'            => array(
					'label'  => esc_html__( 'Text', 'cursor-follower-for-elementor' ),
					'always' => esc_html__( 'Text + Arrows', 'cursor-follower-for-elementor' ),
					'arrows' => esc_html__( 'Arrows Only', 'cursor-follower-for-elementor' ),
				),
				'condition'          => array( 'arts_cursor_drag' => 'yes' ),
				'classes_dictionary' => array(
					'label'  => '',
					'always' => 'always',
					'arrows' => 'arrows',
				),
				'prefix_class'       => 'arts-cursor-drag-style-',
			)
		);

		$this->add_hint_controls(
			$element,
			'drag',
			esc_html__( 'Drag', 'cursor-follower-for-elementor' ),
			'fas fa-arrows-alt-h',
			array(
				'arts_cursor_drag'        => 'yes',
				// The arrows-only style has no text/icon slot to fill.
				'arts_cursor_drag_style!' => 'arrows',
			)
		);
	}

	/** @param Controls_Stack $element */
	public function add_portfolio_controls( $element ): void {
		$this->start_section( $element );

		// The filter buttons aren't represented here on purpose: highlighting them
		// patches markup that gives non-anchor controls no interactive semantics,
		// so it isn't a preference to switch. Only the card label is.
		$element->add_control(
			'arts_cursor_card',
			array(
				'label'              => esc_html__( 'Card Label', 'cursor-follower-for-elementor' ),
				'description'        => esc_html__( 'Show a pill following the cursor across a linked item.', 'cursor-follower-for-elementor' ),
				'type'               => Controls_Manager::SWITCHER,
				'default'            => 'yes',
				'classes_dictionary' => array(
					'yes' => '',
					''    => 'off',
				),
				'prefix_class'       => 'arts-cursor-card-',
			)
		);

		$this->add_hint_controls(
			$element,
			'card',
			esc_html__( 'View Project', 'cursor-follower-for-elementor' ),
			'fas fa-arrow-right',
			array( 'arts_cursor_card' => 'yes' )
		);

		$element->end_controls_section();
	}

	/**
	 * The magnetic switcher, in whichever polarity the widget's default calls for.
	 * A purpose-built widget defaults ON and marks itself when switched OFF, so its
	 * rule excludes the marker; a generic one defaults OFF and marks itself when
	 * switched ON, so its rule requires it. Either way the class exists only in the
	 * NON-default state, which is what keeps an untouched widget unmarked.
	 *
	 * @param Controls_Stack $element
	 * @param string         $description Already escaped by the caller.
	 */
	private function add_magnetic_control(
		Controls_Stack $element,
		bool $on_by_default,
		string $description
	): void {
		$element->add_control(
			'arts_cursor_magnetic',
			array(
				'label'              => esc_html__( 'Magnetic Effect', 'cursor-follower-for-elementor' ),
				'description'        => $description,
				'type'               => Controls_Manager::SWITCHER,
				'default'            => $on_by_default ? 'yes' : '',
				// A value the dictionary maps to '' is skipped, so only the
				// non-default state ever reaches the wrapper as a class.
				'classes_dictionary' => $on_by_default
					? array(
						'yes' => '',
						''    => 'off',
					)
					: array( 'yes' => 'on' ),
				'prefix_class'       => 'arts-cursor-magnetic-',
			)
		);
	}

	/** @param Controls_Stack $element */
	public function add_image_controls( $element ): void {
		$this->start_section( $element );

		// Off by default like the other generic widgets — and here the effect
		// REPLACES something rather than adding to nothing, since a linked image
		// already answers the pointer with the link highlight.
		$element->add_control(
			'arts_cursor_image',
			array(
				'label'              => esc_html__( 'Hint On Hover', 'cursor-follower-for-elementor' ),
				'description'        => esc_html__( 'Show a hint over a linked image instead of the usual highlight.', 'cursor-follower-for-elementor' ),
				'type'               => Controls_Manager::SWITCHER,
				'default'            => '',
				'classes_dictionary' => array( 'yes' => 'on' ),
				'prefix_class'       => 'arts-cursor-image-',
			)
		);

		$this->add_hint_controls(
			$element,
			'image',
			esc_html__( 'Zoom', 'cursor-follower-for-elementor' ),
			'fas fa-search',
			array( 'arts_cursor_image' => 'yes' )
		);

		$element->end_controls_section();
	}

	/** @param Controls_Stack $element */
	public function add_image_box_controls( $element ): void {
		$this->start_section( $element );

		// Off by default for the same reason as the Image widget: the box's link
		// already answers the pointer with the highlight, so a hint replaces an
		// effect rather than adding to nothing.
		//
		// No magnetic option here, deliberately. The other half of this widget is a
		// thumbnail that routinely runs a couple of hundred pixels wide, and pulling
		// a block that size reads as the layout lurching rather than as a cursor
		// reaching — a magnet suits a glyph or a nav control, not a card.
		$element->add_control(
			'arts_cursor_box',
			array(
				'label'              => esc_html__( 'Hint On Hover', 'cursor-follower-for-elementor' ),
				'description'        => esc_html__( 'Show a hint over the image and title instead of the usual highlight.', 'cursor-follower-for-elementor' ),
				'type'               => Controls_Manager::SWITCHER,
				'default'            => '',
				'classes_dictionary' => array( 'yes' => 'on' ),
				'prefix_class'       => 'arts-cursor-box-',
			)
		);

		$this->add_hint_controls(
			$element,
			'box',
			esc_html__( 'View', 'cursor-follower-for-elementor' ),
			'fas fa-arrow-right',
			array( 'arts_cursor_box' => 'yes' )
		);

		$element->end_controls_section();
	}
}
