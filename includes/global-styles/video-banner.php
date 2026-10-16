<?php
/**
 * Default Global Styles for the Video Banner layout (GB Pro). Base classes
 * before their modifiers. None of these names is a class the PHP renderer
 * adds itself (boim-has-video, boim-video-banner__media/__poster/__video).
 *
 * @package Boim
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// A function, so the helper variables don't become globals.
return static function () {
	$padding = static function ( $y, $x ) {
		return array(
			'paddingTop'    => $y,
			'paddingRight'  => $x,
			'paddingBottom' => $y,
			'paddingLeft'   => $x,
		);
	};
	$radius  = static function ( $value ) {
		return array(
			'borderTopLeftRadius'     => $value,
			'borderTopRightRadius'    => $value,
			'borderBottomRightRadius' => $value,
			'borderBottomLeftRadius'  => $value,
		);
	};

	return array(
		// The banner. A dark background keeps the white text readable before
		// the poster or video has loaded, and where the video is switched off
		// without a poster.
		'boim-video-banner'          => array_merge(
			array(
				'position'        => 'relative',
				'isolation'       => 'isolate',
				'overflowX'       => 'hidden',
				'overflowY'       => 'hidden',
				'display'         => 'flex',
				'flexDirection'   => 'column',
				'justifyContent'  => 'center',
				'minHeight'       => '70vh',
				'backgroundColor' => '#111111',
				'color'           => '#ffffff',
			),
			$padding( '6rem', '1.5rem' ),
			array(
				'@media (max-width:767px)' => array(
					'minHeight' => '60vh',
				),
			)
		),
		// A tint between the video and the content (z-index -1, after the
		// video layer in the DOM, so it paints above it), for text contrast.
		'boim-video-banner--overlay' => array(
			'&::after' => array(
				'content'         => '""',
				'position'        => 'absolute',
				'top'             => '0',
				'right'           => '0',
				'bottom'          => '0',
				'left'            => '0',
				'zIndex'          => '-1',
				'backgroundColor' => 'rgba(0, 0, 0, 0.55)',
				'pointerEvents'   => 'none',
			),
		),
		'boim-video-banner__content' => array(
			'width'       => '100%',
			'maxWidth'    => '1200px',
			'marginRight' => 'auto',
			'marginLeft'  => 'auto',
		),
		// The pause toggle: fixed colours (white on 75% black, so it keeps
		// its contrast over any footage), with a CSS-drawn pause/play icon
		// so no text is added to the button's accessible name.
		'boim-video-banner__toggle'  => array_merge(
			array(
				'position'          => 'absolute',
				'insetInlineEnd'    => '1rem',
				'insetBlockEnd'     => '1rem',
				'zIndex'            => '1',
				'display'           => 'inline-flex',
				'alignItems'        => 'center',
				'columnGap'         => '0.5em',
				'borderTopWidth'    => '0',
				'borderRightWidth'  => '0',
				'borderBottomWidth' => '0',
				'borderLeftWidth'   => '0',
				'backgroundColor'   => 'rgba(0, 0, 0, 0.75)',
				'color'             => '#ffffff',
				'fontSize'          => '0.875rem',
				'lineHeight'        => '1.2',
				'cursor'            => 'pointer',
				// Forced colours drop backgrounds; this outline is drawn instead.
				'outlineWidth'      => '2px',
				'outlineStyle'      => 'solid',
				'outlineColor'      => 'transparent',
			),
			$padding( '0.5em', '0.9em' ),
			$radius( '999px' ),
			array(
				'&::before'                      => array(
					'content'          => '""',
					'boxSizing'        => 'border-box',
					'width'            => '0.7em',
					'height'           => '0.8em',
					'borderLeftWidth'  => '0.25em',
					'borderLeftStyle'  => 'solid',
					'borderLeftColor'  => 'currentColor',
					'borderRightWidth' => '0.25em',
					'borderRightStyle' => 'solid',
					'borderRightColor' => 'currentColor',
				),
				'&[aria-pressed="true"]::before' => array(
					'width'             => '0',
					'height'            => '0',
					'borderTopWidth'    => '0.4em',
					'borderTopStyle'    => 'solid',
					'borderTopColor'    => 'transparent',
					'borderBottomWidth' => '0.4em',
					'borderBottomStyle' => 'solid',
					'borderBottomColor' => 'transparent',
					'borderLeftWidth'   => '0.7em',
					'borderRightWidth'  => '0',
				),
				'&:hover'                        => array(
					'backgroundColor' => 'rgba(0, 0, 0, 0.9)',
				),
				// White ring plus a black one: visible over light and dark footage.
				'&:focus-visible'                => array(
					'outlineColor'  => '#ffffff',
					'outlineOffset' => '2px',
					'boxShadow'     => '0 0 0 5px #000000',
				),
			)
		),
	);
};
