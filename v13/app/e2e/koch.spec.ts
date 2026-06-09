import { test, expect } from '@playwright/test';

test.describe('コッホ法トレーニング', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/#koch');
		await page.waitForLoadState('networkidle');
	});

	test('画面の基本要素が表示される', async ({ page }) => {
		await expect(page.locator('h1')).toContainText('コッホ法トレーニング');

		//! 2つのタブ。
		await expect(page.locator('.tab-button:has-text("基本学習")')).toBeVisible();
		await expect(page.locator('.tab-button:has-text("任意文字列練習")')).toBeVisible();

		//! 設定アイコン。
		await expect(page.locator('#settingsIcon')).toBeVisible();
	});

	test('基本学習モードの要素が表示される', async ({ page }) => {
		//! レッスン番号。
		await expect(page.locator('h2:has-text("レッスン")')).toBeVisible();

		//! 学習文字。
		await expect(page.locator('.chars:has-text("学習文字:")')).toBeVisible();

		//! 練習開始ボタン。
		await expect(page.locator('#startBtn')).toBeVisible();

		//! レッスン一覧。
		await expect(page.locator('.lesson-list')).toBeVisible();
	});

	test('任意文字列練習モードに切り替えられる', async ({ page }) => {
		await page.click('.tab-button:has-text("任意文字列練習")');

		//! 文字選択画面が表示される。
		await expect(page.locator('h2:has-text("任意文字列練習モード")')).toBeVisible();
		await expect(page.locator('p:has-text("練習したい文字を選択してください")')).toBeVisible();

		//! 文字選択ボタンが表示される。
		await expect(page.locator('.char-select-btn')).toHaveCount(41); // KOCH_SEQUENCEは41文字
	});

	test('メニューに戻るボタンが機能する', async ({ page }) => {
		await page.click('.back-btn');
		await expect(page).toHaveURL(/#menu/);
	});

	test('設定モーダルが開ける', async ({ page }) => {
		await page.click('#settingsIcon');

		//! モーダルが表示されるまで待機（kochは.modalクラスを使用）。
		await page.waitForSelector('.modal', { state: 'visible', timeout: 10000 });
		await expect(page.locator('.modal')).toBeVisible();

		//! コッホ法固有の設定。
		await expect(page.locator('text=文字速度')).toBeVisible();
		await expect(page.locator('text=実効速度')).toBeVisible();
		await expect(page.locator('text=練習時間')).toBeVisible();
		await expect(page.locator('text=グループサイズ')).toBeVisible();
	});
});
