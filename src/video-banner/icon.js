import { SVG, Path, Rect } from '@wordpress/primitives';

// Drawn like GenerateBlocks' own block icons: 1.25-unit outlines on a
// 24-unit grid with 0.625 rounded corners, coloured by currentColor.
// gblocks-block-icon: GenerateBlocks colours its block icons with this class.
export const videoBannerIcon = (
	<SVG
		className="gblocks-block-icon"
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
	>
		<Rect
			x="2.625"
			y="4.625"
			width="18.75"
			height="14.75"
			rx="0.625"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.25"
		/>
		<Path
			d="M9.75 8.75v6.5L15.25 12z"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.25"
			strokeLinejoin="round"
		/>
	</SVG>
);
