/**
 * The video, playing behind the banner in the editor canvas.
 *
 * GenerateBlocks renders the Container in the editor; this doesn't change
 * that. It finds the Container's element in the canvas (an iframe) and
 * renders the same decorative layer the front end has into it with a React
 * portal. The layer is absolutely positioned behind the content and ignores
 * the mouse, so selecting and editing the blocks inside works as usual.
 *
 * Like the front end, it's switched off at or below the breakpoint, measured
 * in the canvas, so the editor's Tablet/Mobile previews show the result.
 */
import { createPortal, useEffect, useRef, useState } from '@wordpress/element';

import { breakpointOf, htmlAttributesOf, KEY, useVideo } from './shared';

/**
 * The document the blocks are in: the editor canvas iframe, or this page
 * when the editor isn't iframed.
 *
 * @return {Document} Canvas document.
 */
const canvasDocument = () =>
	document.querySelector( 'iframe[name="editor-canvas"]' )?.contentDocument ||
	document;

/**
 * Whether a media query matches in the given window, kept up to date.
 *
 * @param {Window|null} view  Window (the canvas).
 * @param {string}      query Media query, or '' for none.
 * @return {boolean} Matches.
 */
function useMatchMedia( view, query ) {
	const [ matches, setMatches ] = useState( false );

	useEffect( () => {
		if ( ! view || ! query ) {
			setMatches( false );
			return;
		}

		const list = view.matchMedia( query );
		const onChange = () => setMatches( list.matches );

		onChange();
		list.addEventListener( 'change', onChange );

		return () => list.removeEventListener( 'change', onChange );
	}, [ view, query ] );

	return matches;
}

/**
 * The preview for one banner.
 *
 * @param {Object} props            Props.
 * @param {string} props.clientId   Container client id.
 * @param {Object} props.attributes Container attributes.
 */
export default function CanvasVideo( { clientId, attributes } ) {
	const html = htmlAttributesOf( attributes );
	const { url } = useVideo( html[ KEY ] );
	const maxWidth = breakpointOf( html );
	const [ element, setElement ] = useState( null );
	const videoRef = useRef();

	// GB's element is in the canvas by the time this runs (children commit
	// first). Checked after every render: a new tag name means a new element.
	// State only changes when the element does, so this can't loop.
	// eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally every render.
	useEffect( () => {
		const found = canvasDocument().getElementById( `block-${ clientId }` );

		if ( found !== element ) {
			setElement( found );
		}
	} );

	const view = element?.ownerDocument?.defaultView || null;
	const off = useMatchMedia(
		view,
		maxWidth ? `(max-width: ${ maxWidth }px)` : ''
	);
	const reduced = useMatchMedia( view, '(prefers-reduced-motion: reduce)' );
	const play = Boolean( url ) && ! off && ! reduced;

	useEffect( () => {
		const video = videoRef.current;

		if ( ! video ) {
			return;
		}

		video.muted = true; // As a property: React doesn't reliably set it.

		if ( play ) {
			video.play()?.catch( () => {} ); // A refused autoplay just stays still.
		} else {
			video.pause();
		}
	}, [ play, url, element ] );

	if ( ! element || ! url ) {
		return null;
	}

	return createPortal(
		<div
			className="boim-video-banner__media boim-video-banner__media--editor"
			aria-hidden="true"
			contentEditable={ false }
		>
			<video
				ref={ videoRef }
				className="boim-video-banner__video"
				src={ url }
				muted
				loop
				playsInline
				preload="auto"
				disablePictureInPicture
				tabIndex={ -1 }
				style={ { opacity: off ? 0 : 1 } }
			/>
		</div>,
		element
	);
}
