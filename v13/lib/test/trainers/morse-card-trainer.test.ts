import { describe, expect, it } from 'vitest';
import { MorseCardTrainer, type MorseCardEntry } from '../../src/trainers/morse-card-trainer';

const entries: MorseCardEntry[] = [
	{ category: 'letter', difficulty: 1, character: 'A', morse: '.-', label: 'A', description: 'A' },
	{ category: 'letter', difficulty: 1, character: 'E', morse: '.', label: 'E', description: 'E' },
	{ category: 'letter', difficulty: 3, character: 'X', morse: '-..-', label: 'X', description: 'X' },
	{ category: 'symbol', difficulty: 5, character: '×', morse: '-..-', label: 'multiplication sign', description: '乗算記号' },
	{ category: 'symbol', difficulty: 5, character: '?', morse: '..--..', label: 'question mark', description: '疑問符' },
	{ category: 'number', difficulty: 4, character: '1', morse: '.----', label: '1', description: '数字1' },
];

describe('MorseCardTrainer', () => {
	it('generates questions for character to morse', () => {
		const questions = MorseCardTrainer.generateExamQuestions(entries, 'char-to-morse', 3);

		expect(questions).toHaveLength(3);
		expect(questions[0].choices).toContain(questions[0].correctAnswer);
	});

	it('does not include duplicate morse choices in sound to character questions', () => {
		const question = MorseCardTrainer.createQuestion(entries[2], entries, 'sound-to-char');

		expect(question.correctAnswer).toBe('X');
		expect(question.choices).not.toContain('×');
	});

	it('filters by category, difficulty, and query', () => {
		const symbols = MorseCardTrainer.filterByCategories(entries, new Set(['symbol']));
		const difficult = MorseCardTrainer.filterByDifficulties(symbols, new Set([5]));
		const queried = MorseCardTrainer.filterByQuery(difficult, '疑問');

		expect(queried.map(entry => entry.character)).toEqual(['?']);
	});

	it('calculates score', () => {
		const question = MorseCardTrainer.createQuestion(entries[0], entries, 'char-to-morse');
		const score = MorseCardTrainer.calculateScore([
			{ question, userAnswer: question.correctAnswer, isCorrect: true },
			{ question, userAnswer: '---', isCorrect: false }
		]);

		expect(score).toEqual({ correct: 1, total: 2, percentage: 50 });
	});
});
