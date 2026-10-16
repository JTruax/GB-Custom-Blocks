/**
 * Block markup for test pages, shaped like GenerateBlocks' own.
 */
let counter = 0;
const uid = () => `t${ String( ++counter ).padStart( 7, '0' ) }`;
const attrs = ( object ) =>
	Object.entries( object )
		.map(
			( [ name, value ] ) =>
				` ${ name }="${ String( value )
					.replace( /&/g, '&amp;' )
					.replace( /"/g, '&quot;' ) }"`
		)
		.join( '' );

/**
 * A Video Banner with a heading.
 *
 * @param {Object} htmlAttributes The Container's htmlAttributes.
 */
function banner( htmlAttributes ) {
	return `<!-- wp:generateblocks/element ${ JSON.stringify( {
		uniqueId: uid(),
		tagName: 'section',
		htmlAttributes,
	} ) } --><section${ attrs(
		htmlAttributes
	) }><!-- wp:generateblocks/text ${ JSON.stringify( {
		uniqueId: uid(),
		tagName: 'h2',
	} ) } --><h2 class="gb-text">Banner</h2><!-- /wp:generateblocks/text --></section><!-- /wp:generateblocks/element -->`;
}

module.exports = { banner };
