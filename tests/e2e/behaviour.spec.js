/**
 * When the video loads and plays, and the pause toggle.
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

test.describe( 'Desktop', () => {
	test.use( { viewport: { width: 1280, height: 800 } } );

	test( 'the video plays, and the toggle pauses and resumes it', async ( {
		page,
	} ) => {
		await page.goto( DEMO );
		await playing( page, 'banner-a' ).toBe( true );

		const toggle = page.locator(
			'#banner-a > [data-boim-video-part="toggle"]'
		);

		await toggle.click();
		await expect( toggle ).toHaveAttribute( 'aria-pressed', 'true' );
		await expect( toggle ).toHaveAttribute( 'data-boim-state', 'paused' );
		expect( ( await videoState( page, 'banner-a' ) ).paused ).toBe( true );

		await toggle.click();
		await expect( toggle ).toHaveAttribute( 'aria-pressed', 'false' );
		await playing( page, 'banner-a' ).toBe( true );
	} );

	test( 'a banner below the fold loads nothing until it is scrolled near', async ( {
		page,
	} ) => {
		await page.goto( DEMO );
		await playing( page, 'banner-a' ).toBe( true );
		expect( ( await videoState( page, 'banner-h' ) ).sources ).toBe( 0 );

		await page.locator( '#banner-h' ).scrollIntoViewIfNeeded();
		await playing( page, 'banner-h' ).toBe( true );

		// Scrolled away again: paused, but still "playing" as far as the toggle is concerned.
		await page.evaluate( () => window.scrollTo( 0, 0 ) );
		await expect
			.poll( async () => ( await videoState( page, 'banner-h' ) ).paused )
			.toBe( true );
		expect( ( await videoState( page, 'banner-h' ) ).pressed ).toBe(
			'false'
		);
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

	test( 'no loop: the toggle offers play once the video ends', async ( {
		page,
	} ) => {
		await page.goto( DEMO );
		await page.locator( '#banner-d' ).scrollIntoViewIfNeeded();
		await playing( page, 'banner-d' ).toBe( true );
		expect(
			await page
				.locator( '#banner-d video' )
				.evaluate( ( video ) => video.loop )
		).toBe( false );

		await page
			.locator( '#banner-d video' )
			.evaluate(
				( video ) => ( video.currentTime = video.duration - 0.2 )
			);
		await expect(
			page.locator( '#banner-d > [data-boim-video-part="toggle"]' )
		).toHaveAttribute( 'aria-pressed', 'true', {
			timeout: 10_000,
		} );
	} );

	test( 'nested banners have their own toggles', async ( { page } ) => {
		await page.goto( DEMO );
		await page.locator( '#banner-g' ).scrollIntoViewIfNeeded();
		await playing( page, 'banner-f' ).toBe( true );
		await playing( page, 'banner-g' ).toBe( true );

		await page
			.locator( '#banner-f > [data-boim-video-part="toggle"]' )
			.click();
		expect( ( await videoState( page, 'banner-f' ) ).paused ).toBe( true );
		expect( ( await videoState( page, 'banner-g' ) ).paused ).toBe( false );

		await page
			.locator( '#banner-g > [data-boim-video-part="toggle"]' )
			.click();
		expect( ( await videoState( page, 'banner-g' ) ).paused ).toBe( true );
	} );

	test( 'resizing into a disabled range pauses and hides the video', async ( {
		page,
	} ) => {
		await page.goto( DEMO );
		await page.locator( '#banner-b' ).scrollIntoViewIfNeeded();
		await playing( page, 'banner-b' ).toBe( true );

		await page.setViewportSize( { width: 375, height: 800 } );
		await expect
			.poll( async () => ( await videoState( page, 'banner-b' ) ).paused )
			.toBe( true );

		const state = await videoState( page, 'banner-b' );
		expect( state.visible ).toBe( false );
		expect( state.toggleHidden ).toBe( true );
	} );
} );

test.describe( 'Mobile', () => {
	test.use( { viewport: { width: 375, height: 812 } } );

	test( '"Disable on mobile" never downloads the video and shows the poster', async ( {
		page,
	} ) => {
		const { webm, poster } = await mediaIds( page );
		const path = await testPage(
			page,
			'boim-mobile-off',
			banner( {
				id: 'm',
				'data-boim-video': String( webm ),
				'data-boim-video-poster': String( poster ),
				'data-boim-video-hide': 'mobile',
			} )
		);
		const requests = recordVideoRequests( page );

		await page.goto( path );
		await page.waitForLoadState( 'networkidle' );
		await page.waitForTimeout( 1000 );

		expect( requests ).toEqual( [] );

		const state = await videoState( page, 'm' );
		expect( state.sources ).toBe( 0 );
		expect( state.visible ).toBe( false );
		expect( state.toggleHidden ).toBe( true );
		await expect(
			page.locator( '#m .boim-video-banner__poster' )
		).toBeVisible();
	} );

	test( 'banners without the setting still play on mobile', async ( {
		page,
	} ) => {
		await page.goto( DEMO );
		await playing( page, 'banner-a' ).toBe( true );
	} );
} );

test.describe( 'Tablet', () => {
	test.use( { viewport: { width: 800, height: 1000 } } );

	test( '"Disable on tablet" applies from 768 to 1024px only', async ( {
		page,
	} ) => {
		await page.goto( DEMO );
		await page.locator( '#banner-c' ).scrollIntoViewIfNeeded();
		await page.waitForTimeout( 1000 );

		const c = await videoState( page, 'banner-c' );
		expect( c.sources ).toBe( 0 );
		expect( c.toggleHidden ).toBe( true );

		// "Disable on mobile" doesn't apply at tablet width.
		await page.locator( '#banner-b' ).scrollIntoViewIfNeeded();
		await playing( page, 'banner-b' ).toBe( true );
	} );
} );
