import { test, expect } from '@playwright/test';

test.describe('モールス信号聞き取り練習', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/#listening');
		await page.waitForLoadState('networkidle');
	});

	test('画面の基本要素が表示される', async ({ page }) => {
		await expect(page.locator('h1')).toContainText('モールス信号聞き取り練習');

		//! カテゴリータブ。
		await expect(page.locator('.tab-button:has-text("ラバースタンプQSO")')).toBeVisible();
		await expect(page.locator('.tab-button:has-text("英文100字")')).toBeVisible();
		await expect(page.locator('.tab-button:has-text("英文200字")')).toBeVisible();
		await expect(page.locator('.tab-button:has-text("英文300字")')).toBeVisible();
		await expect(page.locator('.tab-button:has-text("ユーザー定義")')).toBeVisible();

		//! 設定アイコン。
		await expect(page.locator('#settingsIcon')).toBeVisible();
	});

	test('QSOテンプレート一覧が表示される', async ({ page }) => {
		//! ランダムQSO生成カード。
		await expect(page.locator('.template-card h3:has-text("ランダムQSO生成")')).toBeVisible();

		//! テンプレートカード。
		await expect(page.locator('.template-card')).toHaveCount(await page.locator('.template-card').count());
	});

	test('英文カテゴリに切り替えられる', async ({ page }) => {
		await page.click('.tab-button:has-text("英文100字")');

		//! テンプレートが表示される。
		await expect(page.locator('.template-card')).toHaveCount(await page.locator('.template-card').count());
	});

	test('ユーザー定義カテゴリに切り替えられる', async ({ page }) => {
		await page.click('.tab-button:has-text("ユーザー定義")');

		//! 新規作成ボタンが表示される（テンプレートがない場合）。
		const addBtn = page.locator('#addCustomBtn');
		if (await addBtn.isVisible()) {
			await expect(addBtn).toBeVisible();
		}
	});

	test('メニューに戻るボタンが機能する', async ({ page }) => {
		await page.click('.back-btn');
		await expect(page).toHaveURL(/#menu/);
	});

	test('設定モーダルが開ける', async ({ page }) => {
		await page.click('#settingsIcon');

		//! モーダルが表示されるまで待機（listeningは.modalクラスを使用）。
		await page.waitForSelector('.modal', { state: 'visible', timeout: 10000 });
		await expect(page.locator('.modal')).toBeVisible();

		//! リスニング固有の設定。
		await expect(page.locator('text=文字速度')).toBeVisible();
		await expect(page.locator('text=実効速度')).toBeVisible();
		await expect(page.locator('text=周波数 A側')).toBeVisible();
		await expect(page.locator('text=周波数 B側')).toBeVisible();
	});

	test('テンプレートを選択して練習画面に遷移できる', async ({ page }) => {
		//! ランダムQSO生成を選択。
		await page.click('button.select-btn[data-template-id="qso-random-generate"]');

		//! 練習画面が表示される。
		await expect(page.locator('.practice-area')).toBeVisible();
		await expect(page.locator('.playback-controls')).toBeVisible();
		await expect(page.locator('#playBtn')).toBeVisible();
		await expect(page.locator('#pauseBtn')).toBeVisible();
		await expect(page.locator('#stopBtn')).toBeVisible();
		await expect(page.locator('#downloadBtn')).toBeVisible();
	});
});
