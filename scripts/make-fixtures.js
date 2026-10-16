/**
 * Makes the test videos and poster in tests/fixtures/ (ffmpeg not needed):
 * Chrome records an animated canvas with MediaRecorder. Run once:
 * node scripts/make-fixtures.js
 */
const fs = require( 'fs' );
const path = require( 'path' );
const { chromium } = require( '@playwright/test' );

const OUT = path.join( __dirname, '..', 'tests', 'fixtures' );

( async () => {
	const browser = await chromium.launch( { channel: 'chrome' } );
	const page = await browser.newPage();

	const record = ( mimeType ) =>
		page.evaluate( async ( type ) => {
			const canvas = document.createElement( 'canvas' );
			canvas.width = 640;
			canvas.height = 360;
			document.body.append( canvas );
			const ctx = canvas.getContext( '2d' );
			const stream = canvas.captureStream( 30 );
			const recorder = new window.MediaRecorder( stream, {
				mimeType: type,
				videoBitsPerSecond: 400000,
			} );
			const chunks = [];
			recorder.ondataavailable = ( e ) => chunks.push( e.data );
			let frame = 0;
			const draw = () => {
				const hue = ( frame * 2 ) % 360;
				const gradient = ctx.createLinearGradient( 0, 0, 640, 360 );
				gradient.addColorStop( 0, `hsl(${ hue }, 60%, 30%)` );
				gradient.addColorStop(
					1,
					`hsl(${ ( hue + 120 ) % 360 }, 60%, 20%)`
				);
				ctx.fillStyle = gradient;
				ctx.fillRect( 0, 0, 640, 360 );
				ctx.fillStyle = 'rgba(255,255,255,0.35)';
				ctx.beginPath();
				ctx.arc(
					320 + 200 * Math.sin( frame / 20 ),
					180,
					50,
					0,
					Math.PI * 2
				);
				ctx.fill();
				frame++;
			};
			const timer = setInterval( draw, 33 );
			draw();
			recorder.start();
			await new Promise( ( r ) => setTimeout( r, 6000 ) );
			recorder.stop();
			await new Promise( ( r ) => ( recorder.onstop = r ) );
			clearInterval( timer );
			const blob = new Blob( chunks, { type } );
			const buffer = new Uint8Array( await blob.arrayBuffer() );
			let binary = '';
			buffer.forEach( ( b ) => ( binary += String.fromCharCode( b ) ) );
			return btoa( binary );
		}, mimeType );

	fs.mkdirSync( OUT, { recursive: true } );
	fs.writeFileSync(
		path.join( OUT, 'sample.webm' ),
		Buffer.from( await record( 'video/webm;codecs=vp9' ), 'base64' )
	);

	const mp4 = await page.evaluate( () =>
		window.MediaRecorder.isTypeSupported( 'video/mp4;codecs=avc1' )
	);
	if ( mp4 ) {
		fs.writeFileSync(
			path.join( OUT, 'sample.mp4' ),
			Buffer.from( await record( 'video/mp4;codecs=avc1' ), 'base64' )
		);
	}

	// Poster: a still frame as JPEG.
	const jpeg = await page.evaluate( () => {
		const canvas = document.createElement( 'canvas' );
		canvas.width = 1280;
		canvas.height = 720;
		const ctx = canvas.getContext( '2d' );
		const gradient = ctx.createLinearGradient( 0, 0, 1280, 720 );
		gradient.addColorStop( 0, 'hsl(200, 60%, 30%)' );
		gradient.addColorStop( 1, 'hsl(320, 60%, 20%)' );
		ctx.fillStyle = gradient;
		ctx.fillRect( 0, 0, 1280, 720 );
		return canvas.toDataURL( 'image/jpeg', 0.8 ).split( ',' )[ 1 ];
	} );
	fs.writeFileSync(
		path.join( OUT, 'poster.jpg' ),
		Buffer.from( jpeg, 'base64' )
	);

	await browser.close();
	// eslint-disable-next-line no-console -- a CLI script.
	console.log( 'mp4:', mp4 );
} )();
