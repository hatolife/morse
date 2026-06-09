import { test, expect } from '@playwright/test';

test.describe('CW略語・Q符号学習', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/#flashcard');
		//! データロード完了まで待機。
		await page.waitForSelector('h1:has-text("CW略語・Q符号学習")', { timeout: 10000 });
	});

	test('画面の基本要素が表示される', async ({ page }) => {
		await expect(page.locator('h1')).toContainText('CW略語・Q符号学習');

		//! 3つのタブ。
		await expect(page.locator('.tab-button:has-text("一覧")')).toBeVisible();
		await expect(page.locator('.tab-button:has-text("学習モード")')).toBeVisible();
		await expect(page.locator('.tab-button:has-text("試験モード")')).toBeVisible();

		//! 設定アイコン。
		await expect(page.locator('#settingsIcon')).toBeVisible();
	});

	test('一覧モードでフィルタリングが機能する', async ({ page }) => {
		//! フィルターセクションが表示される。
		await expect(page.locator('.filter-group label:has-text("タグで絞り込み")')).toBeVisible();
		await expect(page.locator('.filter-group label:has-text("使用頻度で絞り込み")')).toBeVisible();

		//! 該当件数が表示される。
		await expect(page.locator('#filtered-count')).toBeVisible();
	});

	test('学習モードタブに切り替えられる', async ({ page }) => {
		await page.click('.tab-button:has-text("学習モード")');

		//! 学習設定画面が表示される。
		await expect(page.locator('h3:has-text("学習設定")')).toBeVisible();
	});

	test('試験モードタブに切り替えられる', async ({ page }) => {
		await page.click('.tab-button:has-text("試験モード")');

		//! 試験設定画面が表示される。
		await expect(page.locator('h3:has-text("出題形式")')).toBeVisible();
		await expect(page.locator('h3:has-text("問題数")')).toBeVisible();
	});

	test('メニューに戻るボタンが機能する', async ({ page }) => {
		await page.click('.back-btn');
		await expect(page).toHaveURL(/#menu/);
	});

	test('設定モーダルが開ける', async ({ page }) => {
		await page.click('#settingsIcon');
		await expect(page.locator('.settings-modal')).toBeVisible();
	});
});
