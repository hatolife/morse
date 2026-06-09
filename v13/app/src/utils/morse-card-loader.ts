import type { MorseCardCategory, MorseCardEntry } from 'morse-engine';

export async function loadMorseCardData(url: string): Promise<MorseCardEntry[]> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	const text = await response.text();
	return parseMorseCardTsv(text);
}

export function parseMorseCardTsv(text: string): MorseCardEntry[] {
	const lines = text.trim().split(/\r?\n/);
	const dataLines = lines[0]?.startsWith('category\t') ? lines.slice(1) : lines;

	return dataLines
		.map(line => line.split('\t'))
		.filter(columns => columns.length >= 6)
		.map(([category, difficulty, character, morse, label, description]) => ({
			category: category as MorseCardCategory,
			difficulty: Number.parseInt(difficulty, 10),
			character,
			morse,
			label,
			description
		}));
}
