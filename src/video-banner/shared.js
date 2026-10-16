/**
 * Editor helpers shared by the panel and the canvas preview.
 */
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';

export const CONTAINER = 'generateblocks/element';

export const KEY = 'data-boim-video';
export const BREAKPOINT = 'data-boim-video-max-width';
export const OPACITY = 'data-boim-video-opacity'; // 0-100 (%); absent = 100.
export const DEFAULT_BREAKPOINT = '767'; // GenerateBlocks' mobile breakpoint.
export const MAX_BREAKPOINT = 4000; // The same clamp as the server.

const VIDEO_TYPES = /\.(mp4|m4v|webm|ogv)$/i;

/**
 * A plain object of htmlAttributes (an empty one can arrive as an array).
 *
 * @param {Object} attributes Block attributes.
 * @return {Object} htmlAttributes.
 */
export const htmlAttributesOf = ( attributes ) => {
	const value = attributes?.htmlAttributes;

	return value && 'object' === typeof value && ! Array.isArray( value )
		? value
		: {};
};

export const isBanner = ( attributes ) =>
	Object.hasOwn( htmlAttributesOf( attributes ), KEY );

/**
 * The Media Library id in a saved source, or 0.
 *
 * @param {*} source Saved data-boim-video value.
 * @return {number} Attachment id.
 */
export const sourceIdOf = ( source ) =>
	/^\d+$/.test( String( source ?? '' ) ) ? Number( source ) : 0;

/**
 * An http(s) URL to a video file, like the server accepts.
 *
 * @param {string} value URL.
 * @return {boolean} Valid.
 */
export const isVideoUrl = ( value ) => {
	try {
		const url = new URL( value );

		return (
			/^https?:$/.test( url.protocol ) && VIDEO_TYPES.test( url.pathname )
		);
	} catch ( e ) {
		return false;
	}
};

/**
 * The breakpoint as the server reads it: a whole number of px, 767 when
 * empty or invalid, at most 4000. 0 when "Disable on mobile" is off.
 *
 * @param {Object} html htmlAttributes.
 * @return {number} Max width in px, or 0.
 */
export const breakpointOf = ( html ) => {
	if ( ! Object.hasOwn( html, BREAKPOINT ) ) {
		return 0;
	}

	const value = String( html[ BREAKPOINT ] ).trim();
	const width = /^\d+$/.test( value ) ? Number( value ) : 0;

	return width > 0
		? Math.min( width, MAX_BREAKPOINT )
		: Number( DEFAULT_BREAKPOINT );
};

/**
 * The video's opacity as the server reads it: a whole percentage, 0-1,
 * fully opaque when absent or invalid.
 *
 * @param {Object} html htmlAttributes.
 * @return {number} Opacity, 0-1.
 */
export const opacityOf = ( html ) => {
	const value = String( html[ OPACITY ] ?? '' ).trim();

	return /^\d+$/.test( value ) ? Math.min( Number( value ), 100 ) / 100 : 1;
};

/**
 * The saved video as something playable: the Media Library record (or
 * null while it loads), and the URL to play (null if there's none).
 *
 * @param {*} source Saved data-boim-video value.
 * @return {{ media: Object|null, url: string|null }} Video.
 */
export function useVideo( source ) {
	const id = sourceIdOf( source );
	const media = useSelect(
		( select ) =>
			id ? select( coreStore ).getMedia( id, { context: 'view' } ) : null,
		[ id ]
	);

	if ( id ) {
		return {
			media,
			url:
				media && /^video\//.test( media.mime_type || '' )
					? media.source_url
					: null,
		};
	}

	return {
		media: null,
		url: 'string' === typeof source && isVideoUrl( source ) ? source : null,
	};
}
