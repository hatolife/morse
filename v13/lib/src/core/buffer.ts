/**
 * モールス信号バッファ管理クラス
 * 入力中のシーケンスと確定済みのバッファを管理する
 * UI非依存のピュアなロジックモジュール
 */

export class MorseBuffer {
	/** 確定済みのモールス符号バッファ */
	private buffer: string = '';

	/** 入力中のモールス符号シーケンス */
	private sequence: string = '';

	/**
	 * 現在入力中のシーケンスを取得する
	 *
	 * @returns 入力中のモールス符号シーケンス
	 */
	getSequence(): string {
		return this.sequence;
	}

	/**
	 * 確定済みのバッファを取得する
	 *
	 * @returns 確定済みのモールス符号バッファ
	 */
	getBuffer(): string {
		return this.buffer;
	}

	/**
	 * 入力中のシーケンスに符号要素を追加する
	 *
	 * @param element - 追加する符号要素（'.' または '-'）
	 */
	addElement(element: '.' | '-'): void {
		this.sequence += element;
	}

	/**
	 * 入力中のシーケンスを確定してバッファに追加する
	 *
	 * @param addSpace - 確定後にスペースを追加するか（デフォルト: true）
	 */
	commitSequence(addSpace: boolean = true): void {
		if (this.sequence) {
			this.buffer += this.sequence;
			if (addSpace) {
				this.buffer += ' ';
			}
			this.sequence = '';
		}
	}

	/**
	 * 語間スペース（'/'）を追加する
	 * すでに語間スペースで終わっている場合は追加しない
	 */
	addWordSeparator(): void {
		// 入力中のシーケンスがあれば確定
		this.commitSequence(true);

		// すでに '/ ' で終わっている場合は追加しない
		if (!this.buffer.endsWith('/ ')) {
			this.buffer += '/ ';
		}
	}

	/**
	 * バッファとシーケンスをクリアする
	 */
	clear(): void {
		this.buffer = '';
		this.sequence = '';
	}

	/**
	 * バッファの末尾が指定の文字列で終わっているかチェックする
	 *
	 * @param suffix - チェックする末尾文字列
	 * @returns 末尾が一致する場合true
	 */
	endsWith(suffix: string): boolean {
		return this.buffer.endsWith(suffix);
	}

	/**
	 * バッファの長さを取得する
	 *
	 * @returns バッファの長さ
	 */
	getBufferLength(): number {
		return this.buffer.length;
	}

	/**
	 * シーケンスの長さを取得する
	 *
	 * @returns シーケンスの長さ
	 */
	getSequenceLength(): number {
		return this.sequence.length;
	}

	/**
	 * バッファが空かどうかをチェックする
	 *
	 * @returns バッファとシーケンスの両方が空の場合true
	 */
	isEmpty(): boolean {
		return this.buffer.length === 0 && this.sequence.length === 0;
	}
}
