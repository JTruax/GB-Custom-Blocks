<?php
/**
 * Creates the layouts' default GenerateBlocks Pro Global Styles, once, on an
 * ordinary admin page load. Never overwrites a class: once created it's the
 * site's to edit or delete.
 *
 * @package Boim
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Default Global Styles installer.
 */
class Boim_Global_Styles {

	const OPTION   = 'boim_global_styles'; // Class names already handled.
	const CATEGORY = 'BOIM Blocks';
	const BLOCKS   = array( 'video-banner' );

	/**
	 * Hook up.
	 */
	public static function init() {
		add_action( 'admin_init', array( __CLASS__, 'maybe_create' ) );

		// Test sites only (set by the Playground mu-plugin, never on a real
		// site): GB Pro can't be installed there, so print the defaults.
		if ( defined( 'BOIM_PRINT_DEFAULT_STYLES' ) && BOIM_PRINT_DEFAULT_STYLES ) {
			add_action( 'enqueue_block_assets', array( __CLASS__, 'print_defaults' ) );
		}
	}

	/**
	 * Print the compiled defaults as a stylesheet (test sites without GB Pro),
	 * in the editor and on posts that have a Video Banner.
	 */
	public static function print_defaults() {
		if ( ! is_admin() && ! ( is_singular() && Boim_Video_Banner::in_post( get_post() ) ) ) {
			return;
		}

		$css = '';

		foreach ( self::defaults() as $class_name => $styles ) {
			$css .= self::compile( '.' . $class_name, $styles );
		}

		wp_register_style( 'boim-default-styles', false, array(), BOIM_VERSION );
		wp_enqueue_style( 'boim-default-styles' );
		wp_add_inline_style( 'boim-default-styles', $css );
	}

	/**
	 * Every block's defaults, base classes before modifiers.
	 *
	 * @return array Class name => GB styles.
	 */
	public static function defaults() {
		$classes = array();

		foreach ( self::BLOCKS as $block ) {
			$file = BOIM_DIR . 'includes/global-styles/' . $block . '.php';

			if ( file_exists( $file ) ) {
				$build   = require $file;
				$classes = array_merge( $classes, $build() );
			}
		}

		return $classes;
	}

	/**
	 * Whether GB Pro's Global Styles are there (internal API, so checked).
	 *
	 * @return bool
	 */
	public static function available() {
		return class_exists( 'GenerateBlocks_Pro_Styles' )
			&& method_exists( 'GenerateBlocks_Pro_Styles', 'get_class_by_name' )
			&& post_type_exists( 'gblocks_styles' );
	}

	/**
	 * Create classes this site hasn't had yet.
	 */
	public static function maybe_create() {
		// Not the background requests an admin page fires (AJAX, REST, cron).
		if ( wp_doing_ajax() || wp_doing_cron() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
			return;
		}

		$can_manage = method_exists( 'GenerateBlocks_Pro_Styles', 'can_manage_styles' )
			? GenerateBlocks_Pro_Styles::can_manage_styles()
			: current_user_can( 'manage_options' );

		if ( ! self::available() || ! $can_manage ) {
			return;
		}

		$handled = (array) get_option( self::OPTION, array() );
		$new     = array_diff_key( self::defaults(), array_flip( $handled ) );

		if ( ! $new || ! self::lock() ) {
			return;
		}

		// Another request may have just finished: re-read now that we hold the lock.
		wp_cache_delete( 'alloptions', 'options' );
		wp_cache_delete( self::OPTION, 'options' );
		$handled = (array) get_option( self::OPTION, array() );
		$new     = array_diff_key( $new, array_flip( $handled ) );

		if ( $new ) {
			self::create( $new, $handled );
		}

		delete_option( self::OPTION . '_lock' );
	}

	/**
	 * An atomic lock, so two admin tabs can't both create the classes. A lock
	 * older than a minute (a request that died) is cleared.
	 *
	 * @return bool
	 */
	private static function lock() {
		global $wpdb;

		$key = self::OPTION . '_lock';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- must read the database, not the cache.
		$since = $wpdb->get_var( $wpdb->prepare( "SELECT option_value FROM {$wpdb->options} WHERE option_name = %s", $key ) );

		if ( null !== $since && (int) $since < time() - MINUTE_IN_SECONDS ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- compare-and-delete.
			$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->options} WHERE option_name = %s AND option_value = %s", $key, $since ) );
		}

		// add_option() can't be used: it quietly succeeds if the row exists.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- an atomic lock.
		return 1 === (int) $wpdb->query( $wpdb->prepare( "INSERT IGNORE INTO {$wpdb->options} (option_name, option_value, autoload) VALUES (%s, %s, 'no')", $key, (string) time() ) );
	}

	/**
	 * Insert the classes, pausing GB Pro's per-save stylesheet rebuild and
	 * rebuilding once at the end. Progress is saved after each class.
	 *
	 * @param array    $classes Class name => styles.
	 * @param string[] $handled Already handled.
	 */
	private static function create( $classes, $handled ) {
		global $wpdb;

		$builder = null;

		if ( class_exists( 'GenerateBlocks_Pro_Enqueue_Styles' ) && method_exists( 'GenerateBlocks_Pro_Enqueue_Styles', 'build_css' ) ) {
			$builder = GenerateBlocks_Pro_Enqueue_Styles::get_instance();
		}

		$paused  = $builder && remove_action( 'wp_after_insert_post', array( $builder, 'build_css_file_on_save' ), 100 );
		$created = false;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- one read, only when there's work to do.
		$order = (int) $wpdb->get_var( $wpdb->prepare( "SELECT MAX(menu_order) FROM {$wpdb->posts} WHERE post_type = %s", 'gblocks_styles' ) );

		foreach ( $classes as $class_name => $styles ) {
			$selector = '.' . $class_name;

			if ( ! GenerateBlocks_Pro_Styles::get_class_by_name( $selector ) ) {
				$post_id = wp_insert_post(
					array(
						'post_type'   => 'gblocks_styles',
						'post_status' => 'publish',
						'post_title'  => $selector,
						'menu_order'  => ++$order, // Base classes first, so modifiers win.
						'meta_input'  => array(
							'gb_style_selector' => $selector,
							'gb_style_data'     => $styles,
							'gb_style_css'      => self::compile( $selector, $styles ),
							'gb_style_category' => self::CATEGORY,
						),
					),
					true
				);

				if ( is_wp_error( $post_id ) ) {
					continue; // Not marked handled: tried again next time.
				}

				$created = true;
			}

			$handled[] = $class_name;
			update_option( self::OPTION, $handled, false );
		}

		if ( $paused ) {
			add_action( 'wp_after_insert_post', array( $builder, 'build_css_file_on_save' ), 100, 2 );
		}

		if ( $created && $builder ) {
			$builder->build_css();
		}
	}

	/**
	 * GB styles → CSS: declarations, nested "&…"/descendant keys, @media.
	 *
	 * @param string $selector Selector.
	 * @param array  $styles   GB styles.
	 * @return string
	 */
	public static function compile( $selector, $styles ) {
		$declarations = '';
		$nested       = '';

		foreach ( $styles as $property => $value ) {
			if ( is_array( $value ) ) {
				$nested .= 0 === strpos( $property, '@' )
					? $property . '{' . self::compile( $selector, $value ) . '}'
					: self::compile( self::nest( $selector, $property ), $value );
				continue;
			}

			$declarations .= strtolower( preg_replace( '/([a-z])([A-Z])/', '$1-$2', $property ) ) . ':' . $value . ';';
		}

		return ( $declarations ? $selector . '{' . $declarations . '}' : '' ) . $nested;
	}

	/**
	 * "&" is the parent; a key without one is a descendant. Splits on
	 * top-level commas only (not those inside :is( … )).
	 *
	 * @param string $parent_selector Parent selector.
	 * @param string $key    Nested key.
	 * @return string
	 */
	private static function nest( $parent_selector, $key ) {
		$parts = array();
		$depth = 0;
		$part  = '';

		foreach ( str_split( $key ) as $char ) {
			if ( ',' === $char && 0 === $depth ) {
				$parts[] = $part;
				$part    = '';
				continue;
			}

			$depth += ( '(' === $char ) - ( ')' === $char );
			$part  .= $char;
		}

		$parts[] = $part;

		foreach ( $parts as $i => $selector ) {
			$selector    = trim( $selector );
			$parts[ $i ] = false !== strpos( $selector, '&' ) ? str_replace( '&', $parent_selector, $selector ) : $parent_selector . ' ' . $selector;
		}

		return implode( ',', $parts );
	}
}
