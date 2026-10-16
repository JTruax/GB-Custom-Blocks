<?php
/**
 * Removes the plugin's own options. The Global Styles it created and the
 * content using them belong to the site, so they stay.
 *
 * @package Boim
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

delete_option( 'boim_global_styles' );
delete_option( 'boim_global_styles_lock' );
