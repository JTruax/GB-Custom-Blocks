import { SVG, Path } from '@wordpress/primitives';

// gblocks-block-icon: GenerateBlocks colours its block icons with this class.
export const videoBannerIcon = (
	<SVG
		className="gblocks-block-icon"
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
	>
		<Path d="M3 5h18v14H3z" fillOpacity="0.3" />
		<Path d="M3 4h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm0 1.5v13h18v-13z" />
		<Path d="M10 9v6l5-3z" />
	</SVG>
);
