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
		expect(filters.searchQuery).toBe('.-');
	});
});
