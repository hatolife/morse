/**
 * アプリケーションエントリポイント
 */

import { Router } from './router';
import { initI18n } from './i18n';
import './assets/styles.css';

//! アプリケーション起動時の処理。
function init(): void {
	//! i18nシステムを初期化。
	initI18n();

	//! 開発環境でのみログを出力。
	if (import.meta.env.DEV) {
		console.log('Morse training app v12 started');
	}

	//! ルーターを初期化。
	const router = new Router();
	router.init();
}

//! DOMContentLoaded後に初期化。
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}
