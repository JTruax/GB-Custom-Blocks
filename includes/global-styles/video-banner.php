<?php
/**
 * Default Global Styles for the Video Banner layout (GB Pro). Base classes
 * before their modifiers. None of these names is a class the PHP renderer
 * adds itself (boim-has-video, boim-video-banner__media/__video).
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

	return array(
		// The banner. A dark background keeps the white text readable before
		// the video has loaded, and where the video is switched off. Users
		// can set any background in GB, e.g. an image for mobile.
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
		// A tint over the video, under the content: on the video layer's own
		// ::after (later than the video, so it paints above it). Not the
		// Container's ::after, which the block editor uses for its selection
		// outline. No video (or switched off): the layer and tint go with it.
		'boim-video-banner--overlay' => array(
			'& .boim-video-banner__media::after' => array(
				'content'         => '""',
				'position'        => 'absolute',
				'top'             => '0',
				'right'           => '0',
				'bottom'          => '0',
				'left'            => '0',
				'backgroundColor' => 'rgba(0, 0, 0, 0.55)',
			),
		),
		'boim-video-banner__content' => array(
			'width'       => '100%',
			'maxWidth'    => '1200px',
			'marginRight' => 'auto',
			'marginLeft'  => 'auto',
		),
	);
};
