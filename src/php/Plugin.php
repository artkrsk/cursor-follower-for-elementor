<?php

namespace Arts\CursorFollower;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Frontend bootstrap + Elementor Site Settings integration.
 *
 * The engine builds its own cursor markup client-side, so no PHP markup
 * printer exists. Appearance settings never pass through PHP at runtime —
 * Elementor prints them into kit CSS as the public --arts-cursor-* vars;
 * behavioral settings are printed inline as the exact CursorOptions shape
 * the boot script consumes (see Options::build()).
 */
class Plugin {
	private static ?Plugin $instance = null;

	/** Memoized `arts_cursor_follower/enabled` verdict for this request. */
	private ?bool $enabled = null;

	public static function instance(): Plugin {
		return self::$instance ??= new self();
	}

	private function __construct() {
		// Late in the head on purpose: pre-paint needs only "inside <head>"
		// (nothing paints before body content), and consumers are footer
		// scripts — so the gate sits after the meta/styles where a loader
		// belongs instead of above the page's own title.
		add_action( 'wp_head', array( $this, 'print_gate' ), 99 );
		add_filter( 'language_attributes', array( $this, 'filter_language_attributes' ) );
		add_action( 'elementor/loaded', array( $this, 'init_elementor' ) );

		// Only the standalone plugin has a Plugins-page row to attach a link
		// to — the constant comes from the bootstrap file, absent when src/php
		// is consumed as a composer package.
		if ( defined( 'ARTS_CURSOR_FOLLOWER_PLUGIN_FILE' ) ) {
			add_filter(
				'plugin_action_links_' . plugin_basename( ARTS_CURSOR_FOLLOWER_PLUGIN_FILE ),
				array( $this, 'add_plugin_action_links' )
			);
		}
	}

	public function init_elementor(): void {
		add_action( 'elementor/kit/register_tabs', array( $this, 'register_kit_tab' ) );
		add_action( 'elementor/editor/after_enqueue_scripts', array( $this, 'print_editor_bridge' ) );
		( new Elementor\WidgetControls() )->register();
		( new Elementor\LightboxControls() )->register();
	}

	/** @param \Elementor\Core\Kits\Documents\Kit $kit */
	public function register_kit_tab( $kit ): void {
		$kit->register_tab( Elementor\SiteSettingsTab::TAB_ID, Elementor\SiteSettingsTab::class );
	}

	/**
	 * Prepends "Edit with Elementor" to the plugin's row on the Plugins page,
	 * deep-linking into Site Settings — the plugin's only configuration UI,
	 * otherwise reachable just by knowing it's there. No capability check:
	 * this filter only fires for users who can already see the Plugins list.
	 *
	 * @param array<int|string, string> $links
	 * @return array<int|string, string>
	 */
	public function add_plugin_action_links( array $links ): array {
		$url = $this->site_settings_url();

		if ( '' === $url ) {
			return $links;
		}

		array_unshift(
			$links,
			sprintf(
				'<a href="%s" target="_blank" rel="noopener noreferrer">%s</a>',
				esc_url( $url ),
				esc_html__( 'Settings', 'cursor-follower-for-elementor' )
			)
		);

		return $links;
	}

	/**
	 * Editor URL that lands on our Site Settings tab, or '' when it can't be
	 * built (Elementor inactive — possible below WP 6.5 where the Requires
	 * Plugins header isn't enforced — or a fresh site with nothing edited).
	 *
	 * The editor needs an ordinary document to boot against, so `post` is the
	 * most recently edited post — the same trick Elementor's own admin-bar
	 * "Site Settings" link uses. `active-document` then switches it to the kit,
	 * and Elementor's SwitchToActiveTab hook reads `active-tab` and routes
	 * panel/global/{tab} — no JS on our side.
	 */
	private function site_settings_url(): string {
		if ( ! class_exists( '\Elementor\Plugin' ) || ! class_exists( '\Elementor\Utils' ) ) {
			return '';
		}

		$recent = \Elementor\Utils::get_recently_edited_posts_query( array( 'posts_per_page' => 1 ) );

		if ( ! $recent->post_count ) {
			return '';
		}

		$posts = $recent->get_posts();
		$post  = reset( $posts );

		if ( ! $post instanceof \WP_Post || ! \Elementor\Plugin::$instance || ! \Elementor\Plugin::$instance->kits_manager ) {
			return '';
		}

		$kit_id = \Elementor\Plugin::$instance->kits_manager->get_active_id();
		if ( ! is_scalar( $kit_id ) ) {
			return '';
		}

		return admin_url(
			'post.php?post=' . $post->ID
			. '&action=elementor&active-document=' . $kit_id
			. '&active-tab=' . Elementor\SiteSettingsTab::TAB_ID
		);
	}

	/**
	 * Prints the pre-paint gate inline on wp_head — the plugin's ONLY
	 * front-end output. Nothing is enqueued: the gate sets the <html> state
	 * classes synchronously, then fetches the stylesheet + engine itself on
	 * the first real pointer signal, so touch devices download nothing. The
	 * real asset tags are created client-side at load time, which keeps them
	 * out of the output buffer that cache/optimizer plugins rewrite.
	 *
	 * The markers are per-plugin opt-outs, none honored by the others:
	 * noptimize comments (Autoptimize), data-no-optimize (LiteSpeed),
	 * data-cfasync (Cloudflare Rocket Loader), nowprocket (WP Rocket). The
	 * tag itself deliberately carries NO id — ArtsAJAXTransitions re-executes
	 * id'd head scripts on every transition (its body-scoped id lookup misses
	 * head tags, so they always register as "new").
	 *
	 * Options ride the same block as inline JSON, not wp_localize_script:
	 * localize string-casts scalars (an effect's `false` would become "",
	 * defeating the engine's type checks); json_encode preserves types.
	 * Hosts with a non-default serialize_precision may print floats
	 * verbosely (0.20000000000000001) — cosmetic only, same value.
	 */
	public function print_gate(): void {
		if ( ! $this->is_enabled() ) {
			return;
		}

		$slug     = 'cursor-follower-for-elementor';
		$base_dir = untrailingslashit( plugin_dir_path( __FILE__ ) ) . '/libraries/' . $slug;
		$base_url = untrailingslashit( plugin_dir_url( __FILE__ ) ) . '/libraries/' . $slug;

		$gate = $base_dir . '/gate.js';
		$js   = $base_dir . '/' . $slug . '.js';
		$css  = $base_dir . '/' . $slug . '.css';

		if ( ! file_exists( $gate ) || ! file_exists( $js ) || ! file_exists( $css ) ) {
			return;
		}

		$boot = array(
			'js'     => esc_url_raw( $base_url . '/' . $slug . '.js?ver=' . filemtime( $js ) ),
			'css'    => esc_url_raw( $base_url . '/' . $slug . '.css?ver=' . filemtime( $css ) ),
			'editor' => $this->is_editor_preview(),
		);

		$code = 'window.artsCursorFollowerOptions = ' . wp_json_encode( Options::build() ) . ";\n"
			. 'window.artsCursorFollowerBoot = ' . wp_json_encode( $boot ) . ";\n"
			. file_get_contents( $gate );

		echo "<!--noptimize-->\n";
		wp_print_inline_script_tag(
			$code,
			array(
				'data-no-optimize' => '1',
				'data-cfasync'     => 'false',
				'nowprocket'       => true,
			)
		);
		echo "<!--/noptimize-->\n";
	}

	/**
	 * Lazily memoized `arts_cursor_follower/enabled` verdict — evaluated once per
	 * request, shared by the <html> class filter and the gate printer. The
	 * editor preview bypasses the filter entirely: it is the product's
	 * showroom, and a site owner's "disable on the front end" snippet must
	 * not blank it.
	 */
	private function is_enabled(): bool {
		return $this->enabled ??= $this->is_editor_preview()
			|| (bool) apply_filters( 'arts_cursor_follower/enabled', true );
	}

	/**
	 * A request disabled via `arts_cursor_follower/enabled` still gets
	 * `no-cursor-follower` on <html>: the class pair is the documented "which
	 * world" signal, and a page carrying neither class would be a third state
	 * no CSS consumer handles. It cannot ride the gate (which simply doesn't
	 * print when disabled) and cannot wait for wp_head — language_attributes
	 * renders inside the <html> tag itself. Template conditionals are already
	 * resolved by then, so filter callbacks can branch on is_checkout() and
	 * friends.
	 *
	 * @param string $output
	 */
	public function filter_language_attributes( string $output ): string {
		if ( $this->is_enabled() ) {
			return $output;
		}

		return $output . ' class="no-cursor-follower"';
	}

	/**
	 * The preview iframe loads the engine immediately: it is the product's
	 * showroom, and boot.ts's kit-change live-preview listener has to exist
	 * before the first Site Settings change — lazy loading would drop any
	 * change made before the user ever mouses over the preview.
	 */
	private function is_editor_preview(): bool {
		return class_exists( '\Elementor\Plugin' )
			&& \Elementor\Plugin::$instance->preview->is_preview_mode();
	}

	/**
	 * Inline editor bridge: forwards kit-setting changes into the preview
	 * iframe as an `arts-cursor:kit-change` CustomEvent the boot script
	 * listens for. Any `arts_cursor_*` change forwards, not just the JS-bound
	 * subset: selectors-based controls (size, border width, label typography)
	 * land as kit CSS, but the engine measures some of what that CSS produces
	 * and has to be told to re-sample it.
	 *
	 * A $e UI-After hook on `document/elements/settings`, NOT a subscription
	 * on `elementor.settings.page`: that manager (and its Backbone model) is
	 * REPLACED on every document load — opening Site Settings swaps the
	 * current document to the kit, so anything bound earlier sits on the
	 * orphaned page model and never fires for kit changes. The hook holds no
	 * references (getConditions re-reads the current document each time) and
	 * runs after Elementor has already written the new kit CSS into the
	 * preview — the same pattern core uses for its own kit live previews
	 * (lightbox, breakpoints, stretch-container).
	 */
	public function print_editor_bridge(): void {
		$script = <<<'JS'
(function () {
	var register = function () {
		var forward = function () {
			var frame = elementor.$preview && elementor.$preview[0];
			if (!frame || !frame.contentWindow) {
				return;
			}
			// The full kit attribute bag: while the kit document is current,
			// elementor.settings.page.model IS the kit's settings model.
			frame.contentWindow.dispatchEvent(
				new CustomEvent('arts-cursor:kit-change', {
					detail: { settings: elementor.settings.page.model.attributes }
				})
			);
		};
		var Watcher = class extends $e.modules.hookUI.After {
			getCommand() {
				return 'document/elements/settings';
			}
			getId() {
				return 'arts-cursor-forward-kit-settings';
			}
			getContainerType() {
				return 'document';
			}
			getConditions(args) {
				var current = elementor.documents.getCurrent();
				if (!current || 'kit' !== current.config.type) {
					return false;
				}
				var settings = (args && args.settings) || {};
				for (var key in settings) {
					if (0 === key.indexOf('arts_cursor_')) {
						return true;
					}
				}
				return false;
			}
			apply() {
				forward();
			}
		};
		$e.hooks.registerUIAfter(new Watcher());
	};
	if (window.elementor && window.$e && $e.modules && $e.modules.hookUI) {
		register();
	} else if (window.jQuery) {
		jQuery(window).on('elementor:init', register);
	}
})();
JS;

		wp_add_inline_script( 'elementor-editor', $script );
	}
}
