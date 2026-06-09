import { test, expect } from '@playwright/test';

test.describe('横振り電鍵練習', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/#horizontal');
		await page.waitForLoadState('networkidle');
	});

	test('画面の基本要素が表示される', async ({ page }) => {
		await expect(page.locator('h1')).toContainText('横振り電鍵練習');

		//! 2つのパドルボタン。
		await expect(page.locator('#left-paddle')).toBeVisible();
		await expect(page.locator('#right-paddle')).toBeVisible();

		//! モールス信号表示エリア。
		await expect(page.locator('#morse-buffer')).toBeVisible();

		//! デコード結果表示エリア。
		await expect(page.locator('#decoded-text')).toBeVisible();

		//! 現在の速度表示。
		await expect(page.locator('#current-wpm')).toBeVisible();

		//! Iambicモード表示。
		await expect(page.locator('#current-iambic-mode')).toBeVisible();
	});

	test('メニューに戻るボタンが機能する', async ({ page }) => {
		await page.click('.back-btn');
		await expect(page).toHaveURL(/#menu/);
	});

	test('設定モーダルが開ける', async ({ page }) => {
		await page.click('#settingsIcon');

		//! モーダルが表示されるまで待機（horizontal-keyは.modalクラスを使用）。
		await page.waitForSelector('.modal', { state: 'visible', timeout: 10000 });
		await expect(page.locator('.modal')).toBeVisible();

		//! 横振り電鍵固有の設定（モーダル内のlabelを明示的に指定してstrict mode violationを回避）。
		await expect(page.locator('.modal label:has-text("Iambicモード")')).toBeVisible();
		await expect(page.locator('.modal label:has-text("パドルレイアウト")')).toBeVisible();
	});

	test('スペーシング評価UIが表示される', async ({ page }) => {
		//! スペーシング評価セクションが表示される。
		await expect(page.locator('.timing-evaluation-section')).toBeVisible();

		//! スペーシング評価の統計情報が表示される。
		await expect(page.locator('#timing-avg-accuracy')).toBeVisible();
		await expect(page.locator('#timing-avg-error')).toBeVisible();
		await expect(page.locator('#timing-count')).toBeVisible();

		//! 文字間、単語間別の統計情報が表示される（要素間は自動生成のため除外）。
		await expect(page.locator('#timing-char-expected')).toBeVisible();
		await expect(page.locator('#timing-char-accuracy')).toBeVisible();
		await expect(page.locator('#timing-char-error')).toBeVisible();
		await expect(page.locator('#timing-char-count')).toBeVisible();

		await expect(page.locator('#timing-word-expected')).toBeVisible();
		await expect(page.locator('#timing-word-accuracy')).toBeVisible();
		await expect(page.locator('#timing-word-error')).toBeVisible();
		await expect(page.locator('#timing-word-count')).toBeVisible();
	});
});
