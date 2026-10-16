<?php
/**
 * Builds the local test site: media fixtures, the demo page, an empty menu.
 * Runs from the blueprint before anyone is logged in, so the demo page is
 * saved through kses, exactly as an Author or Contributor would save it.
 *
 * @package Boim
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once ABSPATH . 'wp-admin/includes/image.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';

$boim_dir = WP_CONTENT_DIR . '/plugins/boim-blocks/';

// Test-only defaults for the Global Styles.
wp_mkdir_p( WPMU_PLUGIN_DIR );
copy( $boim_dir . 'playground/mu-plugin.php', WPMU_PLUGIN_DIR . '/boim-test.php' );

update_option( 'permalink_structure', '/%postname%/' );
flush_rewrite_rules();

/**
 * Copy a fixture into uploads and make it an attachment.
 *
 * @param string $file  Fixture file name.
 * @param string $title Title.
 * @return int Attachment id.
 */
function boim_test_attachment( $file, $title ) {
	$existing = get_page_by_path( sanitize_title( $title ), OBJECT, 'attachment' );

	if ( $existing ) {
		return $existing->ID;
	}

	$upload = wp_upload_bits( $file, null, file_get_contents( WP_CONTENT_DIR . '/plugins/boim-blocks/tests/fixtures/' . $file ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local fixture.
	$type   = wp_check_filetype( $upload['file'] );
	$id     = wp_insert_attachment(
		array(
			'post_title'     => $title,
			'post_name'      => sanitize_title( $title ),
			'post_mime_type' => $type['type'],
			'post_status'    => 'inherit',
		),
		$upload['file']
	);

	wp_update_attachment_metadata( $id, wp_generate_attachment_metadata( $id, $upload['file'] ) );

	return $id;
}

$boim_media = array(
	'webm'   => boim_test_attachment( 'sample.webm', 'boim-sample-webm' ),
	'mp4'    => boim_test_attachment( 'sample.mp4', 'boim-sample-mp4' ),
	'poster' => boim_test_attachment( 'poster.jpg', 'boim-poster' ), // An image, for the "not a video" test.
);
update_option( 'boim_test_media', $boim_media, false );

require $boim_dir . 'playground/demo/markup.php';

$boim_content = boim_demo_markup( $boim_media );
$boim_page    = get_page_by_path( 'video-banner-demo' );

wp_insert_post(
	array(
		'ID'           => $boim_page ? $boim_page->ID : 0,
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_title'   => 'Video Banner demo',
		'post_name'    => 'video-banner-demo',
		'post_content' => $boim_content,
	)
);

// GeneratePress lists every page in the menu until one is set; test pages
// would pile up there and push the content down.
$boim_menu = wp_get_nav_menu_object( 'Empty' );
$boim_menu = $boim_menu ? $boim_menu->term_id : wp_create_nav_menu( 'Empty' );
set_theme_mod( 'nav_menu_locations', array( 'primary' => $boim_menu ) );
