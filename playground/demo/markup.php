<?php
/**
 * Demo page sections (test fixtures, not plugin content). Block markup as
 * GenerateBlocks saves it: uniqueId in the comment, classes from
 * globalClasses, htmlAttributes on the element.
 *
 * @package Boim
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * A GB Text block.
 *
 * @param string $id       uniqueId.
 * @param string $tag      Tag.
 * @param string $content  HTML content.
 * @param array  $extra    Extra attributes (htmlAttributes, globalClasses).
 * @return string
 */
function boim_demo_text( $id, $tag, $content, $extra = array() ) {
	$attrs   = array_merge(
		array(
			'uniqueId' => $id,
			'tagName'  => $tag,
		),
		$extra
	);
	$classes = array_merge( array( 'gb-text' ), $extra['globalClasses'] ?? array() );
	$html    = '';

	foreach ( $extra['htmlAttributes'] ?? array() as $name => $value ) {
		$html .= sprintf( ' %s="%s"', $name, esc_attr( $value ) );
	}

	return sprintf(
		'<!-- wp:generateblocks/text %1$s --><%2$s class="%3$s"%4$s>%5$s</%2$s><!-- /wp:generateblocks/text -->',
		wp_json_encode( $attrs, JSON_UNESCAPED_SLASHES ),
		$tag,
		implode( ' ', $classes ),
		$html,
		$content
	);
}

/**
 * A GB Element block.
 *
 * @param string $id    uniqueId.
 * @param string $tag   Tag.
 * @param array  $extra Extra attributes (htmlAttributes, globalClasses, styles, css).
 * @param string $inner Inner markup.
 * @return string
 */
function boim_demo_element( $id, $tag, $extra, $inner ) {
	$attrs   = array_merge(
		array(
			'uniqueId' => $id,
			'tagName'  => $tag,
		),
		$extra
	);
	$classes = $extra['globalClasses'] ?? array();
	$html    = '';

	if ( ! empty( $extra['styles'] ) ) {
		$classes[] = 'gb-element-' . $id;
	}

	if ( $classes ) {
		$html .= sprintf( ' class="%s"', implode( ' ', $classes ) );
	}

	foreach ( $extra['htmlAttributes'] ?? array() as $name => $value ) {
		$html .= sprintf( ' %s="%s"', $name, esc_attr( $value ) );
	}

	return sprintf(
		'<!-- wp:generateblocks/element %1$s --><%2$s%3$s>%4$s</%2$s><!-- /wp:generateblocks/element -->',
		wp_json_encode( $attrs, JSON_UNESCAPED_SLASHES ),
		$tag,
		$html,
		$inner
	);
}

/**
 * A Video Banner as the inserter variation creates it.
 *
 * @param string $key      Short key, used for the id and uniqueIds.
 * @param array  $settings Video settings (data-boim-video…).
 * @param string $title    Heading.
 * @param string $extra    Extra inner markup (e.g. a nested banner).
 * @return string
 */
function boim_demo_banner( $key, $settings, $title, $extra = '' ) {
	$content = boim_demo_element(
		"vc{$key}00001",
		'div',
		array( 'globalClasses' => array( 'boim-video-banner__content' ) ),
		boim_demo_text( "vh{$key}00001", 'h2', esc_html( $title ) )
			. boim_demo_text( "vp{$key}00001", 'p', 'Everything here is a GenerateBlocks block you can restyle.' )
			. $extra
	);

	$toggle = boim_demo_text(
		"vt{$key}00001",
		'button',
		'Pause video',
		array(
			'htmlAttributes' => array(
				'data-boim-video-part' => 'toggle',
				'type'                 => 'button',
			),
			'globalClasses'  => array( 'boim-video-banner__toggle' ),
		)
	);

	return boim_demo_element(
		"vb{$key}00001",
		'section',
		array(
			'htmlAttributes' => array_merge( array( 'id' => 'banner-' . $key ), $settings ),
			'globalClasses'  => array( 'boim-video-banner', 'boim-video-banner--overlay' ),
		),
		$content . $toggle
	);
}

/**
 * The whole demo page.
 *
 * @param array $media Attachment ids: webm, mp4, poster.
 * @return string
 */
function boim_demo_markup( $media ) {
	$video  = (string) $media['webm'];
	$poster = (string) $media['poster'];
	$url    = wp_get_attachment_url( $media['mp4'] );

	$nested = boim_demo_banner(
		'g',
		array(
			'data-boim-video'        => $video,
			'data-boim-video-poster' => $poster,
		),
		'Nested banner'
	);

	return implode(
		"\n\n",
		array(
			boim_demo_banner(
				'a',
				array(
					'data-boim-video'        => $video,
					'data-boim-video-poster' => $poster,
				),
				'Plays everywhere'
			),
			boim_demo_banner(
				'b',
				array(
					'data-boim-video'        => $video,
					'data-boim-video-poster' => $poster,
					'data-boim-video-hide'   => 'mobile',
				),
				'Off on mobile'
			),
			boim_demo_banner(
				'c',
				array(
					'data-boim-video'        => $video,
					'data-boim-video-poster' => $poster,
					'data-boim-video-hide'   => 'tablet',
				),
				'Off on tablet'
			),
			boim_demo_banner(
				'd',
				array(
					'data-boim-video'      => $video,
					'data-boim-video-hide' => 'mobile tablet',
					'data-boim-video-loop' => 'false',
				),
				'Off on mobile and tablet, no poster, no loop'
			),
			boim_demo_banner(
				'e',
				array( 'data-boim-video' => $url ),
				'From a URL'
			),
			boim_demo_banner(
				'f',
				array(
					'data-boim-video'        => $video,
					'data-boim-video-poster' => $poster,
				),
				'Outer banner',
				$nested
			),
			boim_demo_element(
				'sp000001',
				'div',
				array(
					'styles' => array( 'minHeight' => '150vh' ),
					'css'    => '.gb-element-sp000001{min-height:150vh}',
				),
				boim_demo_text( 'spt00001', 'p', 'Spacer, so the next banner starts off-screen.' )
			),
			boim_demo_banner(
				'h',
				array(
					'data-boim-video'        => $video,
					'data-boim-video-poster' => $poster,
				),
				'Below the fold'
			),
		)
	);
}
