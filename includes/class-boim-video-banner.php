<?php
/**
 * Video Banner: a video background on a GenerateBlocks Container (Element).
 *
 * The settings live in the Container's own htmlAttributes (GenerateBlocks
 * saves and renders them). Here, on the server, they are validated and turned
 * into a decorative video layer, so the markup is right before any JavaScript
 * runs. The video's <source> is never in the HTML: the view script adds it only
 * when the video is allowed (not on a disabled device, not with reduced motion,
 * only near the viewport), so a phone with "Disable on mobile" never downloads it.
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

	const KEY    = 'data-boim-video';          // Source: an attachment ID or a URL. Also marks a Container as a banner.
	const POSTER = 'data-boim-video-poster';   // Image attachment ID.
	const HIDE   = 'data-boim-video-hide';     // Devices: mobile, tablet, or both (space-separated).
	const LOOP   = 'data-boim-video-loop';     // "false" when looping is off.
	const PART   = 'data-boim-video-part';     // "toggle" on the pause button.
	const CONFIG = 'data-boim-video-banner';   // What the view script reads (sanitised JSON).
	const OWNED  = 'data-boim-owned';          // A toggle a banner has claimed, so an outer banner skips a nested one's.

	const DEVICES = array( 'mobile', 'tablet' );

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
	 * in the block comment's JSON (a toggle alone doesn't count).
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
		foreach ( array( self::KEY, self::POSTER, self::HIDE, self::LOOP ) as $attribute ) {
			$processor->remove_attribute( $attribute );
		}

		if ( $config['sources'] ) {
			$processor->add_class( 'boim-has-video' );

			foreach ( $config['hide'] as $device ) {
				$processor->add_class( 'boim-video-hide-' . $device );
			}

			$processor->set_attribute( self::CONFIG, wp_json_encode( array_diff_key( $config, array( 'poster' => true ) ) ) );
		}

		self::decorate_toggles( $processor, (bool) $config['sources'] );

		$html = $processor->get_updated_html();

		if ( ! $config['sources'] ) {
			return $html; // No usable file (yet): a plain Container.
		}

		// The layer goes just before the Container's own closing tag. Its
		// position in the DOM doesn't matter for painting (it's absolutely
		// positioned behind the content); last is the easiest place to find.
		if ( ! preg_match( '#</' . preg_quote( $tag, '#' ) . '\s*>\s*$#i', $html, $match, PREG_OFFSET_CAPTURE ) ) {
			return $html;
		}

		$html = substr_replace( $html, self::media_layer( $config['poster'] ), $match[0][1], 0 );

		self::enqueue();

		return $html;
	}

	/**
	 * Every setting, whitelisted. The view script only ever sees this.
	 *
	 * @param array $saved The Container's htmlAttributes.
	 * @return array{sources: array, poster: int, hide: string[], loop: bool}
	 */
	public static function config( $saved ) {
		$source = self::source( $saved[ self::KEY ] ?? '' );
		$poster = absint( $saved[ self::POSTER ] ?? 0 );
		$hide   = is_string( $saved[ self::HIDE ] ?? null ) ? preg_split( '/\s+/', $saved[ self::HIDE ] ) : array();

		return array(
			'sources' => $source ? array( $source ) : array(),
			'poster'  => $poster && wp_attachment_is_image( $poster ) ? $poster : 0,
			'hide'    => array_values( array_intersect( self::DEVICES, $hide ) ),
			'loop'    => 'false' !== ( $saved[ self::LOOP ] ?? '' ),
		);
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
	 * The pause toggle part(s): a toggle button (WAI-ARIA APG "button" with
	 * aria-pressed). aria-pressed="true" means the video is paused. Added
	 * here rather than saved, because kses strips aria-pressed from posts
	 * saved by Authors and Contributors.
	 *
	 * @param WP_HTML_Tag_Processor $processor Positioned on the Container's tag.
	 * @param bool                  $has_video Whether there is a video to pause.
	 */
	private static function decorate_toggles( $processor, $has_video ) {
		while ( $processor->next_tag() ) {
			if ( 'toggle' !== $processor->get_attribute( self::PART ) || null !== $processor->get_attribute( self::OWNED ) ) {
				continue;
			}

			$processor->set_attribute( self::OWNED, true );

			if ( 'BUTTON' === $processor->get_tag() ) {
				$processor->set_attribute( 'type', 'button' ); // Never submits a surrounding form.
			} else {
				$processor->set_attribute( 'role', 'button' );
				$processor->set_attribute( 'tabindex', '0' );
			}

			$processor->set_attribute( 'aria-pressed', 'false' );
			$processor->set_attribute( 'data-boim-state', 'playing' );

			if ( ! $has_video ) {
				$processor->set_attribute( 'hidden', true ); // Nothing to pause.
			}
		}
	}

	/**
	 * The decorative layer behind the content: poster image and an empty video.
	 *
	 * @param int $poster Image attachment ID, or 0.
	 * @return string
	 */
	private static function media_layer( $poster ) {
		$image = '';

		if ( $poster ) {
			$image = wp_get_attachment_image(
				$poster,
				'full',
				false,
				array(
					'class'    => 'boim-video-banner__poster',
					'alt'      => '', // Decorative: the layer is aria-hidden.
					'sizes'    => '100vw',
					'decoding' => 'async',
				)
			);
		}

		return '<div class="boim-video-banner__media" aria-hidden="true">'
			. $image
			. '<video class="boim-video-banner__video" muted playsinline preload="none" disablepictureinpicture disableremoteplayback tabindex="-1"></video>'
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
