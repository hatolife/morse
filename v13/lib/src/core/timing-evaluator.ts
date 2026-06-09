/**
 * モールス信号のタイミング評価ロジック
 * 実際の入力タイミングと理想的なタイミングを比較評価する
 * UI非依存のピュアなロジックモジュール
 */

import type { MorseTimings } from './timing.js';

/**
 * タイミングレコード
 * 単一のdot/dash入力に関する情報
 */
export interface TimingRecord {
	/** 入力された要素（'.' または '-'） */
	element: '.' | '-';
	/** 実際の押下時間（ミリ秒） */
	actualDuration: number;
	/** 期待される押下時間（ミリ秒） */
	expectedDuration: number;
	/** 入力時刻（エポックミリ秒） */
	timestamp: number;
}

/**
 * スペーシングタイプ
 * 要素間/文字間/単語間のスペースを区別する
 */
export type SpacingType = 'element' | 'character' | 'word';

/**
 * スペーシングレコード
 * 要素間/文字間/単語間のスペース（無入力期間）に関する情報
 */
export interface SpacingRecord {
	/** スペーシングタイプ */
	type: SpacingType;
	/** 実際のスペース時間（ミリ秒） */
	actualDuration: number;
	/** 期待されるスペース時間（ミリ秒） */
	expectedDuration: number;
	/** 記録時刻（エポックミリ秒） */
	timestamp: number;
}

/**
 * スペーシング評価結果
 */
export interface SpacingEvaluation {
	/** 元のレコード */
	record: SpacingRecord;
	/** 絶対誤差（ミリ秒） */
	absoluteError: number;
	/** 相対誤差（％） */
	relativeError: number;
	/** 精度（％、100 - relativeError） */
	accuracy: number;
}

/**
 * タイミング評価結果
 */
export interface TimingEvaluation {
	/** 元のレコード */
	record: TimingRecord;
	/** 絶対誤差（ミリ秒） */
	absoluteError: number;
	/** 相対誤差（％） */
	relativeError: number;
	/** 精度（％、100 - relativeError） */
	accuracy: number;
}

/**
 * 統計情報
 */
export interface TimingStatistics {
	/** 評価対象のレコード数 */
	count: number;
	/** 平均精度（％） */
	averageAccuracy: number;
	/** 平均絶対誤差（ミリ秒） */
	averageAbsoluteError: number;
	/** 平均相対誤差（％） */
	averageRelativeError: number;
	/** 最高精度（％） */
	maxAccuracy: number;
	/** 最低精度（％） */
	minAccuracy: number;
	/** 標準偏差（精度、％） */
	standardDeviation: number;
}

/**
 * タイミング評価クラス
 */
export class TimingEvaluator {
	/**
	 * タイミングレコードを作成する
	 *
	 * @param element - 入力された要素（'.' または '-'）
	 * @param actualDuration - 実際の押下時間（ミリ秒）
	 * @param timings - モールス信号のタイミング情報
	 * @param timestamp - 入力時刻（エポックミリ秒、省略時は現在時刻）
	 * @returns タイミングレコード
	 *
	 * @example
	 * ```ts
	 * const timings = TimingCalculator.calculate(20);
	 * const record = TimingEvaluator.createRecord('.', 58, timings);
	 * console.log(record.expectedDuration); // 60ms at 20 WPM
	 * ```
	 */
	static createRecord(
		element: '.' | '-',
		actualDuration: number,
		timings: MorseTimings,
		timestamp: number = Date.now(),
	): TimingRecord {
		const expectedDuration = element === '.' ? timings.dot : timings.dash;
		return {
			element,
			actualDuration,
			expectedDuration,
			timestamp,
		};
	}

	/**
	 * タイミングレコードを評価する
	 *
	 * @param record - タイミングレコード
	 * @returns タイミング評価結果
	 *
	 * @example
	 * ```ts
	 * const timings = TimingCalculator.calculate(20);
	 * const record = TimingEvaluator.createRecord('.', 58, timings);
	 * const evaluation = TimingEvaluator.evaluate(record);
	 * console.log(evaluation.accuracy); // 96.67%
	 * console.log(evaluation.absoluteError); // 2ms
	 * ```
	 */
	static evaluate(record: TimingRecord): TimingEvaluation {
		const absoluteError = Math.abs(record.actualDuration - record.expectedDuration);
		const relativeError = (absoluteError / record.expectedDuration) * 100;
		const accuracy = Math.max(0, 100 - relativeError);

		return {
			record,
			absoluteError,
			relativeError,
			accuracy,
		};
	}

	/**
	 * 複数の評価結果から統計情報を計算する
	 *
	 * @param evaluations - タイミング評価結果の配列
	 * @returns 統計情報
	 *
	 * @example
	 * ```ts
	 * const timings = TimingCalculator.calculate(20);
	 * const records = [
	 *   TimingEvaluator.createRecord('.', 58, timings),
	 *   TimingEvaluator.createRecord('.', 62, timings),
	 *   TimingEvaluator.createRecord('-', 178, timings),
	 * ];
	 * const evaluations = records.map(r => TimingEvaluator.evaluate(r));
	 * const stats = TimingEvaluator.calculateStatistics(evaluations);
	 * console.log(stats.averageAccuracy); // Average accuracy
	 * ```
	 */
	static calculateStatistics(evaluations: TimingEvaluation[]): TimingStatistics {
		if (evaluations.length === 0) {
			return {
				count: 0,
				averageAccuracy: 0,
				averageAbsoluteError: 0,
				averageRelativeError: 0,
				maxAccuracy: 0,
				minAccuracy: 0,
				standardDeviation: 0,
			};
		}

		const accuracies = evaluations.map((e) => e.accuracy);
		const absoluteErrors = evaluations.map((e) => e.absoluteError);
		const relativeErrors = evaluations.map((e) => e.relativeError);

		const averageAccuracy = accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length;
		const averageAbsoluteError =
			absoluteErrors.reduce((sum, e) => sum + e, 0) / absoluteErrors.length;
		const averageRelativeError =
			relativeErrors.reduce((sum, e) => sum + e, 0) / relativeErrors.length;

		const maxAccuracy = Math.max(...accuracies);
		const minAccuracy = Math.min(...accuracies);

		// 標準偏差を計算する
		const variance =
			accuracies.reduce((sum, a) => sum + Math.pow(a - averageAccuracy, 2), 0) /
			accuracies.length;
		const standardDeviation = Math.sqrt(variance);

		return {
			count: evaluations.length,
			averageAccuracy,
			averageAbsoluteError,
			averageRelativeError,
			maxAccuracy,
			minAccuracy,
			standardDeviation,
		};
	}

	/**
	 * 評価結果を要素タイプ（dot/dash）別に分類する
	 *
	 * @param evaluations - タイミング評価結果の配列
	 * @returns 要素タイプ別の評価結果
	 *
	 * @example
	 * ```ts
	 * const evaluations = [...]; // TimingEvaluation[]
	 * const classified = TimingEvaluator.classifyByElement(evaluations);
	 * console.log(classified.dot.length); // Number of dot inputs
	 * console.log(classified.dash.length); // Number of dash inputs
	 * ```
	 */
	static classifyByElement(evaluations: TimingEvaluation[]): {
		dot: TimingEvaluation[];
		dash: TimingEvaluation[];
	} {
		const dot = evaluations.filter((e) => e.record.element === '.');
		const dash = evaluations.filter((e) => e.record.element === '-');
		return { dot, dash };
	}

	/**
	 * 最近のN件の評価結果を取得する
	 *
	 * @param evaluations - タイミング評価結果の配列
	 * @param count - 取得する件数
	 * @returns 最近のN件の評価結果
	 *
	 * @example
	 * ```ts
	 * const evaluations = [...]; // TimingEvaluation[]
	 * const recent = TimingEvaluator.getRecent(evaluations, 10);
	 * console.log(recent.length); // Up to 10 entries
	 * ```
	 */
	static getRecent(evaluations: TimingEvaluation[], count: number): TimingEvaluation[] {
		if (count <= 0) {
			return [];
		}
		const sorted = [...evaluations].sort(
			(a, b) => b.record.timestamp - a.record.timestamp,
		);
		return sorted.slice(0, count);
	}

	/**
	 * 期間内の評価結果を取得する
	 *
	 * @param evaluations - タイミング評価結果の配列
	 * @param startTime - 開始時刻（エポックミリ秒）
	 * @param endTime - 終了時刻（エポックミリ秒、省略時は現在時刻）
	 * @returns 期間内の評価結果
	 *
	 * @example
	 * ```ts
	 * const evaluations = [...]; // TimingEvaluation[]
	 * const oneHourAgo = Date.now() - 60 * 60 * 1000;
	 * const recent = TimingEvaluator.getByTimeRange(evaluations, oneHourAgo);
	 * console.log(recent.length); // Entries from the last hour
	 * ```
	 */
	static getByTimeRange(
		evaluations: TimingEvaluation[],
		startTime: number,
		endTime: number = Date.now(),
	): TimingEvaluation[] {
		return evaluations.filter(
			(e) => e.record.timestamp >= startTime && e.record.timestamp <= endTime,
		);
	}

	/**
	 * スペーシングレコードを作成する
	 *
	 * @param actualDuration - 実際のスペース時間（ミリ秒）
	 * @param timings - モールス信号のタイミング情報
	 * @param timestamp - 記録時刻（エポックミリ秒、省略時は現在時刻）
	 * @returns スペーシングレコード
	 *
	 * @example
	 * ```ts
	 * const timings = TimingCalculator.calculate(20);
	 * const record = TimingEvaluator.createSpacingRecord(150, timings);
	 * console.log(record.type); // 'character' because it is close to 3 dots = 180ms
	 * ```
	 */
	static createSpacingRecord(
		actualDuration: number,
		timings: MorseTimings,
		timestamp: number = Date.now(),
	): SpacingRecord {
		//! スペースタイプを判定する。
		//! 0 〜 2 dot: 要素間スペース
		//! 2 〜 5 dot: 文字間スペース
		//! 5 dot 以上: 単語間スペース
		const dotDuration = timings.dot;
		let type: SpacingType;
		let expectedDuration: number;

		if (actualDuration < dotDuration * 2) {
			//! 要素間スペース（同じ文字内の次の要素）
			type = 'element';
			expectedDuration = 0; // すぐに次を送信することを期待
		} else if (actualDuration < dotDuration * 5) {
			//! 文字間スペース
			type = 'character';
			expectedDuration = timings.charGap; // 3 dot
		} else {
			//! 単語間スペース
			type = 'word';
			expectedDuration = timings.wordGap; // 7 dot
		}

		return {
			type,
			actualDuration,
			expectedDuration,
			timestamp,
		};
	}

	/**
	 * スペーシングレコードを評価する
	 *
	 * @param record - スペーシングレコード
	 * @returns スペーシング評価結果
	 *
	 * @example
	 * ```ts
	 * const timings = TimingCalculator.calculate(20);
	 * const record = TimingEvaluator.createSpacingRecord(150, timings);
	 * const evaluation = TimingEvaluator.evaluateSpacing(record);
	 * console.log(evaluation.accuracy); // Spacing accuracy
	 * ```
	 */
	static evaluateSpacing(record: SpacingRecord): SpacingEvaluation {
		const absoluteError = Math.abs(record.actualDuration - record.expectedDuration);
		//! 期待値が0の場合（要素間スペース）、相対誤差の計算で除算エラーを避ける。
		//! この場合、絶対誤差をそのまま相対誤差（%）として扱う（1ms = 1%）。
		const relativeError =
			record.expectedDuration === 0
				? absoluteError
				: (absoluteError / record.expectedDuration) * 100;
		const accuracy = Math.max(0, 100 - relativeError);

		return {
			record,
			absoluteError,
			relativeError,
			accuracy,
		};
	}

	/**
	 * 複数のスペーシング評価結果から統計情報を計算する
	 *
	 * @param evaluations - スペーシング評価結果の配列
	 * @returns 統計情報
	 *
	 * @example
	 * ```ts
	 * const evaluations = [...]; // SpacingEvaluation[]
	 * const stats = TimingEvaluator.calculateSpacingStatistics(evaluations);
	 * console.log(stats.averageAccuracy); // Average accuracy
	 * ```
	 */
	static calculateSpacingStatistics(evaluations: SpacingEvaluation[]): TimingStatistics {
		if (evaluations.length === 0) {
			return {
				count: 0,
				averageAccuracy: 0,
				averageAbsoluteError: 0,
				averageRelativeError: 0,
				maxAccuracy: 0,
				minAccuracy: 0,
				standardDeviation: 0,
			};
		}

		const accuracies = evaluations.map((e) => e.accuracy);
		const absoluteErrors = evaluations.map((e) => e.absoluteError);
		const relativeErrors = evaluations.map((e) => e.relativeError);

		const averageAccuracy = accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length;
		const averageAbsoluteError =
			absoluteErrors.reduce((sum, e) => sum + e, 0) / absoluteErrors.length;
		const averageRelativeError =
			relativeErrors.reduce((sum, e) => sum + e, 0) / relativeErrors.length;

		const maxAccuracy = Math.max(...accuracies);
		const minAccuracy = Math.min(...accuracies);

		//! 標準偏差を計算する。
		const variance =
			accuracies.reduce((sum, a) => sum + Math.pow(a - averageAccuracy, 2), 0) /
			accuracies.length;
		const standardDeviation = Math.sqrt(variance);

		return {
			count: evaluations.length,
			averageAccuracy,
			averageAbsoluteError,
			averageRelativeError,
			maxAccuracy,
			minAccuracy,
			standardDeviation,
		};
	}

	/**
	 * スペーシング評価結果をスペースタイプ別に分類する
	 *
	 * @param evaluations - スペーシング評価結果の配列
	 * @returns スペースタイプ別の評価結果
	 *
	 * @example
	 * ```ts
	 * const evaluations = [...]; // SpacingEvaluation[]
	 * const classified = TimingEvaluator.classifyBySpacingType(evaluations);
	 * console.log(classified.element.length); // Number of element spaces
	 * console.log(classified.character.length); // Number of character spaces
	 * console.log(classified.word.length); // Number of word spaces
	 * ```
	 */
	static classifyBySpacingType(evaluations: SpacingEvaluation[]): {
		element: SpacingEvaluation[];
		character: SpacingEvaluation[];
		word: SpacingEvaluation[];
	} {
		const element = evaluations.filter((e) => e.record.type === 'element');
		const character = evaluations.filter((e) => e.record.type === 'character');
		const word = evaluations.filter((e) => e.record.type === 'word');
		return { element, character, word };
	}
}
