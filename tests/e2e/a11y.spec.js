/**
 * Reduced motion, keyboard, and an axe scan.
 */
const { test, expect } = require( '@playwright/test' );
const AxeBuilder = require( '@axe-core/playwright' ).default;
const { DEMO, testPage, mediaIds, videoState } = require( './helpers' );
const { banner } = require( './markup' );

test.describe( 'Reduced motion', () => {
	test.use( { reducedMotion: 'reduce' } );

	test( 'no autoplay and no download until the visitor presses play', async ( {
		page,
	} ) => {
		await page.goto( DEMO );
		await page.waitForTimeout( 1000 );

		const before = await videoState( page, 'banner-a' );
		expect( before.sources ).toBe( 0 );
		expect( before.pressed ).toBe( 'true' );
		expect( before.toggleHidden ).toBe( false );
		await expect(
			page.locator( '#banner-a .boim-video-banner__poster' )
		).toBeVisible();

		await page
			.locator( '#banner-a > [data-boim-video-part="toggle"]' )
			.click();
		await expect
			.poll( async () => ( await videoState( page, 'banner-a' ) ).paused )
			.toBe( false );
		expect( ( await videoState( page, 'banner-a' ) ).pressed ).toBe(
			'false'
		);
	} );

	test( 'switching reduced motion on while playing pauses the video', async ( {
		page,
	} ) => {
		await page.emulateMedia( { reducedMotion: 'no-preference' } );
		await page.goto( DEMO );
		await expect
			.poll( async () => ( await videoState( page, 'banner-a' ) ).paused )
			.toBe( false );

		await page.emulateMedia( { reducedMotion: 'reduce' } );
		await expect
			.poll( async () => ( await videoState( page, 'banner-a' ) ).paused )
			.toBe( true );
		expect( ( await videoState( page, 'banner-a' ) ).pressed ).toBe(
			'true'
		);
	} );
} );

test( 'keyboard: Enter and Space operate the toggle', async ( { page } ) => {
	await page.goto( DEMO );

	const toggle = page.locator(
		'#banner-a > [data-boim-video-part="toggle"]'
	);

	await toggle.focus();
	await expect( toggle ).toBeFocused();
	await page.keyboard.press( 'Enter' );
	await expect( toggle ).toHaveAttribute( 'aria-pressed', 'true' );
	await page.keyboard.press( 'Space' );
	await expect( toggle ).toHaveAttribute( 'aria-pressed', 'false' );
} );

test( 'keyboard: a <div> toggle works with Enter and Space without scrolling', async ( {
	page,
} ) => {
	const { webm } = await mediaIds( page );
	const path = await testPage(
		page,
		'boim-div-toggle-keys',
		banner(
			{ id: 'k', 'data-boim-video': String( webm ) },
			{ tagName: 'div' }
		)
	);

	await page.goto( path );

	const toggle = page.locator( '#k [data-boim-video-part="toggle"]' );
	const scroll = () => page.evaluate( () => window.scrollY );

	await toggle.focus();
	const y = await scroll();
	await page.keyboard.press( 'Space' );
	await expect( toggle ).toHaveAttribute( 'aria-pressed', 'true' );
	expect( await scroll() ).toBe( y );
	await page.keyboard.press( 'Enter' );
	await expect( toggle ).toHaveAttribute( 'aria-pressed', 'false' );
} );

for ( const colorScheme of [ 'light', 'dark' ] ) {
	test( `axe finds no issues on the demo page (${ colorScheme })`, async ( {
		page,
	} ) => {
		await page.emulateMedia( { colorScheme } );
		await page.goto( DEMO );
		await page.waitForLoadState( 'networkidle' );

		const results = await new AxeBuilder( { page } )
			.include( '.entry-content' )
			.withTags( [
				'wcag2a',
				'wcag2aa',
				'wcag21a',
				'wcag21aa',
				'wcag22aa',
				'best-practice',
			] )
			.analyze();

		expect(
			results.violations.map( ( { id, nodes } ) => ( {
				id,
				targets: nodes.map( ( n ) => n.target.join( ' ' ) ),
			} ) )
		).toEqual( [] );
	} );
}
