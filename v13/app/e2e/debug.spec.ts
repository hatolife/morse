import { test, expect } from '@playwright/test';

//! デバッグ用: 段階的にテストを実行して問題箇所を特定。

test.describe('デバッグ: Playwright基本動作確認', () => {
	test('Step 1: テスト実行環境の確認', async () => {
		//! Playwrightが正常に実行できるか確認。
		expect(true).toBe(true);
	});

	test('Step 2: ブラウザ起動の確認', async ({ browser }) => {
		//! ブラウザオブジェクトが取得できるか確認。
		expect(browser).toBeDefined();
	});

	test('Step 3: コンテキスト作成の確認', async ({ context }) => {
		//! ブラウザコンテキストが作成できるか確認。
		expect(context).toBeDefined();
	});

	test('Step 4: ページ作成の確認', async ({ page }) => {
		//! ページオブジェクトが作成できるか確認。
		expect(page).toBeDefined();
	});

	test('Step 5: ページタイトル取得の確認', async ({ page }) => {
		//! 空のページでタイトルが取得できるか確認。
		const title = await page.title();
		expect(title).toBeDefined();
	});
});

test.describe('デバッグ: サーバーアクセス確認', () => {
	test('Step 6: baseURLへのアクセス', async ({ page }) => {
		//! baseURL (http://localhost:3000) にアクセスできるか確認。
		await page.goto('/');
		expect(page.url()).toContain('localhost:3000');
	});

	test('Step 7: HTMLの取得', async ({ page }) => {
		//! ページのHTMLが取得できるか確認。
		await page.goto('/');
		const html = await page.content();
		expect(html).toContain('html');
	});

	test('Step 8: タイトル要素の確認', async ({ page }) => {
		//! h1タグが存在するか確認。
		await page.goto('/');
		const h1 = page.locator('h1');
		await expect(h1).toBeVisible();
	});
});
