/**
 * morse-codec.ts のユニットテスト
 */

import { describe, it, expect } from 'vitest';
import { MorseCodec } from '../../src/core/morse-codec';

describe('MorseCodec', () => {
	describe('textToMorse()', () => {
		describe('アルファベット変換', () => {
			it('大文字アルファベットA-Zを正しく変換できる', () => {
				expect(MorseCodec.textToMorse('A')).toBe('.-');
				expect(MorseCodec.textToMorse('B')).toBe('-...');
				expect(MorseCodec.textToMorse('C')).toBe('-.-.');
				expect(MorseCodec.textToMorse('D')).toBe('-..');
				expect(MorseCodec.textToMorse('E')).toBe('.');
				expect(MorseCodec.textToMorse('Z')).toBe('--..');
			});

			it('小文字アルファベットを大文字に正規化して変換できる', () => {
				expect(MorseCodec.textToMorse('a')).toBe('.-');
				expect(MorseCodec.textToMorse('b')).toBe('-...');
				expect(MorseCodec.textToMorse('hello')).toBe('.... . .-.. .-.. ---');
			});

			it('大文字小文字混在の文字列を正しく変換できる', () => {
				expect(MorseCodec.textToMorse('HeLLo')).toBe('.... . .-.. .-.. ---');
			});

			it('複数のアルファベットをスペース区切りで変換できる', () => {
				expect(MorseCodec.textToMorse('SOS')).toBe('... --- ...');
				expect(MorseCodec.textToMorse('CQ')).toBe('-.-. --.-');
			});
		});

		describe('数字変換', () => {
			it('数字0-9を正しく変換できる', () => {
				expect(MorseCodec.textToMorse('0')).toBe('-----');
				expect(MorseCodec.textToMorse('1')).toBe('.----');
				expect(MorseCodec.textToMorse('2')).toBe('..---');
				expect(MorseCodec.textToMorse('3')).toBe('...--');
				expect(MorseCodec.textToMorse('4')).toBe('....-');
				expect(MorseCodec.textToMorse('5')).toBe('.....');
				expect(MorseCodec.textToMorse('6')).toBe('-....');
				expect(MorseCodec.textToMorse('7')).toBe('--...');
				expect(MorseCodec.textToMorse('8')).toBe('---..');
				expect(MorseCodec.textToMorse('9')).toBe('----.');
			});

			it('複数の数字を正しく変換できる', () => {
				expect(MorseCodec.textToMorse('123')).toBe('.---- ..--- ...--');
				expect(MorseCodec.textToMorse('599')).toBe('..... ----. ----.');
			});
		});

		describe('特殊文字変換', () => {
			it('ピリオド(.)を正しく変換できる', () => {
				expect(MorseCodec.textToMorse('.')).toBe('.-.-.-');
			});

			it('カンマ(,)を正しく変換できる', () => {
				expect(MorseCodec.textToMorse(',')).toBe('--..--');
			});

			it('コロン(:)を正しく変換できる', () => {
				expect(MorseCodec.textToMorse(':')).toBe('---...');
			});

			it('クエスチョンマーク(?)を正しく変換できる', () => {
				expect(MorseCodec.textToMorse('?')).toBe('..--..');
			});

			it('アンダースコア(_)を正しく変換できる', () => {
				expect(MorseCodec.textToMorse('_')).toBe('..--.-');
			});

			it('スラッシュ(/)を正しく変換できる', () => {
				expect(MorseCodec.textToMorse('/')).toBe('-..-.');
			});

			it('アットマーク(@)を正しく変換できる', () => {
				expect(MorseCodec.textToMorse('@')).toBe('.--.-.');
			});

			it('括弧()を正しく変換できる', () => {
				expect(MorseCodec.textToMorse('(')).toBe('-.--.');
				expect(MorseCodec.textToMorse(')')).toBe('-.--.-');
			});

			it('引用符を正しく変換できる', () => {
				expect(MorseCodec.textToMorse('"')).toBe('.-..-.');
				expect(MorseCodec.textToMorse("'")).toBe('.----.');
			});
		});

		describe('スペース処理', () => {
			it('スペースを/に変換できる', () => {
				expect(MorseCodec.textToMorse('A B')).toBe('.- / -...');
			});

		it('複数のスペースも/に変換できる', () => {
			expect(MorseCodec.textToMorse('A  B')).toBe('.- / / -...');
			expect(MorseCodec.textToMorse('A   B')).toBe('.- / / / -...');
		});

			it('文頭・文末のスペースを適切に処理できる', () => {
				expect(MorseCodec.textToMorse(' A')).toBe('/ .-');
				expect(MorseCodec.textToMorse('A ')).toBe('.- /');
			});
		});

		describe('Prosign処理', () => {
			it('[AR]をprosignとして処理できる（スペースなし結合）', () => {
				const result = MorseCodec.textToMorse('[AR]');
				expect(result).toBe('.-.-.');
			});

			it('[SK]をprosignとして処理できる', () => {
				const result = MorseCodec.textToMorse('[SK]');
				expect(result).toBe('...-.-');
			});

			it('[AS]（待機）をprosignとして処理できる', () => {
				const result = MorseCodec.textToMorse('[AS]');
				expect(result).toBe('.-...');
			});

			it('[BT]（区切り）をprosignとして処理できる', () => {
				const result = MorseCodec.textToMorse('[BT]');
				expect(result).toBe('-...-');
			});

			it('prosignと通常テキストの混在を処理できる', () => {
				const result = MorseCodec.textToMorse('CQ [AR]');
				expect(result).toBe('-.-. --.- / .-.-.');
			});
		});

		describe('エッジケース', () => {
			it('空文字列を処理できる', () => {
				expect(MorseCodec.textToMorse('')).toBe('');
			});

			it('未対応文字をそのまま出力する', () => {
				const result = MorseCodec.textToMorse('A☆B');
				expect(result).toContain('.-');
				expect(result).toContain('-...');
			});
		});
	});

	describe('morseToText()', () => {
		describe('基本変換', () => {
			it('モールス符号をアルファベットに変換できる', () => {
				expect(MorseCodec.morseToText(['.-'])).toBe('A');
				expect(MorseCodec.morseToText(['-...'])).toBe('B');
				expect(MorseCodec.morseToText(['-.-.'])).toBe('C');
			});

			it('複数のモールス符号を連続変換できる', () => {
				expect(MorseCodec.morseToText(['...', '---', '...'])).toBe('SOS');
				expect(MorseCodec.morseToText(['....', '.', '.-..', '.-..', '---'])).toBe('HELLO');
			});

			it('数字を変換できる', () => {
				expect(MorseCodec.morseToText(['-----'])).toBe('0');
				expect(MorseCodec.morseToText(['.----'])).toBe('1');
				expect(MorseCodec.morseToText(['..---'])).toBe('2');
			});
		});

		describe('スペース処理', () => {
			it('/を語間スペースに変換できる', () => {
				expect(MorseCodec.morseToText(['.-', '/', '-...'])).toBe('A B');
			});

			it('空文字列要素を無視する', () => {
				expect(MorseCodec.morseToText(['.-', '', '-...'])).toBe('AB');
			});
		});

		describe('エラー処理', () => {
			it('未知のモールス符号を?に変換する', () => {
				expect(MorseCodec.morseToText(['.-', '.......', '-...'])).toBe('A?B');
			});

			it('空配列を処理できる', () => {
				expect(MorseCodec.morseToText([])).toBe('');
			});
		});
	});

	describe('charToMorse()', () => {
		it('1文字をモールス符号に変換できる', () => {
			expect(MorseCodec.charToMorse('A')).toBe('.-');
			expect(MorseCodec.charToMorse('a')).toBe('.-');
			expect(MorseCodec.charToMorse('0')).toBe('-----');
		});

		it('未対応文字の場合undefinedを返す', () => {
			expect(MorseCodec.charToMorse('☆')).toBeUndefined();
		});
	});

	describe('getMorseMap()', () => {
		it('モールス符号マップを取得できる', () => {
			const map = MorseCodec.getMorseMap();
			expect(map['A']).toBe('.-');
			expect(map['B']).toBe('-...');
			expect(map['0']).toBe('-----');
		});

		it('返されるマップは元のマップのコピーである', () => {
			const map1 = MorseCodec.getMorseMap();
			const map2 = MorseCodec.getMorseMap();
			expect(map1).not.toBe(map2); // 参照が異なる
			expect(map1).toEqual(map2); // 内容は同じ
		});
	});
});
