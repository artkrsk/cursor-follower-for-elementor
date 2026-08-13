<?php

namespace Arts\CursorFollower;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Reads the JS-bound kit settings and emits exactly the `CursorOptions`
 * shape the boot script consumes — no mapping layer in TS for the load
 * path. Selectors-based Appearance/duration controls never pass through
 * here: Elementor prints them into kit CSS as the public --arts-cursor-*
 * variables.
 *
 * Without Elementor (or before a kit exists) keys are resolved to their
 * control defaults, matching the engine's own defaults.
 */
class Options {

	/** @return array<string, mixed> */
	public static function build(): array {
		$options = array(
			'trailing' => self::size_of( 'arts_cursor_trailing', 0.2 ),
		);

		$options['elastic'] = self::is_on( 'arts_cursor_elastic_enabled', true )
			? array( 'strength' => self::size_of( 'arts_cursor_elastic_strength', 1.5 ) )
			: false;

		// Magnetic is always on globally now; per-widget Cursor Follower controls
		// gate it via marker classes. Site Settings keeps only the tuning.
		$options['magnetic'] = array(
			'strength'      => self::size_of( 'arts_cursor_magnetic_strength', 0.25 ),
			'releaseRadius' => self::size_of( 'arts_cursor_magnetic_release', 120 ),
			'elementScale'  => self::size_of( 'arts_cursor_magnetic_element_scale', 1 ),
		);

		$options['highlight'] = self::is_on( 'arts_cursor_highlight_enabled', true )
			? array( 'scale' => self::size_of( 'arts_cursor_highlight_size', 80 ) . 'px' )
			: false;

		$options['pressScale'] = self::is_on( 'arts_cursor_press_enabled', true )
			? array(
				'scale' => array(
					'ref'    => 'cursor',
					'factor' => self::size_of( 'arts_cursor_press_scale', 0.8 ),
				),
			)
			: false;

		// Zero-config Elementor widget rules, grouped by widget scope. Within a
		// group, a rule's `selector` is scope-relative (`:scope` = the widget root,
		// the default when omitted) and `payload.anchor` redirects the effect to
		// another element resolved within the hovered widget instance. Structural
		// effects only; enabling is per-widget now, via a marker class the Cursor
		// Effects section stamps on the widget wrapper. The polarity follows the
		// widget's default: a purpose-built one defaults on and its scope EXCLUDES
		// `-off`, a generic one defaults off and its scope REQUIRES `-on`. Either
		// way an element that isn't covered falls back to regular behavior. The
		// 'target' scale resizes the cursor to the element size × factor.
		// Filterable below.
		$icon_magnet = array(
			'magnetic' => true,
			'scale'    => array(
				'ref'    => 'target',
				'factor' => 1.2,
			),
		);

		// Carousel nav arrows / pagination dots: magnet + resize the cursor to wrap
		// the control at whatever size it's set to ('target' reads the real rendered
		// size), with a px floor so tiny dots don't shrink the cursor to nothing.
		$control_magnet = array(
			'magnetic' => true,
			'scale'    => array(
				'ref'    => 'target',
				'factor' => 2,
				'min'    => '20px',
			),
		);

		// The cursor COLLAPSES on a button instead of resizing to it. A button draws
		// its own outline, so a ring sitting across that outline reads as two shapes
		// arguing rather than one cursor; a ring wrapping the element only works
		// where the element has no boundary of its own, like a bare icon or a dot.
		// Nothing is lost by hiding it: magnetic pulls the element toward the pointer
		// and its own hover and press states still play, so the feedback is the
		// button itself. The OS cursor stays visible, so there's still a pointer.
		// No `highlight` key either — ruleEnabled drops a highlight-bearing rule
		// while the global Highlight toggle is off, taking the magnet with it.
		$button_magnet = array(
			'magnetic' => true,
			'scale'    => '0px',
		);

		// Every carousel gets the same shape, so it's stated once: the controls
		// magnetize, then the swiper TRACK carries the drag pill — `.swiper-wrapper`
		// rather than the widget root, because that is the element Swiper binds its
		// touch handlers to (Swiper's own default touchEventsTarget: 'wrapper' —
		// Elementor never overrides it) and it discards any gesture starting
		// outside it. Keyed on the root, the pill promised a drag
		// on the pagination strip and the outside-position padding that Swiper then
		// refuses. Anything a particular carousel adds goes BETWEEN the control
		// rules and the drag rules, because order is priority — resolveTarget
		// returns the FIRST rule that matches, and the drag rule matches the whole
		// track, so a rule for something NON-INTERACTIVE inside it has to come
		// first or it can never be reached. A link or button is exempt from that
		// ordering: resolveTarget skips a rule matched on an ancestor once the
		// hovered element is itself interactive, so a slide's own anchor gets its
		// highlight (or a later rule) past the drag rule regardless of position.
		$carousel_scope = static function ( string $widget, array $extra = array() ) use ( $control_magnet ) {
			return array(
				'scope' => ".elementor-widget-{$widget}",
				'rules' => array_merge(
					array(
						// `.elementor-swiper-button` matches both prev + next.
						array(
							'selector' => ':scope:not(.arts-cursor-arrows-off) .elementor-swiper-button',
							'payload'  => $control_magnet,
						),
						array(
							'selector' => ':scope:not(.arts-cursor-dots-off) .swiper-pagination-bullet',
							'payload'  => $control_magnet,
						),
					),
					$extra,
					array(
						// The slides, in three styles branched on the Style select's
						// marker class (Cursor Effects → Drag Hint → Style). All three
						// selectors match the same `.swiper-wrapper` and order is
						// priority, so the styled rules must sit before the default
						// one. The payloads live in drag_payload(), shared with the
						// lightbox.
						//
						// Only the labeled styles carry the label/icon vars — a typed
						// hint must never leak into the label-less style. A
						// per-instance Drag Label (Cursor Effects) writes the var named
						// here; naming it on these rules alone keeps a custom label off
						// the arrows/dots above, which share this scope root.
						array(
							'selector' => ':scope:not(.arts-cursor-drag-off).arts-cursor-drag-style-arrows .swiper-wrapper',
							'payload'  => self::drag_payload( 'arrows' ),
						),
						array(
							'selector' => ':scope:not(.arts-cursor-drag-off).arts-cursor-drag-style-always .swiper-wrapper',
							'payload'  => self::drag_payload( 'always' ),
							'labelVar' => '--arts-cursor-drag-label',
							'iconVar'  => '--arts-cursor-drag-icon',
						),
						array(
							'selector' => ':scope:not(.arts-cursor-drag-off) .swiper-wrapper',
							'payload'  => self::drag_payload( 'label' ),
							'labelVar' => '--arts-cursor-drag-label',
							'iconVar'  => '--arts-cursor-drag-icon',
						),
					)
				),
			);
		};

		$options['targetScopes'] = array(
			array(
				'scope' => '.elementor-widget-icon-box:not(.arts-cursor-magnetic-off)',
				'rules' => array(
					// Follow interactivity, not Elementor's (whole-widget) hover
					// color: engage on the linked icon itself. Unlinked box → icon
					// is a <span>, not a.elementor-icon → no match → no effect.
					array(
						'selector' => ':scope a.elementor-icon',
						'payload'  => $icon_magnet,
					),
					// Cousin-targeting, interactive-only: hover the title LINK,
					// magnetize the icon in the other branch (anchor resolved within
					// this widget instance). Requires the `<a>`, so a decorative
					// (unlinked) icon box gets no cursor effect.
					array(
						'selector' => ':scope .elementor-icon-box-title a',
						'payload'  => array_merge( $icon_magnet, array( 'anchor' => ':scope .elementor-icon' ) ),
					),
				),
			),
			array(
				// Opt-IN, so the marker is required rather than excluded: a bare icon
				// is generic enough that magnetising every one on a site would be
				// presumptuous. Gating at the scope also keeps the geometry pre-warm
				// off icons nobody opted in.
				'scope' => '.elementor-widget-icon.arts-cursor-magnetic-on',
				'rules' => array(
					array(
						'selector' => ':scope a.elementor-icon',
						'payload'  => $icon_magnet,
					),
				),
			),
			array(
				// COLLAPSED rather than wrapped, because the rendered size isn't ours
				// to predict. Every other wrapped control has a size we can reason
				// about — a bullet is a bullet — but a social icon's box comes from
				// the widget stylesheet's own fallbacks (25px glyph + .5em padding a
				// side, so ~50px) and themes routinely override it; measured at 16px
				// on the site this was built against. Any wrap factor is then right
				// at one size and wrong at another, while a collapse reads the same
				// at every size and leaves the icon's own fill and hover state as the
				// feedback — the same reasoning as the button rules above, reached
				// from size rather than from outline.
				//
				// On by default, so the marker is EXCLUDED rather than required.
				//
				// `a.` gates nothing here, unlike on Icon and Icon Box: this widget
				// hardcodes the anchor and only adds or omits the href, so an
				// unlinked item is still an <a>. Kept for symmetry and because the
				// class alone is ambiguous — these anchors also carry
				// `elementor-icon`, which is what the two rules above match. The
				// widget scope is what keeps them apart, so don't loosen it.
				'scope' => '.elementor-widget-social-icons:not(.arts-cursor-magnetic-off)',
				'rules' => array(
					array(
						'selector' => ':scope a.elementor-social-icon',
						'payload'  => $button_magnet,
					),
				),
			),
			array(
				// Opt-in like the bare icon. The tag is always an <a> here (unlinked
				// only swaps the href for role="button"), so requiring it wouldn't
				// gate on interactivity the way it does for an icon — and it needn't,
				// since reaching this rule at all means someone asked for it.
				'scope' => '.elementor-widget-button.arts-cursor-magnetic-on',
				'rules' => array(
					array(
						'selector' => ':scope a.elementor-button',
						'payload'  => $button_magnet,
					),
				),
			),
			// The two boxes that own a button. Same magnet, and the `a.` is doing the
			// real work here rather than reading as decoration: both widgets let the
			// link sit on the BOX instead, and Elementor swaps the tags when it does —
			// the button becomes a <span> and the box becomes the anchor, never both.
			// So requiring an anchor IS the box-vs-button switch, read off the markup
			// instead of re-derived from a setting, and a box-linked instance simply
			// falls through to the ordinary link highlight, which is the intent.
			array(
				'scope' => '.elementor-widget-call-to-action.arts-cursor-magnetic-on',
				'rules' => array(
					array(
						'selector' => ':scope a.elementor-cta__button',
						'payload'  => $button_magnet,
					),
				),
			),
			array(
				// The button lives on the back face, so the magnet can only engage once
				// the flip has revealed it — which is the same hover that triggers the
				// flip. Its layer is rotated 180° at REST, which would mirror a pull,
				// but the flip rotates it back to 0 to show it: the space is unmirrored
				// exactly while the magnet is live.
				'scope' => '.elementor-widget-flip-box.arts-cursor-magnetic-on',
				'rules' => array(
					array(
						'selector' => ':scope a.elementor-flip-box__button',
						'payload'  => $button_magnet,
					),
				),
			),
			$carousel_scope( 'image-carousel' ),
			// Pro. Same Swiper markup as the free carousel — Elementor Pro's carousel
			// base prints the identical arrow/bullet/slide classes — so the shared
			// rules match as they are. What's extra is that a slide can LINK.
			$carousel_scope(
				'media-carousel',
				array(
					// Told apart the way the Image widget's two states are, and for the
					// same reason: a lightbox enlarges in place, a custom URL navigates
					// away. Keyed on the attribute and NOT on `.elementor-clickable` —
					// Media Carousel adds that only under is_edit_mode(), the very trap
					// the Image rules were caught by. `:has(img)` is no use here either:
					// this widget paints its slide as a background-image <div>, not an
					// <img>, so the anchor inside .swiper-slide is the stable handle.
					array(
						'selector' => ':scope.arts-cursor-media-on .swiper-slide a[data-elementor-open-lightbox]',
						'payload'  => array(
							'shape' => 'pill',
							'label' => __( 'Zoom', 'cursor-follower-for-elementor' ),
						),
						'labelVar' => '--arts-cursor-media-label',
						'iconVar'  => '--arts-cursor-media-icon',
					),
					array(
						'selector' => ':scope.arts-cursor-media-on .swiper-slide a:not([data-elementor-open-lightbox])',
						'payload'  => array(
							'shape' => 'pill',
							'label' => __( 'View', 'cursor-follower-for-elementor' ),
						),
						'labelVar' => '--arts-cursor-media-label',
						'iconVar'  => '--arts-cursor-media-icon',
					),
				)
			),
			// Pro. Nothing in a testimonial is ever linked, so there is no link state
			// to tell apart — the shared set is the whole integration.
			$carousel_scope( 'testimonial-carousel' ),
			// Pro. The drag pill covers the slide surface like every carousel here,
			// but a linked slide's own <a>, or a CTA button on a slide whose
			// link_click makes it the anchor, are interactive on their own — the
			// engine never lets the drag rule (an ancestor match) claim them, so
			// without a rule they fall to the ordinary link highlight.
			//
			// The button gets more by default: the standalone Button's collapse
			// magnet, in BOTH link modes — as the anchor itself (link_click:
			// button), or as the <div> inside the whole-slide <a>, where it is
			// still the visual click target. One selector list covers the pair; a
			// button on a slide with no link matches neither branch and stays
			// under the pill. Switched off, the rule drops and the interactive
			// fallback takes over again.
			$carousel_scope(
				'slides',
				array(
					array(
						'selector' => ':scope:not(.arts-cursor-magnetic-off) a.elementor-slide-button, :scope:not(.arts-cursor-magnetic-off) a.swiper-slide-inner .elementor-slide-button',
						'payload'  => $button_magnet,
					),
				)
			),
			// Pro's newer "Carousel" (get_name() `nested-carousel`), on the
			// nested-elements base. `n-carousel` and not `nested-carousel` is not a
			// typo: this widget overrides get_html_wrapper_class(), so it is the only
			// one whose root class isn't `elementor-widget-{name}` — the CONTROLS
			// hook still keys off the name (see WidgetControls), the scope keys off
			// the class, and here the two differ.
			//
			// It prints the same arrows and bullets as the four above, so the shared
			// set transfers whole. One difference that only makes life easier: it
			// renders them as SIBLINGS of the `.swiper` rather than children, so
			// unlike the others their hover area isn't clipped by that
			// `overflow: hidden`.
			$carousel_scope( 'n-carousel' ),
			array(
				// One link drives BOTH anchors this widget prints — the thumbnail's
				// (tabindex="-1") and the title's — so the hint belongs on either and
				// there's no state to tell apart the way the Image widget has: they
				// cannot be linked independently, it's one `link` setting or nothing.
				//
				// Hence one rule with a selector LIST rather than two rules sharing a
				// payload. Every branch has to carry its own `:scope`: the expansion
				// is a plain replace, so a branch without it keeps no scope at all and
				// would match that class anywhere on the page.
				//
				// Named rather than a bare `:scope a`, because the description is
				// arbitrary author HTML and a link inside it is not this box's link.
				//
				// No magnetic rule, deliberately — see add_image_box_controls: pulling
				// a thumbnail this size reads as the layout lurching, not as a cursor
				// reaching.
				'scope' => '.elementor-widget-image-box.arts-cursor-box-on',
				'rules' => array(
					array(
						'selector' => ':scope .elementor-image-box-img a, :scope .elementor-image-box-title a',
						'payload'  => array(
							'shape' => 'pill',
							'label' => __( 'View', 'cursor-follower-for-elementor' ),
						),
						'labelVar' => '--arts-cursor-box-label',
						'iconVar'  => '--arts-cursor-box-icon',
					),
				),
			),
			array(
				// Opt-in: a linked image ALREADY answers the pointer with the link
				// highlight, so unlike the other widgets this replaces an effect
				// rather than adding one, and shouldn't presume.
				//
				// The two link states get their own wording because they promise
				// different things — a media file enlarges in place, a custom URL
				// navigates away — and they're told apart by the attribute Elementor
				// only writes for the lightbox path. An image is only ever in ONE of
				// the two states, so both rules share one pair of vars: whichever
				// state an instance is in picks the override up.
				//
				// Matched by the anchor WRAPPING THE IMAGE rather than by a class.
				// `elementor-clickable` looks like the obvious hook and is not one:
				// Image adds it only under is_edit_mode(), so keying on it worked in
				// the editor and never once on the front end. `:has(img)` also keeps
				// the hint off a link inside a caption, which is a sibling of this
				// anchor rather than part of it.
				'scope' => '.elementor-widget-image.arts-cursor-image-on',
				'rules' => array(
					array(
						'selector' => ':scope a[data-elementor-open-lightbox]:has(img)',
						'payload'  => array(
							'shape' => 'pill',
							'label' => __( 'Zoom', 'cursor-follower-for-elementor' ),
						),
						'labelVar' => '--arts-cursor-image-label',
						'iconVar'  => '--arts-cursor-image-icon',
					),
					array(
						'selector' => ':scope a:not([data-elementor-open-lightbox]):has(img)',
						'payload'  => array(
							'shape' => 'pill',
							'label' => __( 'View', 'cursor-follower-for-elementor' ),
						),
						'labelVar' => '--arts-cursor-image-label',
						'iconVar'  => '--arts-cursor-image-icon',
					),
				),
			),
			array(
				'scope' => '.elementor-widget-portfolio',
				'rules' => array(
					// Filter buttons are <li> (not <a>/<button>), so the built-in
					// interactive selector never auto-highlights them — opt them in
					// declaratively so they read like the links they act as.
					array(
						'selector' => ':scope .elementor-portfolio__filter',
						'payload'  => array( 'highlight' => true ),
					),
					// The card is one big anchor; a "View Project" pill follows the
					// cursor across it. Requiring the <a> keeps the pill off the JS
					// ghost-filler tiles and the filter <li>s above. No magnetic —
					// a following label suits a card-sized element better than a pull.
					// Wording and on/off are per instance (Cursor Effects); the literal
					// is the fallback. Only this rule names the var, so a custom label
					// can't reach the filter buttons sharing this scope root.
					array(
						'selector' => ':scope:not(.arts-cursor-card-off) a.elementor-post__thumbnail__link',
						'payload'  => array(
							'shape' => 'pill',
							'label' => __( 'View Project', 'cursor-follower-for-elementor' ),
						),
						'labelVar' => '--arts-cursor-card-label',
						'iconVar'  => '--arts-cursor-card-icon',
					),
				),
			),
			// The two toggle controls the interactive selector can't see. Both are a
			// FIX rather than a setting — the same call as the portfolio filters above
			// — so neither carries a control and neither widget gets a Cursor Effects
			// section at all: there is nothing here to prefer.
			//
			// They still answer to the global Highlight toggle, since ruleEnabled
			// drops a highlight-bearing rule while that's off. Someone who turned
			// highlights off wants them off here too.
			array(
				// Accordion (the nested one, which is what new content gets since
				// `nested-elements` defaults active). Its header is a native
				// <summary> carrying no role, so `a, button, [role="button"]` misses
				// it and the header answers the pointer with nothing at all today.
				//
				// `n-accordion` and not `nested-accordion`: this family overrides
				// get_html_wrapper_class(), same as the nested Carousel.
				'scope' => '.elementor-widget-n-accordion',
				'rules' => array(
					array(
						'selector' => ':scope .e-n-accordion-item-title',
						'payload'  => array( 'highlight' => true ),
					),
				),
			),
			array(
				// Legacy Tabs: `role="tab"`, which is not `role="button"`, so it misses
				// too. Hidden from the panel while the `container` experiment is active
				// (the widget's own show_in_panel() gate) but still rendered by every
				// page that already had one.
				// `.elementor-tab-title` is the base class on both the desktop and the
				// mobile title.
				//
				// Legacy Accordion and Toggle need nothing — their titles are hrefless
				// <a>s, which the interactive selector already matches. Don't "fix"
				// them too.
				'scope' => '.elementor-widget-tabs',
				'rules' => array(
					array(
						'selector' => ':scope .elementor-tab-title',
						'payload'  => array( 'highlight' => true ),
					),
				),
			),
		);

		$options['targetScopes'][] = self::lightbox_scope( $control_magnet );
		$options['targetScopes'][] = self::container_scope();

		/**
		 * Filters the cursor options payload before it is printed inline.
		 *
		 * @param array<string, mixed> $options
		 */
		return apply_filters( 'arts_cursor_follower/options', $options );
	}

	/**
	 * Elementor's lightbox — the one target that isn't a widget. It's built
	 * client-side and appended to <body>, so it sits outside every widget scope
	 * above and needs its own; our rules are delegated, so DOM that appears only
	 * when a lightbox opens is matched the same as anything else.
	 *
	 * @param array<string, mixed> $control_magnet The shared nav-control payload.
	 * @return array<string, mixed>
	 */
	private static function lightbox_scope( array $control_magnet ): array {
		$rules = array();

		if ( self::is_on( 'arts_cursor_lightbox', true ) ) {
			// The arrow is NOT the thing you see: it's a full-height strip 15-20%
			// of the viewport wide, with the chevron pinned to its outer edge. Left
			// alone the magnet would anchor to the middle of that empty area, so
			// the effect is redirected to the glyph — which is what `anchor` is
			// for. The hold zone stays the strip (magneticSessions resolves the
			// TRIGGER's rect for that), so the pull engages across the whole strip
			// instead of flickering at the radius.
			//
			// One rule per direction because an anchor resolves from the SCOPE, not
			// from the trigger — a shared `> *` would find whichever arrow came
			// first in the lightbox and pull both to it.
			//
			// `> *` and not `i`: the icon is an <i> normally and an <svg> under the
			// Inline Font Icons experiment.
			foreach ( array( 'prev', 'next' ) as $side ) {
				$rules[] = array(
					'selector' => ":scope .elementor-swiper-button-{$side}",
					'payload'  => array_merge(
						$control_magnet,
						array( 'anchor' => ".elementor-swiper-button-{$side} > *" )
					),
				);
			}
		}

		// No control, and on regardless — zoom and fullscreen carry `role="switch"`,
		// which nothing in the engine's interactive selector matches, so they answer
		// the pointer with nothing at all today. Restoring that is a fix rather than
		// a preference, the same call already made for Portfolio's filter buttons.
		// Matching the role rather than the icon classes covers both toggle states
		// and both Inline-Font-Icons paths at once.
		$rules[] = array(
			'selector' => ':scope [role="switch"]',
			'payload'  => array( 'highlight' => true ),
		);

		if ( self::is_on( 'arts_cursor_lightbox_drag', true ) ) {
			// The kit twin of the per-widget Drag Hint (LightboxControls): no
			// widget wrapper exists here to stamp a marker class on, so the style
			// is a plain kit value branched right now instead of selector-branched.
			// Keyed on `.swiper-wrapper` for the same Swiper fact the carousel
			// scope states: a gesture starting outside the wrapper is discarded,
			// and the lightbox nests its whole chrome — header with the share and
			// zoom/fullscreen toggles, counter, arrows, footer — INSIDE the swiper
			// container but OUTSIDE the wrapper, so keying the container promised
			// drags there that Swiper then refused. The two mode classes land on
			// the container and gate the pill off while slides can't change:
			// zoom-mode flips allowTouchMove off (a wrapper drag only pans the
			// zoomed image), share-mode detaches Swiper's listeners entirely.
			// Only a slideshow with somewhere to drag TO gets the hint — a
			// single-media lightbox renders one slide, and a Drag pill over it
			// would promise navigation that doesn't exist, so the selector demands
			// a second slide via :has() (an engine without :has() just never
			// matches the rule: hint absent, nothing else affected). Both
			// container spellings cover Elementor's legacy/latest Swiper markup.
			// Broadest hover zone in this scope, so it stays last.
			$style   = self::kit_value( 'arts_cursor_lightbox_drag_style' );
			$rules[] = array(
				'selector' => ':scope :is(.swiper, .swiper-container):not(.elementor-slideshow--zoom-mode, .elementor-slideshow--share-mode) .swiper-wrapper:has(.swiper-slide + .swiper-slide)',
				'payload'  => self::drag_payload( is_string( $style ) ? $style : 'label' ),
			);
		}

		return array(
			'scope' => '.elementor-lightbox',
			'rules' => $rules,
		);
	}

	/**
	 * A whole Container as one target — the section-wide hint (ContainerControls).
	 *
	 * LAST in targetScopes, and that placement is load-bearing. Order is priority
	 * across the flattened rule list, and this rule's trigger is an ancestor of
	 * everything a container holds. A link or button inside protects itself (a
	 * rule matched on an ancestor never claims an interactive element), but a
	 * carousel's `.swiper-wrapper` is not interactive — so ahead of the widget
	 * scopes this rule would answer for it and swallow the drag hint.
	 *
	 * ONE rule covers every container on the site whatever each is set to,
	 * because the per-instance choices arrive as custom properties rather than as
	 * marker classes in the trigger. That is not an optimisation: containers nest,
	 * and `closest()` on a trigger carrying a marker class walks past a nearer
	 * container that lacks it to match a farther one that has it, so an inner
	 * container would wear its ancestor's look. A property is read off the nearest
	 * matching scope instead. `label` here is the fallback the hint vars replace
	 * per instance; `none` is the token that clears a key the payload states.
	 *
	 * @return array<string, mixed>
	 */
	private static function container_scope(): array {
		return array(
			'scope' => '.e-con.arts-cursor-container-on',
			'rules' => array(
				// No `selector`: it defaults to `:scope`, the container itself.
				array(
					'payload'   => array(
						'label' => __( 'Scroll', 'cursor-follower-for-elementor' ),
					),
					'labelVar'  => '--arts-cursor-container-label',
					'iconVar'   => '--arts-cursor-container-icon',
					'stateVars' => array(
						'shape'  => '--arts-cursor-container-shape',
						'arrows' => '--arts-cursor-container-arrows',
					),
				),
			),
		);
	}

	/**
	 * The drag-hint payload for a Style choice — shared verbatim between the
	 * carousels (selector-branched on the Style select's marker class) and the
	 * lightbox (branched server-side on the kit setting), so the styles can
	 * never drift between the two surfaces.
	 *
	 * 'arrows': a compact ‹ › pill from hover, a dot scaling up at the anchor on
	 * press. The native cursor hides from the FIRST press via the stylesheet's
	 * :has() rule (the dot replaces the pointer); the `drag` sub-payload is the
	 * fallback for engines without :has(), where the hide starts at the drag
	 * threshold. No label by design.
	 *
	 * 'always': the labeled pill with its arrows already out on hover. The
	 * `drag` duplicate keeps them stated through the gesture — the drag session
	 * snapshots {hover payload + drag diff}, so an absent key would still ride
	 * along today, but stating it makes the intent survive diff-shape changes.
	 *
	 * 'label' (the default): a "Drag" pill on hover, gaining arrows while the
	 * drag adapter holds its session. The axis is declared rather than drawn
	 * into the wording — Swiper defaults to horizontal and nothing here sets
	 * `direction`, but the wording stays axis-free regardless. The literal
	 * label is the fallback under the per-rule label/icon vars.
	 *
	 * @return array<string, mixed>
	 */
	private static function drag_payload( string $style ): array {
		if ( 'arrows' === $style ) {
			return array(
				'shape'  => 'pill',
				'arrows' => 'horizontal',
				'dot'    => true,
				'drag'   => array( 'hideNativeCursor' => true ),
			);
		}
		if ( 'always' === $style ) {
			return array(
				'shape'  => 'pill',
				'label'  => __( 'Drag', 'cursor-follower-for-elementor' ),
				'arrows' => 'horizontal',
				'drag'   => array( 'arrows' => 'horizontal' ),
			);
		}
		return array(
			'shape' => 'pill',
			'label' => __( 'Drag', 'cursor-follower-for-elementor' ),
			'drag'  => array( 'arrows' => 'horizontal' ),
		);
	}

	/** Raw kit value for a key, or null when Elementor/kit/value is absent. */
	private static function kit_value( string $key ): mixed {
		if ( ! class_exists( '\Elementor\Plugin' ) || ! \Elementor\Plugin::$instance || ! \Elementor\Plugin::$instance->kits_manager ) {
			return null;
		}
		return \Elementor\Plugin::$instance->kits_manager->get_current_settings( $key );
	}

	private static function is_on( string $key, bool $default ): bool {
		$value = self::kit_value( $key );
		if ( null === $value || '' === $value ) {
			// Switchers store '' for off once touched; distinguish never-saved
			// (null) from off ('') — Elementor returns '' for saved-off.
			return null === $value ? $default : false;
		}
		return 'yes' === $value;
	}

	private static function size_of( string $key, float $default ): float {
		$value = self::kit_value( $key );
		if ( is_array( $value ) && isset( $value['size'] ) && is_numeric( $value['size'] ) ) {
			return (float) $value['size'];
		}
		if ( is_numeric( $value ) ) {
			return (float) $value;
		}
		return $default;
	}
}
