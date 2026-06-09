/**
 * timing-evaluator.ts のユニットテスト
 */

import { describe, it, expect } from 'vitest';
import { TimingEvaluator } from '../../src/core/timing-evaluator';
import { TimingCalculator } from '../../src/core/timing.js';

describe('TimingEvaluator', () => {
	describe('createRecord()', () => {
		it('dot要素のレコードを正しく作成する', () => {
			const timings = TimingCalculator.calculate(20);
			const record = TimingEvaluator.createRecord('.', 58, timings, 1000);

			expect(record.element).toBe('.');
			expect(record.actualDuration).toBe(58);
			expect(record.expectedDuration).toBe(60); // 20 WPMのdot時間
			expect(record.timestamp).toBe(1000);
		});

		it('dash要素のレコードを正しく作成する', () => {
			const timings = TimingCalculator.calculate(20);
			const record = TimingEvaluator.createRecord('-', 175, timings, 2000);

			expect(record.element).toBe('-');
			expect(record.actualDuration).toBe(175);
			expect(record.expectedDuration).toBe(180); // 20 WPMのdash時間
			expect(record.timestamp).toBe(2000);
		});

		it('timestampが省略された場合は現在時刻を使用する', () => {
			const timings = TimingCalculator.calculate(20);
			const before = Date.now();
			const record = TimingEvaluator.createRecord('.', 60, timings);
			const after = Date.now();

			expect(record.timestamp).toBeGreaterThanOrEqual(before);
			expect(record.timestamp).toBeLessThanOrEqual(after);
		});
	});

	describe('evaluate()', () => {
		it('完璧な精度（100%）を計算する', () => {
			const timings = TimingCalculator.calculate(20);
			const record = TimingEvaluator.createRecord('.', 60, timings);
			const evaluation = TimingEvaluator.evaluate(record);

			expect(evaluation.absoluteError).toBe(0);
			expect(evaluation.relativeError).toBe(0);
			expect(evaluation.accuracy).toBe(100);
		});

		it('誤差がある場合の精度を計算する（dotが短い）', () => {
			const timings = TimingCalculator.calculate(20);
			const record = TimingEvaluator.createRecord('.', 58, timings);
			const evaluation = TimingEvaluator.evaluate(record);

			expect(evaluation.absoluteError).toBe(2);
			// (2 / 60) * 100 ≈ 3.33%
			expect(evaluation.relativeError).toBeCloseTo(3.33, 2);
			// 100 - 3.33 = 96.67%
			expect(evaluation.accuracy).toBeCloseTo(96.67, 2);
		});

		it('誤差がある場合の精度を計算する（dotが長い）', () => {
			const timings = TimingCalculator.calculate(20);
			const record = TimingEvaluator.createRecord('.', 72, timings);
			const evaluation = TimingEvaluator.evaluate(record);

			expect(evaluation.absoluteError).toBe(12);
			// (12 / 60) * 100 = 20%
			expect(evaluation.relativeError).toBe(20);
			// 100 - 20 = 80%
			expect(evaluation.accuracy).toBe(80);
		});

		it('誤差がある場合の精度を計算する（dashが短い）', () => {
			const timings = TimingCalculator.calculate(20);
			const record = TimingEvaluator.createRecord('-', 170, timings);
			const evaluation = TimingEvaluator.evaluate(record);

			expect(evaluation.absoluteError).toBe(10);
			// (10 / 180) * 100 ≈ 5.56%
			expect(evaluation.relativeError).toBeCloseTo(5.56, 2);
			// 100 - 5.56 = 94.44%
			expect(evaluation.accuracy).toBeCloseTo(94.44, 2);
		});

		it('精度が負にならないようにする（誤差が100%を超える場合）', () => {
			const timings = TimingCalculator.calculate(20);
			const record = TimingEvaluator.createRecord('.', 200, timings);
			const evaluation = TimingEvaluator.evaluate(record);

			expect(evaluation.absoluteError).toBe(140);
			// (140 / 60) * 100 ≈ 233.33%
			expect(evaluation.relativeError).toBeCloseTo(233.33, 2);
			// 精度は0%に制限される
			expect(evaluation.accuracy).toBe(0);
		});
	});

	describe('calculateStatistics()', () => {
		it('空配列の場合は全て0を返す', () => {
			const stats = TimingEvaluator.calculateStatistics([]);

			expect(stats.count).toBe(0);
			expect(stats.averageAccuracy).toBe(0);
			expect(stats.averageAbsoluteError).toBe(0);
			expect(stats.averageRelativeError).toBe(0);
			expect(stats.maxAccuracy).toBe(0);
			expect(stats.minAccuracy).toBe(0);
			expect(stats.standardDeviation).toBe(0);
		});

		it('単一要素の統計を正しく計算する', () => {
			const timings = TimingCalculator.calculate(20);
			const record = TimingEvaluator.createRecord('.', 58, timings);
			const evaluation = TimingEvaluator.evaluate(record);
			const stats = TimingEvaluator.calculateStatistics([evaluation]);

			expect(stats.count).toBe(1);
			expect(stats.averageAccuracy).toBeCloseTo(96.67, 2);
			expect(stats.averageAbsoluteError).toBe(2);
			expect(stats.averageRelativeError).toBeCloseTo(3.33, 2);
			expect(stats.maxAccuracy).toBeCloseTo(96.67, 2);
			expect(stats.minAccuracy).toBeCloseTo(96.67, 2);
			expect(stats.standardDeviation).toBe(0); // 単一要素なので標準偏差は0
		});

		it('複数要素の統計を正しく計算する', () => {
			const timings = TimingCalculator.calculate(20);
			const records = [
				TimingEvaluator.createRecord('.', 60, timings), // 100%
				TimingEvaluator.createRecord('.', 58, timings), // 96.67%
				TimingEvaluator.createRecord('.', 62, timings), // 96.67%
				TimingEvaluator.createRecord('-', 180, timings), // 100%
			];
			const evaluations = records.map((r) => TimingEvaluator.evaluate(r));
			const stats = TimingEvaluator.calculateStatistics(evaluations);

			expect(stats.count).toBe(4);
			// (100 + 96.67 + 96.67 + 100) / 4 ≈ 98.33%
			expect(stats.averageAccuracy).toBeCloseTo(98.33, 2);
			// (0 + 2 + 2 + 0) / 4 = 1
			expect(stats.averageAbsoluteError).toBe(1);
			// (0 + 3.33 + 3.33 + 0) / 4 ≈ 1.67%
			expect(stats.averageRelativeError).toBeCloseTo(1.67, 2);
			expect(stats.maxAccuracy).toBe(100);
			expect(stats.minAccuracy).toBeCloseTo(96.67, 2);
			// 標準偏差の計算
			// 分散 = ((100-98.33)^2 + (96.67-98.33)^2 + (96.67-98.33)^2 + (100-98.33)^2) / 4
			// 分散 ≈ 2.78
			// 標準偏差 ≈ 1.67
			expect(stats.standardDeviation).toBeCloseTo(1.67, 1);
		});

		it('誤差のバリエーションが大きい場合の統計を計算する', () => {
			const timings = TimingCalculator.calculate(20);
			const records = [
				TimingEvaluator.createRecord('.', 60, timings), // 100%
				TimingEvaluator.createRecord('.', 72, timings), // 80%
				TimingEvaluator.createRecord('.', 48, timings), // 80%
				TimingEvaluator.createRecord('-', 150, timings), // 83.33%
			];
			const evaluations = records.map((r) => TimingEvaluator.evaluate(r));
			const stats = TimingEvaluator.calculateStatistics(evaluations);

			expect(stats.count).toBe(4);
			// (100 + 80 + 80 + 83.33) / 4 ≈ 85.83%
			expect(stats.averageAccuracy).toBeCloseTo(85.83, 1);
			expect(stats.maxAccuracy).toBe(100);
			expect(stats.minAccuracy).toBe(80);
			// 標準偏差は約8.8
			expect(stats.standardDeviation).toBeGreaterThan(8);
			expect(stats.standardDeviation).toBeLessThan(10);
		});
	});

	describe('classifyByElement()', () => {
		it('dot/dash要素を正しく分類する', () => {
			const timings = TimingCalculator.calculate(20);
			const records = [
				TimingEvaluator.createRecord('.', 60, timings),
				TimingEvaluator.createRecord('-', 180, timings),
				TimingEvaluator.createRecord('.', 58, timings),
				TimingEvaluator.createRecord('-', 175, timings),
				TimingEvaluator.createRecord('.', 62, timings),
			];
			const evaluations = records.map((r) => TimingEvaluator.evaluate(r));
			const classified = TimingEvaluator.classifyByElement(evaluations);

			expect(classified.dot.length).toBe(3);
			expect(classified.dash.length).toBe(2);
			expect(classified.dot[0].record.element).toBe('.');
			expect(classified.dash[0].record.element).toBe('-');
		});

		it('空配列の場合は両方とも空配列を返す', () => {
			const classified = TimingEvaluator.classifyByElement([]);

			expect(classified.dot.length).toBe(0);
			expect(classified.dash.length).toBe(0);
		});

		it('dot要素のみの場合', () => {
			const timings = TimingCalculator.calculate(20);
			const records = [
				TimingEvaluator.createRecord('.', 60, timings),
				TimingEvaluator.createRecord('.', 58, timings),
			];
			const evaluations = records.map((r) => TimingEvaluator.evaluate(r));
			const classified = TimingEvaluator.classifyByElement(evaluations);

			expect(classified.dot.length).toBe(2);
			expect(classified.dash.length).toBe(0);
		});

		it('dash要素のみの場合', () => {
			const timings = TimingCalculator.calculate(20);
			const records = [
				TimingEvaluator.createRecord('-', 180, timings),
				TimingEvaluator.createRecord('-', 175, timings),
			];
			const evaluations = records.map((r) => TimingEvaluator.evaluate(r));
			const classified = TimingEvaluator.classifyByElement(evaluations);

			expect(classified.dot.length).toBe(0);
			expect(classified.dash.length).toBe(2);
		});
	});

	describe('getRecent()', () => {
		it('最近のN件を取得する', () => {
			const timings = TimingCalculator.calculate(20);
			const records = [
				TimingEvaluator.createRecord('.', 60, timings, 1000),
				TimingEvaluator.createRecord('.', 58, timings, 2000),
				TimingEvaluator.createRecord('-', 180, timings, 3000),
				TimingEvaluator.createRecord('.', 62, timings, 4000),
				TimingEvaluator.createRecord('-', 175, timings, 5000),
			];
			const evaluations = records.map((r) => TimingEvaluator.evaluate(r));
			const recent = TimingEvaluator.getRecent(evaluations, 3);

			expect(recent.length).toBe(3);
			// 新しい順にソートされている
			expect(recent[0].record.timestamp).toBe(5000);
			expect(recent[1].record.timestamp).toBe(4000);
			expect(recent[2].record.timestamp).toBe(3000);
		});

		it('countが0以下の場合は空配列を返す', () => {
			const timings = TimingCalculator.calculate(20);
			const records = [TimingEvaluator.createRecord('.', 60, timings, 1000)];
			const evaluations = records.map((r) => TimingEvaluator.evaluate(r));

			expect(TimingEvaluator.getRecent(evaluations, 0).length).toBe(0);
			expect(TimingEvaluator.getRecent(evaluations, -1).length).toBe(0);
		});

		it('countが要素数より多い場合は全要素を返す', () => {
			const timings = TimingCalculator.calculate(20);
			const records = [
				TimingEvaluator.createRecord('.', 60, timings, 1000),
				TimingEvaluator.createRecord('.', 58, timings, 2000),
			];
			const evaluations = records.map((r) => TimingEvaluator.evaluate(r));
			const recent = TimingEvaluator.getRecent(evaluations, 10);

			expect(recent.length).toBe(2);
		});

		it('空配列の場合は空配列を返す', () => {
			const recent = TimingEvaluator.getRecent([], 5);

			expect(recent.length).toBe(0);
		});
	});

	describe('getByTimeRange()', () => {
		it('期間内の評価結果を取得する', () => {
			const timings = TimingCalculator.calculate(20);
			const records = [
				TimingEvaluator.createRecord('.', 60, timings, 1000),
				TimingEvaluator.createRecord('.', 58, timings, 2000),
				TimingEvaluator.createRecord('-', 180, timings, 3000),
				TimingEvaluator.createRecord('.', 62, timings, 4000),
				TimingEvaluator.createRecord('-', 175, timings, 5000),
			];
			const evaluations = records.map((r) => TimingEvaluator.evaluate(r));
			const filtered = TimingEvaluator.getByTimeRange(evaluations, 2000, 4000);

			expect(filtered.length).toBe(3);
			expect(filtered[0].record.timestamp).toBe(2000);
			expect(filtered[1].record.timestamp).toBe(3000);
			expect(filtered[2].record.timestamp).toBe(4000);
		});

		it('endTimeが省略された場合は現在時刻を使用する', () => {
			const timings = TimingCalculator.calculate(20);
			const records = [
				TimingEvaluator.createRecord('.', 60, timings, 1000),
				TimingEvaluator.createRecord('.', 58, timings, 2000),
			];
			const evaluations = records.map((r) => TimingEvaluator.evaluate(r));
			const filtered = TimingEvaluator.getByTimeRange(evaluations, 1000);

			// 現在時刻までの範囲なので、全要素が含まれる
			expect(filtered.length).toBe(2);
		});

		it('範囲外の場合は空配列を返す', () => {
			const timings = TimingCalculator.calculate(20);
			const records = [
				TimingEvaluator.createRecord('.', 60, timings, 1000),
				TimingEvaluator.createRecord('.', 58, timings, 2000),
			];
			const evaluations = records.map((r) => TimingEvaluator.evaluate(r));
			const filtered = TimingEvaluator.getByTimeRange(evaluations, 3000, 4000);

			expect(filtered.length).toBe(0);
		});

		it('境界値が正しく処理される', () => {
			const timings = TimingCalculator.calculate(20);
			const records = [
				TimingEvaluator.createRecord('.', 60, timings, 1000),
				TimingEvaluator.createRecord('.', 58, timings, 2000),
				TimingEvaluator.createRecord('-', 180, timings, 3000),
			];
			const evaluations = records.map((r) => TimingEvaluator.evaluate(r));

			// startTimeとendTimeは境界値を含む
			const filtered = TimingEvaluator.getByTimeRange(evaluations, 2000, 3000);
			expect(filtered.length).toBe(2);
			expect(filtered[0].record.timestamp).toBe(2000);
			expect(filtered[1].record.timestamp).toBe(3000);
		});
	});
});
