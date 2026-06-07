import { defineConfig, devices } from '@playwright/test';

const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

/**
 * Playwright E2Eテスト設定
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
	testDir: './e2e',

	//! テストタイムアウト設定。
	timeout: 30 * 1000,
	expect: {
		timeout: 5000
	},

	//! 並列実行設定。
	fullyParallel: true,

	//! CIで失敗時のリトライ設定。
	retries: process.env.CI ? 2 : 0,

	//! ワーカー数設定。
	workers: process.env.CI ? 1 : undefined,

	//! レポーター設定。
	reporter: [
		['html', { outputFolder: 'playwright-report' }],
		['list']
	],

	//! 共通設定。
	use: {
		//! ベースURL（開発サーバー）。
		baseURL: 'http://localhost:3000',

		//! ヘッドレスモード（WSL環境でXServerなしで動作）。
		headless: true,

		//! ナビゲーションタイムアウト（ページ遷移）。
		navigationTimeout: 30 * 1000,

		//! アクションタイムアウト（クリック等）。
		actionTimeout: 30 * 1000,

		//! トレース設定。
		trace: 'on-first-retry',

		//! スクリーンショット設定。
		screenshot: 'only-on-failure',

		//! ビデオ設定。
		video: 'off',
	},

	//! テスト対象ブラウザ設定（WSL環境ではchromiumのみ）。
	projects: [
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				//! WSL環境対応: GPUレンダリングを無効化してページ作成を高速化。
				launchOptions: {
					...(chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : {}),
					args: [
						'--use-gl=swiftshader',
						'--disable-gpu',
						'--disable-dev-shm-usage',
						'--disable-crash-reporter',
						'--disable-crashpad',
						'--no-sandbox',
					],
				},
			},
		},

		// Firefox and WebKit require additional installation
		// Run: npx playwright install firefox webkit
		// Uncomment below when browsers are installed:
		// {
		// 	name: 'firefox',
		// 	use: { ...devices['Desktop Firefox'] },
		// },
		// {
		// 	name: 'webkit',
		// 	use: { ...devices['Desktop Safari'] },
		// },
		// {
		// 	name: 'Mobile Chrome',
		// 	use: { ...devices['Pixel 5'] },
		// },
		// {
		// 	name: 'Mobile Safari',
		// 	use: { ...devices['iPhone 12'] },
		// },
	],

	//! 開発サーバー設定。
	webServer: {
		command: 'npm run dev',
		url: 'http://localhost:3000',
		reuseExistingServer: true,
		timeout: 120 * 1000,
	},
});
