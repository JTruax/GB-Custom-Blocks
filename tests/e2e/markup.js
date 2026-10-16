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
 * A Video Banner with a toggle.
 *
 * @param {Object} htmlAttributes The Container's htmlAttributes.
 * @param {Object} [toggle]       { tagName, htmlAttributes } for the toggle.
 */
function banner( htmlAttributes, toggle = {} ) {
	const id = uid();
	const tagName = toggle.tagName || 'button';
	const toggleAttributes = {
		'data-boim-video-part': 'toggle',
		...( 'button' === tagName ? { type: 'button' } : {} ),
		...toggle.htmlAttributes,
	};
	const textId = uid();
	const toggleBlock =
		'div' === tagName
			? `<!-- wp:generateblocks/element ${ JSON.stringify( {
					uniqueId: textId,
					tagName,
					htmlAttributes: toggleAttributes,
			  } ) } --><div${ attrs(
					toggleAttributes
			  ) }><!-- wp:generateblocks/text ${ JSON.stringify( {
					uniqueId: uid(),
					tagName: 'span',
			  } ) } --><span class="gb-text">Pause video</span><!-- /wp:generateblocks/text --></div><!-- /wp:generateblocks/element -->`
			: `<!-- wp:generateblocks/text ${ JSON.stringify( {
					uniqueId: textId,
					tagName,
					htmlAttributes: toggleAttributes,
			  } ) } --><${ tagName } class="gb-text"${ attrs(
					toggleAttributes
			  ) }>Pause video</${ tagName }><!-- /wp:generateblocks/text -->`;

	return `<!-- wp:generateblocks/element ${ JSON.stringify( {
		uniqueId: id,
		tagName: 'section',
		htmlAttributes,
	} ) } --><section${ attrs(
		htmlAttributes
	) }><!-- wp:generateblocks/text ${ JSON.stringify( {
		uniqueId: uid(),
		tagName: 'h2',
	} ) } --><h2 class="gb-text">Banner</h2><!-- /wp:generateblocks/text -->${ toggleBlock }</section><!-- /wp:generateblocks/element -->`;
}

module.exports = { banner };
