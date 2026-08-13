<?php
/**
 * Plugin Name: Arts Cursor Follower for Elementor
 * Description: Interactive mouse cursor effects for Elementor.
 * Version: 1.0.3
 * Author: Artem Semkin
 * Author URI: https://artemsemkin.com
 * License: GPLv3
 * License URI: https://www.gnu.org/licenses/gpl-3.0
 * Requires at least: 6.2
 * Requires PHP: 8.0
 * Requires Plugins: elementor
 * Text Domain: cursor-follower-for-elementor
 * Plugin URI: https://artemsemkin.com/plugins/cursor-follower-for-elementor/
 * Tested up to: 7.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'ARTS_CURSOR_FOLLOWER_PLUGIN_VERSION', '1.0.3' );
define( 'ARTS_CURSOR_FOLLOWER_PLUGIN_FILE', __FILE__ );

require_once __DIR__ . '/vendor/autoload.php';

\Arts\CursorFollower\Plugin::instance();
