/**
 * Anyone who can add HTML can write a data-boim-video-banner attribute. The
 * view script must never run, navigate to or load anything unsafe from it.
 */
const { test, expect } = require( '@playwright/test' );
const { DEMO, videoState } = require( './helpers' );

const FORGED = {
	'broken-json': '{"sources":[',
	'not-object': '5',
	'null-config': 'null',
	'js-url': JSON.stringify( {
		sources: [ { src: 'javascript:alert(1)', type: 'video/webm' } ],
	} ),
	'data-url': JSON.stringify( {
		sources: [ { src: 'data:video/webm;base64,AAAA', type: 'video/webm' } ],
	} ),
	'bad-type': JSON.stringify( {
		sources: [ { src: '/x.webm', type: 'text/html' } ],
	} ),
	'bad-width': JSON.stringify( {
		sources: [
			{ src: 'https://example.invalid/x.webm', type: 'video/webm' },
		],
		maxWidth: { valueOf: 767 },
		opacity: '__proto__',
	} ),
	'sources-string': JSON.stringify( {
		sources: 'https://example.invalid/x.webm',
	} ),
	'proto-width': JSON.stringify( {
		sources: [
			{ src: 'https://example.invalid/x.webm', type: 'video/webm' },
		],
		maxWidth: '__proto__',
	} ),
};

test( 'forged configs are ignored safely and real banners keep working', async ( {
	page,
} ) => {
	const errors = [];
	const unsafe = [];

	page.on( 'pageerror', ( error ) => errors.push( error.message ) );
	page.on( 'dialog', ( dialog ) => {
		errors.push( 'dialog: ' + dialog.message() );
		dialog.dismiss();
	} );
	page.on( 'request', ( request ) => {
		if (
			/^(javascript|data):/.test( request.url() ) ||
			request.url().includes( '/x.webm' )
		) {
			unsafe.push( request.url() );
		}
	} );
	await page.route( 'https://example.invalid/**', ( route ) =>
		route.abort()
	);

	await page.goto( DEMO );

	await page.evaluate( ( forged ) => {
		const host = document.querySelector( '.entry-content' );

		Object.entries( forged ).forEach( ( [ id, config ] ) => {
			const root = document.createElement( 'section' );
			root.id = `forged-${ id }`;
			root.setAttribute( 'data-boim-video-banner', config );
			root.innerHTML =
				'<div class="boim-video-banner__media" aria-hidden="true"><video class="boim-video-banner__video" muted playsinline preload="none"></video></div>';
			host.prepend( root );
		} );

		window.boimVideoBanner.init();
		window.boimVideoBanner.init(); // Idempotent.
	}, FORGED );

	await page.waitForTimeout( 1000 );

	for ( const id of Object.keys( FORGED ) ) {
		const state = await page.evaluate( ( rootId ) => {
			const root = document.getElementById( rootId );
			return {
				sources: [ ...root.querySelectorAll( 'source' ) ].map(
					( source ) => source.getAttribute( 'src' )
				),
			};
		}, `forged-${ id }` );

		if ( [ 'proto-width', 'bad-width' ].includes( id ) ) {
			// A valid http(s) URL is allowed (it's just a video); the bad width is ignored.
			expect( state.sources, id ).toEqual( [
				'https://example.invalid/x.webm',
			] );
		} else {
			expect( state, id ).toEqual( { sources: [] } );
		}
	}

	expect( errors ).toEqual( [] );
	expect(
		unsafe.filter(
			( url ) => ! url.startsWith( 'https://example.invalid/' )
		)
	).toEqual( [] );

	// The real banner still plays.
	await expect
		.poll( async () => ( await videoState( page, 'banner-a' ) ).paused )
		.toBe( false );
} );
