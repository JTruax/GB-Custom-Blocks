/**
 * The Video Banner extends GenerateBlocks' own Container block, so there is
 * no block.json for wp-scripts to find: the entries are listed here. The
 * Patterns block is a normal block; its block.json is copied to build/ by
 * wp-scripts as usual.
 */
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

module.exports = {
	...defaultConfig,
	entry: {
		'video-banner/editor': './src/video-banner/editor.js',
		'video-banner/view': './src/video-banner/view.js',
		'patterns/index': './src/patterns/index.js',
	},
};
