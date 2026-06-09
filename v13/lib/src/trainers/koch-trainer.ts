/**
 * コッホ法トレーナー
 * UI非依存のピュアロジック実装
 * 段階的に文字を増やして学習する方式
 */

/**
 * コッホ法の40レッスン（41文字）
 * レッスン1はKとMの2文字から開始
 * レッスン40は全41文字
 */
export const KOCH_SEQUENCE = [
	'K', 'M', 'U', 'R', 'E', 'S', 'N', 'A', 'P', 'T',
	'L', 'W', 'I', '.', 'J', 'Z', '=', 'F', 'O', 'Y',
	',', 'V', 'G', '5', '/', 'Q', '9', '2', 'H', '3',
	'8', 'B', '?', '4', '7', 'C', '1', 'D', '6', '0',
	'X',
];

/**
 * 練習問題の設定
 */
export interface PracticeSettings {
	/**
	 * グループサイズ（文字数、デフォルト: 5）
	 */
	groupSize?: number;

	/**
	 * 練習時間（秒、デフォルト: 60）
	 */
	duration?: number;

	/**
	 * WPM（デフォルト: 20）
	 * グループ数の計算に使用
	 */
	wpm?: number;
}

/**
 * コッホ法トレーナークラス
 */
export class KochTrainer {
	private currentLesson: number = 1;

	/**
	 * コッホ法トレーナーを初期化する
	 * @param initialLesson - 初期レッスン番号（1-40、デフォルト: 1）
	 */
	constructor(initialLesson: number = 1) {
		this.currentLesson = Math.max(1, Math.min(40, initialLesson));
	}

	/**
	 * レッスン番号で学習する文字を取得
	 * @param lessonNum - レッスン番号（1-40）
	 * @returns 学習文字の配列
	 */
	static getCharsForLesson(lessonNum: number): string[] {
		const lesson = Math.max(1, Math.min(40, lessonNum));
		return KOCH_SEQUENCE.slice(0, lesson + 1);
	}

	/**
	 * ランダムな文字グループを生成
	 * @param chars - 使用する文字の配列
	 * @param settings - 練習設定
	 * @returns 文字グループの配列
	 */
	static generateRandomGroups(
		chars: string[],
		settings: PracticeSettings = {}
	): string[] {
		const groupSize = settings.groupSize || 5;
		const duration = settings.duration || 60;
		const wpm = settings.wpm || 20;

		// WPMベースでグループ数を計算（1分あたりの文字数）
		const numGroups = Math.floor((duration * wpm) / (groupSize * 5));

		const groups: string[] = [];
		for (let i = 0; i < numGroups; i++) {
			let group = '';
			for (let j = 0; j < groupSize; j++) {
				const randomChar = chars[Math.floor(Math.random() * chars.length)];
				group += randomChar;
			}
			groups.push(group);
		}

		return groups;
	}

	/**
	 * 指定した文字セットでランダムグループを生成
	 * @param charSet - 使用する文字セット
	 * @param settings - 練習設定
	 * @returns 文字グループの配列
	 */
	static generateCustomGroups(
		charSet: Set<string>,
		settings: PracticeSettings = {}
	): string[] {
		const chars = Array.from(charSet);
		if (chars.length < 2) {
			throw new Error('Character set must contain at least 2 characters');
		}
		return KochTrainer.generateRandomGroups(chars, settings);
	}

	/**
	 * 正答率を計算する
	 * @param correctAnswer - 正解の文字列
	 * @param userInput - ユーザー入力の文字列
	 * @returns 正答率（0-100）
	 */
	static calculateAccuracy(correctAnswer: string, userInput: string): number {
		if (!userInput) return 0;

		// 空白を除去して比較
		const correct = correctAnswer.replace(/\s/g, '');
		const input = userInput.replace(/\s/g, '');
		const maxLen = Math.max(correct.length, input.length);

		if (maxLen === 0) return 0;

		let matches = 0;
		for (let i = 0; i < maxLen; i++) {
			if (correct[i] === input[i]) {
				matches++;
			}
		}

		return (matches / maxLen) * 100;
	}

	/**
	 * 合格判定（90%以上）
	 * @param accuracy - 正答率（0-100）
	 * @returns 合格の場合true
	 */
	static isPassed(accuracy: number): boolean {
		return accuracy >= 90;
	}

	/**
	 * 現在のレッスン番号を取得
	 * @returns レッスン番号（1-40）
	 */
	getCurrentLesson(): number {
		return this.currentLesson;
	}

	/**
	 * レッスン番号を設定
	 * @param lessonNum - レッスン番号（1-40）
	 */
	setCurrentLesson(lessonNum: number): void {
		this.currentLesson = Math.max(1, Math.min(40, lessonNum));
	}

	/**
	 * 現在のレッスンで学習する文字を取得
	 * @returns 学習文字の配列
	 */
	getCurrentChars(): string[] {
		return KochTrainer.getCharsForLesson(this.currentLesson);
	}

	/**
	 * 現在のレッスン用の練習問題を生成
	 * @param settings - 練習設定
	 * @returns 練習問題（文字グループの配列）
	 */
	generatePractice(settings: PracticeSettings = {}): string[] {
		const chars = this.getCurrentChars();
		return KochTrainer.generateRandomGroups(chars, settings);
	}

	/**
	 * 次のレッスンに進む
	 * @returns 次のレッスン番号（最大40）
	 */
	advanceLesson(): number {
		if (this.currentLesson < 40) {
			this.currentLesson++;
		}
		return this.currentLesson;
	}

	/**
	 * 前のレッスンに戻る
	 * @returns 前のレッスン番号（最小1）
	 */
	previousLesson(): number {
		if (this.currentLesson > 1) {
			this.currentLesson--;
		}
		return this.currentLesson;
	}

	/**
	 * 最後のレッスンかどうかを判定
	 * @returns 最後のレッスンの場合true
	 */
	isLastLesson(): boolean {
		return this.currentLesson === 40;
	}

	/**
	 * 最初のレッスンかどうかを判定
	 * @returns 最初のレッスンの場合true
	 */
	isFirstLesson(): boolean {
		return this.currentLesson === 1;
	}

	/**
	 * 全レッスン数を取得
	 * @returns 全レッスン数（40）
	 */
	static getTotalLessons(): number {
		return 40;
	}

	/**
	 * 全文字数を取得
	 * @returns 全文字数（41）
	 */
	static getTotalChars(): number {
		return KOCH_SEQUENCE.length;
	}

	/**
	 * コッホシーケンス全体を取得
	 * @returns 全41文字の配列
	 */
	static getAllChars(): string[] {
		return [...KOCH_SEQUENCE];
	}
}
