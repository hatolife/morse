/**
 * listening-trainer.ts のユニットテスト
 */

import { describe, it, expect } from 'vitest';
import { ListeningTrainer, ListeningTemplate, TemplateCategory } from '../../src/trainers/listening-trainer';

describe('ListeningTrainer', () => {
	describe('generateCallsign()', () => {
		it('正しい形式のコールサインを生成する', () => {
			const callsign = ListeningTrainer.generateCallsign();
			//! JA/JE/JF等 + 数字1桁 + 英字3文字の形式。
			expect(callsign).toMatch(/^J[A-Z]\d[A-Z]{3}$/);
		});

		it('複数回呼び出しても正しい形式を維持する', () => {
			for (let i = 0; i < 10; i++) {
				const callsign = ListeningTrainer.generateCallsign();
				expect(callsign).toMatch(/^J[A-Z]\d[A-Z]{3}$/);
			}
		});

		it('プレフィックスが有効な範囲内である', () => {
			const validPrefixes = ['JA', 'JE', 'JF', 'JH', 'JI', 'JJ', 'JK', 'JL', 'JM', 'JN', 'JO', 'JP', 'JQ', 'JR'];
			const callsign = ListeningTrainer.generateCallsign();
			const prefix = callsign.substring(0, 2);
			expect(validPrefixes).toContain(prefix);
		});

		it('エリア番号が0-9の範囲内である', () => {
			const callsign = ListeningTrainer.generateCallsign();
			const area = parseInt(callsign[2]);
			expect(area).toBeGreaterThanOrEqual(0);
			expect(area).toBeLessThanOrEqual(9);
		});
	});

	describe('generateRandomQSO()', () => {
		it('ランダムなQSOテンプレートを生成する', () => {
			const qso = ListeningTrainer.generateRandomQSO();
			expect(qso.category).toBe('qso');
			expect(qso.title).toBe('Random QSO');
			expect(qso.dialog).toBeDefined();
			expect(qso.dialog!.length).toBeGreaterThan(0);
			expect(qso.id).toMatch(/^qso-random-\d+$/);
		});

		it('QSOテキストに必要な要素が含まれている', () => {
			const qso = ListeningTrainer.generateRandomQSO();
			//! dialog配列を文字列に結合。
			const fullText = qso.dialog!.map(seg => seg.text).join(' ');
			//! CQ、コールサイン、BT（区切り）、挨拶、RSTレポートなどが含まれる。
			expect(fullText).toContain('CQ');
			expect(fullText).toContain('DE');
			expect(fullText).toContain('BT');
			expect(fullText).toMatch(/[56][0-9]{2}/); // RSTレポート
		});

		it('複数回生成しても正常に動作する', () => {
			for (let i = 0; i < 5; i++) {
				const qso = ListeningTrainer.generateRandomQSO();
				expect(qso.category).toBe('qso');
				expect(qso.dialog).toBeDefined();
				expect(qso.dialog!.length).toBeGreaterThan(0);
			}
		});

		it('生成されるQSOは毎回異なる内容になる可能性がある', () => {
			//! ランダム生成なので、複数回生成すると異なる内容になる可能性が高い。
			const qsos = Array.from({ length: 10 }, () => ListeningTrainer.generateRandomQSO());
			//! 少なくとも1つは異なる内容があるはず（ランダム要素が多いため）。
			const uniqueContents = new Set(qsos.map(q => q.dialog!.map(seg => seg.text).join(' ')));
			expect(uniqueContents.size).toBeGreaterThan(1);
		});
	});

	describe('getBuiltinTemplates()', () => {
		it('カテゴリー指定なしで全テンプレートを取得できる', () => {
			const templates = ListeningTrainer.getBuiltinTemplates();
			expect(templates.length).toBeGreaterThan(0);
		});

		it('QSOカテゴリーのテンプレートを取得できる', () => {
			const templates = ListeningTrainer.getBuiltinTemplates('qso');
			expect(templates.length).toBeGreaterThan(0);
			templates.forEach(t => {
				expect(t.category).toBe('qso');
			});
		});

		it('英文100字カテゴリーのテンプレートを取得できる', () => {
			const templates = ListeningTrainer.getBuiltinTemplates('text100');
			expect(templates.length).toBeGreaterThan(0);
			templates.forEach(t => {
				expect(t.category).toBe('text100');
			});
		});

		it('英文200字カテゴリーのテンプレートを取得できる', () => {
			const templates = ListeningTrainer.getBuiltinTemplates('text200');
			expect(templates.length).toBeGreaterThan(0);
			templates.forEach(t => {
				expect(t.category).toBe('text200');
			});
		});

		it('英文300字カテゴリーのテンプレートを取得できる', () => {
			const templates = ListeningTrainer.getBuiltinTemplates('text300');
			expect(templates.length).toBeGreaterThan(0);
			templates.forEach(t => {
				expect(t.category).toBe('text300');
			});
		});

		it('各テンプレートが必要なプロパティを持っている', () => {
			const templates = ListeningTrainer.getBuiltinTemplates();
			templates.forEach(t => {
				expect(t).toHaveProperty('id');
				expect(t).toHaveProperty('category');
				expect(t).toHaveProperty('title');
				expect(typeof t.id).toBe('string');
				expect(typeof t.title).toBe('string');
				//! QSOカテゴリはdialog、テキストカテゴリはcontentを持つ。
				if (t.category === 'qso') {
					expect(t.dialog).toBeDefined();
					expect(Array.isArray(t.dialog)).toBe(true);
				} else {
					expect(t.content).toBeDefined();
					expect(typeof t.content).toBe('string');
				}
			});
		});

		it('返された配列は新しいインスタンスである', () => {
			const templates1 = ListeningTrainer.getBuiltinTemplates('qso');
			const templates2 = ListeningTrainer.getBuiltinTemplates('qso');
			expect(templates1).not.toBe(templates2);
			expect(templates1).toEqual(templates2);
		});
	});

	describe('getTemplateById()', () => {
		it('存在するIDでテンプレートを取得できる', () => {
			const template = ListeningTrainer.getTemplateById('qso-rubberstamp-1');
			expect(template).toBeDefined();
			expect(template?.id).toBe('qso-rubberstamp-1');
			expect(template?.category).toBe('qso');
		});

		it('存在しないIDではundefinedを返す', () => {
			const template = ListeningTrainer.getTemplateById('nonexistent-id');
			expect(template).toBeUndefined();
		});

		it('各カテゴリーのテンプレートを取得できる', () => {
			const qso = ListeningTrainer.getTemplateById('qso-rubberstamp-1');
			const text100 = ListeningTrainer.getTemplateById('text100-1');
			const text200 = ListeningTrainer.getTemplateById('text200-1');
			const text300 = ListeningTrainer.getTemplateById('text300-1');

			expect(qso?.category).toBe('qso');
			expect(text100?.category).toBe('text100');
			expect(text200?.category).toBe('text200');
			expect(text300?.category).toBe('text300');
		});
	});

	describe('calculateAccuracy()', () => {
		it('完全一致で100%を返す', () => {
			const accuracy = ListeningTrainer.calculateAccuracy('HELLO WORLD', 'HELLO WORLD');
			expect(accuracy).toBe(100);
		});

		it('完全不一致で0%を返す', () => {
			const accuracy = ListeningTrainer.calculateAccuracy('AAAAA', 'BBBBB');
			expect(accuracy).toBe(0);
		});

		it('半分一致で50%を返す', () => {
			const accuracy = ListeningTrainer.calculateAccuracy('AB', 'AC');
			expect(accuracy).toBe(50);
		});

		it('空白を無視して比較する', () => {
			const accuracy = ListeningTrainer.calculateAccuracy('H E L L O', 'HELLO');
			expect(accuracy).toBe(100);
		});

		it('大文字小文字を区別しない', () => {
			const accuracy = ListeningTrainer.calculateAccuracy('HELLO', 'hello');
			expect(accuracy).toBe(100);
		});

		it('大文字小文字混在でも正しく比較する', () => {
			const accuracy = ListeningTrainer.calculateAccuracy('Hello World', 'HELLO WORLD');
			expect(accuracy).toBe(100);
		});

		it('ユーザー入力が空の場合は0%を返す', () => {
			const accuracy = ListeningTrainer.calculateAccuracy('HELLO', '');
			expect(accuracy).toBe(0);
		});

		it('正解が空の場合は0%を返す', () => {
			const accuracy = ListeningTrainer.calculateAccuracy('', 'HELLO');
			expect(accuracy).toBe(0);
		});

		it('長さが異なる場合は長い方の長さで計算する', () => {
			const accuracy = ListeningTrainer.calculateAccuracy('AB', 'ABCDE');
			//! ABが一致、残り3文字が不一致 → 2/5 = 40%。
			expect(accuracy).toBe(40);
		});

		it('入力が正解より長い場合も正しく計算する', () => {
			const accuracy = ListeningTrainer.calculateAccuracy('ABC', 'ABCDE');
			//! ABCが一致、残り2文字が不一致 → 3/5 = 60%。
			expect(accuracy).toBe(60);
		});

		it('整数パーセントを返す', () => {
			const accuracy = ListeningTrainer.calculateAccuracy('AAA', 'AAB');
			//! 2/3 = 66.666... → 67%。
			expect(accuracy).toBe(67);
			expect(Number.isInteger(accuracy)).toBe(true);
		});
	});

	describe('isPassed()', () => {
		it('デフォルトの閾値（90%）で合格判定する', () => {
			expect(ListeningTrainer.isPassed(90)).toBe(true);
			expect(ListeningTrainer.isPassed(95)).toBe(true);
			expect(ListeningTrainer.isPassed(100)).toBe(true);
			expect(ListeningTrainer.isPassed(89)).toBe(false);
			expect(ListeningTrainer.isPassed(50)).toBe(false);
		});

		it('カスタム閾値で合格判定する', () => {
			expect(ListeningTrainer.isPassed(80, 75)).toBe(true);
			expect(ListeningTrainer.isPassed(74, 75)).toBe(false);
		});

		it('100%の閾値で完全一致のみ合格とする', () => {
			expect(ListeningTrainer.isPassed(100, 100)).toBe(true);
			expect(ListeningTrainer.isPassed(99, 100)).toBe(false);
		});

		it('0%の閾値で全て合格とする', () => {
			expect(ListeningTrainer.isPassed(0, 0)).toBe(true);
			expect(ListeningTrainer.isPassed(50, 0)).toBe(true);
			expect(ListeningTrainer.isPassed(100, 0)).toBe(true);
		});
	});

	describe('getTemplateCounts()', () => {
		it('各カテゴリーのテンプレート数を取得できる', () => {
			const counts = ListeningTrainer.getTemplateCounts();
			expect(counts).toHaveProperty('qso');
			expect(counts).toHaveProperty('text100');
			expect(counts).toHaveProperty('text200');
			expect(counts).toHaveProperty('text300');
			expect(counts.qso).toBeGreaterThan(0);
			expect(counts.text100).toBeGreaterThan(0);
			expect(counts.text200).toBeGreaterThan(0);
			expect(counts.text300).toBeGreaterThan(0);
		});

		it('カウント数が実際のテンプレート数と一致する', () => {
			const counts = ListeningTrainer.getTemplateCounts();
			const qsoTemplates = ListeningTrainer.getBuiltinTemplates('qso');
			const text100Templates = ListeningTrainer.getBuiltinTemplates('text100');
			const text200Templates = ListeningTrainer.getBuiltinTemplates('text200');
			const text300Templates = ListeningTrainer.getBuiltinTemplates('text300');

			expect(counts.qso).toBe(qsoTemplates.length);
			expect(counts.text100).toBe(text100Templates.length);
			expect(counts.text200).toBe(text200Templates.length);
			expect(counts.text300).toBe(text300Templates.length);
		});
	});

	describe('getTotalTemplateCount()', () => {
		it('全ビルトインテンプレートの総数を取得できる', () => {
			const total = ListeningTrainer.getTotalTemplateCount();
			expect(total).toBeGreaterThan(0);
		});

		it('総数が全カテゴリーの合計と一致する', () => {
			const total = ListeningTrainer.getTotalTemplateCount();
			const counts = ListeningTrainer.getTemplateCounts();
			const sum = counts.qso + counts.text100 + counts.text200 + counts.text300;
			expect(total).toBe(sum);
		});

		it('総数が全テンプレート配列の長さと一致する', () => {
			const total = ListeningTrainer.getTotalTemplateCount();
			const allTemplates = ListeningTrainer.getBuiltinTemplates();
			expect(total).toBe(allTemplates.length);
		});
	});

	describe('統合テスト', () => {
		it('ランダムQSO生成からテンプレート取得までの流れ', () => {
			//! ランダムQSO生成。
			const randomQSO = ListeningTrainer.generateRandomQSO();
			expect(randomQSO).toBeDefined();
			expect(randomQSO.dialog).toBeTruthy();
		expect(randomQSO.dialog!.length).toBeGreaterThan(0);

			//! ビルトインテンプレート取得。
			const qsoTemplates = ListeningTrainer.getBuiltinTemplates('qso');
			expect(qsoTemplates.length).toBeGreaterThan(0);

			//! 特定のテンプレート取得。
			const template = ListeningTrainer.getTemplateById('qso-rubberstamp-1');
			expect(template).toBeDefined();
		});

		it('聞き取り練習の完全な流れをシミュレート', () => {
			//! 1. テンプレートを選択。
			const template = ListeningTrainer.getTemplateById('text100-1');
			expect(template).toBeDefined();

			if (!template) return;

			//! 2. ユーザー入力をシミュレート（部分的に間違った入力）。
			const correctAnswer = template.content!;
			const userInput = correctAnswer.substring(0, Math.floor(correctAnswer.length * 0.9));

			//! 3. 正答率を計算。
			const accuracy = ListeningTrainer.calculateAccuracy(correctAnswer, userInput);
			expect(accuracy).toBeGreaterThan(0);
			expect(accuracy).toBeLessThan(100);

			//! 4. 合格判定。
			const passed = ListeningTrainer.isPassed(accuracy);
			//! 90%未満なので不合格。
			expect(passed).toBe(false);
		});

		it('完全一致の場合は100%で合格となる', () => {
			const template = ListeningTrainer.getTemplateById('text100-1');
			expect(template).toBeDefined();

			if (!template) return;

			const correctAnswer = template.content!;
			const accuracy = ListeningTrainer.calculateAccuracy(correctAnswer, correctAnswer);
			expect(accuracy).toBe(100);
			expect(ListeningTrainer.isPassed(accuracy)).toBe(true);
		});
	});

	describe('QSOテンプレートのdialog構造', () => {
		it('QSOテンプレートはdialog配列を持つ', () => {
			const templates = ListeningTrainer.getBuiltinTemplates('qso');

			expect(templates.length).toBeGreaterThan(0);

			for (const template of templates) {
				expect(template.dialog).toBeDefined();
				expect(Array.isArray(template.dialog)).toBe(true);
				if (template.dialog && template.dialog.length > 0) {
					expect(template.dialog[0]).toHaveProperty('side');
					expect(template.dialog[0]).toHaveProperty('text');
					expect(['A', 'B']).toContain(template.dialog[0].side);
				}
			}
		});

		it('generateRandomQSO()はdialog構造を持つQSOを生成する', () => {
			const qso = ListeningTrainer.generateRandomQSO();

			expect(qso.category).toBe('qso');
			expect(qso.dialog).toBeDefined();
			expect(Array.isArray(qso.dialog)).toBe(true);
			expect(qso.dialog!.length).toBeGreaterThan(0);

			//! 各セグメントにside情報が含まれる。
			for (const segment of qso.dialog!) {
				expect(['A', 'B']).toContain(segment.side);
				expect(segment.text).toBeTruthy();
			}
		});
	});
});
