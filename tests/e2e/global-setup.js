/**
 * The Playground port opens before the blueprint has finished, so wait
 * until the demo page has its banners (up to ~5 minutes on a cold start).
 * Playground first redirects to its auto-login, which needs a cookie jar,
 * so this uses Playwright's request context rather than plain fetch.
 */
const { request } = require( '@playwright/test' );

module.exports = async () => {
	const context = await request.newContext( {
		baseURL: 'http://127.0.0.1:9400',
	} );
	const deadline = Date.now() + 300_000;

	try {
		while ( Date.now() < deadline ) {
			try {
				const response = await context.get( '/video-banner-demo/', {
					maxRedirects: 20,
				} );

				if (
					( await response.text() ).includes(
						'data-boim-video-banner'
					)
				) {
					return;
				}
			} catch ( e ) {
				// Not up yet.
			}

			await new Promise( ( resolve ) => setTimeout( resolve, 2000 ) );
		}
	} finally {
		await context.dispose();
	}

	throw new Error( 'The Playground demo page never showed a Video Banner.' );
};
