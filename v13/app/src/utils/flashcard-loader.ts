/**
 * フラッシュカードTSVローダー
 */

import type { FlashcardEntry } from 'morse-engine';

/**
 * TSVファイルからフラッシュカードデータをロードする
 * @param url - TSVファイルのURL
 * @returns FlashcardEntryの配列
 */
export async function loadFlashcardData(url: string): Promise<FlashcardEntry[]> {
	//! TSVファイルを取得。
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to load flashcard data: ${response.statusText}`);
	}

	const text = await response.text();
	return parseTSV(text);
}

/**
 * TSVテキストをパースしてFlashcardEntry配列に変換する
 * @param text - TSVテキスト
 * @returns FlashcardEntryの配列
 */
function parseTSV(text: string): FlashcardEntry[] {
	//! 行に分割。
	const lines = text.split('\n').filter(line => line.trim());
	if (lines.length === 0) return [];

	//! 先頭行はヘッダーなのでスキップ。
	const dataLines = lines.slice(1);

	return dataLines.map((line, index) => {
		//! タブで分割。
		const columns = line.split('\t');

		//! 最低限6列（タグ、頻度、略語、英文、和訳、説明）必要。
		if (columns.length < 6) {
			//! 開発環境でのみ警告を出力。
			if (import.meta.env.DEV) {
				console.warn(`Line ${index + 2} has insufficient columns, skipping`);
			}
			return null;
		}

		const entry: FlashcardEntry = {
			tags: columns[0].trim(),
			frequency: parseInt(columns[1].trim(), 10) || 1,
			abbreviation: columns[2].trim(),
			english: columns[3].trim(),
			japanese: columns[4].trim(),
			description: columns[5]?.trim(),
			example: columns[6]?.trim()
		};

		return entry;
	}).filter((entry): entry is FlashcardEntry => entry !== null);
}
