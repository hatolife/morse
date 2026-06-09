/**
 * vertical-key.ts のユニットテスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { VerticalKeyTrainer, VerticalKeyCallbacks } from '../../src/trainers/vertical-key';
import { MorseBuffer } from '../../src/core/buffer';
import { TimerManager } from '../../src/core/timer';
import { TimingCalculator, MorseTimings } from '../../src/core/timing';

describe('VerticalKeyTrainer', () => {
	let trainer: VerticalKeyTrainer;
	let buffer: MorseBuffer;
	let timer: TimerManager;
	let timings: MorseTimings;
	let callbacks: VerticalKeyCallbacks;

	beforeEach(() => {
		buffer = new MorseBuffer();
		timer = new TimerManager();
		timings = TimingCalculator.calculate(20);
		callbacks = {
			onKeyPress: vi.fn(),
			onKeyRelease: vi.fn(),
			onSequenceUpdate: vi.fn(),
			onCharacter: vi.fn(),
			onWordSeparator: vi.fn(),
			onBufferUpdate: vi.fn(),
			onTimingEvaluated: vi.fn(),
		};
		trainer = new VerticalKeyTrainer(buffer, timer, timings, callbacks);
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('コンストラクタと初期状態', () => {
		it('初期状態ではキーが押されていない', () => {
			expect(trainer.isKeyDown()).toBe(false);
		});

		it('初期状態ではバッファが空', () => {
			expect(trainer.getBuffer()).toBe('');
			expect(trainer.getSequence()).toBe('');
			expect(trainer.getDecoded()).toBe('');
		});

		it('初期状態ではタイマーが0個', () => {
			expect(trainer.getTimerCount()).toBe(0);
		});
	});

	describe('keyPress()', () => {
		it('キーを押すとisKeyDown()がtrueになる', () => {
			trainer.keyPress();
			expect(trainer.isKeyDown()).toBe(true);
		});

		it('onKeyPressコールバックが呼ばれる', () => {
			trainer.keyPress();
			expect(callbacks.onKeyPress).toHaveBeenCalledTimes(1);
		});

		it('連続して押しても状態は変わらない', () => {
			trainer.keyPress();
			trainer.keyPress();
			expect(trainer.isKeyDown()).toBe(true);
			expect(callbacks.onKeyPress).toHaveBeenCalledTimes(1);
		});

		it('既存のタイマーがクリアされる', () => {
			// 事前にタイマーを設定
			timer.set('test', () => {}, 1000);
			expect(trainer.getTimerCount()).toBe(1);

			trainer.keyPress();
			expect(trainer.getTimerCount()).toBe(0);
		});
	});

	describe('keyRelease()', () => {
		it('キーを離すとisKeyDown()がfalseになる', () => {
			trainer.keyPress();
			vi.advanceTimersByTime(50); // 短い時間
			trainer.keyRelease();
			expect(trainer.isKeyDown()).toBe(false);
		});

		it('短い押下でdot(".")が追加される', () => {
			trainer.keyPress();
			vi.advanceTimersByTime(50); // timings.dot (60ms) より短い
			trainer.keyRelease();
			expect(trainer.getSequence()).toBe('.');
		});

		it('長い押下でdash("-")が追加される', () => {
			trainer.keyPress();
			vi.advanceTimersByTime(200); // timings.dot * 2 (120ms) より長い
			trainer.keyRelease();
			expect(trainer.getSequence()).toBe('-');
		});

		it('onKeyReleaseコールバックが呼ばれる（dot）', () => {
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			expect(callbacks.onKeyRelease).toHaveBeenCalledWith('.');
		});

		it('onKeyReleaseコールバックが呼ばれる（dash）', () => {
			trainer.keyPress();
			vi.advanceTimersByTime(200);
			trainer.keyRelease();
			expect(callbacks.onKeyRelease).toHaveBeenCalledWith('-');
		});

		it('onSequenceUpdateコールバックが呼ばれる', () => {
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			expect(callbacks.onSequenceUpdate).toHaveBeenCalledWith('.');
		});

		it('onBufferUpdateコールバックが呼ばれる', () => {
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			expect(callbacks.onBufferUpdate).toHaveBeenCalled();
		});

		it('文字確定タイマーと語間スペースタイマーが設定される', () => {
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			expect(trainer.getTimerCount()).toBe(2); // charGap + wordGap
		});

		it('キーが押されていない状態でkeyRelease()を呼んでも何もしない', () => {
			trainer.keyRelease();
			expect(callbacks.onKeyRelease).not.toHaveBeenCalled();
			expect(trainer.getSequence()).toBe('');
		});
	});

	describe('文字確定タイマー', () => {
		it('charGap経過後に文字が確定する', () => {
			// "A" (.-) を入力
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			expect(trainer.getSequence()).toBe('.');

			trainer.keyPress();
			vi.advanceTimersByTime(200);
			trainer.keyRelease();
			expect(trainer.getSequence()).toBe('.-');

			// charGap経過
			vi.advanceTimersByTime(timings.charGap);
			expect(trainer.getSequence()).toBe('');
			expect(trainer.getBuffer()).toContain('.-');
		});

		it('onCharacterコールバックが呼ばれる', () => {
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			expect(trainer.getSequence()).toBe('.');

			// charGap経過
			vi.advanceTimersByTime(timings.charGap);
			expect(callbacks.onCharacter).toHaveBeenCalledWith('.', 'E');
		});
	});

	describe('語間スペースタイマー', () => {
		it('wordGap経過後に語間スペースが追加される', () => {
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();

			// wordGap経過
			vi.advanceTimersByTime(timings.wordGap);
			expect(trainer.getBuffer()).toContain('/');
		});

		it('onWordSeparatorコールバックが呼ばれる', () => {
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();

			// wordGap経過
			vi.advanceTimersByTime(timings.wordGap);
			expect(callbacks.onWordSeparator).toHaveBeenCalled();
		});

		it('wordGap経過前にシーケンスがある場合、文字確定してから語間スペースが追加される', () => {
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			expect(trainer.getSequence()).toBe('.');

			// wordGap経過
			vi.advanceTimersByTime(timings.wordGap);
			expect(trainer.getSequence()).toBe('');
			expect(trainer.getBuffer()).toBe('. / ');
		});
	});

	describe('clear()', () => {
		it('バッファをクリアする', () => {
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			expect(trainer.getSequence()).toBe('.');

			trainer.clear();
			expect(trainer.getBuffer()).toBe('');
			expect(trainer.getSequence()).toBe('');
		});

		it('タイマーをクリアする', () => {
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			expect(trainer.getTimerCount()).toBe(2);

			trainer.clear();
			expect(trainer.getTimerCount()).toBe(0);
		});

		it('onBufferUpdateコールバックが呼ばれる', () => {
			vi.clearAllMocks();
			trainer.clear();
			expect(callbacks.onBufferUpdate).toHaveBeenCalledWith('', '');
		});
	});

	describe('getBuffer()', () => {
		it('現在のバッファを返す', () => {
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			trainer.keyPress();
			vi.advanceTimersByTime(200);
			trainer.keyRelease();

			// 文字確定タイマー待ち
			vi.advanceTimersByTime(timings.charGap);

			const buffer = trainer.getBuffer();
			expect(buffer).toContain('.-');
		});
	});

	describe('getSequence()', () => {
		it('現在入力中のシーケンスを返す', () => {
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			expect(trainer.getSequence()).toBe('.');

			trainer.keyPress();
			vi.advanceTimersByTime(200);
			trainer.keyRelease();
			expect(trainer.getSequence()).toBe('.-');
		});

		it('文字確定後は空文字列を返す', () => {
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			vi.advanceTimersByTime(timings.charGap);
			expect(trainer.getSequence()).toBe('');
		});
	});

	describe('getDecoded()', () => {
		it('バッファを解読した文字列を返す', () => {
			// "A" (.-) を入力
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			trainer.keyPress();
			vi.advanceTimersByTime(200);
			trainer.keyRelease();
			vi.advanceTimersByTime(timings.charGap);

			expect(trainer.getDecoded()).toBe('A');
		});

		it('複数文字を解読する', () => {
			// "A" (.-) を入力
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			trainer.keyPress();
			vi.advanceTimersByTime(200);
			trainer.keyRelease();
			vi.advanceTimersByTime(timings.charGap);

			// "B" (-...) を入力
			trainer.keyPress();
			vi.advanceTimersByTime(200);
			trainer.keyRelease();
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			vi.advanceTimersByTime(timings.charGap);

			expect(trainer.getDecoded()).toBe('AB');
		});
	});

	describe('統合テスト', () => {
		it('SOS信号を正しく入力できる', () => {
			// S (...)
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			vi.advanceTimersByTime(timings.charGap);

			// O (---)
			trainer.keyPress();
			vi.advanceTimersByTime(200);
			trainer.keyRelease();
			trainer.keyPress();
			vi.advanceTimersByTime(200);
			trainer.keyRelease();
			trainer.keyPress();
			vi.advanceTimersByTime(200);
			trainer.keyRelease();
			vi.advanceTimersByTime(timings.charGap);

			// S (...)
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			vi.advanceTimersByTime(timings.charGap);

			expect(trainer.getDecoded()).toBe('SOS');
		});

		it('語間スペースを含む信号を正しく入力できる', () => {
			// "A" (.-) を入力
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			trainer.keyPress();
			vi.advanceTimersByTime(200);
			trainer.keyRelease();

			// wordGap経過（語間スペース）
			vi.advanceTimersByTime(timings.wordGap);

			// "B" (-...) を入力
			trainer.keyPress();
			vi.advanceTimersByTime(200);
			trainer.keyRelease();
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			vi.advanceTimersByTime(timings.charGap);

			expect(trainer.getDecoded()).toBe('A B');
		});

		it('全てのコールバックが適切に呼ばれる', () => {
			vi.clearAllMocks();

			// "A" (.-) を入力
			trainer.keyPress();
			expect(callbacks.onKeyPress).toHaveBeenCalledTimes(1);

			vi.advanceTimersByTime(50);
			trainer.keyRelease();
			expect(callbacks.onKeyRelease).toHaveBeenCalledWith('.');
			expect(callbacks.onSequenceUpdate).toHaveBeenCalledWith('.');
			expect(callbacks.onBufferUpdate).toHaveBeenCalled();

			trainer.keyPress();
			expect(callbacks.onKeyPress).toHaveBeenCalledTimes(2);

			vi.advanceTimersByTime(200);
			trainer.keyRelease();
			expect(callbacks.onKeyRelease).toHaveBeenCalledWith('-');
			expect(callbacks.onSequenceUpdate).toHaveBeenCalledWith('.-');

			// charGap経過で文字確定
			vi.clearAllMocks();
			vi.advanceTimersByTime(timings.charGap);
			expect(callbacks.onCharacter).toHaveBeenCalledWith('.-', 'A');
			expect(callbacks.onBufferUpdate).toHaveBeenCalled();

			// wordGap経過で語間スペース
			vi.clearAllMocks();
			vi.advanceTimersByTime(timings.wordGap - timings.charGap);
			expect(callbacks.onWordSeparator).toHaveBeenCalled();
			expect(callbacks.onBufferUpdate).toHaveBeenCalled();
		});
	});

	describe('境界値テスト', () => {
		it('dot/dashの閾値ちょうどでdashと判定される', () => {
			const threshold = timings.dot * 2; // 120ms (WPM=20の場合)

			trainer.keyPress();
			vi.advanceTimersByTime(threshold);
			trainer.keyRelease();

			// threshold以上はdash
			expect(trainer.getSequence()).toBe('-');
		});

		it('dot/dashの閾値-1msでdotと判定される', () => {
			const threshold = timings.dot * 2; // 120ms

			trainer.keyPress();
			vi.advanceTimersByTime(threshold - 1);
			trainer.keyRelease();

			expect(trainer.getSequence()).toBe('.');
		});
	});

	describe('コールバックなしでの動作', () => {
		it('コールバックなしでも正常に動作する', () => {
			const trainerNoCallback = new VerticalKeyTrainer(
				new MorseBuffer(),
				new TimerManager(),
				timings
			);

			expect(() => {
				trainerNoCallback.keyPress();
				vi.advanceTimersByTime(50);
				trainerNoCallback.keyRelease();
				vi.advanceTimersByTime(timings.charGap);
			}).not.toThrow();
		});
	});

	describe('タイミング評価機能', () => {
		it('onTimingEvaluatedコールバックが呼ばれる', () => {
			vi.clearAllMocks();
			trainer.keyPress();
			vi.advanceTimersByTime(50);
			trainer.keyRelease();

			expect(callbacks.onTimingEvaluated).toHaveBeenCalledTimes(1);
			const evaluation = (callbacks.onTimingEvaluated as any).mock.calls[0][0];
			expect(evaluation).toHaveProperty('accuracy');
			expect(evaluation).toHaveProperty('absoluteError');
			expect(evaluation).toHaveProperty('relativeError');
		});

		it('タイミング評価結果を正しく記録する', () => {
			trainer.keyPress();
			vi.advanceTimersByTime(60); // 理論値通り
			trainer.keyRelease();

			const evaluations = trainer.getAllEvaluations();
			expect(evaluations.length).toBe(1);
			expect(evaluations[0].record.element).toBe('.');
			expect(evaluations[0].record.actualDuration).toBe(60);
			expect(evaluations[0].record.expectedDuration).toBe(60);
			expect(evaluations[0].accuracy).toBe(100);
		});

		it('複数の入力を記録する', () => {
			// dot
			trainer.keyPress();
			vi.advanceTimersByTime(58);
			trainer.keyRelease();

			// dash
			trainer.keyPress();
			vi.advanceTimersByTime(175);
			trainer.keyRelease();

			const evaluations = trainer.getAllEvaluations();
			expect(evaluations.length).toBe(2);
			expect(evaluations[0].record.element).toBe('.');
			expect(evaluations[1].record.element).toBe('-');
		});

		it('統計情報を正しく計算する', () => {
			// 3回の入力（全て精度100%）
			trainer.keyPress();
			vi.advanceTimersByTime(60);
			trainer.keyRelease();

			trainer.keyPress();
			vi.advanceTimersByTime(60);
			trainer.keyRelease();

			trainer.keyPress();
			vi.advanceTimersByTime(180);
			trainer.keyRelease();

			const stats = trainer.getTimingStatistics();
			expect(stats.count).toBe(3);
			expect(stats.averageAccuracy).toBe(100);
			expect(stats.averageAbsoluteError).toBe(0);
			expect(stats.maxAccuracy).toBe(100);
			expect(stats.minAccuracy).toBe(100);
		});

		it('精度が異なる入力の統計を計算する', () => {
			// dot (58ms、期待値60ms)
			trainer.keyPress();
			vi.advanceTimersByTime(58);
			trainer.keyRelease();

			// dot (72ms、期待値60ms)
			trainer.keyPress();
			vi.advanceTimersByTime(72);
			trainer.keyRelease();

			const stats = trainer.getTimingStatistics();
			expect(stats.count).toBe(2);
			// (96.67 + 80) / 2 ≈ 88.33
			expect(stats.averageAccuracy).toBeCloseTo(88.33, 1);
			expect(stats.maxAccuracy).toBeCloseTo(96.67, 1);
			expect(stats.minAccuracy).toBe(80);
		});

		it('要素タイプ別の統計を取得する', () => {
			// dot 3回
			trainer.keyPress();
			vi.advanceTimersByTime(60);
			trainer.keyRelease();

			trainer.keyPress();
			vi.advanceTimersByTime(58);
			trainer.keyRelease();

			trainer.keyPress();
			vi.advanceTimersByTime(62);
			trainer.keyRelease();

			// dash 2回
			trainer.keyPress();
			vi.advanceTimersByTime(180);
			trainer.keyRelease();

			trainer.keyPress();
			vi.advanceTimersByTime(175);
			trainer.keyRelease();

			const statsByElement = trainer.getStatisticsByElement();
			expect(statsByElement.dot.count).toBe(3);
			expect(statsByElement.dash.count).toBe(2);
		});

		it('最近のN件の評価結果を取得する', () => {
			// 5回の入力
			for (let i = 0; i < 5; i++) {
				trainer.keyPress();
				vi.advanceTimersByTime(60);
				trainer.keyRelease();
			}

			const recent = trainer.getRecentEvaluations(3);
			expect(recent.length).toBe(3);
			// 新しい順にソートされている
			expect(recent[0].record.timestamp).toBeGreaterThanOrEqual(
				recent[1].record.timestamp
			);
			expect(recent[1].record.timestamp).toBeGreaterThanOrEqual(
				recent[2].record.timestamp
			);
		});

		it('clear()で評価記録もクリアされる', () => {
			trainer.keyPress();
			vi.advanceTimersByTime(60);
			trainer.keyRelease();

			expect(trainer.getAllEvaluations().length).toBe(1);

			trainer.clear();
			expect(trainer.getAllEvaluations().length).toBe(0);

			const stats = trainer.getTimingStatistics();
			expect(stats.count).toBe(0);
		});

		it('評価記録が空の場合の統計情報', () => {
			const stats = trainer.getTimingStatistics();
			expect(stats.count).toBe(0);
			expect(stats.averageAccuracy).toBe(0);
			expect(stats.averageAbsoluteError).toBe(0);
			expect(stats.maxAccuracy).toBe(0);
			expect(stats.minAccuracy).toBe(0);
		});
	});
});
