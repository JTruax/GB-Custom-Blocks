const { test, expect } = require( '@playwright/test' );
const { DEMO, testPage, pluginAssets } = require( './helpers' );

test.describe( 'Assets', () => {
	test( 'pages without a Video Banner load nothing from the plugin', async ( {
		page,
	} ) => {
		const plain = await testPage(
			page,
			'boim-plain-page',
			'<!-- wp:generateblocks/element {"uniqueId":"plain001","tagName":"div","htmlAttributes":{"data-test":"plain"}} --><div data-test="plain"><!-- wp:generateblocks/text {"uniqueId":"plain002","tagName":"p"} --><p class="gb-text">No banner here.</p><!-- /wp:generateblocks/text --></div><!-- /wp:generateblocks/element -->'
		);

		for ( const url of [ '/', plain ] ) {
			const { files, inline } = await pluginAssets( page, url );

			expect( files, url ).toEqual( [] );
			expect( inline, url ).toEqual( [] );
		}
	} );

	test( 'a page with banners loads exactly the view files, CSS in <head>', async ( {
		page,
	} ) => {
		const { files, inline } = await pluginAssets( page, DEMO );

		expect( files ).toEqual( [
			'build/video-banner/style-view.css',
			'build/video-banner/view.js',
		] );
		// Only the test site's stand-in for GB Pro Global Styles.
		expect( inline ).toEqual( [ 'boim-default-styles-inline-css' ] );
		expect(
			await page.locator( 'head link#boim-video-banner-view-css' ).count()
		).toBe( 1 );
		expect(
			await page
				.locator( 'script#boim-video-banner-view-js' )
				.getAttribute( 'defer' )
		).not.toBeNull();
	} );
} );
