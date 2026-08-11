<?php
/**
 * Corrections for vendor/arts/elementor-stubs/elementor-stubs.php: these methods
 * have an empty stub body and no @return docblock, so PHPStan infers `void` and
 * flags every call site that uses the result. Confirmed against the real Elementor
 * source (core/kits/manager.php, core/page-assets/data-managers/font-icon-svg/manager.php)
 * that all of them return a value.
 */

namespace Elementor\Core\Kits;

class Manager {
	/** @return mixed */
	public function get_active_id() {}

	/**
	 * @param string|null $setting
	 * @return mixed
	 */
	public function get_current_settings( $setting = null ) {}
}

namespace Elementor\Core\Page_Assets\Data_Managers\Font_Icon_Svg;

class Manager {
	/**
	 * @param string $icon_library
	 * @return string
	 */
	public static function get_font_family( $icon_library ) {}
}
