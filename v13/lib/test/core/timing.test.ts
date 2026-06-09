/**
 * timing.ts のユニットテスト
 */

import { describe, it, expect } from 'vitest';
import { TimingCalculator } from '../../src/core/timing';

describe('TimingCalculator', () => {
	describe('calculate()', () => {
		it('WPM=20でタイミングを正しく計算する', () => {
			const timings = TimingCalculator.calculate(20);

			expect(timings.dot).toBe(60);
			expect(timings.dash).toBe(180);
			expect(timings.elementGap).toBe(60);
			expect(timings.charGap).toBe(180);
			expect(timings.wordGap).toBe(420);
		});

		it('WPM=30でタイミングを正しく計算する', () => {
			const timings = TimingCalculator.calculate(30);

			expect(timings.dot).toBe(40);
			expect(timings.dash).toBe(120);
			expect(timings.elementGap).toBe(40);
			expect(timings.charGap).toBe(120);
			expect(timings.wordGap).toBe(280);
		});

		it('WPM=10でタイミングを正しく計算する', () => {
			const timings = TimingCalculator.calculate(10);

			expect(timings.dot).toBe(120);
			expect(timings.dash).toBe(360);
			expect(timings.elementGap).toBe(120);
			expect(timings.charGap).toBe(360);
			expect(timings.wordGap).toBe(840);
		});

		it('shortenGaps=trueでギャップを10%短縮する', () => {
			const timings = TimingCalculator.calculate(20, { shortenGaps: true });

			expect(timings.dot).toBe(60);
			expect(timings.dash).toBe(180);
			expect(timings.elementGap).toBe(60);
			// 180 * 0.9 = 162
			expect(timings.charGap).toBe(162);
			// 420 * 0.9 = 378
			expect(timings.wordGap).toBe(378);
		});

		it('0以下のWPMでエラーをthrowする', () => {
			expect(() => TimingCalculator.calculate(0)).toThrow('Invalid WPM value: 0');
			expect(() => TimingCalculator.calculate(-5)).toThrow('Invalid WPM value: -5');
		});

		it('小数点のWPMでも計算できる', () => {
			const timings = TimingCalculator.calculate(25.5);

			// 1200 / 25.5 ≈ 47.06
			expect(timings.dot).toBeCloseTo(47.06, 2);
			expect(timings.dash).toBeCloseTo(141.18, 2);
		});
	});

	describe('getCharGapDelay()', () => {
		it('文字確定までの待機時間を計算する', () => {
			const timings = TimingCalculator.calculate(20);
			const delay = TimingCalculator.getCharGapDelay(timings);

			// unit * 4 = 60 * 4 = 240
			expect(delay).toBe(240);
		});

		it('shortenGaps=trueの場合も正しく計算する', () => {
			const timings = TimingCalculator.calculate(20, { shortenGaps: true });
			const delay = TimingCalculator.getCharGapDelay(timings);

			// unit * 4 * 0.9 = 60 * 4 * 0.9 = 216
			expect(delay).toBe(216);
		});
	});

	describe('getWordGapDelay()', () => {
		it('語間スペース確定までの待機時間を取得する', () => {
			const timings = TimingCalculator.calculate(20);
			const delay = TimingCalculator.getWordGapDelay(timings);

			expect(delay).toBe(420);
		});

		it('shortenGaps=trueの場合も正しく計算する', () => {
			const timings = TimingCalculator.calculate(20, { shortenGaps: true });
			const delay = TimingCalculator.getWordGapDelay(timings);

			// 420 * 0.9 = 378
			expect(delay).toBe(378);
		});
	});

	describe('classifyElement()', () => {
		it('短い押下時間をdotと判定する', () => {
			const dotDuration = 60;

			expect(TimingCalculator.classifyElement(30, dotDuration)).toBe('.');
			expect(TimingCalculator.classifyElement(50, dotDuration)).toBe('.');
			expect(TimingCalculator.classifyElement(60, dotDuration)).toBe('.');
		});

		it('長い押下時間をdashと判定する', () => {
			const dotDuration = 60;

			// 閾値は 60 * 1.5 = 90
			expect(TimingCalculator.classifyElement(90, dotDuration)).toBe('-');
			expect(TimingCalculator.classifyElement(100, dotDuration)).toBe('-');
			expect(TimingCalculator.classifyElement(150, dotDuration)).toBe('-');
			expect(TimingCalculator.classifyElement(180, dotDuration)).toBe('-');
		});

		it('閾値付近の判定が正しい', () => {
			const dotDuration = 60;
			const threshold = 90; // 60 * 1.5

			// 閾値未満はdot
			expect(TimingCalculator.classifyElement(89, dotDuration)).toBe('.');
			// 閾値以上はdash
			expect(TimingCalculator.classifyElement(90, dotDuration)).toBe('-');
		});

		it('異なるWPMでも正しく判定する', () => {
			// WPM=30の場合、dot=40ms
			const dotDuration = 40;
			const threshold = 60; // 40 * 1.5

			expect(TimingCalculator.classifyElement(30, dotDuration)).toBe('.');
			expect(TimingCalculator.classifyElement(59, dotDuration)).toBe('.');
			expect(TimingCalculator.classifyElement(60, dotDuration)).toBe('-');
			expect(TimingCalculator.classifyElement(120, dotDuration)).toBe('-');
		});
	});
});
