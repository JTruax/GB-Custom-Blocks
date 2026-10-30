/**
 * Opening GenerateBlocks' Pattern Library from a Patterns block.
 *
 * GenerateBlocks (2.x) opens its library through the
 * "generateblocks.patternLibrary.open" action, and opens it on the library
 * named in window.generateBlocksPatternLibrary.defaultOpenLibrary. Its Insert
 * button replaces the selected block when that block is an empty paragraph.
 *
 * So, to open the Local library and have the pattern land where the Patterns
 * block is: point defaultOpenLibrary at the Local library, swap the Patterns
 * block for an empty paragraph in the same spot, and open the library. When
 * the library closes, put GB's setting back, and if nothing was inserted,
 * swap the paragraph back to a Patterns block. Neither swap is an undo step.
 *
 * While it's open, synced patterns are inserted as synced references rather
 * than copies (see synced.js).
 *
 * None of this is documented GenerateBlocks API, so every piece is checked
 * first and fails quietly (the block then explains in the editor).
 */
import apiFetch from '@wordpress/api-fetch';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { createBlock } from '@wordpress/blocks';
import { dispatch, select } from '@wordpress/data';
import { doAction, hasAction } from '@wordpress/hooks';

import { endSession, startSession } from './synced';

export const BLOCK = 'boim/patterns';

const OPEN_ACTION = 'generateblocks.patternLibrary.open';
// GB's own handler. Checked by namespace: without one, hasAction() is true
// for any action that was ever registered, even after it's removed.
const OPEN_NAMESPACE = 'generateblocks/pattern-library';
const MODAL = '.gblocks-pattern-library-modal';
// Without is_enabled, GB returns every library with its on/off state.
const LIBRARIES = '/generateblocks/v1/pattern-library/libraries';
// GB Pro's default Collection, the one it calls "Local".
const DEFAULT_LOCAL = 'local-patterns';

// Blocks that must not open the library by themselves: ones that already
// did, and ones put back after the library closed.
export const handled = new Set();

/**
 * Whether GenerateBlocks' Pattern Library can be opened in this editor.
 *
 * @return {boolean} Available.
 */
export const isLibraryAvailable = () =>
	hasAction( OPEN_ACTION, OPEN_NAMESPACE ) &&
	Boolean( window.generateBlocksPatternLibrary ) &&
	'object' === typeof window.generateBlocksPatternLibrary;

let localLibrary;

const isTrue = ( value ) => [ true, 1, '1', 'true' ].includes( value );

/**
 * The site's Local library (GenerateBlocks Pro). Pro makes each pattern
 * Collection a local library, switched off until it's turned on in the
 * Pattern Library's Manage Libraries; GB only shows switched-on libraries.
 * Looked up once per editor session.
 *
 * @return {Promise<{id: string|null, disabled: boolean}>} The switched-on
 *         Local library to open ("Local" first), and whether there's a local
 *         library that's switched off when none is on.
 */
export function getLocalLibrary() {
	if ( ! localLibrary ) {
		localLibrary = apiFetch( { path: LIBRARIES } )
			.then( ( response ) => {
				const locals = (
					Array.isArray( response?.data ) ? response.data : []
				).filter(
					( library ) =>
						library &&
						isTrue( library.isLocal ) &&
						'string' === typeof library.id &&
						library.id
				);
				const enabled = locals.filter( ( library ) =>
					isTrue( library.isEnabled )
				);
				const pick =
					enabled.find(
						( library ) => DEFAULT_LOCAL === library.id
					) || enabled[ 0 ];

				return {
					id: pick ? pick.id : null,
					disabled: ! pick && locals.length > 0,
				};
			} )
			.catch( () => ( { id: null, disabled: false } ) );
	}

	return localLibrary;
}

/**
 * Whether a block is an empty paragraph (what GB's Insert replaces).
 *
 * @param {Object|null} block Block.
 * @return {boolean} Empty paragraph.
 */
const isEmptyParagraph = ( block ) =>
	'core/paragraph' === block?.name &&
	'' === String( block.attributes?.content ?? '' ).trim();

/**
 * Call onClose once GB's library modal has opened and closed again. If it
 * never appears (GB failed to open it), that counts as closed too.
 *
 * @param {Function} onClose Callback.
 */
function watchModal( onClose ) {
	let seen = false;
	let done = false;
	const finish = () => {
		if ( ! done ) {
			done = true;
			observer.disconnect();
			onClose();
		}
	};
	const observer = new window.MutationObserver( () => {
		const open = Boolean( document.querySelector( MODAL ) );

		if ( open ) {
			seen = true;
		} else if ( seen ) {
			finish();
		}
	} );

	observer.observe( document.body, { childList: true, subtree: true } );

	window.setTimeout( () => {
		if ( ! seen && ! document.querySelector( MODAL ) ) {
			finish();
		}
	}, 3000 );
}

/**
 * Swap one block for another without adding an undo step. The new block is
 * selected (GB's Insert looks at the selected block).
 *
 * @param {string}  clientId Block to replace.
 * @param {Object}  block    New block.
 * @param {boolean} focus    Whether to move keyboard focus to it. Not while
 *                           the library opens: focus going back into the
 *                           canvas would close GB's dialog straight away.
 */
function swap( clientId, block, focus ) {
	const editor = dispatch( blockEditorStore );

	editor.__unstableMarkNextChangeAsNotPersistent();
	editor.replaceBlocks( clientId, block, 0, focus ? 0 : null );
}

/**
 * Open GB's Pattern Library for a Patterns block.
 *
 * @param {string} clientId The Patterns block.
 * @return {Promise<string>} 'opened', 'unavailable' (GB's library can't be
 *                           opened here) or 'skipped' (already open, or the
 *                           block is gone).
 */
export async function openLibrary( clientId ) {
	handled.add( clientId );

	if ( ! isLibraryAvailable() ) {
		return 'unavailable';
	}

	if ( document.querySelector( MODAL ) ) {
		return 'skipped';
	}

	const { id: localId } = await getLocalLibrary();

	// The block may have been removed while the lookup ran.
	if ( BLOCK !== select( blockEditorStore ).getBlock( clientId )?.name ) {
		return 'skipped';
	}

	const settings = window.generateBlocksPatternLibrary;
	const previous = settings.defaultOpenLibrary;
	const paragraph = createBlock( 'core/paragraph' );

	if ( localId ) {
		settings.defaultOpenLibrary = localId;
	}

	swap( clientId, paragraph, false );
	startSession( paragraph.clientId );

	watchModal( () => {
		settings.defaultOpenLibrary = previous;
		endSession();

		// Nothing inserted: the paragraph is still there and still empty.
		const block = select( blockEditorStore ).getBlock( paragraph.clientId );

		if ( isEmptyParagraph( block ) ) {
			const placeholder = createBlock( BLOCK );

			handled.add( placeholder.clientId );
			swap( paragraph.clientId, placeholder, true );
		}
	} );

	doAction( OPEN_ACTION );

	return 'opened';
}
