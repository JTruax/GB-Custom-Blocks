<?php
/**
 * Test site only (copied into mu-plugins by playground/setup.php). GB Pro
 * can't be installed in Playground, so the plugin prints its default
 * Global Styles itself. Never on a real site.
 *
 * @package Boim
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'BOIM_PRINT_DEFAULT_STYLES', true );
