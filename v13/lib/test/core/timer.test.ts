/**
 * timer.ts のユニットテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimerManager } from '../../src/core/timer';

describe('TimerManager', () => {
	let manager: TimerManager;

	beforeEach(() => {
		vi.useFakeTimers();
		manager = new TimerManager();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('初期状態', () => {
		it('初期状態でタイマー数が0である', () => {
			expect(manager.count()).toBe(0);
		});
	});

	describe('set()', () => {
		it('タイマーを設定できる', () => {
			const callback = vi.fn();
			manager.set('test', callback, 1000);

			expect(manager.has('test')).toBe(true);
			expect(manager.count()).toBe(1);
		});

		it('タイマーが指定時間後に実行される', () => {
			const callback = vi.fn();
			manager.set('test', callback, 1000);

			// まだ実行されていない
			expect(callback).not.toHaveBeenCalled();

			// 1000ms経過
			vi.advanceTimersByTime(1000);

			// 実行された
			expect(callback).toHaveBeenCalledTimes(1);
		});

		it('複数のタイマーを設定できる', () => {
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			manager.set('timer1', callback1, 1000);
			manager.set('timer2', callback2, 2000);

			expect(manager.count()).toBe(2);
			expect(manager.has('timer1')).toBe(true);
			expect(manager.has('timer2')).toBe(true);
		});

		it('同じ名前のタイマーを設定すると上書きされる', () => {
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			manager.set('test', callback1, 1000);
			manager.set('test', callback2, 2000);

			expect(manager.count()).toBe(1);

			// 1000ms経過してもcallback1は実行されない
			vi.advanceTimersByTime(1000);
			expect(callback1).not.toHaveBeenCalled();

			// 2000ms経過でcallback2が実行される
			vi.advanceTimersByTime(1000);
			expect(callback2).toHaveBeenCalledTimes(1);
		});
	});

	describe('clear()', () => {
		it('指定したタイマーをクリアできる', () => {
			const callback = vi.fn();
			manager.set('test', callback, 1000);

			manager.clear('test');

			expect(manager.has('test')).toBe(false);
			expect(manager.count()).toBe(0);

			// タイマーが実行されない
			vi.advanceTimersByTime(1000);
			expect(callback).not.toHaveBeenCalled();
		});

		it('存在しないタイマーをクリアしてもエラーにならない', () => {
			expect(() => manager.clear('nonexistent')).not.toThrow();
		});

		it('特定のタイマーのみをクリアできる', () => {
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			manager.set('timer1', callback1, 1000);
			manager.set('timer2', callback2, 2000);

			manager.clear('timer1');

			expect(manager.has('timer1')).toBe(false);
			expect(manager.has('timer2')).toBe(true);
			expect(manager.count()).toBe(1);
		});
	});

	describe('clearAll()', () => {
		it('全てのタイマーをクリアできる', () => {
			const callback1 = vi.fn();
			const callback2 = vi.fn();
			const callback3 = vi.fn();

			manager.set('timer1', callback1, 1000);
			manager.set('timer2', callback2, 2000);
			manager.set('timer3', callback3, 3000);

			manager.clearAll();

			expect(manager.count()).toBe(0);
			expect(manager.has('timer1')).toBe(false);
			expect(manager.has('timer2')).toBe(false);
			expect(manager.has('timer3')).toBe(false);

			// どのタイマーも実行されない
			vi.advanceTimersByTime(3000);
			expect(callback1).not.toHaveBeenCalled();
			expect(callback2).not.toHaveBeenCalled();
			expect(callback3).not.toHaveBeenCalled();
		});

		it('タイマーがない状態でclearAll()してもエラーにならない', () => {
			expect(() => manager.clearAll()).not.toThrow();
		});
	});

	describe('has()', () => {
		it('存在するタイマーに対してtrueを返す', () => {
			manager.set('test', () => {}, 1000);
			expect(manager.has('test')).toBe(true);
		});

		it('存在しないタイマーに対してfalseを返す', () => {
			expect(manager.has('nonexistent')).toBe(false);
		});

		it('クリアしたタイマーに対してfalseを返す', () => {
			manager.set('test', () => {}, 1000);
			manager.clear('test');
			expect(manager.has('test')).toBe(false);
		});
	});

	describe('count()', () => {
		it('管理中のタイマー数を返す', () => {
			expect(manager.count()).toBe(0);

			manager.set('timer1', () => {}, 1000);
			expect(manager.count()).toBe(1);

			manager.set('timer2', () => {}, 2000);
			expect(manager.count()).toBe(2);

			manager.clear('timer1');
			expect(manager.count()).toBe(1);

			manager.clearAll();
			expect(manager.count()).toBe(0);
		});
	});

	describe('統合テスト', () => {
		it('複数のタイマーが独立して動作する', () => {
			const callback1 = vi.fn();
			const callback2 = vi.fn();
			const callback3 = vi.fn();

			manager.set('timer1', callback1, 1000);
			manager.set('timer2', callback2, 2000);
			manager.set('timer3', callback3, 3000);

			// 1000ms経過
			vi.advanceTimersByTime(1000);
			expect(callback1).toHaveBeenCalledTimes(1);
			expect(callback2).not.toHaveBeenCalled();
			expect(callback3).not.toHaveBeenCalled();

			// 2000ms経過
			vi.advanceTimersByTime(1000);
			expect(callback1).toHaveBeenCalledTimes(1);
			expect(callback2).toHaveBeenCalledTimes(1);
			expect(callback3).not.toHaveBeenCalled();

			// 3000ms経過
			vi.advanceTimersByTime(1000);
			expect(callback1).toHaveBeenCalledTimes(1);
			expect(callback2).toHaveBeenCalledTimes(1);
			expect(callback3).toHaveBeenCalledTimes(1);
		});

		it('タイマー実行後に同じ名前で再設定できる', () => {
			const callback = vi.fn();

			manager.set('test', callback, 1000);
			vi.advanceTimersByTime(1000);
			expect(callback).toHaveBeenCalledTimes(1);

			// 再設定
			manager.set('test', callback, 1000);
			vi.advanceTimersByTime(1000);
			expect(callback).toHaveBeenCalledTimes(2);
		});

		it('CharGapとWordGapのシナリオ', () => {
			const charGapCallback = vi.fn();
			const wordGapCallback = vi.fn();

			// charGap: 240ms, wordGap: 420ms のシナリオ
			manager.set('charGap', charGapCallback, 240);
			manager.set('wordGap', wordGapCallback, 420);

			// 240ms経過 - charGapが実行される
			vi.advanceTimersByTime(240);
			expect(charGapCallback).toHaveBeenCalledTimes(1);
			expect(wordGapCallback).not.toHaveBeenCalled();

			// 420ms経過 - wordGapが実行される
			vi.advanceTimersByTime(180);
			expect(charGapCallback).toHaveBeenCalledTimes(1);
			expect(wordGapCallback).toHaveBeenCalledTimes(1);
		});
	});
});
