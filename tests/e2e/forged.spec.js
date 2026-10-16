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
	'sources-string': JSON.stringify( {
		sources: 'https://example.invalid/x.webm',
	} ),
	'proto-hide': JSON.stringify( {
		sources: [
			{ src: 'https://example.invalid/x.webm', type: 'video/webm' },
		],
		hide: [ '__proto__', 'constructor', 'toString', { mobile: true } ],
		loop: 'yes',
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
				'<button type="button" data-boim-video-part="toggle" aria-pressed="false">Pause video</button>' +
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
				hidden: root.querySelector( 'button' ).hidden,
			};
		}, `forged-${ id }` );

		if ( 'proto-hide' === id ) {
			// A valid http(s) URL is allowed (it's just a video); the bad hide values are ignored.
			expect( state.sources ).toEqual( [
				'https://example.invalid/x.webm',
			] );
		} else {
			expect( state, id ).toEqual( { sources: [], hidden: true } );
		}
	}

	expect( errors ).toEqual( [] );
	expect(
		unsafe.filter(
			( url ) => ! url.startsWith( 'https://example.invalid/' )
		)
	).toEqual( [] );

	// The real banner still works.
	await page.locator( '#banner-a > [data-boim-video-part="toggle"]' ).click();
	expect( ( await videoState( page, 'banner-a' ) ).paused ).toBe( true );
} );
