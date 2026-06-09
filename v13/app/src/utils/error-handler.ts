/**
 * エラーハンドリングユーティリティ
 * アプリケーション全体で統一されたエラー処理を提供
 */

//! エラー通知インターフェース。
export interface ErrorNotificationOptions {
	message: string;
	duration?: number; // 表示時間（ミリ秒）
	type?: 'error' | 'warning' | 'info';
}

/**
 * エラーハンドラークラス
 * console.errorの代わりに使用し、ユーザーにも通知
 */
export class ErrorHandler {
	/**
	 * エラーを処理してログ出力とユーザー通知を行う
	 * @param error エラーオブジェクト
	 * @param context エラーが発生したコンテキスト
	 */
	static handle(error: Error | unknown, context: string): void {
		const errorMessage = error instanceof Error ? error.message : String(error);

		//! 開発環境ではコンソールに詳細を出力。
		if (import.meta.env.DEV) {
			console.error(`[${context}]`, error);
		}

		//! ユーザー向けの通知を表示。
		this.showNotification({
			message: `エラーが発生しました: ${errorMessage}`,
			type: 'error',
			duration: 5000,
		});
	}

	/**
	 * 警告を処理する
	 * @param message 警告メッセージ
	 * @param context 警告が発生したコンテキスト
	 */
	static warn(message: string, context: string): void {
		//! 開発環境ではコンソールに出力。
		if (import.meta.env.DEV) {
			console.warn(`[${context}]`, message);
		}

		//! ユーザー向けの通知を表示（警告レベル）。
		this.showNotification({
			message,
			type: 'warning',
			duration: 3000,
		});
	}

	/**
	 * ユーザーに通知を表示する
	 * @param options 通知オプション
	 */
	static showNotification(options: ErrorNotificationOptions): void {
		const { message, duration = 3000, type = 'info' } = options;

		//! 通知要素を作成。
		const notification = document.createElement('div');
		notification.className = `notification notification-${type}`;
		notification.textContent = message;
		notification.style.cssText = `
			position: fixed;
			top: 20px;
			right: 20px;
			padding: 16px 24px;
			background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
			color: white;
			border-radius: 8px;
			box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
			z-index: 10000;
			font-size: 14px;
			max-width: 400px;
			animation: slideIn 0.3s ease-out;
		`;

		//! アニメーションスタイルを追加。
		if (!document.getElementById('notification-styles')) {
			const style = document.createElement('style');
			style.id = 'notification-styles';
			style.textContent = `
				@keyframes slideIn {
					from {
						transform: translateX(100%);
						opacity: 0;
					}
					to {
						transform: translateX(0);
						opacity: 1;
					}
				}
				@keyframes slideOut {
					from {
						transform: translateX(0);
						opacity: 1;
					}
					to {
						transform: translateX(100%);
						opacity: 0;
					}
				}
			`;
			document.head.appendChild(style);
		}

		//! DOMに追加。
		document.body.appendChild(notification);

		//! 指定時間後にフェードアウトして削除。
		setTimeout(() => {
			notification.style.animation = 'slideOut 0.3s ease-out';
			setTimeout(() => {
				notification.remove();
			}, 300);
		}, duration);
	}
}

/**
 * LocalStorageユーティリティ
 * エラーハンドリング付きのストレージ操作
 */
export class StorageUtil {
	/**
	 * データを保存する
	 * @param key キー
	 * @param value 値
	 * @returns 成功したかどうか
	 */
	static save<T>(key: string, value: T): boolean {
		try {
			localStorage.setItem(key, JSON.stringify(value));
			return true;
		} catch (error) {
			ErrorHandler.handle(error, 'StorageUtil.save');
			return false;
		}
	}

	/**
	 * データを読み込む
	 * @param key キー
	 * @returns 読み込んだ値（存在しない場合はnull）
	 */
	static load<T>(key: string): T | null {
		try {
			const saved = localStorage.getItem(key);
			if (!saved) return null;
			return JSON.parse(saved) as T;
		} catch (error) {
			ErrorHandler.handle(error, 'StorageUtil.load');
			return null;
		}
	}

	/**
	 * データを削除する
	 * @param key キー
	 * @returns 成功したかどうか
	 */
	static remove(key: string): boolean {
		try {
			localStorage.removeItem(key);
			return true;
		} catch (error) {
			ErrorHandler.handle(error, 'StorageUtil.remove');
			return false;
		}
	}

	/**
	 * LocalStorageの容量をチェックする
	 * @returns 使用中のサイズ（バイト）
	 */
	static getUsedSize(): number {
		try {
			let size = 0;
			for (const key in localStorage) {
				if (localStorage.hasOwnProperty(key)) {
					size += key.length + (localStorage[key]?.length || 0);
				}
			}
			return size;
		} catch (error) {
			ErrorHandler.handle(error, 'StorageUtil.getUsedSize');
			return 0;
		}
	}
}
