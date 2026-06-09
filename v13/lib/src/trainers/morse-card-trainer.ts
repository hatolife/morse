/**
 * モールス符号フラッシュカードトレーナー
 * UI非依存のピュアロジック実装
 */

export type MorseCardCategory = 'letter' | 'number' | 'symbol';
export type MorseCardQuestionType =
	| 'char-to-morse'
	| 'morse-to-char'
	| 'sound-to-char'
	| 'sound-to-morse';

export interface MorseCardEntry {
	category: MorseCardCategory;
	difficulty: number;
	character: string;
	morse: string;
	label: string;
	description: string;
}

export interface MorseCardQuestion {
	type: MorseCardQuestionType;
	entry: MorseCardEntry;
	choices: string[];
	correctAnswer: string;
}

export interface MorseCardExamResult {
	question: MorseCardQuestion;
	userAnswer: string;
	isCorrect: boolean;
}

export interface MorseCardScoreInfo {
	correct: number;
	total: number;
	percentage: number;
}

export class MorseCardTrainer {
	static shuffleCards(cards: MorseCardEntry[]): MorseCardEntry[] {
		return this.shuffle(cards);
	}

	static generateExamQuestions(
		entries: MorseCardEntry[],
		questionType: MorseCardQuestionType,
		count: number
	): MorseCardQuestion[] {
		if (entries.length === 0) return [];

		const actualCount = Math.min(count, entries.length);
		return this.shuffleCards(entries)
			.slice(0, actualCount)
			.map(entry => this.createQuestion(entry, entries, questionType));
	}

	static createQuestion(
		entry: MorseCardEntry,
		allEntries: MorseCardEntry[],
		questionType: MorseCardQuestionType
	): MorseCardQuestion {
		const answerField = this.answerFieldFor(questionType);
		const correctAnswer = entry[answerField];
		const others = this.shuffleCards(allEntries)
			.filter(candidate => candidate.character !== entry.character)
			.filter(candidate => answerField !== 'character' || candidate.morse !== entry.morse)
			.filter(candidate => candidate[answerField] !== correctAnswer)
			.slice(0, 3);
		const choices = this.shuffle([correctAnswer, ...others.map(candidate => candidate[answerField])]);

		return {
			type: questionType,
			entry,
			choices,
			correctAnswer
		};
	}

	static checkAnswer(question: MorseCardQuestion, userAnswer: string): boolean {
		return question.correctAnswer === userAnswer;
	}

	static calculateScore(results: MorseCardExamResult[]): MorseCardScoreInfo {
		const total = results.length;
		const correct = results.filter(result => result.isCorrect).length;
		return {
			correct,
			total,
			percentage: total > 0 ? Math.round((correct / total) * 100) : 0
		};
	}

	static isPassed(percentage: number, threshold: number = 80): boolean {
		return percentage >= threshold;
	}

	static getWrongAnswers(results: MorseCardExamResult[]): MorseCardEntry[] {
		return results.filter(result => !result.isCorrect).map(result => result.question.entry);
	}

	static filterByCategories(entries: MorseCardEntry[], categories: Set<MorseCardCategory>): MorseCardEntry[] {
		if (categories.size === 0) return entries;
		return entries.filter(entry => categories.has(entry.category));
	}

	static filterByDifficulties(entries: MorseCardEntry[], difficulties: Set<number>): MorseCardEntry[] {
		if (difficulties.size === 0) return entries;
		return entries.filter(entry => difficulties.has(entry.difficulty));
	}

	static filterByQuery(entries: MorseCardEntry[], query: string): MorseCardEntry[] {
		const normalizedQuery = query.trim().toLowerCase();
		if (!normalizedQuery) return entries;

		return entries.filter(entry =>
			entry.character.toLowerCase().includes(normalizedQuery) ||
			entry.morse.includes(normalizedQuery) ||
			entry.label.toLowerCase().includes(normalizedQuery) ||
			entry.description.toLowerCase().includes(normalizedQuery)
		);
	}

	static sortEntries(
		entries: MorseCardEntry[],
		column: MorseCardSortColumn,
		direction: MorseCardSortDirection
	): MorseCardEntry[] {
		const sorted = [...entries];
		const factor = direction === 'asc' ? 1 : -1;
		sorted.sort((a, b) => {
			if (column === 'difficulty') {
				return (a.difficulty - b.difficulty) * factor;
			}
			return String(a[column]).localeCompare(String(b[column]), 'ja') * factor;
		});
		return sorted;
	}

	private static answerFieldFor(questionType: MorseCardQuestionType): 'character' | 'morse' {
		switch (questionType) {
			case 'char-to-morse':
			case 'sound-to-morse':
				return 'morse';
			case 'morse-to-char':
			case 'sound-to-char':
				return 'character';
		}
	}

	private static shuffle<T>(items: T[]): T[] {
		const shuffled = [...items];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
	}
}

export type MorseCardSortColumn = 'character' | 'morse' | 'category' | 'difficulty';
export type MorseCardSortDirection = 'asc' | 'desc';
