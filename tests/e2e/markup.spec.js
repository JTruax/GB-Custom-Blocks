/**
 * The server-rendered markup, before any JavaScript runs.
 */
const { test, expect } = require( '@playwright/test' );
const { DEMO, testPage, mediaIds } = require( './helpers' );
const { banner } = require( './markup' );

// No view script: what the server sent is what we see. Installed after any
// REST setup (interception during Playground's login redirect aborts it).
const blockViewScript = ( page ) =>
	page.route( '**/build/video-banner/view.js*', ( route ) => route.abort() );

test( 'a banner gets a decorative, empty video layer and a toggle button', async ( {
	page,
} ) => {
	await blockViewScript( page );
	await page.goto( DEMO );

	const a = page.locator( '#banner-a' );
	const config = JSON.parse(
		await a.getAttribute( 'data-boim-video-banner' )
	);

	expect( config ).toEqual( {
		sources: [
			{
				src: expect.stringMatching( /\/sample\.webm$/ ),
				type: 'video/webm',
			},
		],
		hide: [],
		loop: true,
	} );
	await expect( a ).toHaveClass( /\bboim-has-video\b/ );

	// The raw settings don't reach the page.
	for ( const name of [
		'data-boim-video',
		'data-boim-video-poster',
		'data-boim-video-hide',
		'data-boim-video-loop',
	] ) {
		expect( await a.getAttribute( name ), name ).toBeNull();
	}

	const media = a.locator( ':scope > .boim-video-banner__media' );
	await expect( media ).toHaveAttribute( 'aria-hidden', 'true' );
	await expect(
		media.locator( 'img.boim-video-banner__poster' )
	).toHaveAttribute( 'alt', '' );

	const video = media.locator( 'video' );
	await expect( video ).toHaveAttribute( 'preload', 'none' );
	expect(
		await video.evaluate( ( element ) => [
			element.muted,
			element.src,
			element.children.length,
		] )
	).toEqual( [ true, '', 0 ] );

	const toggle = a.locator( '[data-boim-video-part="toggle"]' );
	await expect( toggle ).toHaveAttribute( 'type', 'button' );
	await expect( toggle ).toHaveAttribute( 'aria-pressed', 'false' );
	await expect( toggle ).toBeVisible();

	await expect( page.locator( '#banner-b' ) ).toHaveClass(
		/\bboim-video-hide-mobile\b/
	);
	await expect( page.locator( '#banner-c' ) ).toHaveClass(
		/\bboim-video-hide-tablet\b/
	);
	await expect( page.locator( '#banner-d' ) ).toHaveClass(
		/boim-video-hide-mobile boim-video-hide-tablet/
	);
	expect(
		JSON.parse(
			await page
				.locator( '#banner-d' )
				.getAttribute( 'data-boim-video-banner' )
		).loop
	).toBe( false );
	expect(
		JSON.parse(
			await page
				.locator( '#banner-e' )
				.getAttribute( 'data-boim-video-banner' )
		).sources[ 0 ].type
	).toBe( 'video/mp4' );
} );

test( 'a nested banner keeps its own toggle', async ( { page } ) => {
	await blockViewScript( page );
	await page.goto( DEMO );

	await expect(
		page.locator( '#banner-f [data-boim-video-part="toggle"]' )
	).toHaveCount( 2 );
	await expect(
		page.locator( '#banner-f > .boim-video-banner__media' )
	).toHaveCount( 1 );
	await expect(
		page.locator( '#banner-g > .boim-video-banner__media' )
	).toHaveCount( 1 );
} );

test( 'invalid sources leave a plain Container with the toggle hidden', async ( {
	page,
} ) => {
	const { poster } = await mediaIds( page );
	const cases = {
		js: { 'data-boim-video': 'javascript:alert(1)' },
		text: { 'data-boim-video': 'https://example.com/file.txt' },
		image: { 'data-boim-video': String( poster ) },
		missing: { 'data-boim-video': '999999' },
		empty: { 'data-boim-video': '' },
	};
	const path = await testPage(
		page,
		'boim-invalid-sources',
		Object.entries( cases )
			.map( ( [ id, settings ] ) => banner( { id, ...settings } ) )
			.join( '' )
	);

	await blockViewScript( page );
	await page.goto( path );

	for ( const id of Object.keys( cases ) ) {
		const root = page.locator( `#${ id }` );

		await expect( root, id ).not.toHaveClass( /boim-has-video/ );
		expect(
			await root.getAttribute( 'data-boim-video-banner' ),
			id
		).toBeNull();
		await expect(
			root.locator( '.boim-video-banner__media' ),
			id
		).toHaveCount( 0 );
		await expect(
			root.locator( '[data-boim-video-part="toggle"]' ),
			id
		).toBeHidden();
	}
} );

test( 'a toggle that is not a <button> becomes a keyboard-operable button', async ( {
	page,
} ) => {
	const { webm } = await mediaIds( page );
	const path = await testPage(
		page,
		'boim-div-toggle',
		banner(
			{
				id: 'div-toggle',
				'data-boim-video': String( webm ),
				'data-boim-video-hide': '__proto__ mobile constructor',
			},
			{ tagName: 'div' }
		)
	);

	await blockViewScript( page );
	await page.goto( path );

	const toggle = page.locator(
		'#div-toggle [data-boim-video-part="toggle"]'
	);
	await expect( toggle ).toHaveAttribute( 'role', 'button' );
	await expect( toggle ).toHaveAttribute( 'tabindex', '0' );
	await expect( toggle ).toHaveAttribute( 'aria-pressed', 'false' );
	expect(
		JSON.parse(
			await page
				.locator( '#div-toggle' )
				.getAttribute( 'data-boim-video-banner' )
		).hide
	).toEqual( [ 'mobile' ] );
} );
