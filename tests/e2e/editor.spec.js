/**
 * The editor: valid content, the inserter variation, and the panels.
 */
const { test, expect } = require( '@playwright/test' );
const { rest, openEditor, invalidBlocks } = require( './helpers' );

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
	expect( roundTrip.html ).toContain( 'data-boim-video-part="toggle"' );
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

	await page.getByRole( 'checkbox', { name: 'Disable on mobile' } ).check();
	await page.getByRole( 'checkbox', { name: 'Disable on tablet' } ).check();
	await page.getByRole( 'checkbox', { name: 'Loop' } ).uncheck();

	const html = () =>
		page.evaluate(
			( id ) =>
				window.wp.data
					.select( 'core/block-editor' )
					.getBlockAttributes( id ).htmlAttributes,
			clientId
		);

	expect( await html() ).toMatchObject( {
		'data-boim-video-hide': 'mobile tablet',
		'data-boim-video-loop': 'false',
	} );

	await page.getByRole( 'checkbox', { name: 'Disable on mobile' } ).uncheck();
	await page.getByRole( 'checkbox', { name: 'Loop' } ).check();

	const after = await html();
	expect( after[ 'data-boim-video-hide' ] ).toBe( 'tablet' );
	expect( after ).not.toHaveProperty( 'data-boim-video-loop' );
	expect( after ).toHaveProperty( 'id', 'banner-a' ); // Other attributes are kept.

	// The poster previews in the canvas.
	const canvas = page.frameLocator( 'iframe[name="editor-canvas"]' );
	const element = canvas.locator( `#block-${ clientId }` );
	await expect( element ).toHaveAttribute( 'data-boim-editor-poster', '' );
	expect(
		await element.evaluate(
			( node ) => window.getComputedStyle( node ).backgroundImage
		)
	).toMatch( /poster/ );

	// Remove clears every video setting, nothing else.
	await page
		.getByRole( 'button', { name: 'Remove video background' } )
		.click();
	const removed = await html();
	expect(
		Object.keys( removed ).filter(
			( key ) =>
				key.startsWith( 'data-boim-video' ) &&
				'data-boim-video-part' !== key
		)
	).toEqual( [] );
	expect( removed ).toHaveProperty( 'id', 'banner-a' );
} );

test( 'the part panel appears only inside a banner', async ( { page } ) => {
	await openEditor( page, await demoId( page ) );

	// The toggle inside banner A.
	await page.evaluate( () => {
		const { select, dispatch } = window.wp.data;
		const banner = select( 'core/block-editor' )
			.getBlocks()
			.find(
				( block ) => 'banner-a' === block.attributes.htmlAttributes?.id
			);
		const toggle = banner.innerBlocks.find(
			( block ) =>
				block.attributes.htmlAttributes?.[ 'data-boim-video-part' ]
		);

		dispatch( 'core/block-editor' ).selectBlock( toggle.clientId );
		dispatch( 'core/edit-post' ).openGeneralSidebar( 'edit-post/block' );
	} );

	await expect(
		page.getByRole( 'button', { name: 'Video banner part' } )
	).toBeVisible();
	await expect(
		page.getByRole( 'combobox', { name: 'This block is the…' } )
	).toHaveValue( 'toggle' );

	// The spacer's text, outside any banner.
	await page.evaluate( () => {
		const { select, dispatch } = window.wp.data;
		const spacer = select( 'core/block-editor' )
			.getBlocks()
			.find( ( block ) => 'sp000001' === block.attributes.uniqueId );

		dispatch( 'core/block-editor' ).selectBlock(
			spacer.innerBlocks[ 0 ].clientId
		);
	} );

	await expect(
		page.getByRole( 'button', { name: 'Video banner part' } )
	).toHaveCount( 0 );
} );
