/**
 * Video Banner, editor side.
 *
 * Not a new block: a GenerateBlocks Container (generateblocks/element) with
 * a "Video background" panel. Every setting is saved in the Container's own
 * htmlAttributes, which GenerateBlocks saves and renders, so the content
 * stays a valid Container if this plugin is ever switched off. PHP turns the
 * settings into the video layer (includes/class-boim-video-banner.php).
 */
import { __, sprintf } from '@wordpress/i18n';
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { InspectorControls, MediaReplaceFlow } from '@wordpress/block-editor';
import { getBlockType, registerBlockVariation } from '@wordpress/blocks';
import {
	Button,
	ExternalLink,
	Notice,
	PanelBody,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { useState } from '@wordpress/element';

import { videoBannerIcon } from './icon';
import './editor.scss';

const CONTAINER = 'generateblocks/element';

const KEY = 'data-boim-video';
const BREAKPOINT = 'data-boim-video-max-width';
const DEFAULT_BREAKPOINT = '767'; // GenerateBlocks' mobile breakpoint.

const OVERLAY_CLASS = 'boim-video-banner--overlay';
const VIDEO_TYPES = /\.(mp4|m4v|webm|ogv)$/i;

/**
 * A plain object of htmlAttributes (an empty one can arrive as an array).
 *
 * @param {Object} attributes Block attributes.
 * @return {Object} htmlAttributes.
 */
const htmlAttributesOf = ( attributes ) => {
	const value = attributes?.htmlAttributes;

	return value && 'object' === typeof value && ! Array.isArray( value )
		? value
		: {};
};

const isBanner = ( attributes ) =>
	Object.hasOwn( htmlAttributesOf( attributes ), KEY );

/**
 * An http(s) URL to a video file, like the server accepts.
 *
 * @param {string} value URL.
 * @return {boolean} Valid.
 */
const isVideoUrl = ( value ) => {
	try {
		const url = new URL( value );

		return (
			/^https?:$/.test( url.protocol ) && VIDEO_TYPES.test( url.pathname )
		);
	} catch ( e ) {
		return false;
	}
};

/*
 * The "Video Banner" entry in the inserter: a Container with the video
 * setting switched on and a starting layout. Looks come from GB Pro Global
 * Styles the plugin creates (includes/global-styles/video-banner.php);
 * without GB Pro the layout is unstyled but works.
 */
const variation = {
	name: 'boim/video-banner',
	title: __( 'Video Banner', 'boim-blocks' ),
	description: __(
		'A Container with a video file as its background.',
		'boim-blocks'
	),
	icon: videoBannerIcon,
	keywords: [
		__( 'video', 'boim-blocks' ),
		__( 'hero', 'boim-blocks' ),
		__( 'background', 'boim-blocks' ),
	],
	scope: [ 'inserter' ],
	attributes: {
		tagName: 'section',
		htmlAttributes: { [ KEY ]: '' },
		globalClasses: [ 'boim-video-banner', OVERLAY_CLASS ],
		metadata: { name: __( 'Video Banner', 'boim-blocks' ) },
	},
	innerBlocks: [
		[
			'generateblocks/element',
			{
				tagName: 'div',
				globalClasses: [ 'boim-video-banner__content' ],
				metadata: { name: __( 'Content', 'boim-blocks' ) },
			},
			[
				[
					'generateblocks/text',
					{
						tagName: 'h2',
						content: __(
							'A headline over your video',
							'boim-blocks'
						),
					},
				],
				[
					'generateblocks/text',
					{
						tagName: 'p',
						content: __(
							'Everything here is a GenerateBlocks block you can restyle.',
							'boim-blocks'
						),
					},
				],
			],
		],
	],
	isActive: ( attributes ) => isBanner( attributes ),
};

/*
 * GenerateBlocks' own "Container" variation matches every div/section, and
 * WordPress reports the first matching variation as the active one. So the
 * Video Banner is put in front of GB's variations when the Container block
 * registers (this script loads first). If GB was already registered, it's
 * added normally: everything works, the block card just says "Container".
 */
if ( getBlockType( CONTAINER ) ) {
	registerBlockVariation( CONTAINER, variation );
} else {
	addFilter(
		'blocks.registerBlockType',
		'boim/video-banner-variation',
		( settings, name ) =>
			CONTAINER === name
				? {
						...settings,
						variations: [
							variation,
							...( settings.variations || [] ),
						],
				  }
				: settings
	);
}

/**
 * The "Video background" panel.
 *
 * @param {Object}   props               Block edit props.
 * @param {Object}   props.attributes    Container attributes.
 * @param {Function} props.setAttributes Attribute setter.
 */
function VideoPanel( { attributes, setAttributes } ) {
	const html = htmlAttributesOf( attributes );
	const source = html[ KEY ];
	const banner = Object.hasOwn( html, KEY );
	const sourceId = /^\d+$/.test( String( source ?? '' ) )
		? Number( source )
		: 0;
	const mobileOff = Object.hasOwn( html, BREAKPOINT );
	const [ urlError, setUrlError ] = useState( false );

	const video = useSelect(
		( select ) =>
			sourceId
				? select( coreStore ).getMedia( sourceId, { context: 'view' } )
				: null,
		[ sourceId ]
	);

	// Only the keys given change; undefined removes a key. Always a copy.
	const update = ( changes ) => {
		const next = { ...html };

		Object.entries( changes ).forEach( ( [ key, value ] ) => {
			if ( undefined === value ) {
				delete next[ key ];
			} else {
				next[ key ] = value;
			}
		} );

		setAttributes( { htmlAttributes: next } );
	};

	const removeAll = () =>
		update( { [ KEY ]: undefined, [ BREAKPOINT ]: undefined } );

	let sourceLabel = __( 'No video chosen yet.', 'boim-blocks' );

	if ( sourceId ) {
		sourceLabel = video?.source_url
			? video.source_url.split( '/' ).pop()
			: __( 'Loading…', 'boim-blocks' );
	} else if ( source ) {
		sourceLabel = source;
	}

	return (
		<PanelBody
			title={ __( 'Video background', 'boim-blocks' ) }
			initialOpen={ banner }
		>
			<p className="boim-video-panel__file">
				<strong>{ __( 'Video:', 'boim-blocks' ) }</strong>{ ' ' }
				{ sourceLabel }
			</p>

			<div className="boim-video-panel__actions">
				<MediaReplaceFlow
					name={
						source
							? __( 'Replace video', 'boim-blocks' )
							: __( 'Choose video', 'boim-blocks' )
					}
					mediaId={ sourceId || undefined }
					mediaURL={
						sourceId ? video?.source_url : source || undefined
					}
					allowedTypes={ [ 'video' ] }
					accept="video/mp4,video/webm,video/ogg"
					onSelect={ ( media ) => {
						setUrlError( false );
						update( { [ KEY ]: String( media.id ) } );
					} }
					onSelectURL={ ( url ) => {
						const valid = isVideoUrl( url );

						setUrlError( ! valid );

						if ( valid ) {
							update( { [ KEY ]: url } );
						}
					} }
				/>
				{ banner && (
					<Button
						variant="tertiary"
						isDestructive
						onClick={ removeAll }
					>
						{ __( 'Remove video background', 'boim-blocks' ) }
					</Button>
				) }
			</div>

			{ urlError && (
				<Notice status="error" isDismissible={ false }>
					{ __(
						'That URL isn’t a video file. Use an http(s) link ending in .mp4, .m4v, .webm or .ogv.',
						'boim-blocks'
					) }
				</Notice>
			) }

			{ banner && (
				<>
					<p className="components-base-control__help">
						{ __(
							'The video plays muted and loops. Until it plays, and wherever it is switched off, this block’s own background shows: set a background colour or image in its Styles.',
							'boim-blocks'
						) }
					</p>

					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Disable on mobile', 'boim-blocks' ) }
						checked={ mobileOff }
						onChange={ ( on ) =>
							update( {
								[ BREAKPOINT ]: on
									? DEFAULT_BREAKPOINT
									: undefined,
							} )
						}
					/>
					{ mobileOff && (
						<TextControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							type="number"
							min={ 1 }
							max={ 4000 }
							step={ 1 }
							label={ __( 'Breakpoint (px)', 'boim-blocks' ) }
							help={ __(
								'The video is switched off at this screen width and below, and never downloaded there. 767px is GenerateBlocks’ mobile breakpoint.',
								'boim-blocks'
							) }
							value={ html[ BREAKPOINT ] ?? '' }
							onChange={ ( value ) =>
								update( {
									[ BREAKPOINT ]: String( value ).replace(
										/\D/g,
										''
									),
								} )
							}
						/>
					) }

					{ ! ( attributes.globalClasses || [] ).includes(
						OVERLAY_CLASS
					) && (
						<Notice status="info" isDismissible={ false }>
							{ sprintf(
								/* translators: %s: a CSS class name. */
								__(
									'Text over moving video is hard to read. Add the %s class, or a tint with the nested selector &::after in this block’s Styles (position: absolute, inset 0, z-index: -1).',
									'boim-blocks'
								),
								OVERLAY_CLASS
							) }
						</Notice>
					) }

					<p className="components-base-control__help">
						{ __(
							'Focal point: in this block’s Styles, add the nested selector “& .boim-video-banner__media > *” and set object-position.',
							'boim-blocks'
						) }{ ' ' }
						<ExternalLink href="https://developer.mozilla.org/docs/Web/CSS/object-position">
							{ __( 'About object-position', 'boim-blocks' ) }
						</ExternalLink>
					</p>
				</>
			) }
		</PanelBody>
	);
}

const withVideoPanel = createHigherOrderComponent(
	( BlockEdit ) => ( props ) => {
		// Runs for every block in the post: only selected Containers get the panel.
		if ( CONTAINER !== props.name || ! props.isSelected ) {
			return <BlockEdit { ...props } />;
		}

		return (
			<>
				<BlockEdit { ...props } />
				<InspectorControls>
					<VideoPanel { ...props } />
				</InspectorControls>
			</>
		);
	},
	'withVideoPanel'
);

addFilter( 'editor.BlockEdit', 'boim/video-banner-panel', withVideoPanel );
