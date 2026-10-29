/**
 * The Patterns block in the editor: a placeholder that opens GenerateBlocks'
 * Pattern Library, by itself when the block is added and from its button.
 */
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { Button, Notice, Placeholder } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useEffect, useState } from '@wordpress/element';

import { patternsIcon } from './icon';
import { getLocalLibraryId, handled, openLibrary } from './library';

export default function Edit( { clientId } ) {
	// Added just now (inserter, quick inserter or "/patterns"), not loaded
	// with the post or put back after the library closed.
	const justInserted = useSelect(
		( select ) => {
			const { wasBlockJustInserted } = select( blockEditorStore );

			return (
				wasBlockJustInserted( clientId, 'inserter_menu' ) ||
				wasBlockJustInserted( clientId, undefined )
			);
		},
		[ clientId ]
	);
	// Only set when opening actually failed: GB registers its library while
	// the editor loads, so an early check could be wrong.
	const [ unavailable, setUnavailable ] = useState( false );
	const [ hasLocal, setHasLocal ] = useState( null );

	useEffect( () => {
		let active = true;

		getLocalLibraryId().then( ( id ) => active && setHasLocal( !! id ) );

		return () => {
			active = false;
		};
	}, [] );

	const open = () =>
		openLibrary( clientId ).then( ( result ) =>
			// Opening swaps this block out; only a failure leaves it here.
			setUnavailable( 'unavailable' === result )
		);

	useEffect( () => {
		if ( justInserted && ! handled.has( clientId ) ) {
			open();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- Once, when the block is added.
	}, [ justInserted, clientId ] );

	let instructions = __(
		'Insert one of your site’s local patterns from the GenerateBlocks Pattern Library. The pattern you choose takes this block’s place.',
		'boim-blocks'
	);

	if ( false === hasLocal ) {
		instructions = __(
			'This site has no Local pattern library (it comes with GenerateBlocks Pro), so this opens the GenerateBlocks Pattern Library on its default library. The pattern you choose takes this block’s place.',
			'boim-blocks'
		);
	}

	return (
		<div { ...useBlockProps() }>
			<Placeholder
				icon={ patternsIcon }
				label={ __( 'Patterns', 'boim-blocks' ) }
				instructions={ instructions }
			>
				{ unavailable && (
					<Notice status="warning" isDismissible={ false }>
						{ __(
							'The GenerateBlocks Pattern Library isn’t available in this editor. Check that GenerateBlocks 2 is active and its Pattern Library isn’t turned off.',
							'boim-blocks'
						) }
					</Notice>
				) }
				<Button variant="primary" onClick={ open }>
					{ __( 'Open local patterns', 'boim-blocks' ) }
				</Button>
			</Placeholder>
		</div>
	);
}
