/**
 * Video Banner, front end.
 *
 * The server has rendered the layer (an empty, muted, looping <video>). This
 * decides when the video may load and play:
 *
 * - never at or below the "Disable on mobile" width,
 * - not until the banner is near the viewport,
 * - never for visitors who prefer reduced motion or save data,
 * - paused while off-screen or in a background tab.
 *
 * Until it plays, and wherever it's switched off, the banner's own
 * GenerateBlocks background shows.
 *
 * The config in data-boim-video-banner could be forged (anyone who can add
 * HTML can write one), so every value is checked again here.
 */
import './style.scss';

const SELECTOR = '[data-boim-video-banner]';
const TYPES = [ 'video/mp4', 'video/webm', 'video/ogg' ];
const MAX_BREAKPOINT = 4000; // The same clamp as the server.

const reducedMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' );
const saveData = Boolean( window.navigator.connection?.saveData );
const banners = new Set();

/**
 * The checked config, or null.
 *
 * @param {HTMLElement} root Banner.
 * @return {Object|null} { sources, maxWidth }.
 */
function readConfig( root ) {
	let config;

	try {
		config = JSON.parse( root.getAttribute( 'data-boim-video-banner' ) );
	} catch ( e ) {
		return null;
	}

	if ( ! config || 'object' !== typeof config ) {
		return null;
	}

	const sources = ( Array.isArray( config.sources ) ? config.sources : [] )
		.map( ( source ) => {
			if (
				! source ||
				'string' !== typeof source.src ||
				! TYPES.includes( source.type )
			) {
				return null;
			}

			try {
				const url = new URL( source.src, window.location.href );

				// Only http(s): never a javascript: or data: URL from a forged config.
				return /^https?:$/.test( url.protocol )
					? { src: url.href, type: source.type }
					: null;
			} catch ( e ) {
				return null;
			}
		} )
		.filter( Boolean );

	// A whole number of pixels; anything else means "never switched off".
	const width = config.maxWidth;
	const maxWidth =
		Number.isInteger( width ) && width > 0
			? Math.min( width, MAX_BREAKPOINT )
			: 0;

	return { sources, maxWidth };
}

/**
 * Whether the video is switched on for this visitor and screen size.
 *
 * @param {Object} banner Banner state.
 * @return {boolean} Enabled.
 */
const isEnabled = ( banner ) =>
	! banner.failed &&
	! banner.blocked &&
	! banner.media?.matches &&
	! reducedMotion.matches &&
	! saveData;

/**
 * Attach the source(s), once. Until now the browser had nothing to download.
 *
 * @param {Object} banner Banner state.
 */
function load( banner ) {
	if ( banner.loaded ) {
		return;
	}

	const { video, config } = banner;

	banner.loaded = true;
	video.muted = true; // Muted video may autoplay; there is never sound.
	video.loop = true;

	config.sources.forEach( ( { src, type }, index ) => {
		const source = video.ownerDocument.createElement( 'source' );

		source.src = src;
		source.type = type;

		// <source> errors don't reach the video: the last one failing means none worked.
		if ( index === config.sources.length - 1 ) {
			source.addEventListener( 'error', () => {
				banner.failed = true;
				update( banner );
			} );
		}

		video.append( source );
	} );

	video.load();
}

/**
 * Bring the video in line with the current state.
 *
 * @param {Object} banner Banner state.
 */
function update( banner ) {
	const { video } = banner;
	const enabled = isEnabled( banner );

	if ( ! enabled ) {
		// The banner's own background shows instead of a frozen frame
		// (also stopping a fade-in that's still running).
		video.getAnimations?.().forEach( ( animation ) => animation.cancel() );
		video.style.opacity = '0';
	}

	if ( enabled && banner.near && ! document.hidden ) {
		load( banner );

		// Autoplay can still be refused (e.g. low-power mode): leave it off.
		video.play()?.catch( ( error ) => {
			if ( 'NotAllowedError' === error?.name ) {
				banner.blocked = true;
				update( banner );
			}
		} );
	} else if ( ! video.paused ) {
		video.pause();
	}
}

/**
 * Fade the video in over the banner's background when it plays. Web
 * Animations, not a class: "remove unused CSS" tools can't strip it.
 *
 * @param {Object} banner Banner state.
 */
function reveal( banner ) {
	const { video } = banner;

	// Already shown, or switched off since play() was called.
	if ( '1' === video.style.opacity || ! isEnabled( banner ) ) {
		return;
	}

	video.style.opacity = '1';

	if ( video.animate ) {
		video.animate( [ { opacity: 0 }, { opacity: 1 } ], {
			duration: 400,
			easing: 'ease-out',
		} );
	}
}

const observer =
	'IntersectionObserver' in window
		? new window.IntersectionObserver(
				( entries ) =>
					entries.forEach( ( entry ) => {
						const banner = entry.target.boimVideoBanner;

						if ( banner ) {
							banner.near = entry.isIntersecting;
							update( banner );
						}
					} ),
				{ rootMargin: '200px 0px' }
		  )
		: null;

/**
 * Set up one banner.
 *
 * @param {HTMLElement} root Banner.
 */
function setup( root ) {
	if ( root.boimVideoBanner ) {
		return; // Already set up.
	}

	const config = readConfig( root );
	const video = root.querySelector(
		':scope > .boim-video-banner__media > video.boim-video-banner__video'
	);

	if ( ! config || ! config.sources.length || ! video ) {
		return;
	}

	const banner = {
		root,
		video,
		config,
		media: config.maxWidth
			? window.matchMedia( `(max-width: ${ config.maxWidth }px)` )
			: null,
		blocked: false,
		near: ! observer, // Without IntersectionObserver, treat it as visible.
		loaded: false,
		failed: false,
	};

	root.boimVideoBanner = banner;
	banners.add( banner );

	video.addEventListener( 'playing', () => reveal( banner ) );
	banner.media?.addEventListener( 'change', () => update( banner ) );

	update( banner );
	observer?.observe( root );
}

function updateAll() {
	banners.forEach( update );
}

function init() {
	document.querySelectorAll( SELECTOR ).forEach( setup );
}

document.addEventListener( 'visibilitychange', updateAll );
reducedMotion.addEventListener?.( 'change', updateAll );

// For content added later, and for tests.
window.boimVideoBanner = { init };

if ( 'loading' === document.readyState ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}
