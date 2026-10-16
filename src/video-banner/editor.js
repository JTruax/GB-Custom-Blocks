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
import {
	InspectorControls,
	MediaReplaceFlow,
	MediaUpload,
	MediaUploadCheck,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { getBlockType, registerBlockVariation } from '@wordpress/blocks';
import {
	Button,
	ExternalLink,
	Notice,
	PanelBody,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { useState } from '@wordpress/element';

import { videoBannerIcon } from './icon';
import './editor.scss';

const CONTAINER = 'generateblocks/element';
const PART_BLOCKS = [
	'generateblocks/element',
	'generateblocks/text',
	'generateblocks/shape',
	'generateblocks/media',
];

const KEY = 'data-boim-video';
const POSTER = 'data-boim-video-poster';
const HIDE = 'data-boim-video-hide';
const LOOP = 'data-boim-video-loop';
const PART = 'data-boim-video-part';
const SETTINGS = [ KEY, POSTER, HIDE, LOOP ];

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
 * Whether a banner's own blocks include a pause toggle (a nested banner's
 * toggle belongs to that banner).
 *
 * @param {Array} blocks Inner blocks.
 * @return {boolean} Found.
 */
const hasToggle = ( blocks ) =>
	blocks.some( ( block ) => {
		if ( CONTAINER === block.name && isBanner( block.attributes ) ) {
			return false;
		}

		return (
			'toggle' === htmlAttributesOf( block.attributes )[ PART ] ||
			hasToggle( block.innerBlocks || [] )
		);
	} );

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
		[
			'generateblocks/text',
			{
				tagName: 'button',
				content: __( 'Pause video', 'boim-blocks' ),
				htmlAttributes: { [ PART ]: 'toggle', type: 'button' },
				globalClasses: [ 'boim-video-banner__toggle' ],
				metadata: { name: __( 'Pause toggle', 'boim-blocks' ) },
			},
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
 * @param {string}   props.clientId      Container client id.
 */
function VideoPanel( { attributes, setAttributes, clientId } ) {
	const html = htmlAttributesOf( attributes );
	const source = html[ KEY ];
	const banner = Object.hasOwn( html, KEY );
	const sourceId = /^\d+$/.test( String( source ?? '' ) )
		? Number( source )
		: 0;
	const posterId = /^\d+$/.test( String( html[ POSTER ] ?? '' ) )
		? Number( html[ POSTER ] )
		: 0;
	const hide = String( html[ HIDE ] ?? '' ).split( /\s+/ );
	const [ urlError, setUrlError ] = useState( false );

	const { video, poster, toggle } = useSelect(
		( select ) => ( {
			video: sourceId
				? select( coreStore ).getMedia( sourceId, { context: 'view' } )
				: null,
			poster: posterId
				? select( coreStore ).getMedia( posterId, { context: 'view' } )
				: null,
			toggle: banner
				? hasToggle( select( blockEditorStore ).getBlocks( clientId ) )
				: true,
		} ),
		[ sourceId, posterId, banner, clientId ]
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

	const setHidden = ( device, on ) => {
		const devices = [ 'mobile', 'tablet' ].filter( ( item ) =>
			item === device ? on : hide.includes( item )
		);

		update( {
			[ HIDE ]: devices.length ? devices.join( ' ' ) : undefined,
		} );
	};

	const removeAll = () =>
		update(
			Object.fromEntries( SETTINGS.map( ( key ) => [ key, undefined ] ) )
		);

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
					<MediaUploadCheck>
						<MediaUpload
							allowedTypes={ [ 'image' ] }
							value={ posterId || undefined }
							onSelect={ ( media ) =>
								update( { [ POSTER ]: String( media.id ) } )
							}
							render={ ( { open } ) => (
								<div>
									{ poster?.source_url && (
										<img
											className="boim-video-panel__poster"
											src={ poster.source_url }
											alt=""
										/>
									) }
									<div className="boim-video-panel__actions">
										<Button
											variant="secondary"
											onClick={ open }
										>
											{ posterId
												? __(
														'Replace poster image',
														'boim-blocks'
												  )
												: __(
														'Choose poster image',
														'boim-blocks'
												  ) }
										</Button>
										{ posterId > 0 && (
											<Button
												variant="tertiary"
												onClick={ () =>
													update( {
														[ POSTER ]: undefined,
													} )
												}
											>
												{ __(
													'Remove poster',
													'boim-blocks'
												) }
											</Button>
										) }
									</div>
								</div>
							) }
						/>
					</MediaUploadCheck>
					<p className="components-base-control__help">
						{ __(
							'Shown until the video plays, where the video is switched off, and to visitors who prefer reduced motion. It is also the preview here in the editor.',
							'boim-blocks'
						) }
					</p>

					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Disable on mobile', 'boim-blocks' ) }
						help={ __(
							'Up to 767px wide. The video file is never downloaded there.',
							'boim-blocks'
						) }
						checked={ hide.includes( 'mobile' ) }
						onChange={ ( on ) => setHidden( 'mobile', on ) }
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Disable on tablet', 'boim-blocks' ) }
						help={ __( '768px to 1024px wide.', 'boim-blocks' ) }
						checked={ hide.includes( 'tablet' ) }
						onChange={ ( on ) => setHidden( 'tablet', on ) }
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Loop', 'boim-blocks' ) }
						checked={ 'false' !== html[ LOOP ] }
						onChange={ ( on ) =>
							update( { [ LOOP ]: on ? undefined : 'false' } )
						}
					/>

					{ ! toggle && (
						<Notice status="warning" isDismissible={ false }>
							{ __(
								'Add a pause button: moving content that lasts more than 5 seconds needs one (WCAG 2.2.2). Select a Text block set to <button> inside this banner and choose “Video banner part → Pause toggle”.',
								'boim-blocks'
							) }
						</Notice>
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

/**
 * The "Video banner part" panel, on GB blocks inside a banner.
 *
 * @param {Object}   props               Block edit props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 */
function PartPanel( { attributes, setAttributes } ) {
	const html = htmlAttributesOf( attributes );
	const value = html[ PART ] || '';

	return (
		<PanelBody title={ __( 'Video banner part', 'boim-blocks' ) }>
			<SelectControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={ __( 'This block is the…', 'boim-blocks' ) }
				value={ value }
				options={ [
					{
						value: '',
						label: __( 'Nothing special', 'boim-blocks' ),
					},
					{
						value: 'toggle',
						label: __( 'Pause toggle', 'boim-blocks' ),
					},
				] }
				help={
					'toggle' === value
						? __(
								'Pauses and plays the video. It gets aria-pressed="true" while paused: style that state with the nested selector &[aria-pressed="true"]. Keep the visible text the same in both states, and use a Text block set to <button>. Icon only? Add an aria-label in HTML Attributes.',
								'boim-blocks'
						  )
						: undefined
				}
				onChange={ ( next ) => {
					const updated = { ...html };

					if ( next ) {
						updated[ PART ] = next;
					} else {
						delete updated[ PART ];
					}

					setAttributes( { htmlAttributes: updated } );
				} }
			/>
		</PanelBody>
	);
}

const withVideoPanels = createHigherOrderComponent(
	( BlockEdit ) => ( props ) => {
		const { name, clientId, isSelected } = props;
		const isPartBlock = PART_BLOCKS.includes( name );

		// Runs for every block in the post: only look at parents for a selected GB block.
		const insideBanner = useSelect(
			( select ) => {
				if ( ! isPartBlock || ! isSelected ) {
					return false;
				}

				const { getBlockParents, getBlockName, getBlockAttributes } =
					select( blockEditorStore );

				return getBlockParents( clientId ).some(
					( parent ) =>
						CONTAINER === getBlockName( parent ) &&
						isBanner( getBlockAttributes( parent ) )
				);
			},
			[ clientId, isPartBlock, isSelected ]
		);

		if ( ! isSelected || ( CONTAINER !== name && ! insideBanner ) ) {
			return <BlockEdit { ...props } />;
		}

		return (
			<>
				<BlockEdit { ...props } />
				<InspectorControls>
					{ CONTAINER === name && <VideoPanel { ...props } /> }
					{ insideBanner && <PartPanel { ...props } /> }
				</InspectorControls>
			</>
		);
	},
	'withVideoPanels'
);

addFilter( 'editor.BlockEdit', 'boim/video-banner-panels', withVideoPanels );

/**
 * The poster as the banner's background in the editor canvas, via the
 * block's wrapper props (GB's own edit component is left alone).
 *
 * @param {Object}   props                BlockListBlock props.
 * @param {Function} props.BlockListBlock The wrapped component.
 * @param {number}   props.posterId       Poster attachment id.
 */
function PosterPreview( { BlockListBlock, posterId, ...props } ) {
	const url = useSelect(
		( select ) =>
			select( coreStore ).getMedia( posterId, { context: 'view' } )
				?.source_url,
		[ posterId ]
	);

	if ( ! url ) {
		return <BlockListBlock { ...props } />;
	}

	const wrapperProps = {
		...props.wrapperProps,
		'data-boim-editor-poster': '',
		style: {
			...props.wrapperProps?.style,
			'--boim-editor-poster': `url(${ JSON.stringify( url ) })`,
		},
	};

	return <BlockListBlock { ...props } wrapperProps={ wrapperProps } />;
}

const withPosterPreview = createHigherOrderComponent(
	( BlockListBlock ) => ( props ) => {
		if ( CONTAINER !== props.name ) {
			return <BlockListBlock { ...props } />;
		}

		const html = htmlAttributesOf( props.attributes );
		const posterId =
			Object.hasOwn( html, KEY ) &&
			/^\d+$/.test( String( html[ POSTER ] ?? '' ) )
				? Number( html[ POSTER ] )
				: 0;

		return posterId ? (
			<PosterPreview
				{ ...props }
				BlockListBlock={ BlockListBlock }
				posterId={ posterId }
			/>
		) : (
			<BlockListBlock { ...props } />
		);
	},
	'withPosterPreview'
);

addFilter(
	'editor.BlockListBlock',
	'boim/video-banner-poster',
	withPosterPreview
);
