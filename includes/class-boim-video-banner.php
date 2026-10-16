<?php
/**
 * Video Banner: a video background on a GenerateBlocks Container (Element).
 *
 * The settings live in the Container's own htmlAttributes (GenerateBlocks
 * saves and renders them). Here, on the server, they are validated and turned
 * into a decorative video layer, so the markup is right before any JavaScript
 * runs. The video's <source> is never in the HTML: the view script adds it only
 * when the video is allowed (not at or below the "Disable on mobile" width, not
 * with reduced motion, only near the viewport), so a phone below the breakpoint
 * never downloads it. The video always loops, muted.
 *
 * @package Boim
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Renders Video Banners.
 */
class Boim_Video_Banner {

	const KEY        = 'data-boim-video';           // Source: an attachment ID or a URL. Also marks a Container as a banner.
	const BREAKPOINT = 'data-boim-video-max-width'; // "Disable on mobile": off at this width (px) and below.
	const OPACITY    = 'data-boim-video-opacity';   // Video opacity, 0-100 (%). Absent means 100.
	const CONFIG     = 'data-boim-video-banner';    // What the view script reads (sanitised JSON).

	const DEFAULT_BREAKPOINT = 767; // GenerateBlocks' mobile breakpoint.
	const MAX_BREAKPOINT     = 4000;

	// Video types every current browser can play, by file extension.
	const TYPES = array(
		'mp4'  => 'video/mp4',
		'm4v'  => 'video/mp4',
		'webm' => 'video/webm',
		'ogv'  => 'video/ogg',
	);

	/**
	 * Hook up.
	 */
	public static function init() {
		add_filter( 'render_block_generateblocks/element', array( __CLASS__, 'render' ), 10, 2 );
	}

	/**
	 * Whether a post's content has a Video Banner: the setting as it appears
	 * in the block comment's JSON.
	 *
	 * @param WP_Post|null $post Post.
	 * @return bool
	 */
	public static function in_post( $post ) {
		return $post instanceof WP_Post && false !== strpos( $post->post_content, '"' . self::KEY . '":' );
	}

	/**
	 * Add the video layer to a Container that has a video background.
	 *
	 * @param string $html  Rendered Container HTML (GB may have put a <style> first).
	 * @param array  $block Parsed block.
	 * @return string
	 */
	public static function render( $html, $block ) {
		// Cheap check first: this filter runs for every Container on the page.
		if ( false === strpos( $html, self::KEY ) ) {
			return $html;
		}

		$saved = $block['attrs']['htmlAttributes'] ?? null;

		if ( ! is_array( $saved ) || ! array_key_exists( self::KEY, $saved ) ) {
			return $html; // The string was in a child's markup, not on this Container.
		}

		$config    = self::config( $saved );
		$processor = new WP_HTML_Tag_Processor( $html );

		// The Container's own tag. GB may have printed its CSS as a <style> before it.
		do {
			if ( ! $processor->next_tag() ) {
				return $html;
			}
		} while ( 'STYLE' === $processor->get_tag() );

		$tag = strtolower( $processor->get_tag() );

		// The raw settings never reach the page; the script gets the checked config instead.
		$processor->remove_attribute( self::KEY );
		$processor->remove_attribute( self::BREAKPOINT );
		$processor->remove_attribute( self::OPACITY );

		if ( ! $config['sources'] ) {
			return $processor->get_updated_html(); // No usable file (yet): a plain Container.
		}

		$processor->add_class( 'boim-has-video' );
		$processor->set_attribute( self::CONFIG, wp_json_encode( $config ) );

		$html = $processor->get_updated_html();

		// The layer goes just before the Container's own closing tag. Its
		// position in the DOM doesn't matter for painting (it's absolutely
		// positioned behind the content); last is the easiest place to find.
		if ( ! preg_match( '#</' . preg_quote( $tag, '#' ) . '\s*>\s*$#i', $html, $match, PREG_OFFSET_CAPTURE ) ) {
			return $html;
		}

		$html = substr_replace( $html, self::media_layer(), $match[0][1], 0 );

		self::enqueue();

		return $html;
	}

	/**
	 * Every setting, whitelisted. The view script only ever sees this.
	 *
	 * @param array $saved The Container's htmlAttributes.
	 * @return array{sources: array, maxWidth: int, opacity: float}
	 */
	public static function config( $saved ) {
		$source = self::source( $saved[ self::KEY ] ?? '' );

		return array(
			'sources'  => $source ? array( $source ) : array(),
			'maxWidth' => array_key_exists( self::BREAKPOINT, $saved ) ? self::breakpoint( $saved[ self::BREAKPOINT ] ) : 0,
			'opacity'  => self::opacity( $saved[ self::OPACITY ] ?? null ),
		);
	}

	/**
	 * The "Disable on mobile" width in px: a whole number, clamped. Empty or
	 * invalid falls back to the default, since the setting is switched on.
	 *
	 * @param mixed $value Saved value.
	 * @return int
	 */
	public static function breakpoint( $value ) {
		$width = is_scalar( $value ) && preg_match( '/^\d+$/', trim( (string) $value ) ) ? (int) $value : 0;

		return $width > 0 ? min( $width, self::MAX_BREAKPOINT ) : self::DEFAULT_BREAKPOINT;
	}

	/**
	 * The video's opacity, from a whole percentage (0-100) to 0-1. Anything
	 * else (absent, empty, not a number) means fully opaque.
	 *
	 * @param mixed $value Saved value.
	 * @return float
	 */
	public static function opacity( $value ) {
		if ( ! is_scalar( $value ) || ! preg_match( '/^\d+$/', trim( (string) $value ) ) ) {
			return 1.0;
		}

		return min( (int) $value, 100 ) / 100;
	}

	/**
	 * The video file: a Media Library video, or an http(s) URL ending in a
	 * video extension.
	 *
	 * @param mixed $value Saved value.
	 * @return array{src: string, type: string}|null
	 */
	public static function source( $value ) {
		if ( is_int( $value ) || ( is_string( $value ) && ctype_digit( $value ) ) ) {
			$id   = (int) $value;
			$type = $id ? get_post_mime_type( $id ) : false;
			$url  = $type && in_array( $type, self::TYPES, true ) ? wp_get_attachment_url( $id ) : false;

			return $url ? array(
				'src'  => esc_url_raw( $url ),
				'type' => $type,
			) : null;
		}

		if ( ! is_string( $value ) || '' === $value ) {
			return null;
		}

		$url = esc_url_raw( trim( $value ), array( 'http', 'https' ) );

		if ( '' === $url || ! in_array( wp_parse_url( $url, PHP_URL_SCHEME ), array( 'http', 'https' ), true ) ) {
			return null;
		}

		$extension = strtolower( pathinfo( (string) wp_parse_url( $url, PHP_URL_PATH ), PATHINFO_EXTENSION ) );

		return isset( self::TYPES[ $extension ] ) ? array(
			'src'  => $url,
			'type' => self::TYPES[ $extension ],
		) : null;
	}

	/**
	 * The decorative layer behind the content: an empty, muted video.
	 *
	 * @return string
	 */
	private static function media_layer() {
		return '<div class="boim-video-banner__media" aria-hidden="true">'
			. '<video class="boim-video-banner__video" muted loop playsinline preload="none" disablepictureinpicture disableremoteplayback tabindex="-1"></video>'
			. '</div>';
	}

	/**
	 * Front-end files, only on pages that have a banner, and not when the
	 * content is rendered for something other than a page view.
	 */
	private static function enqueue() {
		if ( is_feed() || doing_action( 'wp_head' ) || ( function_exists( 'wp_is_serving_rest_request' ) ? wp_is_serving_rest_request() : ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) ) {
			return;
		}

		wp_enqueue_style( 'boim-video-banner-view' );
		wp_enqueue_script( 'boim-video-banner-view' );
	}
}
