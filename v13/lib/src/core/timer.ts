/**
 * タイマー管理クラス
 * 複数のタイマーを型安全に管理する
 * UI非依存のピュアなロジックモジュール
 */

export type TimerCallback = () => void;

/**
 * 型安全なタイマー管理クラス
 *
 * number | null の代わりに、より型安全な方法でタイマーを管理する
 */
export class TimerManager {
	/** 管理中のタイマーID */
	private timers: Map<string, number> = new Map();

	/**
	 * タイマーを設定する
	 *
	 * @param name - タイマーの識別名
	 * @param callback - タイマー実行時のコールバック
	 * @param delay - 遅延時間（ミリ秒）
	 *
	 * @example
	 * ```ts
	 * const manager = new TimerManager();
	 * manager.set('charGap', () => console.log('Character committed'), 200);
	 * ```
	 */
	set(name: string, callback: TimerCallback, delay: number): void {
		// 既存のタイマーがあればクリア
		this.clear(name);

		// 新しいタイマーを設定
		const timerId = window.setTimeout(callback, delay);
		this.timers.set(name, timerId);
	}

	/**
	 * 指定したタイマーをクリアする
	 *
	 * @param name - タイマーの識別名
	 *
	 * @example
	 * ```ts
	 * manager.clear('charGap');
	 * ```
	 */
	clear(name: string): void {
		const timerId = this.timers.get(name);
		if (timerId !== undefined) {
			clearTimeout(timerId);
			this.timers.delete(name);
		}
	}

	/**
	 * 全てのタイマーをクリアする
	 *
	 * @example
	 * ```ts
	 * manager.clearAll();
	 * ```
	 */
	clearAll(): void {
		for (const timerId of this.timers.values()) {
			clearTimeout(timerId);
		}
		this.timers.clear();
	}

	/**
	 * 指定したタイマーが存在するかチェックする
	 *
	 * @param name - タイマーの識別名
	 * @returns タイマーが存在する場合true
	 */
	has(name: string): boolean {
		return this.timers.has(name);
	}

	/**
	 * 管理中のタイマー数を取得する
	 *
	 * @returns タイマー数
	 */
	count(): number {
		return this.timers.size;
	}
}
