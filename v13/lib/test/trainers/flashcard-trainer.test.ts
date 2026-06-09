/**
 * flashcard-trainer.ts のユニットテスト
 */

import { describe, it, expect } from 'vitest';
import {
	FlashcardTrainer,
	FlashcardEntry,
	QuestionType,
	ExamQuestion,
	ExamResult,
	ScoreInfo
} from '../../src/trainers/flashcard-trainer';

//! テスト用のサンプルデータ。
const sampleEntries: FlashcardEntry[] = [
	{
		tags: 'Q符号',
		frequency: 5,
		abbreviation: 'QTH',
		english: 'What is your location?',
		japanese: 'あなたの位置は？',
		description: '自局の位置を尋ねる',
		example: 'MY QTH IS TOKYO'
	},
	{
		tags: 'Q符号',
		frequency: 5,
		abbreviation: 'QSL',
		english: 'Can you acknowledge receipt?',
		japanese: '受信確認できますか？',
		description: 'QSLカードの交換',
		example: 'QSL VIA BUREAU'
	},
	{
		tags: '略語',
		frequency: 5,
		abbreviation: 'CQ',
		english: 'Calling any station',
		japanese: '全局呼び出し',
		description: '不特定の局への呼びかけ',
		example: 'CQ CQ CQ DE JA1AAA'
	},
	{
		tags: '略語,Prosign',
		frequency: 4,
		abbreviation: '[AR]',
		english: 'End of message',
		japanese: '送信終了',
		description: 'メッセージの終わり',
		example: 'TU AR'
	},
	{
		tags: 'Q符号',
		frequency: 3,
		abbreviation: 'QRM',
		english: 'Are you being interfered with?',
		japanese: '混信がありますか？',
		description: '他局からの混信',
		example: 'QRM NIL'
	}
];

describe('FlashcardTrainer', () => {
	describe('shuffleCards()', () => {
		it('元の配列と同じ長さの配列を返す', () => {
			const shuffled = FlashcardTrainer.shuffleCards(sampleEntries);
			expect(shuffled.length).toBe(sampleEntries.length);
		});

		it('元の配列と同じ要素を含む', () => {
			const shuffled = FlashcardTrainer.shuffleCards(sampleEntries);
			const originalAbbrs = sampleEntries.map(e => e.abbreviation).sort();
			const shuffledAbbrs = shuffled.map(e => e.abbreviation).sort();
			expect(shuffledAbbrs).toEqual(originalAbbrs);
		});

		it('元の配列を変更しない', () => {
			const original = [...sampleEntries];
			FlashcardTrainer.shuffleCards(sampleEntries);
			expect(sampleEntries).toEqual(original);
		});

		it('複数回呼び出しても正常に動作する', () => {
			for (let i = 0; i < 5; i++) {
				const shuffled = FlashcardTrainer.shuffleCards(sampleEntries);
				expect(shuffled.length).toBe(sampleEntries.length);
			}
		});

		it('空配列を渡しても空配列を返す', () => {
			const shuffled = FlashcardTrainer.shuffleCards([]);
			expect(shuffled).toEqual([]);
		});

		it('1要素の配列を渡しても同じ配列を返す', () => {
			const single = [sampleEntries[0]];
			const shuffled = FlashcardTrainer.shuffleCards(single);
			expect(shuffled).toEqual(single);
		});
	});

	describe('generateExamQuestions()', () => {
		it('指定した数の問題を生成する', () => {
			const questions = FlashcardTrainer.generateExamQuestions(
				sampleEntries,
				'abbr-to-meaning',
				3
			);
			expect(questions.length).toBe(3);
		});

		it('エントリー数より多い問題数を指定した場合はエントリー数が上限となる', () => {
			const questions = FlashcardTrainer.generateExamQuestions(
				sampleEntries,
				'abbr-to-meaning',
				100
			);
			expect(questions.length).toBe(sampleEntries.length);
		});

		it('空配列を渡すと空配列を返す', () => {
			const questions = FlashcardTrainer.generateExamQuestions(
				[],
				'abbr-to-meaning',
				10
			);
			expect(questions).toEqual([]);
		});

		it('各問題が必要なプロパティを持っている', () => {
			const questions = FlashcardTrainer.generateExamQuestions(
				sampleEntries,
				'abbr-to-meaning',
				2
			);
			questions.forEach(q => {
				expect(q).toHaveProperty('type');
				expect(q).toHaveProperty('entry');
				expect(q).toHaveProperty('choices');
				expect(q).toHaveProperty('correctAnswer');
				expect(q.type).toBe('abbr-to-meaning');
				expect(q.choices.length).toBe(4); // 4択
			});
		});

		it('各問題の選択肢に正解が含まれている', () => {
			const questions = FlashcardTrainer.generateExamQuestions(
				sampleEntries,
				'abbr-to-meaning',
				5
			);
			questions.forEach(q => {
				expect(q.choices).toContain(q.correctAnswer);
			});
		});

		it('異なる出題形式で問題を生成できる', () => {
			const types: QuestionType[] = ['abbr-to-meaning', 'meaning-to-abbr', 'morse-to-abbr', 'morse-to-meaning'];
			types.forEach(type => {
				const questions = FlashcardTrainer.generateExamQuestions(
					sampleEntries,
					type,
					3
				);
				expect(questions.length).toBe(3);
				questions.forEach(q => {
					expect(q.type).toBe(type);
				});
			});
		});
	});

	describe('createQuestion()', () => {
		it('abbr-to-meaning形式の問題を作成する', () => {
			const question = FlashcardTrainer.createQuestion(
				sampleEntries[0],
				sampleEntries,
				'abbr-to-meaning'
			);
			expect(question.type).toBe('abbr-to-meaning');
			expect(question.entry).toBe(sampleEntries[0]);
			expect(question.correctAnswer).toBe(`${sampleEntries[0].english} / ${sampleEntries[0].japanese}`);
			expect(question.choices.length).toBe(4);
		});

		it('meaning-to-abbr形式の問題を作成する', () => {
			const question = FlashcardTrainer.createQuestion(
				sampleEntries[0],
				sampleEntries,
				'meaning-to-abbr'
			);
			expect(question.type).toBe('meaning-to-abbr');
			expect(question.correctAnswer).toBe(sampleEntries[0].abbreviation);
		});

		it('morse-to-abbr形式の問題を作成する', () => {
			const question = FlashcardTrainer.createQuestion(
				sampleEntries[0],
				sampleEntries,
				'morse-to-abbr'
			);
			expect(question.type).toBe('morse-to-abbr');
			expect(question.correctAnswer).toBe(sampleEntries[0].abbreviation);
		});

		it('morse-to-meaning形式の問題を作成する', () => {
			const question = FlashcardTrainer.createQuestion(
				sampleEntries[0],
				sampleEntries,
				'morse-to-meaning'
			);
			expect(question.type).toBe('morse-to-meaning');
			expect(question.correctAnswer).toBe(`${sampleEntries[0].english} / ${sampleEntries[0].japanese}`);
		});

		it('選択肢に正解が含まれている', () => {
			const question = FlashcardTrainer.createQuestion(
				sampleEntries[0],
				sampleEntries,
				'abbr-to-meaning'
			);
			expect(question.choices).toContain(question.correctAnswer);
		});

		it('選択肢に正解以外の3つの選択肢が含まれている', () => {
			const question = FlashcardTrainer.createQuestion(
				sampleEntries[0],
				sampleEntries,
				'abbr-to-meaning'
			);
			expect(question.choices.length).toBe(4);
			//! 正解を除いた選択肢が3つあるはず。
			const wrongChoices = question.choices.filter(c => c !== question.correctAnswer);
			expect(wrongChoices.length).toBe(3);
		});
	});

	describe('checkAnswer()', () => {
		it('正しい回答でtrueを返す', () => {
			const question: ExamQuestion = {
				type: 'abbr-to-meaning',
				entry: sampleEntries[0],
				choices: ['A', 'B', 'C', 'D'],
				correctAnswer: 'B'
			};
			expect(FlashcardTrainer.checkAnswer(question, 'B')).toBe(true);
		});

		it('誤った回答でfalseを返す', () => {
			const question: ExamQuestion = {
				type: 'abbr-to-meaning',
				entry: sampleEntries[0],
				choices: ['A', 'B', 'C', 'D'],
				correctAnswer: 'B'
			};
			expect(FlashcardTrainer.checkAnswer(question, 'A')).toBe(false);
			expect(FlashcardTrainer.checkAnswer(question, 'C')).toBe(false);
			expect(FlashcardTrainer.checkAnswer(question, 'D')).toBe(false);
		});

		it('大文字小文字を区別する', () => {
			const question: ExamQuestion = {
				type: 'meaning-to-abbr',
				entry: sampleEntries[0],
				choices: ['QTH', 'QSL', 'CQ', 'QRM'],
				correctAnswer: 'QTH'
			};
			expect(FlashcardTrainer.checkAnswer(question, 'QTH')).toBe(true);
			expect(FlashcardTrainer.checkAnswer(question, 'qth')).toBe(false);
		});
	});

	describe('calculateScore()', () => {
		it('全問正解で100%を返す', () => {
			const results: ExamResult[] = [
				{
					question: FlashcardTrainer.createQuestion(sampleEntries[0], sampleEntries, 'abbr-to-meaning'),
					userAnswer: 'correct',
					isCorrect: true
				},
				{
					question: FlashcardTrainer.createQuestion(sampleEntries[1], sampleEntries, 'abbr-to-meaning'),
					userAnswer: 'correct',
					isCorrect: true
				}
			];
			const score = FlashcardTrainer.calculateScore(results);
			expect(score.correct).toBe(2);
			expect(score.total).toBe(2);
			expect(score.percentage).toBe(100);
		});

		it('全問不正解で0%を返す', () => {
			const results: ExamResult[] = [
				{
					question: FlashcardTrainer.createQuestion(sampleEntries[0], sampleEntries, 'abbr-to-meaning'),
					userAnswer: 'wrong',
					isCorrect: false
				},
				{
					question: FlashcardTrainer.createQuestion(sampleEntries[1], sampleEntries, 'abbr-to-meaning'),
					userAnswer: 'wrong',
					isCorrect: false
				}
			];
			const score = FlashcardTrainer.calculateScore(results);
			expect(score.correct).toBe(0);
			expect(score.total).toBe(2);
			expect(score.percentage).toBe(0);
		});

		it('半分正解で50%を返す', () => {
			const results: ExamResult[] = [
				{
					question: FlashcardTrainer.createQuestion(sampleEntries[0], sampleEntries, 'abbr-to-meaning'),
					userAnswer: 'correct',
					isCorrect: true
				},
				{
					question: FlashcardTrainer.createQuestion(sampleEntries[1], sampleEntries, 'abbr-to-meaning'),
					userAnswer: 'wrong',
					isCorrect: false
				}
			];
			const score = FlashcardTrainer.calculateScore(results);
			expect(score.correct).toBe(1);
			expect(score.total).toBe(2);
			expect(score.percentage).toBe(50);
		});

		it('空の結果で0%を返す', () => {
			const score = FlashcardTrainer.calculateScore([]);
			expect(score.correct).toBe(0);
			expect(score.total).toBe(0);
			expect(score.percentage).toBe(0);
		});

		it('パーセンテージは整数に丸める', () => {
			const results: ExamResult[] = [
				{ question: {} as ExamQuestion, userAnswer: '', isCorrect: true },
				{ question: {} as ExamQuestion, userAnswer: '', isCorrect: false },
				{ question: {} as ExamQuestion, userAnswer: '', isCorrect: false }
			];
			const score = FlashcardTrainer.calculateScore(results);
			//! 1/3 = 33.333... → 33%。
			expect(score.percentage).toBe(33);
			expect(Number.isInteger(score.percentage)).toBe(true);
		});
	});

	describe('isPassed()', () => {
		it('デフォルトの閾値（80%）で合格判定する', () => {
			expect(FlashcardTrainer.isPassed(80)).toBe(true);
			expect(FlashcardTrainer.isPassed(85)).toBe(true);
			expect(FlashcardTrainer.isPassed(100)).toBe(true);
			expect(FlashcardTrainer.isPassed(79)).toBe(false);
			expect(FlashcardTrainer.isPassed(50)).toBe(false);
		});

		it('カスタム閾値で合格判定する', () => {
			expect(FlashcardTrainer.isPassed(90, 85)).toBe(true);
			expect(FlashcardTrainer.isPassed(84, 85)).toBe(false);
		});

		it('100%の閾値で完全正解のみ合格とする', () => {
			expect(FlashcardTrainer.isPassed(100, 100)).toBe(true);
			expect(FlashcardTrainer.isPassed(99, 100)).toBe(false);
		});

		it('0%の閾値で全て合格とする', () => {
			expect(FlashcardTrainer.isPassed(0, 0)).toBe(true);
			expect(FlashcardTrainer.isPassed(50, 0)).toBe(true);
			expect(FlashcardTrainer.isPassed(100, 0)).toBe(true);
		});
	});

	describe('getWrongAnswers()', () => {
		it('間違えた問題のエントリーを抽出する', () => {
			const results: ExamResult[] = [
				{
					question: { entry: sampleEntries[0] } as ExamQuestion,
					userAnswer: '',
					isCorrect: true
				},
				{
					question: { entry: sampleEntries[1] } as ExamQuestion,
					userAnswer: '',
					isCorrect: false
				},
				{
					question: { entry: sampleEntries[2] } as ExamQuestion,
					userAnswer: '',
					isCorrect: false
				}
			];
			const wrong = FlashcardTrainer.getWrongAnswers(results);
			expect(wrong.length).toBe(2);
			expect(wrong).toContain(sampleEntries[1]);
			expect(wrong).toContain(sampleEntries[2]);
		});

		it('全問正解の場合は空配列を返す', () => {
			const results: ExamResult[] = [
				{
					question: { entry: sampleEntries[0] } as ExamQuestion,
					userAnswer: '',
					isCorrect: true
				}
			];
			const wrong = FlashcardTrainer.getWrongAnswers(results);
			expect(wrong).toEqual([]);
		});

		it('空の結果で空配列を返す', () => {
			const wrong = FlashcardTrainer.getWrongAnswers([]);
			expect(wrong).toEqual([]);
		});
	});

	describe('getCorrectAnswers()', () => {
		it('正解した問題のエントリーを抽出する', () => {
			const results: ExamResult[] = [
				{
					question: { entry: sampleEntries[0] } as ExamQuestion,
					userAnswer: '',
					isCorrect: true
				},
				{
					question: { entry: sampleEntries[1] } as ExamQuestion,
					userAnswer: '',
					isCorrect: false
				},
				{
					question: { entry: sampleEntries[2] } as ExamQuestion,
					userAnswer: '',
					isCorrect: true
				}
			];
			const correct = FlashcardTrainer.getCorrectAnswers(results);
			expect(correct.length).toBe(2);
			expect(correct).toContain(sampleEntries[0]);
			expect(correct).toContain(sampleEntries[2]);
		});

		it('全問不正解の場合は空配列を返す', () => {
			const results: ExamResult[] = [
				{
					question: { entry: sampleEntries[0] } as ExamQuestion,
					userAnswer: '',
					isCorrect: false
				}
			];
			const correct = FlashcardTrainer.getCorrectAnswers(results);
			expect(correct).toEqual([]);
		});
	});

	describe('filterByTags()', () => {
		it('指定したタグを含むエントリーのみ返す', () => {
			const tags = new Set(['Q符号']);
			const filtered = FlashcardTrainer.filterByTags(sampleEntries, tags);
			expect(filtered.length).toBe(3); // QTH, QSL, QRM
			filtered.forEach(entry => {
				expect(entry.tags).toContain('Q符号');
			});
		});

		it('複数のタグで OR 検索する', () => {
			const tags = new Set(['Q符号', 'Prosign']);
			const filtered = FlashcardTrainer.filterByTags(sampleEntries, tags);
			//! Q符号(3) + Prosign(1, [AR]) = 4件（QTH, QSL, QRM, [AR]）。
			expect(filtered.length).toBe(4);
		});

		it('空のタグセットで全エントリーを返す', () => {
			const tags = new Set<string>();
			const filtered = FlashcardTrainer.filterByTags(sampleEntries, tags);
			expect(filtered).toEqual(sampleEntries);
		});

		it('該当するタグがない場合は空配列を返す', () => {
			const tags = new Set(['存在しないタグ']);
			const filtered = FlashcardTrainer.filterByTags(sampleEntries, tags);
			expect(filtered).toEqual([]);
		});
	});

	describe('filterByFrequencies()', () => {
		it('指定した使用頻度のエントリーのみ返す', () => {
			const frequencies = new Set([5]);
			const filtered = FlashcardTrainer.filterByFrequencies(sampleEntries, frequencies);
			expect(filtered.length).toBe(3); // QTH, QSL, CQ
			filtered.forEach(entry => {
				expect(entry.frequency).toBe(5);
			});
		});

		it('複数の頻度で OR 検索する', () => {
			const frequencies = new Set([4, 5]);
			const filtered = FlashcardTrainer.filterByFrequencies(sampleEntries, frequencies);
			expect(filtered.length).toBe(4); // QTH, QSL, CQ, [AR]
		});

		it('空の頻度セットで全エントリーを返す', () => {
			const frequencies = new Set<number>();
			const filtered = FlashcardTrainer.filterByFrequencies(sampleEntries, frequencies);
			expect(filtered).toEqual(sampleEntries);
		});

		it('該当する頻度がない場合は空配列を返す', () => {
			const frequencies = new Set([1]);
			const filtered = FlashcardTrainer.filterByFrequencies(sampleEntries, frequencies);
			expect(filtered).toEqual([]);
		});
	});

	describe('filterByQuery()', () => {
		it('略語で検索できる', () => {
			const filtered = FlashcardTrainer.filterByQuery(sampleEntries, 'QTH');
			expect(filtered.length).toBe(1);
			expect(filtered[0].abbreviation).toBe('QTH');
		});

		it('英語で検索できる', () => {
			const filtered = FlashcardTrainer.filterByQuery(sampleEntries, 'location');
			expect(filtered.length).toBe(1);
			expect(filtered[0].abbreviation).toBe('QTH');
		});

		it('日本語で検索できる', () => {
			const filtered = FlashcardTrainer.filterByQuery(sampleEntries, '位置');
			expect(filtered.length).toBe(1);
			expect(filtered[0].abbreviation).toBe('QTH');
		});

		it('タグで検索できる', () => {
			const filtered = FlashcardTrainer.filterByQuery(sampleEntries, 'Prosign');
			expect(filtered.length).toBe(1);
			expect(filtered[0].abbreviation).toBe('[AR]');
		});

		it('大文字小文字を区別しない（英語・タグ）', () => {
			const filtered = FlashcardTrainer.filterByQuery(sampleEntries, 'calling');
			expect(filtered.length).toBe(1);
			expect(filtered[0].abbreviation).toBe('CQ');
		});

		it('空のクエリで全エントリーを返す', () => {
			const filtered = FlashcardTrainer.filterByQuery(sampleEntries, '');
			expect(filtered).toEqual(sampleEntries);
		});

		it('空白のみのクエリで全エントリーを返す', () => {
			const filtered = FlashcardTrainer.filterByQuery(sampleEntries, '   ');
			expect(filtered).toEqual(sampleEntries);
		});

		it('該当しないクエリで空配列を返す', () => {
			const filtered = FlashcardTrainer.filterByQuery(sampleEntries, 'ZZZZZ');
			expect(filtered).toEqual([]);
		});
	});

	describe('getAllTags()', () => {
		it('全てのユニークなタグを返す', () => {
			const tags = FlashcardTrainer.getAllTags(sampleEntries);
			expect(tags).toContain('Q符号');
			expect(tags).toContain('略語');
			expect(tags).toContain('Prosign');
		});

		it('重複したタグは1つだけ含まれる', () => {
			const tags = FlashcardTrainer.getAllTags(sampleEntries);
			const qCodeCount = tags.filter(t => t === 'Q符号').length;
			expect(qCodeCount).toBe(1);
		});

		it('ソートされた配列を返す', () => {
			const tags = FlashcardTrainer.getAllTags(sampleEntries);
			const sorted = [...tags].sort();
			expect(tags).toEqual(sorted);
		});

		it('空配列を渡すと空配列を返す', () => {
			const tags = FlashcardTrainer.getAllTags([]);
			expect(tags).toEqual([]);
		});
	});

	describe('sortByAbbreviation()', () => {
		it('昇順でソートする', () => {
			const sorted = FlashcardTrainer.sortByAbbreviation(sampleEntries, true);
			expect(sorted[0].abbreviation).toBe('[AR]');
			expect(sorted[1].abbreviation).toBe('CQ');
			expect(sorted[2].abbreviation).toBe('QRM');
		});

		it('降順でソートする', () => {
			const sorted = FlashcardTrainer.sortByAbbreviation(sampleEntries, false);
			expect(sorted[0].abbreviation).toBe('QTH');
			expect(sorted[sorted.length - 1].abbreviation).toBe('[AR]');
		});

		it('元の配列を変更しない', () => {
			const original = [...sampleEntries];
			FlashcardTrainer.sortByAbbreviation(sampleEntries, true);
			expect(sampleEntries).toEqual(original);
		});

		it('空配列を渡すと空配列を返す', () => {
			const sorted = FlashcardTrainer.sortByAbbreviation([], true);
			expect(sorted).toEqual([]);
		});
	});

	describe('sortByFrequency()', () => {
		it('降順（頻度の高い順）でソートする', () => {
			const sorted = FlashcardTrainer.sortByFrequency(sampleEntries, false);
			//! 頻度5→4→3の順。
			expect(sorted[0].frequency).toBe(5);
			expect(sorted[sorted.length - 1].frequency).toBe(3);
		});

		it('昇順（頻度の低い順）でソートする', () => {
			const sorted = FlashcardTrainer.sortByFrequency(sampleEntries, true);
			expect(sorted[0].frequency).toBe(3);
			expect(sorted[sorted.length - 1].frequency).toBe(5);
		});

		it('元の配列を変更しない', () => {
			const original = [...sampleEntries];
			FlashcardTrainer.sortByFrequency(sampleEntries, false);
			expect(sampleEntries).toEqual(original);
		});
	});

	describe('統合テスト', () => {
		it('フィルタリング→試験生成→採点の完全な流れ', () => {
			//! 1. タグでフィルタリング。
			const filtered = FlashcardTrainer.filterByTags(sampleEntries, new Set(['Q符号']));
			expect(filtered.length).toBe(3);

			//! 2. 試験問題を生成。
			const questions = FlashcardTrainer.generateExamQuestions(
				filtered,
				'abbr-to-meaning',
				3
			);
			expect(questions.length).toBe(3);

			//! 3. 回答をシミュレート（2問正解、1問不正解）。
			const results: ExamResult[] = [
				{
					question: questions[0],
					userAnswer: questions[0].correctAnswer,
					isCorrect: true
				},
				{
					question: questions[1],
					userAnswer: questions[1].correctAnswer,
					isCorrect: true
				},
				{
					question: questions[2],
					userAnswer: 'wrong answer',
					isCorrect: false
				}
			];

			//! 4. スコア計算。
			const score = FlashcardTrainer.calculateScore(results);
			expect(score.correct).toBe(2);
			expect(score.total).toBe(3);
			expect(score.percentage).toBe(67); // 2/3 = 66.666... → 67%

			//! 5. 合格判定。
			const passed = FlashcardTrainer.isPassed(score.percentage);
			expect(passed).toBe(false); // 67% < 80%

			//! 6. 間違えた問題を抽出。
			const wrong = FlashcardTrainer.getWrongAnswers(results);
			expect(wrong.length).toBe(1);
			expect(wrong[0]).toBe(questions[2].entry);
		});

		it('複数のフィルタを組み合わせる', () => {
			//! 頻度5のエントリーをフィルタ。
			let filtered = FlashcardTrainer.filterByFrequencies(sampleEntries, new Set([5]));
			expect(filtered.length).toBe(3);

			//! さらにタグでフィルタ。
			filtered = FlashcardTrainer.filterByTags(filtered, new Set(['Q符号']));
			expect(filtered.length).toBe(2); // QTH, QSL

			//! さらに検索クエリでフィルタ。
			filtered = FlashcardTrainer.filterByQuery(filtered, 'location');
			expect(filtered.length).toBe(1);
			expect(filtered[0].abbreviation).toBe('QTH');
		});

		it('ソート→シャッフル→問題生成の流れ', () => {
			//! 1. 頻度でソート。
			const sorted = FlashcardTrainer.sortByFrequency(sampleEntries, false);
			expect(sorted[0].frequency).toBe(5);

			//! 2. シャッフル。
			const shuffled = FlashcardTrainer.shuffleCards(sorted);
			expect(shuffled.length).toBe(sorted.length);

			//! 3. 問題生成。
			const questions = FlashcardTrainer.generateExamQuestions(
				shuffled,
				'meaning-to-abbr',
				2
			);
			expect(questions.length).toBe(2);
			questions.forEach(q => {
				expect(q.type).toBe('meaning-to-abbr');
				expect(q.choices.length).toBe(4);
			});
		});
	});
});
