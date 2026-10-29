import { SVG, Path, Rect } from '@wordpress/primitives';

// Drawn like GenerateBlocks' own block icons: 1.25-unit outlines on a
// 24-unit grid with 0.625 rounded corners, coloured by currentColor.
// A page made of stacked sections: a pattern.
export const patternsIcon = (
	<SVG
		className="gblocks-block-icon"
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
	>
		<Rect
			x="2.625"
			y="2.625"
			width="18.75"
			height="7.75"
			rx="0.625"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.25"
		/>
		<Rect
			x="2.625"
			y="13.625"
			width="7.75"
			height="7.75"
			rx="0.625"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.25"
		/>
		<Path
			d="M13.625 14.25h7.75M13.625 17.5h7.75M13.625 20.75h5"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.25"
			strokeLinecap="round"
		/>
	</SVG>
);
