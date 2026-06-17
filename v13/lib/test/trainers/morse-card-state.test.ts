import { beforeEach, describe, expect, it } from 'vitest';
import { MorseCardState } from '../../src/trainers/morse-card-state';

describe('MorseCardState', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('saves and loads progress', () => {
		MorseCardState.saveProgress({
			known: new Set(['A']),
			unknown: new Set(['?'])
		});

		const progress = MorseCardState.loadProgress();
		expect(progress.known.has('A')).toBe(true);
		expect(progress.unknown.has('?')).toBe(true);
	});

	it('saves and loads filters', () => {
		MorseCardState.saveFilters({
			selectedCategories: new Set(['letter', 'symbol']),
			searchQuery: '.-'
		});

		const filters = MorseCardState.loadFilters();
		expect(Array.from(filters.selectedCategories).sort()).toEqual(['letter', 'symbol']);
		expect(Array.from(filters.selectedDifficulties).sort()).toEqual([1, 2, 3, 4, 5]);
		expect(filters.searchQuery).toBe('.-');
	});

	it('saves and loads difficulty filters', () => {
		MorseCardState.saveFilters({
			selectedCategories: new Set(['letter']),
			selectedDifficulties: new Set([5, 3]),
			searchQuery: ''
		});

		const filters = MorseCardState.loadFilters();
		expect(Array.from(filters.selectedDifficulties).sort()).toEqual([3, 5]);
	});
});
