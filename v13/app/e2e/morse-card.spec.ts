import { test, expect } from '@playwright/test';

test.describe('モールス符号フラッシュカード', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/#morse-card');
		await page.waitForSelector('h1:has-text("モールス符号フラッシュカード")', { timeout: 10000 });
	});

	test('画面の基本要素が表示される', async ({ page }) => {
		await expect(page.locator('h1')).toContainText('モールス符号フラッシュカード');
		await expect(page.locator('.tab-button:has-text("一覧")')).toBeVisible();
		await expect(page.locator('.tab-button:has-text("学習モード")')).toBeVisible();
		await expect(page.locator('.tab-button:has-text("試験モード")')).toBeVisible();
		await expect(page.locator('#settingsIcon')).toBeVisible();
	});

	test('一覧モードでカードが表示される', async ({ page }) => {
		await expect(page.locator('.filter-group label:has-text("種別で絞り込み")')).toBeVisible();
		await expect(page.locator('.entry-card').first()).toBeVisible();
		await expect(page.locator('.morse-code-text').first()).toBeVisible();
	});

	test('学習モードに切り替えられる', async ({ page }) => {
		await page.click('.tab-button:has-text("学習モード")');
		await expect(page.locator('h3:has-text("学習設定")')).toBeVisible();
		await expect(page.locator('button:has-text("文字→符号")')).toBeVisible();
	});

	test('試験モードに切り替えられる', async ({ page }) => {
		await page.click('.tab-button:has-text("試験モード")');
		await expect(page.locator('h3:has-text("試験設定")')).toBeVisible();
		await expect(page.locator('button:has-text("試験開始")')).toBeVisible();
	});
});
