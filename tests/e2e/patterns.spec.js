/**
 * The Patterns block: opens GenerateBlocks' Pattern Library on the Local
 * library, and the pattern chosen takes its place.
 *
 * The test site has no GenerateBlocks Pro, so a test-only mu-plugin adds a
 * "Local (test)" library (flagged isLocal) that serves one pattern.
 */
const { test, expect } = require( '@playwright/test' );
const {
	rest,
	testPage,
	openEditor,
	invalidBlocks,
	pluginAssets,
} = require( './helpers' );

test.use( { viewport: { width: 1440, height: 900 } } );

const MODAL = '.gblocks-pattern-library-modal';
const CONTENT = [
	'<!-- wp:paragraph --><p>Before</p><!-- /wp:paragraph -->',
	'<!-- wp:generateblocks/element {"uniqueId":"pc000001","tagName":"div"} --><div><!-- wp:paragraph --><p>Inside</p><!-- /wp:paragraph --></div><!-- /wp:generateblocks/element -->',
	'<!-- wp:paragraph --><p>After</p><!-- /wp:paragraph -->',
];

/**
 * A fresh test page, open in the editor.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string}                          slug
 * @param {string[]}                        [blocks] Block markup.
 * @return {Promise<number>} Post id.
 */
async function editPage( page, slug, blocks = CONTENT ) {
	await testPage( page, slug, blocks.join( '' ) );
	const [ { id } ] = await rest( page, '/wp/v2/pages', {
		params: { slug, status: 'publish' },
	} );

	await openEditor( page, id );

	return id;
}

/**
 * Add a Patterns block the way the inserter does.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number}                          index
 * @param {boolean}                         [inContainer] Inside the Container.
 */
async function insertPatterns( page, index, inContainer = false ) {
	// Right after the editor loads, a Container's inner-block settings aren't
	// registered yet and an insert into it is refused: wait for them.
	await expect
		.poll( () =>
			page.evaluate( ( inside ) => {
				const editor = window.wp.data.select( 'core/block-editor' );
				const root = inside
					? editor
							.getBlocks()
							.find(
								( block ) =>
									'generateblocks/element' === block.name
							)?.clientId
					: '';

				return editor.canInsertBlockType( 'boim/patterns', root );
			}, inContainer )
		)
		.toBe( true );

	return page.evaluate(
		( [ at, inside ] ) => {
			const { blocks, data } = window.wp;
			const editor = data.select( 'core/block-editor' );
			const root = inside
				? editor
						.getBlocks()
						.find(
							( block ) => 'generateblocks/element' === block.name
						).clientId
				: '';

			data.dispatch( 'core/block-editor' ).insertBlocks(
				blocks.createBlock( 'boim/patterns' ),
				at,
				root,
				true,
				0,
				{ source: 'inserter_menu' }
			);
		},
		[ index, inContainer ]
	);
}

/**
 * The block tree as [ name, text ] pairs (Container children nested).
 *
 * @param {import('@playwright/test').Page} page
 */
function outline( page ) {
	return page.evaluate( () => {
		const text = ( block ) =>
			String( block.attributes.content ?? '' ).replace( /<[^>]+>/g, '' );
		const walk = ( list ) =>
			list.map( ( block ) =>
				block.innerBlocks.length
					? [ block.name, walk( block.innerBlocks ) ]
					: [ block.name, text( block ) ]
			);

		return walk( window.wp.data.select( 'core/block-editor' ).getBlocks() );
	} );
}

const defaultLibrary = ( page ) =>
	page.evaluate(
		() => window.generateBlocksPatternLibrary.defaultOpenLibrary
	);

/**
 * Close GB's Pattern Library with its own "Close Pattern Library" button.
 *
 * @param {import('@playwright/test').Page} page
 */
const closeLibrary = ( page ) =>
	page
		.locator( MODAL )
		.getByRole( 'button', { name: 'Close Pattern Library' } )
		.click();

/**
 * GB's Insert button on one pattern in the open library.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string}                          label Pattern title.
 */
async function insertFromLibrary( page, label ) {
	const card = page.locator( MODAL ).locator( '.gb-pattern-details', {
		has: page.getByRole( 'heading', { name: label, exact: true } ),
	} );

	await card.scrollIntoViewIfNeeded();
	await card.hover();
	await card.getByRole( 'button', { name: 'Insert', exact: true } ).click();
	await expect( page.locator( MODAL ) ).toHaveCount( 0 );
}

const INSIDE = [ 'generateblocks/element', [ [ 'core/paragraph', 'Inside' ] ] ];

test( 'Patterns is a GenerateBlocks block in the inserter', async ( {
	page,
} ) => {
	await editPage( page, 'boim-patterns-inserter' );

	expect(
		await page.evaluate(
			() => window.wp.blocks.getBlockType( 'boim/patterns' )?.category
		)
	).toBe( 'generateblocks' );

	await page
		.getByRole( 'button', { name: /block inserter/i } )
		.first()
		.click();
	await page.getByRole( 'searchbox' ).first().fill( 'Patterns' );
	await expect(
		page.getByRole( 'option', { name: 'Patterns', exact: true } )
	).toBeVisible();
} );

test( 'adding it opens the Local library; the pattern inserted takes its place', async ( {
	page,
} ) => {
	const errors = [];
	page.on( 'pageerror', ( error ) => errors.push( error.message ) );

	await editPage( page, 'boim-patterns-insert' );
	const before = await defaultLibrary( page );

	await insertPatterns( page, 1 );

	const modal = page.locator( MODAL );
	await expect( modal ).toBeVisible();
	await expect(
		modal.getByRole( 'button', { name: 'Local (test)' } )
	).toHaveAttribute( 'aria-pressed', 'true' );

	// While it's open, the block's spot holds a selected, empty paragraph.
	expect( ( await outline( page ) )[ 1 ] ).toEqual( [
		'core/paragraph',
		'',
	] );

	// GenerateBlocks' own Insert button.
	await expect( modal.getByText( 'Test local pattern' ) ).toBeVisible();
	await insertFromLibrary( page, 'Test local pattern' );

	expect( await outline( page ) ).toEqual( [
		[ 'core/paragraph', 'Before' ],
		[ 'core/heading', 'Inserted local pattern' ],
		[ 'core/paragraph', 'From the Local (test) library.' ],
		INSIDE,
		[ 'core/paragraph', 'After' ],
	] );
	await expect.poll( () => defaultLibrary( page ) ).toBe( before );
	expect( await invalidBlocks( page ) ).toEqual( [] );
	expect( errors ).toEqual( [] );
} );

test( 'inside a Container, the pattern lands inside it', async ( { page } ) => {
	await editPage( page, 'boim-patterns-container' );
	await insertPatterns( page, 1, true );

	const modal = page.locator( MODAL );
	await expect( modal.getByText( 'Test local pattern' ) ).toBeVisible();
	await insertFromLibrary( page, 'Test local pattern' );

	expect( ( await outline( page ) )[ 1 ] ).toEqual( [
		'generateblocks/element',
		[
			[ 'core/paragraph', 'Inside' ],
			[ 'core/heading', 'Inserted local pattern' ],
			[ 'core/paragraph', 'From the Local (test) library.' ],
		],
	] );
} );

test( 'closing without picking keeps the placeholder, with no extra undo steps', async ( {
	page,
} ) => {
	await editPage( page, 'boim-patterns-close' );
	const before = await defaultLibrary( page );

	await insertPatterns( page, 1 );
	const modal = page.locator( MODAL );
	await expect( modal ).toBeVisible();

	await closeLibrary( page );
	await expect( modal ).toHaveCount( 0 );

	await expect
		.poll( async () =>
			( await outline( page ) ).map( ( [ name ] ) => name )
		)
		.toEqual( [
			'core/paragraph',
			'boim/patterns',
			'generateblocks/element',
			'core/paragraph',
		] );
	await expect.poll( () => defaultLibrary( page ) ).toBe( before );

	// It doesn't reopen by itself.
	await page.waitForTimeout( 1000 );
	await expect( modal ).toHaveCount( 0 );

	// One undo removes the block entirely: the swaps weren't undo steps.
	await page.evaluate( () =>
		window.wp.data.dispatch( 'core/editor' ).undo()
	);
	await expect
		.poll( async () =>
			( await outline( page ) ).map( ( [ name ] ) => name )
		)
		.toEqual( [
			'core/paragraph',
			'generateblocks/element',
			'core/paragraph',
		] );
} );

test( 'the placeholder button reopens the library', async ( { page } ) => {
	await editPage( page, 'boim-patterns-button', [
		CONTENT[ 0 ],
		'<!-- wp:boim/patterns /-->',
		CONTENT[ 2 ],
	] );

	const canvas = page.frameLocator( 'iframe[name="editor-canvas"]' );
	const modal = page.locator( MODAL );

	// A saved placeholder doesn't open the library by itself.
	await expect(
		canvas.getByRole( 'button', { name: 'Open local patterns' } )
	).toBeVisible();
	await page.waitForTimeout( 1000 );
	await expect( modal ).toHaveCount( 0 );
	expect( await invalidBlocks( page ) ).toEqual( [] );

	await canvas.getByRole( 'button', { name: 'Open local patterns' } ).click();
	await expect( modal ).toBeVisible();
	await expect(
		modal.getByRole( 'button', { name: 'Local (test)' } )
	).toHaveAttribute( 'aria-pressed', 'true' );

	await closeLibrary( page );
	await expect( modal ).toHaveCount( 0 );
	await expect(
		canvas.getByRole( 'button', { name: 'Open local patterns' } )
	).toBeVisible();
} );

test( 'without the GenerateBlocks library, the block explains instead', async ( {
	page,
} ) => {
	const errors = [];
	page.on( 'pageerror', ( error ) => errors.push( error.message ) );

	await editPage( page, 'boim-patterns-unavailable', [
		'<!-- wp:boim/patterns /-->',
	] );

	await page.evaluate( () =>
		window.wp.hooks.removeAction(
			'generateblocks.patternLibrary.open',
			'generateblocks/pattern-library'
		)
	);

	const canvas = page.frameLocator( 'iframe[name="editor-canvas"]' );
	await canvas.getByRole( 'button', { name: 'Open local patterns' } ).click();

	await expect(
		canvas.getByText( /Pattern Library isn’t available/ )
	).toBeVisible();
	await expect( page.locator( MODAL ) ).toHaveCount( 0 );
	expect( ( await outline( page ) )[ 0 ][ 0 ] ).toBe( 'boim/patterns' );
	expect( errors ).toEqual( [] );
} );

test( 'on the front end a leftover placeholder renders nothing and loads nothing', async ( {
	page,
} ) => {
	const path = await testPage(
		page,
		'boim-patterns-front',
		[ CONTENT[ 0 ], '<!-- wp:boim/patterns /-->', CONTENT[ 2 ] ].join( '' )
	);

	const { files, inline } = await pluginAssets( page, path );

	expect( files ).toEqual( [] );
	expect( inline ).toEqual( [] );

	const html = await page.locator( '.entry-content' ).innerHTML();
	expect( html ).toContain( 'Before' );
	expect( html ).toContain( 'After' );
	expect( html ).not.toMatch( /boim|patterns/i );
} );

test( 'typing /patterns adds it and opens the library', async ( { page } ) => {
	await editPage( page, 'boim-patterns-slash', [ CONTENT[ 0 ] ] );

	// A new empty paragraph after "Before", then the slash inserter.
	await page.evaluate( () => {
		const { blocks, data } = window.wp;
		data.dispatch( 'core/block-editor' ).insertBlocks(
			blocks.createBlock( 'core/paragraph' ),
			1
		);
	} );

	const canvas = page.frameLocator( 'iframe[name="editor-canvas"]' );
	await canvas
		.getByRole( 'document', { name: /Empty block/i } )
		.first()
		.click();
	await page.keyboard.type( '/Patterns' );
	await expect(
		page.getByRole( 'option', { name: 'Patterns', exact: true } )
	).toBeVisible();
	await page.keyboard.press( 'Enter' );

	await expect( page.locator( MODAL ) ).toBeVisible();
	await closeLibrary( page );
	await expect
		.poll( async () =>
			( await outline( page ) ).map( ( [ name ] ) => name )
		)
		.toEqual( [ 'core/paragraph', 'boim/patterns' ] );
} );

test( 'the BOIM blocks sit side by side in the GenerateBlocks category', async ( {
	page,
} ) => {
	await editPage( page, 'boim-patterns-order' );
	await page
		.getByRole( 'button', { name: /block inserter/i } )
		.first()
		.click();

	const heading = page
		.getByRole( 'heading', { name: 'GenerateBlocks', exact: true } )
		.first();
	await heading.scrollIntoViewIfNeeded();

	const names = await page
		.locator( '.block-editor-inserter__panel-header', { has: heading } )
		.locator( '..' )
		.getByRole( 'option' )
		.allInnerTexts();
	const items = names.map( ( name ) => name.trim() );
	const patterns = items.indexOf( 'Patterns' );
	const banner = items.indexOf( 'Video Banner' );

	// Patterns comes straight before Video Banner (which sits with GB's
	// Container), so both are on the same row of the 3-column grid.
	expect( patterns ).toBeGreaterThan( -1 );
	expect( banner ).toBe( patterns + 1 );
	expect( Math.floor( patterns / 3 ) ).toBe( Math.floor( banner / 3 ) );
	expect( items.slice( 0, 6 ) ).toEqual( [
		'Text',
		'Headline',
		'Button',
		'Patterns',
		'Video Banner',
		'Container',
	] );
} );

test.describe( 'Synced patterns', () => {
	const patternId = async ( page, slug ) =>
		( await rest( page, '/wp/v2/blocks', { params: { slug } } ) )[ 0 ].id;

	const second = ( page ) =>
		page.evaluate( () => {
			const block = window.wp.data
				.select( 'core/block-editor' )
				.getBlocks()[ 1 ];

			return { name: block.name, ref: block.attributes.ref };
		} );

	test( 'a synced pattern stays synced (inserted as a reference)', async ( {
		page,
	} ) => {
		const id = await patternId( page, 'boim-synced-pattern' );

		await editPage( page, 'boim-patterns-synced' );
		await insertPatterns( page, 1 );
		await expect(
			page.locator( MODAL ).getByText( 'Test synced pattern' )
		).toBeVisible();

		await insertFromLibrary( page, 'Test synced pattern' );

		await expect
			.poll( () => second( page ) )
			.toEqual( {
				name: 'core/block',
				ref: id,
			} );
		const names = ( await outline( page ) ).map( ( [ name ] ) => name );
		expect( names ).toEqual( [
			'core/paragraph',
			'core/block',
			'generateblocks/element',
			'core/paragraph',
		] );
		expect( await invalidBlocks( page ) ).toEqual( [] );
	} );

	test( 'an unsynced pattern is inserted as a copy, as GB does', async ( {
		page,
	} ) => {
		await editPage( page, 'boim-patterns-unsynced' );
		await insertPatterns( page, 1 );
		await insertFromLibrary( page, 'Test unsynced pattern' );

		expect( ( await outline( page ) ).slice( 1, 3 ) ).toEqual( [
			[ 'core/heading', 'Test unsynced pattern' ],
			[ 'core/paragraph', 'Pattern body.' ],
		] );
	} );

	test( 'same ID but different content (another site) stays a copy', async ( {
		page,
	} ) => {
		await editPage( page, 'boim-patterns-lookalike' );
		await insertPatterns( page, 1 );
		await insertFromLibrary( page, 'Lookalike pattern' );

		expect( ( await outline( page ) )[ 1 ] ).toEqual( [
			'core/paragraph',
			'Lookalike from another site.',
		] );
	} );

	test( "GB's own Pattern Library button keeps GB's behaviour (a copy)", async ( {
		page,
	} ) => {
		await editPage( page, 'boim-patterns-toolbar' );

		// Select "Before", then open GB's library from its toolbar button.
		await page.evaluate( () => {
			const { select, dispatch } = window.wp.data;
			dispatch( 'core/block-editor' ).selectBlock(
				select( 'core/block-editor' ).getBlocks()[ 0 ].clientId
			);
		} );
		await page
			.getByRole( 'button', { name: 'Pattern Library', exact: true } )
			.first()
			.click();

		const modal = page.locator( MODAL );
		await expect( modal ).toBeVisible();
		await modal.getByRole( 'button', { name: 'Local (test)' } ).click();
		await insertFromLibrary( page, 'Test synced pattern' );

		const names = ( await outline( page ) ).map( ( [ name ] ) => name );
		expect( names ).not.toContain( 'core/block' );
		expect( names ).toContain( 'core/heading' );
	} );

	test( 'a switched-off Local library is explained in the block', async ( {
		page,
	} ) => {
		// GB's library list as on a site whose Local library is switched off.
		await page.route(
			// Plain or %2F-encoded in ?rest_route=; not GB's own is_enabled request.
			/pattern-library(?:\/|%2F)libraries(?!.*is_enabled)/i,
			( route ) =>
				route.fulfill( {
					json: {
						success: true,
						data: [
							{
								id: 'local-patterns',
								name: 'Local',
								isLocal: true,
								isEnabled: false,
							},
						],
					},
				} )
		);

		await editPage( page, 'boim-patterns-local-off', [
			'<!-- wp:boim/patterns /-->',
		] );

		await expect(
			page
				.frameLocator( 'iframe[name="editor-canvas"]' )
				.getByText( /Local pattern library is switched off/ )
		).toBeVisible();
	} );
} );
