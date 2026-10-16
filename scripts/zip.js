/**
 * Builds dist/boim-blocks.zip from an allowlist of runtime files.
 * Run after `npm run build`: node scripts/zip.js
 */
const fs = require( 'fs' );
const path = require( 'path' );
const { execFileSync } = require( 'child_process' );

const ROOT = path.join( __dirname, '..' );
const SLUG = 'boim-blocks';
const FILES = [
	'boim-blocks.php',
	'uninstall.php',
	'readme.txt',
	'LICENSE',
	'includes',
	'build',
];
const OUT = path.join( ROOT, 'dist' );
const STAGE = path.join( OUT, SLUG );

if (
	! fs.existsSync( path.join( ROOT, 'build', 'video-banner', 'view.js' ) )
) {
	throw new Error( 'Run `npm run build` first.' );
}

fs.rmSync( OUT, { recursive: true, force: true } );
fs.mkdirSync( STAGE, { recursive: true } );

FILES.filter( ( file ) => fs.existsSync( path.join( ROOT, file ) ) ).forEach(
	( file ) =>
		fs.cpSync( path.join( ROOT, file ), path.join( STAGE, file ), {
			recursive: true,
		} )
);

execFileSync( 'zip', [ '-rq', `${ SLUG }.zip`, SLUG ], { cwd: OUT } );
fs.rmSync( STAGE, { recursive: true } );

// eslint-disable-next-line no-console -- a CLI script.
console.log( `dist/${ SLUG }.zip` );
