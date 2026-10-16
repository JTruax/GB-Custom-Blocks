const { defineConfig } = require( '@playwright/test' );

module.exports = defineConfig( {
	testDir: './tests/e2e',
	globalSetup: require.resolve( './tests/e2e/global-setup.js' ),
	workers: 1, // One shared WordPress: run serially.
	fullyParallel: false,
	timeout: 90_000,
	expect: { timeout: 15_000 },
	retries: process.env.CI ? 1 : 0,
	use: {
		baseURL: 'http://127.0.0.1:9400',
		trace: 'retain-on-failure',
		// Installed Chrome plays MP4 (H.264); Playwright's own Chromium doesn't.
		...( process.env.CI ? {} : { channel: 'chrome' } ),
	},
	webServer: {
		command:
			'node node_modules/@wp-playground/cli/wp-playground.js server --mount=./:/wordpress/wp-content/plugins/boim-blocks --blueprint=playground/blueprint.json --port=9400 --login',
		port: 9400,
		reuseExistingServer: ! process.env.CI,
		timeout: 300_000,
	},
} );
