<?php
/**
 * Test site only (copied into mu-plugins by playground/setup.php). Adds a
 * pattern library flagged as local, standing in for GenerateBlocks Pro's
 * Local library, which can't be installed in Playground, and serves one
 * pattern for it from the REST route GenerateBlocks asks local libraries for.
 * Never on a real site.
 *
 * @package Boim
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_filter(
	'generateblocks_pattern_libraries',
	static function ( $libraries ) {
		if ( ! class_exists( 'GenerateBlocks_Libraries' ) || ! is_array( $libraries ) ) {
			return $libraries;
		}

		$libraries[] = GenerateBlocks_Libraries::get_instance()->create(
			array(
				'id'        => 'boim_test_local',
				'name'      => 'Local (test)',
				'isEnabled' => true,
				'isLocal'   => true,
			)
		);

		return $libraries;
	}
);

add_action(
	'rest_api_init',
	static function () {
		$is_test_library = static function ( WP_REST_Request $request ) {
			return 'boim_test_local' === $request->get_param( 'libraryId' );
		};
		$can_edit        = static function () {
			return current_user_can( 'edit_posts' );
		};

		register_rest_route(
			'generateblocks-pro/v1',
			'/pattern-library/categories',
			array(
				'methods'             => 'GET',
				'permission_callback' => $can_edit,
				'callback'            => static function ( WP_REST_Request $request ) use ( $is_test_library ) {
					// The shape GenerateBlocks' own routes answer with.
					return rest_ensure_response(
						array(
							'success'  => true,
							'response' => array(
								'data' => $is_test_library( $request ) ? array(
									array(
										'id'   => 'boim-test',
										'name' => 'Test patterns',
									),
								) : array(),
							),
						)
					);
				},
			)
		);

		register_rest_route(
			'generateblocks-pro/v1',
			'/pattern-library/patterns',
			array(
				'methods'             => 'GET',
				'permission_callback' => $can_edit,
				'callback'            => static function ( WP_REST_Request $request ) use ( $is_test_library ) {
					$pattern = '<!-- wp:heading --><h2 class="wp-block-heading">Inserted local pattern</h2><!-- /wp:heading --><!-- wp:paragraph --><p>From the Local (test) library.</p><!-- /wp:paragraph -->';

					return rest_ensure_response(
						array(
							'success'  => true,
							'response' => array(
								'data' => $is_test_library( $request ) ? array(
									array(
										'id'         => 'boim-test-pattern',
										'label'      => 'Test local pattern',
										'pattern'    => $pattern,
										'preview'    => $pattern,
										'categories' => array( 'boim-test' ),
									),
								) : array(),
							),
						)
					);
				},
			)
		);
	}
);
