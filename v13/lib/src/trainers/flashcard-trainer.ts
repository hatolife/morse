/**
 * フラッシュカードトレーナー
 * UI非依存のピュアロジック実装
 * CW略語・Q符号の学習支援機能を提供
 */

/**
 * フラッシュカードエントリー
 */
export interface FlashcardEntry {
	/**
	 * タグ（カンマ区切り）
	 */
	tags: string;

	/**
	 * 使用頻度（1-5、5が最頻出）
	 */
	frequency: number;

	/**
	 * 略語（例: "CQ", "QTH", "[AR]"）
	 */
	abbreviation: string;

	/**
	 * 英語の意味
	 */
	english: string;

	/**
	 * 日本語の意味
	 */
	japanese: string;

	/**
	 * 説明（オプション）
	 */
	description?: string;

	/**
	 * 具体例（オプション）
	 */
	example?: string;
}

/**
 * 試験の出題形式
 */
export type QuestionType = 'abbr-to-meaning' | 'meaning-to-abbr' | 'morse-to-abbr' | 'morse-to-meaning';

/**
 * 試験問題
 */
export interface ExamQuestion {
	/**
	 * 出題形式
	 */
	type: QuestionType;

	/**
	 * 出題エントリー
	 */
	entry: FlashcardEntry;

	/**
	 * 選択肢（4択）
	 */
	choices: string[];

	/**
	 * 正解
	 */
	correctAnswer: string;
}

/**
 * 試験結果
 */
export interface ExamResult {
	/**
	 * 出題された問題
	 */
	question: ExamQuestion;

	/**
	 * ユーザーの回答
	 */
	userAnswer: string;

	/**
	 * 正誤判定
	 */
	isCorrect: boolean;
}

/**
 * スコア情報
 */
export interface ScoreInfo {
	/**
	 * 正解数
	 */
	correct: number;

	/**
	 * 総問題数
	 */
	total: number;

	/**
	 * 正答率（0-100）
	 */
	percentage: number;
}

/**
 * フラッシュカードトレーナークラス
 */
export class FlashcardTrainer {
	/**
	 * カードをシャッフルする（Fisher-Yates shuffle）
	 * @param cards - シャッフルするカードの配列
	 * @returns シャッフルされたカードの配列
	 */
	static shuffleCards(cards: FlashcardEntry[]): FlashcardEntry[] {
		const shuffled = [...cards];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
	}

	/**
	 * 試験問題を生成する
	 * @param entries - 問題の元となるエントリーの配列
	 * @param questionType - 出題形式
	 * @param count - 問題数（entriesの長さを超える場合はentriesの長さになる）
	 * @returns 試験問題の配列
	 */
	static generateExamQuestions(
		entries: FlashcardEntry[],
		questionType: QuestionType,
		count: number
	): ExamQuestion[] {
		if (entries.length === 0) return [];

		const actualCount = Math.min(count, entries.length);
		const shuffled = this.shuffleCards(entries);
		const selected = shuffled.slice(0, actualCount);

		return selected.map(entry => this.createQuestion(entry, entries, questionType));
	}

	/**
	 * 1つの試験問題を作成する
	 * @param entry - 正解となるエントリー
	 * @param allEntries - 選択肢生成用の全エントリー
	 * @param questionType - 出題形式
	 * @returns 試験問題
	 */
	static createQuestion(
		entry: FlashcardEntry,
		allEntries: FlashcardEntry[],
		questionType: QuestionType
	): ExamQuestion {
		//! 正解以外のエントリーから3つ選ぶ。
		const others = allEntries
			.filter(e => e.abbreviation !== entry.abbreviation)
			.sort(() => Math.random() - 0.5)
			.slice(0, 3);

		let correctAnswer: string;
		let choices: string[];

		switch (questionType) {
			case 'abbr-to-meaning':
			case 'morse-to-meaning':
				//! 意味を答える問題。
				correctAnswer = `${entry.english} / ${entry.japanese}`;
				choices = [correctAnswer, ...others.map(e => `${e.english} / ${e.japanese}`)];
				break;

			case 'meaning-to-abbr':
			case 'morse-to-abbr':
				//! 略語を答える問題。
				correctAnswer = entry.abbreviation;
				choices = [correctAnswer, ...others.map(e => e.abbreviation)];
				break;
		}

		//! 選択肢をシャッフル。
		choices = choices.sort(() => Math.random() - 0.5);

		return {
			type: questionType,
			entry,
			choices,
			correctAnswer
		};
	}

	/**
	 * ユーザーの回答が正解かどうかを判定する
	 * @param question - 試験問題
	 * @param userAnswer - ユーザーの回答
	 * @returns 正解の場合true
	 */
	static checkAnswer(question: ExamQuestion, userAnswer: string): boolean {
		return userAnswer === question.correctAnswer;
	}

	/**
	 * 試験結果のスコアを計算する
	 * @param results - 試験結果の配列
	 * @returns スコア情報
	 */
	static calculateScore(results: ExamResult[]): ScoreInfo {
		const total = results.length;
		const correct = results.filter(r => r.isCorrect).length;
		const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

		return {
			correct,
			total,
			percentage
		};
	}

	/**
	 * 合格判定
	 * @param percentage - 正答率（0-100）
	 * @param threshold - 合格ライン（デフォルト: 80）
	 * @returns 合格の場合true
	 */
	static isPassed(percentage: number, threshold: number = 80): boolean {
		return percentage >= threshold;
	}

	/**
	 * 間違えた問題のエントリーを抽出する
	 * @param results - 試験結果の配列
	 * @returns 間違えたエントリーの配列
	 */
	static getWrongAnswers(results: ExamResult[]): FlashcardEntry[] {
		return results
			.filter(r => !r.isCorrect)
			.map(r => r.question.entry);
	}

	/**
	 * 正解した問題のエントリーを抽出する
	 * @param results - 試験結果の配列
	 * @returns 正解したエントリーの配列
	 */
	static getCorrectAnswers(results: ExamResult[]): FlashcardEntry[] {
		return results
			.filter(r => r.isCorrect)
			.map(r => r.question.entry);
	}

	/**
	 * タグでフィルタリングする
	 * @param entries - フィルタリング対象のエントリー配列
	 * @param tags - フィルタリングに使用するタグのセット
	 * @returns フィルタリングされたエントリー配列
	 */
	static filterByTags(entries: FlashcardEntry[], tags: Set<string>): FlashcardEntry[] {
		if (tags.size === 0) return entries;

		return entries.filter(entry => {
			const entryTags = entry.tags.split(',').map(t => t.trim());
			return Array.from(tags).some(tag => entryTags.includes(tag));
		});
	}

	/**
	 * 使用頻度でフィルタリングする
	 * @param entries - フィルタリング対象のエントリー配列
	 * @param frequencies - フィルタリングに使用する頻度のセット（1-5）
	 * @returns フィルタリングされたエントリー配列
	 */
	static filterByFrequencies(entries: FlashcardEntry[], frequencies: Set<number>): FlashcardEntry[] {
		if (frequencies.size === 0) return entries;

		return entries.filter(entry => frequencies.has(entry.frequency));
	}

	/**
	 * 検索クエリでフィルタリングする
	 * @param entries - フィルタリング対象のエントリー配列
	 * @param query - 検索クエリ（略語、英語、日本語、タグから検索）
	 * @returns フィルタリングされたエントリー配列
	 */
	static filterByQuery(entries: FlashcardEntry[], query: string): FlashcardEntry[] {
		if (!query.trim()) return entries;

		const lowerQuery = query.toLowerCase();
		return entries.filter(entry =>
			entry.abbreviation.toLowerCase().includes(lowerQuery) ||
			entry.english.toLowerCase().includes(lowerQuery) ||
			entry.japanese.includes(query) ||
			entry.tags.toLowerCase().includes(lowerQuery)
		);
	}

	/**
	 * 全てのタグを抽出する
	 * @param entries - エントリー配列
	 * @returns ユニークなタグの配列（ソート済み）
	 */
	static getAllTags(entries: FlashcardEntry[]): string[] {
		const tagsSet = new Set<string>();
		entries.forEach(entry => {
			entry.tags.split(',').forEach(tag => {
				const trimmedTag = tag.trim();
				if (trimmedTag) {
					tagsSet.add(trimmedTag);
				}
			});
		});
		return Array.from(tagsSet).sort();
	}

	/**
	 * エントリーを略語でソートする
	 * @param entries - ソート対象のエントリー配列
	 * @param ascending - 昇順の場合true（デフォルト: true）
	 * @returns ソートされたエントリー配列
	 */
	static sortByAbbreviation(entries: FlashcardEntry[], ascending: boolean = true): FlashcardEntry[] {
		const sorted = [...entries];
		sorted.sort((a, b) => {
			const compareResult = a.abbreviation.localeCompare(b.abbreviation);
			return ascending ? compareResult : -compareResult;
		});
		return sorted;
	}

	/**
	 * エントリーを使用頻度でソートする
	 * @param entries - ソート対象のエントリー配列
	 * @param ascending - 昇順の場合true（デフォルト: false、頻度の高い順）
	 * @returns ソートされたエントリー配列
	 */
	static sortByFrequency(entries: FlashcardEntry[], ascending: boolean = false): FlashcardEntry[] {
		const sorted = [...entries];
		sorted.sort((a, b) => {
			const compareResult = a.frequency - b.frequency;
			return ascending ? compareResult : -compareResult;
		});
		return sorted;
	}

	/**
	 * エントリーを英語でソートする
	 * @param entries - ソート対象のエントリー配列
	 * @param ascending - 昇順の場合true（デフォルト: true）
	 * @returns ソートされたエントリー配列
	 */
	static sortByEnglish(entries: FlashcardEntry[], ascending: boolean = true): FlashcardEntry[] {
		const sorted = [...entries];
		sorted.sort((a, b) => {
			const compareResult = a.english.localeCompare(b.english);
			return ascending ? compareResult : -compareResult;
		});
		return sorted;
	}

	/**
	 * エントリーを日本語でソートする
	 * @param entries - ソート対象のエントリー配列
	 * @param ascending - 昇順の場合true（デフォルト: true）
	 * @returns ソートされたエントリー配列
	 */
	static sortByJapanese(entries: FlashcardEntry[], ascending: boolean = true): FlashcardEntry[] {
		const sorted = [...entries];
		sorted.sort((a, b) => {
			const compareResult = a.japanese.localeCompare(b.japanese, 'ja');
			return ascending ? compareResult : -compareResult;
		});
		return sorted;
	}

	/**
	 * エントリーをタグでソートする
	 * @param entries - ソート対象のエントリー配列
	 * @param ascending - 昇順の場合true（デフォルト: true）
	 * @returns ソートされたエントリー配列
	 */
	static sortByTags(entries: FlashcardEntry[], ascending: boolean = true): FlashcardEntry[] {
		const sorted = [...entries];
		sorted.sort((a, b) => {
			const compareResult = a.tags.localeCompare(b.tags);
			return ascending ? compareResult : -compareResult;
		});
		return sorted;
	}
}
