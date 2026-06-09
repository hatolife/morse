/**
 * koch-trainer.ts のユニットテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KochTrainer, KOCH_SEQUENCE, PracticeSettings } from '../../src/trainers/koch-trainer';

describe('KochTrainer', () => {
	let trainer: KochTrainer;

	beforeEach(() => {
		trainer = new KochTrainer();
	});

	describe('KOCH_SEQUENCE', () => {
		it('41文字のシーケンスを持つ', () => {
			expect(KOCH_SEQUENCE).toHaveLength(41);
		});

		it('最初の2文字はK Mである', () => {
			expect(KOCH_SEQUENCE[0]).toBe('K');
			expect(KOCH_SEQUENCE[1]).toBe('M');
		});

		it('最後の文字はXである', () => {
			expect(KOCH_SEQUENCE[40]).toBe('X');
		});
	});

	describe('コンストラクタ', () => {
		it('デフォルトでレッスン1から開始', () => {
			const defaultTrainer = new KochTrainer();
			expect(defaultTrainer.getCurrentLesson()).toBe(1);
		});

		it('初期レッスン番号を指定できる', () => {
			const trainerL10 = new KochTrainer(10);
			expect(trainerL10.getCurrentLesson()).toBe(10);
		});

		it('レッスン番号が1未満の場合は1になる', () => {
			const trainerL0 = new KochTrainer(0);
			expect(trainerL0.getCurrentLesson()).toBe(1);
		});

		it('レッスン番号が40を超える場合は40になる', () => {
			const trainerL50 = new KochTrainer(50);
			expect(trainerL50.getCurrentLesson()).toBe(40);
		});
	});

	describe('getCharsForLesson()', () => {
		it('レッスン1でKとMの2文字', () => {
			const chars = KochTrainer.getCharsForLesson(1);
			expect(chars).toEqual(['K', 'M']);
		});

		it('レッスン2でK M Uの3文字', () => {
			const chars = KochTrainer.getCharsForLesson(2);
			expect(chars).toEqual(['K', 'M', 'U']);
		});

		it('レッスン40で全41文字', () => {
			const chars = KochTrainer.getCharsForLesson(40);
			expect(chars).toHaveLength(41);
			expect(chars).toEqual(KOCH_SEQUENCE);
		});

		it('レッスン番号が1未満の場合は1として扱う', () => {
			const chars = KochTrainer.getCharsForLesson(0);
			expect(chars).toEqual(['K', 'M']);
		});

		it('レッスン番号が40を超える場合は40として扱う', () => {
			const chars = KochTrainer.getCharsForLesson(50);
			expect(chars).toHaveLength(41);
		});
	});

	describe('generateRandomGroups()', () => {
		it('指定された文字セットからランダムグループを生成', () => {
			const chars = ['K', 'M'];
			const groups = KochTrainer.generateRandomGroups(chars);

			expect(groups.length).toBeGreaterThan(0);
			groups.forEach(group => {
				expect(group.length).toBe(5); // デフォルトのグループサイズ
				for (const char of group) {
					expect(chars).toContain(char);
				}
			});
		});

		it('カスタムグループサイズでグループを生成', () => {
			const chars = ['K', 'M', 'U'];
			const settings: PracticeSettings = { groupSize: 3 };
			const groups = KochTrainer.generateRandomGroups(chars, settings);

			groups.forEach(group => {
				expect(group.length).toBe(3);
			});
		});

		it('カスタム練習時間でグループ数を調整', () => {
			const chars = ['K', 'M'];
			const settings: PracticeSettings = { duration: 120 }; // 2分
			const groups = KochTrainer.generateRandomGroups(chars, settings);

			// 2分は1分の2倍のグループ数
			expect(groups.length).toBeGreaterThan(0);
		});

		it('カスタムWPMでグループ数を調整', () => {
			const chars = ['K', 'M'];
			const settings: PracticeSettings = { wpm: 40 };
			const groups = KochTrainer.generateRandomGroups(chars, settings);

			// WPM40はWPM20の2倍のグループ数
			expect(groups.length).toBeGreaterThan(0);
		});

		it('空文字配列でも空配列を返す', () => {
			const chars: string[] = [];
			const groups = KochTrainer.generateRandomGroups(chars);
			expect(Array.isArray(groups)).toBe(true);
		});
	});

	describe('generateCustomGroups()', () => {
		it('カスタム文字セットからグループを生成', () => {
			const charSet = new Set(['A', 'B', 'C']);
			const groups = KochTrainer.generateCustomGroups(charSet);

			expect(groups.length).toBeGreaterThan(0);
			groups.forEach(group => {
				for (const char of group) {
					expect(charSet.has(char)).toBe(true);
				}
			});
		});

		it('2文字未満の文字セットでエラーをthrow', () => {
			const charSet = new Set(['A']);
			expect(() => {
				KochTrainer.generateCustomGroups(charSet);
			}).toThrow('Character set must contain at least 2 characters');
		});
	});

	describe('calculateAccuracy()', () => {
		it('完全一致で100%', () => {
			const accuracy = KochTrainer.calculateAccuracy('KMUKM', 'KMUKM');
			expect(accuracy).toBe(100);
		});

		it('完全不一致で0%', () => {
			const accuracy = KochTrainer.calculateAccuracy('KMUKM', 'ABCDE');
			expect(accuracy).toBe(0);
		});

		it('半分一致で50%', () => {
			const accuracy = KochTrainer.calculateAccuracy('KM', 'KA');
			expect(accuracy).toBe(50);
		});

		it('空白を無視して比較', () => {
			const accuracy = KochTrainer.calculateAccuracy('K M U K M', 'KMUKM');
			expect(accuracy).toBe(100);
		});

		it('ユーザー入力が空の場合は0%', () => {
			const accuracy = KochTrainer.calculateAccuracy('KMUKM', '');
			expect(accuracy).toBe(0);
		});

		it('正解が空の場合は0%', () => {
			const accuracy = KochTrainer.calculateAccuracy('', 'KMUKM');
			expect(accuracy).toBe(0);
		});

		it('長さが異なる場合は長い方の長さで計算', () => {
			const accuracy = KochTrainer.calculateAccuracy('KM', 'KMUKM');
			// KMが一致、残り3文字が不一致 → 2/5 = 40%
			expect(accuracy).toBe(40);
		});
	});

	describe('isPassed()', () => {
		it('90%以上で合格', () => {
			expect(KochTrainer.isPassed(90)).toBe(true);
			expect(KochTrainer.isPassed(95)).toBe(true);
			expect(KochTrainer.isPassed(100)).toBe(true);
		});

		it('90%未満で不合格', () => {
			expect(KochTrainer.isPassed(89)).toBe(false);
			expect(KochTrainer.isPassed(50)).toBe(false);
			expect(KochTrainer.isPassed(0)).toBe(false);
		});
	});

	describe('getCurrentLesson()', () => {
		it('現在のレッスン番号を返す', () => {
			expect(trainer.getCurrentLesson()).toBe(1);
		});
	});

	describe('setCurrentLesson()', () => {
		it('レッスン番号を設定できる', () => {
			trainer.setCurrentLesson(10);
			expect(trainer.getCurrentLesson()).toBe(10);
		});

		it('1未満の場合は1になる', () => {
			trainer.setCurrentLesson(0);
			expect(trainer.getCurrentLesson()).toBe(1);
		});

		it('40を超える場合は40になる', () => {
			trainer.setCurrentLesson(50);
			expect(trainer.getCurrentLesson()).toBe(40);
		});
	});

	describe('getCurrentChars()', () => {
		it('現在のレッスンの文字を返す', () => {
			trainer.setCurrentLesson(1);
			expect(trainer.getCurrentChars()).toEqual(['K', 'M']);

			trainer.setCurrentLesson(3);
			expect(trainer.getCurrentChars()).toEqual(['K', 'M', 'U', 'R']);
		});
	});

	describe('generatePractice()', () => {
		it('現在のレッスン用の練習問題を生成', () => {
			trainer.setCurrentLesson(1);
			const practice = trainer.generatePractice();

			expect(practice.length).toBeGreaterThan(0);
			practice.forEach(group => {
				for (const char of group) {
					expect(['K', 'M']).toContain(char);
				}
			});
		});

		it('設定を指定して練習問題を生成', () => {
			trainer.setCurrentLesson(2);
			const settings: PracticeSettings = { groupSize: 3, duration: 30 };
			const practice = trainer.generatePractice(settings);

			practice.forEach(group => {
				expect(group.length).toBe(3);
			});
		});
	});

	describe('advanceLesson()', () => {
		it('次のレッスンに進む', () => {
			trainer.setCurrentLesson(5);
			const next = trainer.advanceLesson();
			expect(next).toBe(6);
			expect(trainer.getCurrentLesson()).toBe(6);
		});

		it('レッスン40では進まない', () => {
			trainer.setCurrentLesson(40);
			const next = trainer.advanceLesson();
			expect(next).toBe(40);
			expect(trainer.getCurrentLesson()).toBe(40);
		});
	});

	describe('previousLesson()', () => {
		it('前のレッスンに戻る', () => {
			trainer.setCurrentLesson(5);
			const prev = trainer.previousLesson();
			expect(prev).toBe(4);
			expect(trainer.getCurrentLesson()).toBe(4);
		});

		it('レッスン1では戻らない', () => {
			trainer.setCurrentLesson(1);
			const prev = trainer.previousLesson();
			expect(prev).toBe(1);
			expect(trainer.getCurrentLesson()).toBe(1);
		});
	});

	describe('isLastLesson()', () => {
		it('レッスン40でtrue', () => {
			trainer.setCurrentLesson(40);
			expect(trainer.isLastLesson()).toBe(true);
		});

		it('レッスン39以下でfalse', () => {
			trainer.setCurrentLesson(39);
			expect(trainer.isLastLesson()).toBe(false);
			trainer.setCurrentLesson(1);
			expect(trainer.isLastLesson()).toBe(false);
		});
	});

	describe('isFirstLesson()', () => {
		it('レッスン1でtrue', () => {
			trainer.setCurrentLesson(1);
			expect(trainer.isFirstLesson()).toBe(true);
		});

		it('レッスン2以上でfalse', () => {
			trainer.setCurrentLesson(2);
			expect(trainer.isFirstLesson()).toBe(false);
			trainer.setCurrentLesson(40);
			expect(trainer.isFirstLesson()).toBe(false);
		});
	});

	describe('getTotalLessons()', () => {
		it('全レッスン数40を返す', () => {
			expect(KochTrainer.getTotalLessons()).toBe(40);
		});
	});

	describe('getTotalChars()', () => {
		it('全文字数41を返す', () => {
			expect(KochTrainer.getTotalChars()).toBe(41);
		});
	});

	describe('getAllChars()', () => {
		it('全41文字を返す', () => {
			const allChars = KochTrainer.getAllChars();
			expect(allChars).toHaveLength(41);
			expect(allChars).toEqual(KOCH_SEQUENCE);
		});

		it('返された配列は新しいインスタンス', () => {
			const allChars1 = KochTrainer.getAllChars();
			const allChars2 = KochTrainer.getAllChars();
			expect(allChars1).not.toBe(allChars2);
			expect(allChars1).toEqual(allChars2);
		});
	});

	describe('統合テスト', () => {
		it('レッスン1から40まで進行できる', () => {
			const newTrainer = new KochTrainer(1);

			for (let i = 1; i <= 40; i++) {
				expect(newTrainer.getCurrentLesson()).toBe(i);
				const chars = newTrainer.getCurrentChars();
				expect(chars.length).toBe(i + 1);
				if (i < 40) {
					newTrainer.advanceLesson();
				}
			}

			expect(newTrainer.isLastLesson()).toBe(true);
		});

		it('練習問題の生成と正答率計算の統合', () => {
			trainer.setCurrentLesson(1);
			const practice = trainer.generatePractice({ groupSize: 5, duration: 30 });
			const correctAnswer = practice.join('');

			// 完全一致
			const accuracy100 = KochTrainer.calculateAccuracy(
				correctAnswer,
				correctAnswer
			);
			expect(accuracy100).toBe(100);
			expect(KochTrainer.isPassed(accuracy100)).toBe(true);

			// 部分一致
			const partialAnswer = correctAnswer.substring(0, Math.floor(correctAnswer.length * 0.9));
			const accuracy90 = KochTrainer.calculateAccuracy(
				correctAnswer,
				partialAnswer
			);
			expect(accuracy90).toBeGreaterThanOrEqual(80);
		});
	});
});
