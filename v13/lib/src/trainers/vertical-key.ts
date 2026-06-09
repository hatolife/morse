/**
 * 縦振り電鍵トレーナー
 * UI非依存のピュアロジック実装
 */

import { MorseBuffer } from '../core/buffer';
import { TimerManager } from '../core/timer';
import { MorseCodec } from '../core/morse-codec';
import type { MorseTimings } from '../core/timing';
import { TimingEvaluator } from '../core/timing-evaluator';
import type { TimingEvaluation, TimingStatistics } from '../core/timing-evaluator';

/**
 * 縦振り電鍵トレーナーのコールバック定義
 */
export interface VerticalKeyCallbacks {
	/**
	 * キーが押された時に呼ばれる
	 */
	onKeyPress?: () => void;

	/**
	 * キーが離された時に呼ばれる
	 * @param element - 確定した要素 ('.' または '-')
	 */
	onKeyRelease?: (element: '.' | '-') => void;

	/**
	 * シーケンスが更新された時に呼ばれる（要素追加時）
	 * @param sequence - 現在のシーケンス (例: ".-")
	 */
	onSequenceUpdate?: (sequence: string) => void;

	/**
	 * 文字が確定した時に呼ばれる
	 * @param morse - モールス信号 (例: ".-")
	 * @param char - 解読された文字 (例: "A")
	 */
	onCharacter?: (morse: string, char: string) => void;

	/**
	 * 語間スペースが追加された時に呼ばれる
	 */
	onWordSeparator?: () => void;

	/**
	 * バッファ全体が更新された時に呼ばれる
	 * @param buffer - モールス信号バッファ (例: ".- -...")
	 * @param decoded - 解読された文字列 (例: "AB")
	 */
	onBufferUpdate?: (buffer: string, decoded: string) => void;

	/**
	 * タイミング評価が完了した時に呼ばれる
	 * @param evaluation - タイミング評価結果
	 */
	onTimingEvaluated?: (evaluation: TimingEvaluation) => void;
}

/**
 * 縦振り電鍵トレーナークラス
 * キー押下/解放イベントからモールス信号を生成する
 */
export class VerticalKeyTrainer {
	private keyDown: boolean = false;
	private keyDownTime: number = 0;
	private evaluations: TimingEvaluation[] = [];

	/**
	 * 縦振り電鍵トレーナーを初期化する
	 * @param buffer - モールスバッファインスタンス
	 * @param timer - タイマーマネージャーインスタンス
	 * @param timings - タイミング設定
	 * @param callbacks - イベントコールバック
	 */
	constructor(
		private buffer: MorseBuffer,
		private timer: TimerManager,
		private timings: MorseTimings,
		private callbacks: VerticalKeyCallbacks = {}
	) {}

	/**
	 * キーが押された時の処理
	 * 連続音の開始と状態の記録を行う
	 */
	keyPress(): void {
		if (this.keyDown) return;

		this.keyDown = true;
		this.keyDownTime = Date.now();
		this.timer.clearAll();

		this.callbacks.onKeyPress?.();
	}

	/**
	 * キーが離された時の処理
	 * 押下時間からdot/dashを判定し、バッファに追加する
	 */
	keyRelease(): void {
		if (!this.keyDown) return;

		this.keyDown = false;
		const duration = Date.now() - this.keyDownTime;

		// dot/dashの判定: 2dot相当を閾値とする
		const element = duration < this.timings.dot * 2 ? '.' : '-';
		this.buffer.addElement(element);

		// タイミング評価を実行
		const record = TimingEvaluator.createRecord(element, duration, this.timings);
		const evaluation = TimingEvaluator.evaluate(record);
		this.evaluations.push(evaluation);

		// コールバック呼び出し
		this.callbacks.onKeyRelease?.(element);
		this.callbacks.onSequenceUpdate?.(this.buffer.getSequence());
		this.callbacks.onTimingEvaluated?.(evaluation);
		this.notifyBufferUpdate();

		// 文字確定・語間スペースタイマーを設定
		this.setupCharWordTimers();
	}

	/**
	 * 文字確定・語間スペースタイマーを設定する
	 */
	private setupCharWordTimers(): void {
		this.timer.clearAll();

		// 文字確定タイマー
		const charGapDelay = this.timings.charGap;
		this.timer.set('charGap', () => {
			const sequence = this.buffer.getSequence();
			if (sequence) {
				const char = MorseCodec.morseToText([sequence]);
				this.buffer.commitSequence();
				this.callbacks.onCharacter?.(sequence, char || '?');
				this.notifyBufferUpdate();
			}
		}, charGapDelay);

		// 語間スペースタイマー
		const wordGapDelay = this.timings.wordGap;
		this.timer.set('wordGap', () => {
			const sequence = this.buffer.getSequence();
			if (sequence) {
				const char = MorseCodec.morseToText([sequence]);
				this.buffer.commitSequence();
				this.callbacks.onCharacter?.(sequence, char || '?');
			}
			this.buffer.addWordSeparator();
			this.callbacks.onWordSeparator?.();
			this.notifyBufferUpdate();
		}, wordGapDelay);
	}

	/**
	 * バッファ更新を通知する
	 */
	private notifyBufferUpdate(): void {
		const buffer = this.buffer.getBuffer();
		const sequences = buffer.trim().split(/\s+/);
		const decoded = MorseCodec.morseToText(sequences);
		this.callbacks.onBufferUpdate?.(buffer, decoded);
	}

	/**
	 * バッファとタイマーをクリアする
	 */
	clear(): void {
		this.buffer.clear();
		this.timer.clearAll();
		this.evaluations = [];
		this.notifyBufferUpdate();
	}

	/**
	 * 現在のモールス信号バッファを取得する
	 * @returns モールス信号文字列 (例: ".- -...")
	 */
	getBuffer(): string {
		return this.buffer.getBuffer();
	}

	/**
	 * 現在入力中のシーケンスを取得する
	 * @returns シーケンス文字列 (例: ".-")
	 */
	getSequence(): string {
		return this.buffer.getSequence();
	}

	/**
	 * 現在のバッファを解読した文字列を取得する
	 * @returns 解読された文字列 (例: "AB")
	 */
	getDecoded(): string {
		const buffer = this.buffer.getBuffer();
		const sequences = buffer.trim().split(/\s+/);
		return MorseCodec.morseToText(sequences);
	}

	/**
	 * キーが現在押されているかどうかを取得する
	 * @returns キーが押されている場合true
	 */
	isKeyDown(): boolean {
		return this.keyDown;
	}

	/**
	 * タイマーの状態を取得する（主にテスト用）
	 * @returns アクティブなタイマーの数
	 */
	getTimerCount(): number {
		return this.timer.count();
	}

	/**
	 * タイミング評価の統計情報を取得する
	 * @returns 統計情報
	 */
	getTimingStatistics(): TimingStatistics {
		return TimingEvaluator.calculateStatistics(this.evaluations);
	}

	/**
	 * 最近のN件のタイミング評価結果を取得する
	 * @param count - 取得する件数
	 * @returns タイミング評価結果の配列
	 */
	getRecentEvaluations(count: number): TimingEvaluation[] {
		return TimingEvaluator.getRecent(this.evaluations, count);
	}

	/**
	 * 全てのタイミング評価結果を取得する
	 * @returns タイミング評価結果の配列
	 */
	getAllEvaluations(): TimingEvaluation[] {
		return [...this.evaluations];
	}

	/**
	 * 要素タイプ（dot/dash）別の統計情報を取得する
	 * @returns dot/dash別の統計情報
	 */
	getStatisticsByElement(): {
		dot: TimingStatistics;
		dash: TimingStatistics;
	} {
		const classified = TimingEvaluator.classifyByElement(this.evaluations);
		return {
			dot: TimingEvaluator.calculateStatistics(classified.dot),
			dash: TimingEvaluator.calculateStatistics(classified.dash),
		};
	}
}
