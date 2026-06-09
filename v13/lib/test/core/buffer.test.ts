/**
 * buffer.ts のユニットテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MorseBuffer } from '../../src/core/buffer';

describe('MorseBuffer', () => {
	let buffer: MorseBuffer;

	beforeEach(() => {
		buffer = new MorseBuffer();
	});

	describe('初期状態', () => {
		it('初期状態でバッファとシーケンスが空である', () => {
			expect(buffer.getBuffer()).toBe('');
			expect(buffer.getSequence()).toBe('');
			expect(buffer.isEmpty()).toBe(true);
		});
	});

	describe('addElement()', () => {
		it('dotをシーケンスに追加できる', () => {
			buffer.addElement('.');
			expect(buffer.getSequence()).toBe('.');
		});

		it('dashをシーケンスに追加できる', () => {
			buffer.addElement('-');
			expect(buffer.getSequence()).toBe('-');
		});

		it('複数の要素を連続して追加できる', () => {
			buffer.addElement('.');
			buffer.addElement('.');
			buffer.addElement('-');
			expect(buffer.getSequence()).toBe('..-');
		});
	});

	describe('commitSequence()', () => {
		it('シーケンスをバッファに確定できる', () => {
			buffer.addElement('.');
			buffer.addElement('.');
			buffer.commitSequence();

			expect(buffer.getBuffer()).toBe('.. ');
			expect(buffer.getSequence()).toBe('');
		});

		it('addSpace=falseの場合スペースを追加しない', () => {
			buffer.addElement('.');
			buffer.commitSequence(false);

			expect(buffer.getBuffer()).toBe('.');
			expect(buffer.getSequence()).toBe('');
		});

		it('シーケンスが空の場合は何もしない', () => {
			buffer.commitSequence();

			expect(buffer.getBuffer()).toBe('');
			expect(buffer.getSequence()).toBe('');
		});

		it('複数回確定できる', () => {
			buffer.addElement('.');
			buffer.commitSequence();

			buffer.addElement('-');
			buffer.addElement('-');
			buffer.commitSequence();

			expect(buffer.getBuffer()).toBe('. -- ');
			expect(buffer.getSequence()).toBe('');
		});
	});

	describe('addWordSeparator()', () => {
		it('語間スペース（/）を追加できる', () => {
			buffer.addWordSeparator();
			expect(buffer.getBuffer()).toBe('/ ');
		});

		it('シーケンスがある場合は確定してから語間スペースを追加する', () => {
			buffer.addElement('.');
			buffer.addElement('.');
			buffer.addWordSeparator();

			expect(buffer.getBuffer()).toBe('.. / ');
			expect(buffer.getSequence()).toBe('');
		});

		it('すでに"/ "で終わっている場合は追加しない', () => {
			buffer.addWordSeparator();
			buffer.addWordSeparator();

			expect(buffer.getBuffer()).toBe('/ ');
		});

		it('他のバッファがある場合に語間スペースを追加できる', () => {
			buffer.addElement('.');
			buffer.commitSequence();
			buffer.addWordSeparator();

			expect(buffer.getBuffer()).toBe('. / ');
		});
	});

	describe('clear()', () => {
		it('バッファとシーケンスをクリアできる', () => {
			buffer.addElement('.');
			buffer.addElement('-');
			buffer.commitSequence();
			buffer.addElement('.');

			buffer.clear();

			expect(buffer.getBuffer()).toBe('');
			expect(buffer.getSequence()).toBe('');
			expect(buffer.isEmpty()).toBe(true);
		});
	});

	describe('endsWith()', () => {
		it('バッファの末尾をチェックできる', () => {
			buffer.addElement('.');
			buffer.commitSequence();

			expect(buffer.endsWith('. ')).toBe(true);
			expect(buffer.endsWith('.')).toBe(false);
		});

		it('語間スペースで終わっているかチェックできる', () => {
			buffer.addWordSeparator();

			expect(buffer.endsWith('/ ')).toBe(true);
			expect(buffer.endsWith('/')).toBe(false);
		});
	});

	describe('getBufferLength(), getSequenceLength()', () => {
		it('バッファの長さを取得できる', () => {
			buffer.addElement('.');
			buffer.commitSequence();

			expect(buffer.getBufferLength()).toBe(2); // '. '
			expect(buffer.getSequenceLength()).toBe(0);
		});

		it('シーケンスの長さを取得できる', () => {
			buffer.addElement('.');
			buffer.addElement('-');

			expect(buffer.getBufferLength()).toBe(0);
			expect(buffer.getSequenceLength()).toBe(2); // '.-'
		});
	});

	describe('isEmpty()', () => {
		it('バッファとシーケンスが両方空の場合trueを返す', () => {
			expect(buffer.isEmpty()).toBe(true);
		});

		it('シーケンスがある場合falseを返す', () => {
			buffer.addElement('.');
			expect(buffer.isEmpty()).toBe(false);
		});

		it('バッファがある場合falseを返す', () => {
			buffer.addElement('.');
			buffer.commitSequence();
			expect(buffer.isEmpty()).toBe(false);
		});
	});

	describe('統合テスト', () => {
		it('SOSを入力するシナリオ', () => {
			// S = ...
			buffer.addElement('.');
			buffer.addElement('.');
			buffer.addElement('.');
			buffer.commitSequence();

			// O = ---
			buffer.addElement('-');
			buffer.addElement('-');
			buffer.addElement('-');
			buffer.commitSequence();

			// S = ...
			buffer.addElement('.');
			buffer.addElement('.');
			buffer.addElement('.');
			buffer.commitSequence();

			expect(buffer.getBuffer()).toBe('... --- ... ');
		});

		it('語間スペースを含む入力シナリオ', () => {
			// CQ
			buffer.addElement('-');
			buffer.addElement('.');
			buffer.addElement('-');
			buffer.addElement('.');
			buffer.commitSequence();

			buffer.addElement('-');
			buffer.addElement('-');
			buffer.addElement('.');
			buffer.addElement('-');
			buffer.commitSequence();

			// 語間スペース
			buffer.addWordSeparator();

			// DE
			buffer.addElement('-');
			buffer.addElement('.');
			buffer.addElement('.');
			buffer.commitSequence();

			buffer.addElement('.');
			buffer.commitSequence();

			expect(buffer.getBuffer()).toBe('-.-. --.- / -.. . ');
		});
	});
});
