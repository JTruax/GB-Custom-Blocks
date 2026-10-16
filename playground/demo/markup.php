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
		serialize_block_attributes( $attrs ), // Escaped like the editor saves them (& < > " as \u00XX), so kses keeps them.
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
		serialize_block_attributes( $attrs ), // Escaped like the editor saves them (& < > " as \u00XX), so kses keeps them.
		$tag,
		$html,
		$inner
	);
}

/**
 * A Video Banner as the inserter variation creates it (no classes), styled
 * the way a user would: GB local styles on the banner and its content,
 * including a tint on the video layer.
 *
 * @param string $key      Short key, used for the id and uniqueIds.
 * @param array  $settings Video settings (data-boim-video…).
 * @param string $title    Heading.
 * @param string $extra    Extra inner markup (e.g. a nested banner).
 * @return string
 */
function boim_demo_banner( $key, $settings, $title, $extra = '' ) {
	$content_id = "vc{$key}00001";
	$banner_id  = "vb{$key}00001";

	$content = boim_demo_element(
		$content_id,
		'div',
		array(
			'styles' => array(
				'width'       => '100%',
				'maxWidth'    => '1200px',
				'marginRight' => 'auto',
				'marginLeft'  => 'auto',
			),
			'css'    => ".gb-element-{$content_id}{width:100%;max-width:1200px;margin-right:auto;margin-left:auto}",
		),
		boim_demo_text( "vh{$key}00001", 'h2', esc_html( $title ) )
			. boim_demo_text( "vp{$key}00001", 'p', 'Everything here is a GenerateBlocks block you can restyle.' )
			. $extra
	);

	$tint = array(
		'content'         => '""',
		'position'        => 'absolute',
		'top'             => '0',
		'right'           => '0',
		'bottom'          => '0',
		'left'            => '0',
		'backgroundColor' => 'rgba(0, 0, 0, 0.55)',
	);

	return boim_demo_element(
		$banner_id,
		'section',
		array(
			'htmlAttributes' => array_merge( array( 'id' => 'banner-' . $key ), $settings ),
			'styles'         => array(
				'display'                            => 'flex',
				'flexDirection'                      => 'column',
				'justifyContent'                     => 'center',
				'minHeight'                          => '70vh',
				'paddingTop'                         => '6rem',
				'paddingRight'                       => '1.5rem',
				'paddingBottom'                      => '6rem',
				'paddingLeft'                        => '1.5rem',
				'backgroundColor'                    => '#111111',
				'color'                              => '#ffffff',
				'& .boim-video-banner__media::after' => $tint,
			),
			'css'            => ".gb-element-{$banner_id}{display:flex;flex-direction:column;justify-content:center;min-height:70vh;padding:6rem 1.5rem;background-color:#111111;color:#ffffff}"
				. ".gb-element-{$banner_id} .boim-video-banner__media::after{content:\"\";position:absolute;top:0;right:0;bottom:0;left:0;background-color:rgba(0, 0, 0, 0.55)}",
		),
		$content
	);
}

/**
 * The whole demo page.
 *
 * @param array $media Attachment ids: webm, mp4.
 * @return string
 */
function boim_demo_markup( $media ) {
	$video = (string) $media['webm'];
	$url   = wp_get_attachment_url( $media['mp4'] );

	$nested = boim_demo_banner( 'g', array( 'data-boim-video' => $video ), 'Nested banner' );

	return implode(
		"\n\n",
		array(
			boim_demo_banner( 'a', array( 'data-boim-video' => $video ), 'Plays everywhere' ),
			boim_demo_banner(
				'b',
				array(
					'data-boim-video'           => $video,
					'data-boim-video-max-width' => '767',
				),
				'Off at 767px and below'
			),
			boim_demo_banner(
				'c',
				array(
					'data-boim-video'           => $video,
					'data-boim-video-max-width' => '1024',
				),
				'Off at 1024px and below'
			),
			boim_demo_banner(
				'o',
				array(
					'data-boim-video'         => $video,
					'data-boim-video-opacity' => '50',
				),
				'Video at 50% opacity'
			),
			boim_demo_banner( 'e', array( 'data-boim-video' => $url ), 'From a URL' ),
			boim_demo_banner( 'f', array( 'data-boim-video' => $video ), 'Outer banner', $nested ),
			boim_demo_element(
				'sp000001',
				'div',
				array(
					'styles' => array( 'minHeight' => '150vh' ),
					'css'    => '.gb-element-sp000001{min-height:150vh}',
				),
				boim_demo_text( 'spt00001', 'p', 'Spacer, so the next banner starts off-screen.' )
			),
			boim_demo_banner( 'h', array( 'data-boim-video' => $video ), 'Below the fold' ),
		)
	);
}
