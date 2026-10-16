/**
 * Shared helpers for the browser tests.
 */
const DEMO = '/video-banner-demo/';
const VIDEO_FILE = /\/wp-content\/uploads\/.+\.(webm|mp4)(\?|$)/;

/**
 * Call the REST API as the logged-in admin.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string}                          path          e.g. /wp/v2/pages
 * @param {Object}                          [opts]        Options.
 * @param {string}                          [opts.method] HTTP method.
 * @param {Object}                          [opts.data]   JSON body.
 * @param {Object}                          [opts.params] Query parameters.
 */
async function rest( page, path, { method = 'GET', data, params = {} } = {} ) {
	if ( ! page.url().includes( '/wp-admin/' ) ) {
		await page.goto( '/wp-admin/' );
	}

	return page.evaluate(
		async ( { path: route, method: verb, data: body, params: query } ) => {
			const nonce = await (
				await fetch( '/wp-admin/admin-ajax.php?action=rest-nonce' )
			).text();
			const url = new URL( '/', window.location.origin );

			url.searchParams.set( 'rest_route', route );
			Object.entries( query ).forEach( ( [ key, value ] ) =>
				url.searchParams.set( key, value )
			);

			const response = await fetch( url, {
				method: verb,
				headers: {
					'X-WP-Nonce': nonce,
					'Content-Type': 'application/json',
				},
				body: body ? JSON.stringify( body ) : undefined,
			} );

			return response.json();
		},
		{ path, method, data, params }
	);
}

/**
 * Create or update a published page by slug. Returns its path.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string}                          slug
 * @param {string}                          content Block markup.
 */
async function testPage( page, slug, content ) {
	const [ existing ] = await rest( page, '/wp/v2/pages', {
		params: { slug, status: 'publish,draft' },
	} );
	const data = { slug, title: slug, content, status: 'publish' };

	await rest(
		page,
		existing ? `/wp/v2/pages/${ existing.id }` : '/wp/v2/pages',
		{ method: 'POST', data }
	);

	return `/${ slug }/`;
}

/**
 * The demo media attachment ids.
 *
 * @param {import('@playwright/test').Page} page
 */
async function mediaIds( page ) {
	const find = async ( slug ) =>
		( await rest( page, '/wp/v2/media', { params: { slug } } ) )[ 0 ];
	// One after another: each call may need to navigate to wp-admin first.
	const webm = await find( 'boim-sample-webm' );
	const mp4 = await find( 'boim-sample-mp4' );
	const poster = await find( 'boim-poster' );

	return {
		webm: webm.id,
		mp4: mp4.id,
		mp4Url: mp4.source_url,
		poster: poster.id,
	};
}

/**
 * Record video file requests made by the page.
 *
 * @param {import('@playwright/test').Page} page
 * @return {string[]} Live list of requested video URLs.
 */
function recordVideoRequests( page ) {
	const urls = [];

	page.on( 'request', ( request ) => {
		if ( VIDEO_FILE.test( request.url() ) ) {
			urls.push( request.url() );
		}
	} );

	return urls;
}

/**
 * Requests to the plugin's files, and plugin inline <style>/<script> tags.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string}                          url
 */
async function pluginAssets( page, url ) {
	const files = [];
	const listener = ( request ) => {
		if (
			request.url().includes( '/plugins/boim-blocks/' ) &&
			! VIDEO_FILE.test( request.url() )
		) {
			files.push(
				new URL( request.url() ).pathname.replace(
					/.*\/plugins\/boim-blocks\//,
					''
				)
			);
		}
	};

	page.on( 'request', listener );
	await page.goto( url );
	await page.waitForLoadState( 'networkidle' );
	page.off( 'request', listener );

	const inline = await page.evaluate( () =>
		[ ...document.querySelectorAll( 'style[id], script[id]:not([src])' ) ]
			.map( ( element ) => element.id )
			.filter( ( id ) => id.startsWith( 'boim' ) )
	);

	return { files: [ ...new Set( files ) ].sort(), inline };
}

/**
 * Open the block editor for a post and wait for its blocks.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number}                          postId
 */
async function openEditor( page, postId ) {
	await page.goto( `/wp-admin/post.php?post=${ postId }&action=edit` );
	await page.waitForFunction(
		() =>
			window.wp?.data?.select( 'core/block-editor' )?.getBlocks().length >
			0,
		null,
		{
			timeout: 60_000,
		}
	);

	// Close the welcome guide if it's there.
	await page.evaluate( () => {
		const prefs = window.wp.data.dispatch( 'core/preferences' );
		prefs?.set( 'core/edit-post', 'welcomeGuide', false );
		prefs?.set( 'core', 'welcomeGuide', false );
	} );
}

/**
 * Names of invalid blocks in the editor (walks the whole tree).
 *
 * @param {import('@playwright/test').Page} page
 */
function invalidBlocks( page ) {
	return page.evaluate( () => {
		const invalid = [];
		const walk = ( blocks ) =>
			blocks.forEach( ( block ) => {
				if ( ! block.isValid ) {
					invalid.push( block.name );
				}
				walk( block.innerBlocks );
			} );

		walk( window.wp.data.select( 'core/block-editor' ).getBlocks() );

		return invalid;
	} );
}

/**
 * Video state of a banner, by its id.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string}                          id
 */
function videoState( page, id ) {
	return page.evaluate( ( bannerId ) => {
		const root = document.getElementById( bannerId );
		const video = root.querySelector(
			':scope > .boim-video-banner__media > video'
		);

		return {
			sources: video.querySelectorAll( 'source' ).length,
			paused: video.paused,
			time: video.currentTime,
			loop: video.loop,
			opacity: window.getComputedStyle( video ).opacity,
		};
	}, id );
}

module.exports = {
	DEMO,
	rest,
	testPage,
	mediaIds,
	recordVideoRequests,
	pluginAssets,
	openEditor,
	invalidBlocks,
	videoState,
};
