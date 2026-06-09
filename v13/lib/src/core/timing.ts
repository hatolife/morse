/**
 * モールス信号のタイミング計算ロジック
 * WPM（Words Per Minute）からdot/dash/gap時間を計算する
 * UI非依存のピュアなロジックモジュール
 */

export interface MorseTimings {
	/** dot（短点）の長さ（ミリ秒） */
	dot: number;
	/** dash（長点）の長さ（ミリ秒） */
	dash: number;
	/** 符号要素間の間隔（ミリ秒） */
	elementGap: number;
	/** 文字間の間隔（ミリ秒） */
	charGap: number;
	/** 語間の間隔（ミリ秒） */
	wordGap: number;
}

export interface TimingOptions {
	/** 文字間・語間ギャップを10%短縮するか（デフォルト: false） */
	shortenGaps?: boolean;
}

/**
 * タイミング計算クラス
 *
 * 標準的なモールス信号のタイミング:
 * - dot = 1200 / wpm (ms)
 * - dash = dot * 3
 * - elementGap = dot * 1（符号要素間）
 * - charGap = dot * 3（文字間、element gap含めると dot * 4）
 * - wordGap = dot * 7
 */
export class TimingCalculator {
	/**
	 * WPMからモールス信号のタイミングを計算する
	 *
	 * @param wpm - Words Per Minute（1分間あたりの単語数）
	 * @param options - タイミング計算のオプション
	 * @returns モールス信号のタイミング情報
	 *
	 * @example
	 * ```ts
	 * const timings = TimingCalculator.calculate(20);
	 * console.log(timings.dot); // 60ms
	 * console.log(timings.dash); // 180ms
	 * ```
	 */
	static calculate(wpm: number, options: TimingOptions = {}): MorseTimings {
		if (wpm <= 0) {
			throw new Error(`Invalid WPM value: ${wpm}. WPM must be greater than 0.`);
		}

		const unit = 1200 / wpm;
		const shortenFactor = options.shortenGaps ? 0.9 : 1.0;

		return {
			dot: unit,
			dash: unit * 3,
			elementGap: unit,
			charGap: unit * 3 * shortenFactor,
			wordGap: unit * 7 * shortenFactor,
		};
	}

	/**
	 * タイミング情報から文字確定までの待機時間を計算する
	 *
	 * @param timings - モールス信号のタイミング情報
	 * @returns 文字確定までの待機時間（ミリ秒）
	 */
	static getCharGapDelay(timings: MorseTimings): number {
		const shortenFactor = timings.charGap / (timings.dot * 3);
		return timings.dot * 4 * shortenFactor;
	}

	/**
	 * タイミング情報から語間スペース確定までの待機時間を計算する
	 *
	 * @param timings - モールス信号のタイミング情報
	 * @returns 語間スペース確定までの待機時間（ミリ秒）
	 */
	static getWordGapDelay(timings: MorseTimings): number {
		return timings.wordGap;
	}

	/**
	 * 押下時間からdot/dashを判定する
	 *
	 * @param pressDuration - キー押下時間（ミリ秒）
	 * @param dotDuration - dot時間（ミリ秒）
	 * @returns '.'（dot）または '-'（dash）
	 */
	static classifyElement(pressDuration: number, dotDuration: number): '.' | '-' {
		// dot時間の1.5倍を閾値とする
		const threshold = dotDuration * 1.5;
		return pressDuration < threshold ? '.' : '-';
	}
}
