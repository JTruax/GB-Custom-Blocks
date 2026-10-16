/**
 * When the video loads and plays.
 */
const { test, expect } = require( '@playwright/test' );
const {
	DEMO,
	testPage,
	mediaIds,
	recordVideoRequests,
	videoState,
} = require( './helpers' );
const { banner } = require( './markup' );

const playing = ( page, id ) =>
	expect.poll( async () => {
		const state = await videoState( page, id );
		return (
			state.sources > 0 &&
			! state.paused &&
			state.time > 0 &&
			'1' === state.opacity
		);
	} );

/**
 * A page with one banner switched off at the given width.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string}                          maxWidth
 */
async function breakpointPage( page, maxWidth ) {
	const { webm } = await mediaIds( page );

	return testPage(
		page,
		`boim-off-${ maxWidth }`,
		banner( {
			id: 'm',
			'data-boim-video': String( webm ),
			'data-boim-video-max-width': maxWidth,
		} )
	);
}

test.describe( 'Desktop', () => {
	test.use( { viewport: { width: 1280, height: 800 } } );

	test( 'the video plays muted and loops', async ( { page } ) => {
		await page.goto( DEMO );
		await playing( page, 'banner-a' ).toBe( true );

		const state = await videoState( page, 'banner-a' );
		expect( state.loop ).toBe( true );
		expect(
			await page
				.locator( '#banner-a video' )
				.evaluate( ( video ) => video.muted )
		).toBe( true );
	} );

	test( 'a banner below the fold loads nothing until it is scrolled near', async ( {
		page,
	} ) => {
		await page.goto( DEMO );
		await playing( page, 'banner-a' ).toBe( true );
		expect( ( await videoState( page, 'banner-h' ) ).sources ).toBe( 0 );

		await page.locator( '#banner-h' ).scrollIntoViewIfNeeded();
		await playing( page, 'banner-h' ).toBe( true );

		// Scrolled away again: paused.
		await page.evaluate( () => window.scrollTo( 0, 0 ) );
		await expect
			.poll( async () => ( await videoState( page, 'banner-h' ) ).paused )
			.toBe( true );
	} );

	test( 'a video from a URL plays (MP4)', async ( { page } ) => {
		test.skip(
			!! process.env.CI,
			"Playwright's own Chromium can't play H.264."
		);

		await page.goto( DEMO );
		await page.locator( '#banner-e' ).scrollIntoViewIfNeeded();
		await playing( page, 'banner-e' ).toBe( true );
	} );

	test( 'nested banners both play', async ( { page } ) => {
		await page.goto( DEMO );
		await page.locator( '#banner-g' ).scrollIntoViewIfNeeded();
		await playing( page, 'banner-f' ).toBe( true );
		await playing( page, 'banner-g' ).toBe( true );
	} );

	test( 'resizing to the breakpoint pauses and hides the video', async ( {
		page,
	} ) => {
		await page.goto( DEMO );
		await page.locator( '#banner-b' ).scrollIntoViewIfNeeded();
		await playing( page, 'banner-b' ).toBe( true );

		await page.setViewportSize( { width: 767, height: 800 } );
		await expect
			.poll( async () => ( await videoState( page, 'banner-b' ) ).paused )
			.toBe( true );
		expect( ( await videoState( page, 'banner-b' ) ).opacity ).toBe( '0' );

		// Wider again: it comes back.
		await page.setViewportSize( { width: 768, height: 800 } );
		await playing( page, 'banner-b' ).toBe( true );
	} );
} );

test.describe( 'Below the breakpoint', () => {
	test.use( { viewport: { width: 375, height: 812 } } );

	test( 'the video file is never downloaded', async ( { page } ) => {
		const path = await breakpointPage( page, '767' );
		const requests = recordVideoRequests( page );

		await page.goto( path );
		await page.waitForLoadState( 'networkidle' );
		await page.waitForTimeout( 1000 );

		expect( requests ).toEqual( [] );

		const state = await videoState( page, 'm' );
		expect( state.sources ).toBe( 0 );
		expect( state.opacity ).toBe( '0' );
	} );

	test( 'banners without the setting still play on mobile', async ( {
		page,
	} ) => {
		await page.goto( DEMO );
		await playing( page, 'banner-a' ).toBe( true );
	} );
} );

test.describe( 'Custom breakpoint', () => {
	test.use( { viewport: { width: 900, height: 1000 } } );

	test( '1024px switches it off at 900px; 767px does not', async ( {
		page,
	} ) => {
		await page.goto( DEMO );
		await page.locator( '#banner-c' ).scrollIntoViewIfNeeded();
		await page.waitForTimeout( 1000 );

		const c = await videoState( page, 'banner-c' );
		expect( c.sources ).toBe( 0 );
		expect( c.opacity ).toBe( '0' );

		await page.locator( '#banner-b' ).scrollIntoViewIfNeeded();
		await playing( page, 'banner-b' ).toBe( true );
	} );

	test( 'exactly at the breakpoint counts as off', async ( { page } ) => {
		const path = await breakpointPage( page, '900' );
		const requests = recordVideoRequests( page );

		await page.goto( path );
		await page.waitForLoadState( 'networkidle' );
		await page.waitForTimeout( 1000 );

		expect( requests ).toEqual( [] );
	} );
} );
