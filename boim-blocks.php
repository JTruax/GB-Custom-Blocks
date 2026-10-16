<?php
/**
 * Plugin Name:       BOIM Blocks
 * Description:       A collection of custom blocks that are compatible with GenerateBlocks.
 * Version:           0.1.0
 * Requires at least: 6.6
 * Requires PHP:      7.4
 * Requires Plugins:  generateblocks
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       boim-blocks
 *
 * @package Boim
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'BOIM_VERSION', '0.1.0' );
define( 'BOIM_DIR', plugin_dir_path( __FILE__ ) );
define( 'BOIM_URL', plugin_dir_url( __FILE__ ) );

require_once BOIM_DIR . 'includes/class-boim-video-banner.php';

add_action( 'init', 'boim_register_assets' );
/**
 * Register (not enqueue) the scripts and styles. The front-end files are only
 * enqueued when a Video Banner renders, so other pages load nothing.
 */
function boim_register_assets() {
	$assets = array(
		'boim-video-banner-view'   => 'video-banner/view',
		'boim-video-banner-editor' => 'video-banner/editor',
	);

	foreach ( $assets as $handle => $entry ) {
		$asset_file = BOIM_DIR . "build/{$entry}.asset.php";

		if ( ! file_exists( $asset_file ) ) {
			continue;
		}

		$asset = require $asset_file;

		wp_register_script(
			$handle,
			BOIM_URL . "build/{$entry}.js",
			$asset['dependencies'],
			$asset['version'],
			'boim-video-banner-view' === $handle ? array(
				'in_footer' => true,
				'strategy'  => 'defer',
			) : array( 'in_footer' => true )
		);
	}

	// wp-scripts names CSS after the entry that imports it.
	$styles = array(
		'boim-video-banner-view'   => 'video-banner/style-view.css',
		'boim-video-banner-editor' => 'video-banner/editor.css',
	);

	foreach ( $styles as $handle => $file ) {
		if ( file_exists( BOIM_DIR . 'build/' . $file ) ) {
			wp_register_style( $handle, BOIM_URL . 'build/' . $file, array(), (string) filemtime( BOIM_DIR . 'build/' . $file ) );
		}
	}
}

add_action( 'enqueue_block_editor_assets', 'boim_editor_assets' );
/**
 * Editor script and panel styles. The script has to run before GenerateBlocks
 * registers its Container block, so the Video Banner variation is listed ahead
 * of GB's own Container variation (WordPress shows the first match as the
 * block's name). Listing it as a dependency of GB's Container script makes
 * WordPress print it first.
 */
function boim_editor_assets() {
	if ( ! wp_script_is( 'boim-video-banner-editor', 'registered' ) ) {
		return;
	}

	wp_enqueue_script( 'boim-video-banner-editor' );
	wp_set_script_translations( 'boim-video-banner-editor', 'boim-blocks' );
	wp_enqueue_style( 'boim-video-banner-editor' ); // The sidebar panel.

	$container = wp_scripts()->query( generate_block_asset_handle( 'generateblocks/element', 'editorScript' ), 'registered' );

	if ( $container && ! in_array( 'boim-video-banner-editor', $container->deps, true ) ) {
		$container->deps[] = 'boim-video-banner-editor';
	}
}

add_action( 'enqueue_block_assets', 'boim_editor_canvas_styles' );
/**
 * The editor canvas is an iframe, and enqueue_block_assets is what reaches
 * it: the video plays behind banners there too.
 */
function boim_editor_canvas_styles() {
	if ( is_admin() && wp_style_is( 'boim-video-banner-editor', 'registered' ) ) {
		wp_enqueue_style( 'boim-video-banner-editor' );
	}
}

add_action( 'wp_enqueue_scripts', 'boim_head_styles' );
/**
 * Classic themes (GeneratePress) render the post content after <head>, so a
 * style enqueued while the banner renders would print in the footer and the
 * banner would flash unstyled. Load it in <head> when the post being viewed
 * has a Video Banner. Banners elsewhere (GP Elements, widgets) still get it
 * from the render, just later.
 */
function boim_head_styles() {
	if ( is_singular() && Boim_Video_Banner::in_post( get_post() ) ) {
		wp_enqueue_style( 'boim-video-banner-view' );
	}
}

add_action( 'admin_notices', 'boim_generateblocks_notice' );
/**
 * "Requires Plugins" only checks on activation; GenerateBlocks may be
 * deactivated later, or be an old 1.x version.
 */
function boim_generateblocks_notice() {
	if ( ! current_user_can( 'activate_plugins' ) ) {
		return;
	}

	if ( defined( 'GENERATEBLOCKS_VERSION' ) && version_compare( GENERATEBLOCKS_VERSION, '2.0.0', '>=' ) ) {
		return;
	}

	printf(
		'<div class="notice notice-warning"><p>%s</p></div>',
		esc_html__( 'BOIM Blocks needs GenerateBlocks 2.0 or newer to be active.', 'boim-blocks' )
	);
}

Boim_Video_Banner::init();
