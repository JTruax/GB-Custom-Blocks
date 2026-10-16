/**
 * Video Banner, front end.
 *
 * The server has rendered the layer (poster + an empty <video>) and the pause
 * toggle's state. This decides when the video may load and play:
 *
 * - never on a viewport the editor switched off ("Disable on mobile/tablet"),
 * - not until the banner is near the viewport,
 * - not automatically for visitors who prefer reduced motion or save data
 *   (they can still press play),
 * - paused while off-screen or in a background tab.
 *
 * The config in data-boim-video-banner could be forged (anyone who can add
 * HTML can write one), so every value is checked again here.
 */
import './style.scss';

const SELECTOR = '[data-boim-video-banner]';
const TOGGLE = '[data-boim-video-part="toggle"]';
const TYPES = [ 'video/mp4', 'video/webm', 'video/ogg' ];

// GenerateBlocks' default breakpoints; the same as style.scss.
const DEVICES = {
	mobile: '(max-width: 767px)',
	tablet: '(min-width: 768px) and (max-width: 1024px)',
};

const reducedMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' );
const saveData = Boolean( window.navigator.connection?.saveData );
const banners = new Set();

/**
 * The checked config, or null.
 *
 * @param {HTMLElement} root Banner.
 * @return {Object|null} { sources, hide, loop }.
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

	// Own keys only: a forged "__proto__" or "constructor" must not reach the
	// prototype. (hasOwnProperty.call rather than Object.hasOwn, for older Safari.)
	const hide = ( Array.isArray( config.hide ) ? config.hide : [] ).filter(
		( device ) =>
			'string' === typeof device &&
			Object.prototype.hasOwnProperty.call( DEVICES, device )
	);

	return { sources, hide, loop: false !== config.loop };
}

/**
 * Whether the video should be playing if it could: the visitor's choice,
 * otherwise autoplay unless they prefer reduced motion or save data.
 *
 * @param {Object} banner Banner state.
 * @return {boolean} Wants to play.
 */
const wantsPlay = ( banner ) =>
	null === banner.choice
		? ! reducedMotion.matches && ! saveData && ! banner.blocked
		: banner.choice;

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
	video.loop = config.loop;

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
 * Bring the video and the toggle in line with the current state.
 *
 * @param {Object} banner Banner state.
 */
function update( banner ) {
	const { video, toggles, media } = banner;
	const available = ! banner.failed && ! media?.matches;
	const play =
		available && banner.near && ! document.hidden && wantsPlay( banner );

	toggles.forEach( ( toggle ) => {
		// Don't leave focus on a button that's about to disappear.
		if (
			! available &&
			toggle.contains( toggle.ownerDocument.activeElement )
		) {
			toggle.blur();
		}

		toggle.hidden = ! available;
		toggle.setAttribute(
			'aria-pressed',
			wantsPlay( banner ) ? 'false' : 'true'
		);
		toggle.setAttribute(
			'data-boim-state',
			wantsPlay( banner ) ? 'playing' : 'paused'
		);
	} );

	if ( play ) {
		load( banner );

		const promise = video.play();

		// Autoplay can still be refused (e.g. low-power mode): show it as paused.
		promise?.catch( ( error ) => {
			if ( 'NotAllowedError' === error?.name && null === banner.choice ) {
				banner.blocked = true;
				update( banner );
			}
		} );
	} else if ( ! video.paused ) {
		video.pause();
	}
}

/**
 * Fade the video in over the poster the first time it really plays.
 * Web Animations, not a class: "remove unused CSS" tools can't strip it.
 *
 * @param {HTMLVideoElement} video Video.
 */
function reveal( video ) {
	if ( '1' === video.style.opacity ) {
		return;
	}

	video.style.opacity = '1';

	if ( ! reducedMotion.matches && video.animate ) {
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
	// This banner's own toggles, not those of a banner nested inside it.
	const toggles = [ ...root.querySelectorAll( TOGGLE ) ].filter(
		( toggle ) => toggle.closest( SELECTOR ) === root
	);

	if ( ! config || ! config.sources.length || ! video ) {
		toggles.forEach( ( toggle ) => ( toggle.hidden = true ) );
		return;
	}

	const banner = {
		root,
		video,
		toggles,
		config,
		media: config.hide.length
			? window.matchMedia(
					config.hide
						.map( ( device ) => DEVICES[ device ] )
						.join( ', ' )
			  )
			: null,
		choice: null, // The visitor's own play/pause, once they've used the toggle.
		blocked: false,
		near: ! observer, // Without IntersectionObserver, treat it as visible.
		loaded: false,
		failed: false,
	};

	root.boimVideoBanner = banner;
	banners.add( banner );

	video.addEventListener( 'playing', () => reveal( video ) );
	video.addEventListener( 'ended', () => {
		banner.choice = false; // Not looping: it stopped, so the toggle offers play.
		update( banner );
	} );
	banner.media?.addEventListener( 'change', () => update( banner ) );

	const toggle = ( event ) => {
		event.preventDefault(); // A link used as the toggle mustn't navigate.
		banner.choice = ! wantsPlay( banner );
		banner.blocked = false;
		update( banner );
	};

	toggles.forEach( ( button ) => {
		button.addEventListener( 'click', toggle );

		if ( 'BUTTON' !== button.tagName ) {
			button.addEventListener( 'keydown', ( event ) => {
				// Space for every role="button"; Enter too, except on links (Enter already clicks them).
				if (
					' ' === event.key ||
					( 'Enter' === event.key && 'A' !== button.tagName )
				) {
					toggle( event );
				}
			} );
		}
	} );

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
