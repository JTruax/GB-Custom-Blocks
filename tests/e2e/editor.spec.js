/**
 * The editor: valid content, the inserter variation, and the panels.
 */
const { test, expect } = require( '@playwright/test' );
const { rest, openEditor, invalidBlocks, mediaIds } = require( './helpers' );

test.use( { viewport: { width: 1440, height: 900 } } );

async function demoId( page ) {
	return (
		await rest( page, '/wp/v2/pages', {
			params: { slug: 'video-banner-demo' },
		} )
	)[ 0 ].id;
}

/**
 * Select the Container whose htmlAttributes id is given, and show the block sidebar.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string}                          id
 */
function selectById( page, id ) {
	return page.evaluate( ( htmlId ) => {
		const { select, dispatch } = window.wp.data;
		const find = ( blocks ) => {
			for ( const block of blocks ) {
				if ( htmlId === block.attributes?.htmlAttributes?.id ) {
					return block;
				}
				const found = find( block.innerBlocks );
				if ( found ) {
					return found;
				}
			}
			return null;
		};
		const block = find( select( 'core/block-editor' ).getBlocks() );

		dispatch( 'core/block-editor' ).selectBlock( block.clientId );
		dispatch( 'core/edit-post' ).openGeneralSidebar( 'edit-post/block' );

		return block.clientId;
	}, id );
}

test( 'the demo page opens with every block valid', async ( { page } ) => {
	const errors = [];
	page.on( 'pageerror', ( error ) => errors.push( error.message ) );

	await openEditor( page, await demoId( page ) );

	expect( await invalidBlocks( page ) ).toEqual( [] );
	expect( errors ).toEqual( [] );
} );

test( 'Video Banner is in the inserter and is the active variation of a banner', async ( {
	page,
} ) => {
	await openEditor( page, await demoId( page ) );

	const result = await page.evaluate( () => {
		const { select } = window.wp.data;
		const blocks = select( 'core/blocks' );
		const variations = blocks
			.getBlockVariations( 'generateblocks/element', 'inserter' )
			.map( ( v ) => v.name );

		return {
			listed: variations.includes( 'boim/video-banner' ),
			banner: blocks.getActiveBlockVariation( 'generateblocks/element', {
				tagName: 'section',
				htmlAttributes: { 'data-boim-video': '12' },
			} )?.name,
			plain: blocks.getActiveBlockVariation( 'generateblocks/element', {
				tagName: 'div',
				htmlAttributes: {},
			} )?.name,
		};
	} );

	expect( result ).toEqual( {
		listed: true,
		banner: 'boim/video-banner',
		plain: 'generateblocks/container',
	} );

	// Search for it in the inserter.
	await page
		.getByRole( 'button', { name: /block inserter/i } )
		.first()
		.click();
	await page.getByRole( 'searchbox' ).first().fill( 'Video Banner' );
	await expect(
		page.getByRole( 'option', { name: 'Video Banner' } )
	).toBeVisible();
} );

test( 'inserting the variation gives valid blocks that survive a save round trip', async ( {
	page,
} ) => {
	await openEditor( page, await demoId( page ) );

	await page.evaluate( () => {
		const { blocks, data } = window.wp;
		const variation = blocks
			.getBlockVariations( 'generateblocks/element', 'inserter' )
			.find( ( v ) => 'boim/video-banner' === v.name );
		const block = blocks.createBlock(
			'generateblocks/element',
			variation.attributes,
			blocks.createBlocksFromInnerBlocksTemplate( variation.innerBlocks )
		);

		data.dispatch( 'core/block-editor' ).insertBlocks( block, 0 );
	} );

	// GB gives each block its uniqueId once mounted.
	await expect
		.poll( () =>
			page.evaluate( () =>
				Boolean(
					window.wp.data
						.select( 'core/block-editor' )
						.getBlocks()[ 0 ].attributes.uniqueId
				)
			)
		)
		.toBe( true );

	const roundTrip = await page.evaluate( () => {
		const { blocks, data } = window.wp;
		const first = data.select( 'core/block-editor' ).getBlocks()[ 0 ];
		const reparsed = blocks.parse( blocks.serialize( first ) );
		const invalid = [];
		const walk = ( list ) =>
			list.forEach( ( block ) => {
				if ( ! block.isValid ) {
					invalid.push( block.name );
				}
				walk( block.innerBlocks );
			} );

		walk( reparsed );

		return {
			invalid,
			html: blocks.serialize( first ),
		};
	} );

	expect( roundTrip.invalid ).toEqual( [] );
	expect( roundTrip.html ).toContain( 'data-boim-video=""' );
	expect( roundTrip.html ).not.toContain( 'data-boim-video-part' );
	expect( await invalidBlocks( page ) ).toEqual( [] );
} );

test( 'the Video background panel writes htmlAttributes', async ( {
	page,
} ) => {
	await openEditor( page, await demoId( page ) );
	const clientId = await selectById( page, 'banner-a' );

	const panel = page.getByRole( 'button', {
		name: 'Video background',
		exact: true,
	} );
	await expect( panel ).toBeVisible();
	if ( 'false' === ( await panel.getAttribute( 'aria-expanded' ) ) ) {
		await panel.click();
	}

	const html = () =>
		page.evaluate(
			( id ) =>
				window.wp.data
					.select( 'core/block-editor' )
					.getBlockAttributes( id ).htmlAttributes,
			clientId
		);
	const field = page.getByRole( 'spinbutton', { name: 'Breakpoint (px)' } );

	// Off by default: no breakpoint field.
	await expect( field ).toHaveCount( 0 );

	await page.getByRole( 'checkbox', { name: 'Disable on mobile' } ).check();
	await expect( field ).toHaveValue( '767' );
	expect( await html() ).toMatchObject( {
		'data-boim-video-max-width': '767',
	} );

	await field.fill( '1024' );
	expect( ( await html() )[ 'data-boim-video-max-width' ] ).toBe( '1024' );

	await page.getByRole( 'checkbox', { name: 'Disable on mobile' } ).uncheck();
	await expect( field ).toHaveCount( 0 );
	const after = await html();
	expect( after ).not.toHaveProperty( 'data-boim-video-max-width' );
	expect( after ).toHaveProperty( 'id', 'banner-a' ); // Other attributes are kept.

	// No loop or poster options any more.
	await expect( page.getByRole( 'checkbox', { name: 'Loop' } ) ).toHaveCount(
		0
	);
	await expect( page.getByRole( 'button', { name: /poster/i } ) ).toHaveCount(
		0
	);

	await page.getByRole( 'checkbox', { name: 'Disable on mobile' } ).check();

	// Remove clears every video setting, nothing else.
	await page
		.getByRole( 'button', { name: 'Remove video background' } )
		.click();
	const removed = await html();
	expect(
		Object.keys( removed ).filter( ( key ) =>
			key.startsWith( 'data-boim-video' )
		)
	).toEqual( [] );
	expect( removed ).toHaveProperty( 'id', 'banner-a' );
} );

/**
 * Open the Video background panel for a banner (by its saved id).
 *
 * @param {import('@playwright/test').Page} page
 * @param {string}                          id
 * @return {string} Client id.
 */
async function openPanel( page, id ) {
	const clientId = await selectById( page, id );
	const panel = page.getByRole( 'button', {
		name: 'Video background',
		exact: true,
	} );

	await expect( panel ).toBeVisible();
	if ( 'false' === ( await panel.getAttribute( 'aria-expanded' ) ) ) {
		await panel.click();
	}

	return clientId;
}

/**
 * The canvas video of a banner.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string}                          clientId
 */
const canvasVideo = ( page, clientId ) =>
	page
		.frameLocator( 'iframe[name="editor-canvas"]' )
		.locator( `#block-${ clientId } > .boim-video-banner__media > video` );

const videoState = ( video ) =>
	video.evaluate( ( element ) => ( {
		src: element.currentSrc || element.src,
		paused: element.paused,
		time: element.currentTime,
		opacity: element.style.opacity,
	} ) );

test( 'the video plays behind the banner in the editor canvas', async ( {
	page,
} ) => {
	await openEditor( page, await demoId( page ) );
	const clientId = await selectById( page, 'banner-a' );
	const video = canvasVideo( page, clientId );

	await expect( video ).toHaveCount( 1 );
	await expect
		.poll( async () => {
			const state = await videoState( video );
			return ! state.paused && state.time > 0;
		} )
		.toBe( true );
	expect( ( await videoState( video ) ).src ).toMatch( /sample\.webm$/ );

	// The layer is decorative and doesn't get in the way of editing.
	const layer = page
		.frameLocator( 'iframe[name="editor-canvas"]' )
		.locator( `#block-${ clientId } > .boim-video-banner__media` );
	await expect( layer ).toHaveAttribute( 'aria-hidden', 'true' );
	expect(
		await layer.evaluate(
			( node ) =>
				node.ownerDocument.defaultView.getComputedStyle( node )
					.pointerEvents
		)
	).toBe( 'none' );

	// The overlay tint is on the layer, so the editor's selection outline
	// (the block's own ::after) can't pull it above the text.
	expect(
		await layer.evaluate(
			( node ) =>
				node.ownerDocument.defaultView.getComputedStyle(
					node,
					'::after'
				).backgroundColor
		)
	).toBe( 'rgba(0, 0, 0, 0.55)' );

	// Nothing is saved for it: the block's content is unchanged.
	expect( await invalidBlocks( page ) ).toEqual( [] );
	expect(
		await page.evaluate(
			( id ) =>
				window.wp.blocks.serialize(
					window.wp.data.select( 'core/block-editor' ).getBlock( id )
				),
			clientId
		)
	).not.toContain( 'boim-video-banner__media' );
} );

test( 'the canvas preview follows the breakpoint', async ( { page } ) => {
	await openEditor( page, await demoId( page ) );
	const clientId = await openPanel( page, 'banner-a' );
	const video = canvasVideo( page, clientId );

	await expect
		.poll( async () => ( await videoState( video ) ).paused )
		.toBe( false );

	// Wider than the canvas: switched off.
	await page.getByRole( 'checkbox', { name: 'Disable on mobile' } ).check();
	await page
		.getByRole( 'spinbutton', { name: 'Breakpoint (px)' } )
		.fill( '3000' );
	await expect
		.poll( async () => ( await videoState( video ) ).paused )
		.toBe( true );
	expect( ( await videoState( video ) ).opacity ).toBe( '0' );

	// Back to 767: the canvas is wider, so it plays again.
	await page
		.getByRole( 'spinbutton', { name: 'Breakpoint (px)' } )
		.fill( '767' );
	await expect
		.poll( async () => ( await videoState( video ) ).paused )
		.toBe( false );
	expect( ( await videoState( video ) ).opacity ).toBe( '1' );
} );

test( 'the video source: Upload or Video URL', async ( { page } ) => {
	const { mp4Url } = await mediaIds( page );

	await openEditor( page, await demoId( page ) );
	const clientId = await openPanel( page, 'banner-a' );
	const source = () =>
		page.evaluate(
			( id ) =>
				window.wp.data
					.select( 'core/block-editor' )
					.getBlockAttributes( id ).htmlAttributes[
					'data-boim-video'
				],
			clientId
		);
	const before = await source();
	const notice = () =>
		page.locator( '.components-notice__content', {
			hasText: 'isn’t a link to a video file',
		} );

	// A Media Library video: Upload is selected and offers Replace.
	await expect( page.getByRole( 'radio', { name: 'Upload' } ) ).toBeChecked();
	await expect(
		page.getByRole( 'button', { name: 'Replace video' } )
	).toBeVisible();
	await expect( page.getByText( 'sample.webm' ) ).toBeVisible();

	// Video URL: an invalid link is flagged and not saved.
	await page.getByRole( 'radio', { name: 'Video URL' } ).click();
	const field = page.getByRole( 'textbox', { name: 'Video URL' } );
	await expect( field ).toBeVisible();
	await expect(
		page.getByRole( 'button', { name: 'Replace video' } )
	).toHaveCount( 0 );

	await field.fill( 'https://example.com/a-page' );
	await expect( notice() ).toHaveCount( 0 ); // Not while typing.
	await field.blur();
	await expect( notice() ).toBeVisible();
	expect( await source() ).toBe( before );

	// A valid link is saved, and the canvas plays it.
	await field.fill( mp4Url );
	await expect( notice() ).toHaveCount( 0 );
	expect( await source() ).toBe( mp4Url );
	await expect
		.poll(
			async () =>
				( await videoState( canvasVideo( page, clientId ) ) ).src
		)
		.toBe( mp4Url );

	// Back to Upload: nothing chosen from the library for this one yet.
	await page.getByRole( 'radio', { name: 'Upload' } ).click();
	await expect(
		page.getByRole( 'button', { name: 'Upload or choose video' } )
	).toBeVisible();
} );
