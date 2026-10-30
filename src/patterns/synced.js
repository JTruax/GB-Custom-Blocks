/**
 * Keep synced patterns synced when they're inserted from a Patterns block.
 *
 * GenerateBlocks Pro's Local library hands each of the site's patterns
 * (wp_block posts) to the library as { id: 'pattern-<post ID>', pattern:
 * <its content> }, and GB's Insert button parses that content: a copy. For
 * a synced pattern, that copy is no longer synced.
 *
 * While the library is open for a Patterns block, GB's Insert button is
 * wrapped (through GB's "generateblocks.patterns.insertPatternButton"
 * filter, after GB Pro's). If every pattern being inserted is a synced pattern on this site,
 * with exactly the same content, a synced reference (core/block) to it is
 * inserted instead. Anything else (unsynced patterns, remote libraries, a
 * mix in Bulk Insert, or the library opened from GB's own toolbar button)
 * goes through GB's Insert unchanged.
 */
import apiFetch from '@wordpress/api-fetch';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { createBlock, parse, serialize } from '@wordpress/blocks';
import { dispatch, select } from '@wordpress/data';
import { addFilter } from '@wordpress/hooks';
import { addQueryArgs } from '@wordpress/url';

const MODAL = '.gblocks-pattern-library-modal';
const PATTERN_ID = /^pattern-(\d+)$/;
// After GB Pro's own filter (default priority 10), which ignores the button
// it's given and returns a new one: wrapping before it would be discarded.
const FILTER_PRIORITY = 100;

// The open Patterns-block session: { paragraphId }, or null.
let session = null;
// Synced patterns on this site: post ID → content. Filled when a session
// starts; read synchronously when Insert is clicked.
let synced = new Map();

/**
 * The site's synced patterns, every page of them.
 *
 * @return {Promise<Map<number, string>>} Post ID → content.
 */
async function fetchSyncedPatterns() {
	const found = new Map();

	for ( let page = 1; page <= 20; page++ ) {
		const response = await apiFetch( {
			path: addQueryArgs( '/wp/v2/blocks', {
				context: 'edit',
				per_page: 100,
				page,
				_fields: 'id,content,meta,wp_pattern_sync_status',
			} ),
			parse: false,
		} );
		const items = await response.json();

		( Array.isArray( items ) ? items : [] ).forEach( ( item ) => {
			const status =
				item?.wp_pattern_sync_status ??
				item?.meta?.wp_pattern_sync_status ??
				'';

			// '' (synced) and 'partial' (synced with overrides) both stay synced.
			if (
				'unsynced' !== status &&
				'string' === typeof item?.content?.raw
			) {
				found.set( Number( item.id ), item.content.raw );
			}
		} );

		if (
			page >= ( Number( response.headers.get( 'X-WP-TotalPages' ) ) || 1 )
		) {
			break;
		}
	}

	return found;
}

/**
 * Start a session: GB's library is about to open for a Patterns block whose
 * spot is now an empty paragraph.
 *
 * @param {string} paragraphId The paragraph GB's Insert will replace.
 */
export function startSession( paragraphId ) {
	session = { paragraphId };

	// Fresh each time, so a pattern edited since doesn't count as identical.
	fetchSyncedPatterns()
		.then( ( found ) => ( synced = found ) )
		.catch( () => ( synced = new Map() ) );
}

export function endSession() {
	session = null;
}

/**
 * Block content in one canonical form, so whitespace or formatting
 * differences between two copies of the same pattern don't matter.
 *
 * @param {string} content Block markup.
 * @return {string|null} Canonical markup.
 */
function canonical( content ) {
	try {
		return serialize( parse( String( content ) ) );
	} catch ( e ) {
		return null;
	}
}

/**
 * The synced pattern IDs to insert, if every pattern is a synced pattern on
 * this site with the same content; otherwise null.
 *
 * @param {Array} patterns Patterns GB's button would insert.
 * @return {number[]|null} Pattern post IDs.
 */
function syncedIds( patterns ) {
	if ( ! Array.isArray( patterns ) || ! patterns.length ) {
		return null;
	}

	const ids = [];

	for ( const pattern of patterns ) {
		const match = PATTERN_ID.exec( String( pattern?.id ?? '' ) );
		const id = match ? Number( match[ 1 ] ) : 0;

		if ( ! id || ! synced.has( id ) ) {
			return null;
		}

		const ours = canonical( synced.get( id ) );

		// Same ID but different content (e.g. another site's library): not ours.
		if ( null === ours || ours !== canonical( pattern.pattern ) ) {
			return null;
		}

		ids.push( id );
	}

	return ids;
}

/**
 * Close GB's library the way its own Escape handling does.
 */
function closeLibrary() {
	document.querySelector( MODAL )?.dispatchEvent(
		new window.KeyboardEvent( 'keydown', {
			key: 'Escape',
			code: 'Escape',
			bubbles: true,
		} )
	);
}

/**
 * GB's Insert button, wrapped. Clicks are caught before the button sees
 * them; only synced patterns from a Patterns block are handled here.
 *
 * @param {Object} props          Props.
 * @param {Object} props.children GB's button (possibly wrapped by GB Pro).
 * @param {Array}  props.patterns The patterns it inserts.
 */
function InsertButton( { children, patterns } ) {
	const onClickCapture = ( event ) => {
		if ( ! session ) {
			return; // Opened from GB's own button: GB's behaviour.
		}

		if ( event.target?.closest?.( 'button' )?.disabled ) {
			return; // GB (Pro) has blocked this insert.
		}

		const paragraph = select( blockEditorStore ).getBlock(
			session.paragraphId
		);
		const ids = syncedIds( patterns );

		if ( ! ids || 'core/paragraph' !== paragraph?.name ) {
			return; // Not all synced, or the spot is gone: let GB insert.
		}

		event.preventDefault();
		event.stopPropagation();

		dispatch( blockEditorStore ).replaceBlocks(
			paragraph.clientId,
			ids.map( ( ref ) => createBlock( 'core/block', { ref } ) )
		);
		closeLibrary();
	};

	return (
		<span
			style={ { display: 'contents' } }
			onClickCapture={ onClickCapture }
		>
			{ children }
		</span>
	);
}

addFilter(
	'generateblocks.patterns.insertPatternButton',
	'boim/patterns-keep-synced',
	( button, props ) => (
		<InsertButton patterns={ props?.patterns }>{ button }</InsertButton>
	),
	FILTER_PRIORITY
);
