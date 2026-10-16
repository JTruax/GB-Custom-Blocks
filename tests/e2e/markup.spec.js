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

const config = async ( page, selector ) =>
	JSON.parse(
		await page.locator( selector ).getAttribute( 'data-boim-video-banner' )
	);

test( 'a banner gets a decorative, empty, looping video layer', async ( {
	page,
} ) => {
	await blockViewScript( page );
	await page.goto( DEMO );

	const a = page.locator( '#banner-a' );

	expect( await config( page, '#banner-a' ) ).toEqual( {
		sources: [
			{
				src: expect.stringMatching( /\/sample\.webm$/ ),
				type: 'video/webm',
			},
		],
		maxWidth: 0,
		opacity: 1,
	} );
	await expect( a ).toHaveClass( /\bboim-has-video\b/ );

	// The raw settings don't reach the page.
	for ( const name of [
		'data-boim-video',
		'data-boim-video-max-width',
		'data-boim-video-opacity',
	] ) {
		expect( await a.getAttribute( name ), name ).toBeNull();
	}

	const media = a.locator( ':scope > .boim-video-banner__media' );
	await expect( media ).toHaveAttribute( 'aria-hidden', 'true' );
	await expect( media.locator( '> *' ) ).toHaveCount( 1 );

	const video = media.locator( 'video' );
	await expect( video ).toHaveAttribute( 'preload', 'none' );
	expect(
		await video.evaluate( ( element ) => [
			element.muted,
			element.loop,
			element.src,
			element.children.length,
		] )
	).toEqual( [ true, true, '', 0 ] );

	// No pause button or poster any more.
	await expect( page.locator( '[data-boim-video-part]' ) ).toHaveCount( 0 );
	await expect( page.locator( '.boim-video-banner__poster' ) ).toHaveCount(
		0
	);

	expect( ( await config( page, '#banner-b' ) ).maxWidth ).toBe( 767 );
	expect( ( await config( page, '#banner-c' ) ).maxWidth ).toBe( 1024 );
	expect( ( await config( page, '#banner-o' ) ).opacity ).toBe( 0.5 );
	expect( ( await config( page, '#banner-e' ) ).sources[ 0 ].type ).toBe(
		'video/mp4'
	);
} );

test( 'a nested banner has its own layer', async ( { page } ) => {
	await blockViewScript( page );
	await page.goto( DEMO );

	await expect(
		page.locator( '#banner-f > .boim-video-banner__media' )
	).toHaveCount( 1 );
	await expect(
		page.locator( '#banner-g > .boim-video-banner__media' )
	).toHaveCount( 1 );
} );

test( 'the breakpoint is a whole number of pixels, defaulting to 767', async ( {
	page,
} ) => {
	const { webm } = await mediaIds( page );
	const cases = {
		empty: [ '', 767 ],
		text: [ 'abc', 767 ],
		zero: [ '0', 767 ],
		units: [ '900px', 767 ],
		custom: [ '900', 900 ],
		huge: [ '99999', 4000 ],
	};
	const path = await testPage(
		page,
		'boim-breakpoints',
		Object.entries( cases )
			.map( ( [ id, [ value ] ] ) =>
				banner( {
					id,
					'data-boim-video': String( webm ),
					'data-boim-video-max-width': value,
				} )
			)
			.join( '' )
	);

	await blockViewScript( page );
	await page.goto( path );

	for ( const [ id, [ , expected ] ] of Object.entries( cases ) ) {
		expect( ( await config( page, `#${ id }` ) ).maxWidth, id ).toBe(
			expected
		);
	}
} );

test( 'opacity is a whole percentage, defaulting to 100%', async ( {
	page,
} ) => {
	const { webm } = await mediaIds( page );
	const cases = {
		empty: [ '', 1 ],
		text: [ 'abc', 1 ],
		negative: [ '-5', 1 ],
		decimal: [ '0.5', 1 ],
		zero: [ '0', 0 ],
		some: [ '35', 0.35 ],
		over: [ '150', 1 ],
	};
	const path = await testPage(
		page,
		'boim-opacities',
		Object.entries( cases )
			.map( ( [ id, [ value ] ] ) =>
				banner( {
					id,
					'data-boim-video': String( webm ),
					'data-boim-video-opacity': value,
				} )
			)
			.join( '' )
	);

	await blockViewScript( page );
	await page.goto( path );

	for ( const [ id, [ , expected ] ] of Object.entries( cases ) ) {
		expect( ( await config( page, `#${ id }` ) ).opacity, id ).toBe(
			expected
		);
	}
} );

test( 'invalid sources leave a plain Container', async ( { page } ) => {
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
		expect( await root.getAttribute( 'data-boim-video' ), id ).toBeNull();
		await expect(
			root.locator( '.boim-video-banner__media' ),
			id
		).toHaveCount( 0 );
	}
} );
