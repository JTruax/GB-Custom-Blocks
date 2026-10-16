/**
 * Reduced motion and an axe scan.
 */
const { test, expect } = require( '@playwright/test' );
const AxeBuilder = require( '@axe-core/playwright' ).default;
const { DEMO, recordVideoRequests, videoState } = require( './helpers' );

test.describe( 'Reduced motion', () => {
	test.use( { reducedMotion: 'reduce' } );

	test( 'no video and no download', async ( { page } ) => {
		const requests = recordVideoRequests( page );

		await page.goto( DEMO );
		await page.waitForLoadState( 'networkidle' );
		await page.waitForTimeout( 1000 );

		expect( requests ).toEqual( [] );

		const state = await videoState( page, 'banner-a' );
		expect( state.sources ).toBe( 0 );
		expect( state.opacity ).toBe( '0' );
	} );

	test( 'switching reduced motion on while playing stops and hides the video', async ( {
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
		expect( ( await videoState( page, 'banner-a' ) ).opacity ).toBe( '0' );
	} );
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
