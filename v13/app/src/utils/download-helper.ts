/**
 * ダウンロードヘルパー関数
 * Blobをファイルとしてダウンロードさせるユーティリティ
 */

/**
 * Blobをファイルとしてダウンロードする
 *
 * @param blob - ダウンロードするBlob
 * @param filename - ファイル名
 */
export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/**
 * ファイル名をサニタイズする（安全なファイル名に変換）
 *
 * @param filename - 元のファイル名
 * @returns サニタイズされたファイル名
 */
export function sanitizeFilename(filename: string): string {
	return filename.replace(/[^a-zA-Z0-9_-]/g, '_');
}
