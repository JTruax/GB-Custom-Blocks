/**
 * Patterns: a block that opens GenerateBlocks' Pattern Library on your
 * site's Local library. The pattern you pick takes its place. It never
 * outputs anything itself (rendered as '' in PHP).
 */
import { registerBlockType } from '@wordpress/blocks';

import metadata from './block.json';
import Edit from './edit';
import { patternsIcon } from './icon';
import './editor.scss';

registerBlockType( metadata.name, {
	icon: patternsIcon,
	edit: Edit,
	save: () => null,
} );
