/**
 * Video Banner, editor side.
 *
 * Not a new block: a GenerateBlocks Container (generateblocks/element) with
 * a "Video background" panel. Every setting is saved in the Container's own
 * htmlAttributes, which GenerateBlocks saves and renders, so the content
 * stays a valid Container if this plugin is ever switched off. PHP turns the
 * settings into the video layer (includes/class-boim-video-banner.php); in
 * the editor, canvas-video.js plays the same video behind the content.
 */
import { __, sprintf } from '@wordpress/i18n';
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import {
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import { getBlockType, registerBlockVariation } from '@wordpress/blocks';
import {
	Button,
	ExternalLink,
	Notice,
	PanelBody,
	RangeControl,
	TextControl,
	ToggleControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis -- Only exported as experimental in WP 6.6–6.9; core and GenerateBlocks use it throughout.
	__experimentalToggleGroupControl as ToggleGroupControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis -- As above.
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { useState } from '@wordpress/element';

import CanvasVideo from './canvas-video';
import { videoBannerIcon } from './icon';
import {
	BREAKPOINT,
	CONTAINER,
	DEFAULT_BREAKPOINT,
	htmlAttributesOf,
	isBanner,
	isVideoUrl,
	KEY,
	OPACITY,
	opacityOf,
	sourceIdOf,
	useVideo,
} from './shared';
import './editor.scss';

const OVERLAY_CLASS = 'boim-video-banner--overlay';

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
 * Where the video comes from: the Media Library (upload or choose), or a URL.
 *
 * @param {Object}   props          Props.
 * @param {*}        props.source   Saved data-boim-video value.
 * @param {Function} props.onChange Called with the new value to save.
 */
function VideoSource( { source, onChange } ) {
	const sourceId = sourceIdOf( source );
	const savedUrl = ! sourceId && source ? String( source ) : '';
	const [ mode, setMode ] = useState( savedUrl ? 'url' : 'upload' );
	const [ url, setUrl ] = useState( savedUrl );
	// Checked once the field is left, not on every keystroke while typing.
	const [ checked, setChecked ] = useState( false );
	const { media } = useVideo( source );
	const urlError = checked && '' !== url.trim() && ! isVideoUrl( url.trim() );

	let fileName = __( 'No video chosen yet.', 'boim-blocks' );

	if ( sourceId ) {
		fileName = media?.source_url
			? media.source_url.split( '/' ).pop()
			: __( 'Loading…', 'boim-blocks' );
	}

	return (
		<>
			<ToggleGroupControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				isBlock
				label={ __( 'Video source', 'boim-blocks' ) }
				value={ mode }
				onChange={ ( next ) => setMode( next ) }
			>
				<ToggleGroupControlOption
					value="upload"
					label={ __( 'Upload', 'boim-blocks' ) }
				/>
				<ToggleGroupControlOption
					value="url"
					label={ __( 'Video URL', 'boim-blocks' ) }
				/>
			</ToggleGroupControl>

			<div className="boim-video-panel__source">
				{ 'upload' === mode ? (
					<>
						<p className="boim-video-panel__file">
							{ sourceId
								? fileName
								: __(
										'Upload a video or choose one from the Media Library (MP4, WebM or Ogg).',
										'boim-blocks'
								  ) }
						</p>
						<MediaUploadCheck
							fallback={
								<p className="components-base-control__help">
									{ __(
										'You don’t have permission to upload. Use a video URL instead.',
										'boim-blocks'
									) }
								</p>
							}
						>
							<MediaUpload
								allowedTypes={ [ 'video' ] }
								value={ sourceId || undefined }
								onSelect={ ( selected ) => {
									setUrl( '' );
									onChange( String( selected.id ) );
								} }
								render={ ( { open } ) => (
									<Button
										variant="secondary"
										onClick={ open }
										__next40pxDefaultSize
									>
										{ sourceId
											? __(
													'Replace video',
													'boim-blocks'
											  )
											: __(
													'Upload or choose video',
													'boim-blocks'
											  ) }
									</Button>
								) }
							/>
						</MediaUploadCheck>
					</>
				) : (
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						type="url"
						label={ __( 'Video URL', 'boim-blocks' ) }
						placeholder="https://"
						value={ url }
						help={ __(
							'A direct link to the file, ending in .mp4, .m4v, .webm or .ogv (not a YouTube or Vimeo page).',
							'boim-blocks'
						) }
						onBlur={ () => setChecked( true ) }
						onChange={ ( next ) => {
							setUrl( next );
							setChecked( false );

							if ( isVideoUrl( next.trim() ) ) {
								onChange( next.trim() );
							}
						} }
					/>
				) }

				{ 'url' === mode && urlError && (
					<Notice status="error" isDismissible={ false }>
						{ __(
							'That isn’t a link to a video file yet. The banner keeps its current video until it is.',
							'boim-blocks'
						) }
					</Notice>
				) }
			</div>
		</>
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
	const banner = Object.hasOwn( html, KEY );
	const mobileOff = Object.hasOwn( html, BREAKPOINT );

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

	return (
		<PanelBody
			title={ __( 'Video background', 'boim-blocks' ) }
			initialOpen={ banner }
		>
			<VideoSource
				source={ html[ KEY ] }
				onChange={ ( value ) => update( { [ KEY ]: value } ) }
			/>

			{ banner && (
				<>
					<RangeControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Video opacity (%)', 'boim-blocks' ) }
						min={ 0 }
						max={ 100 }
						step={ 1 }
						value={ Math.round( opacityOf( html ) * 100 ) }
						allowReset
						resetFallbackValue={ 100 }
						help={ __(
							'Lower it to let this block’s background show through the video.',
							'boim-blocks'
						) }
						onChange={ ( value ) =>
							update( {
								[ OPACITY ]:
									undefined === value || value >= 100
										? undefined
										: String(
												Math.max(
													0,
													Math.round( value )
												)
										  ),
							} )
						}
					/>

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
									'Text over moving video is hard to read. Add the %s class, or a tint in this block’s Styles with the nested selector “& .boim-video-banner__media::after” (content: "", position: absolute, inset 0, a background colour).',
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

					<Button
						variant="tertiary"
						isDestructive
						onClick={ () =>
							update( {
								[ KEY ]: undefined,
								[ BREAKPOINT ]: undefined,
								[ OPACITY ]: undefined,
							} )
						}
					>
						{ __( 'Remove video background', 'boim-blocks' ) }
					</Button>
				</>
			) }
		</PanelBody>
	);
}

const withVideoBanner = createHigherOrderComponent(
	( BlockEdit ) => ( props ) => {
		// Runs for every block in the post: return early for anything else.
		if ( CONTAINER !== props.name ) {
			return <BlockEdit { ...props } />;
		}

		const banner = isBanner( props.attributes );

		if ( ! banner && ! props.isSelected ) {
			return <BlockEdit { ...props } />;
		}

		return (
			<>
				<BlockEdit { ...props } />
				{ banner && (
					<CanvasVideo
						clientId={ props.clientId }
						attributes={ props.attributes }
					/>
				) }
				{ props.isSelected && (
					<InspectorControls>
						<VideoPanel { ...props } />
					</InspectorControls>
				) }
			</>
		);
	},
	'withVideoBanner'
);

addFilter( 'editor.BlockEdit', 'boim/video-banner', withVideoBanner );
