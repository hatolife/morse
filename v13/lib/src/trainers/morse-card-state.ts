/**
 * モールス符号フラッシュカード状態管理
 */

import type {
	MorseCardCategory,
	MorseCardQuestionType,
	MorseCardSortColumn,
	MorseCardSortDirection,
} from './morse-card-trainer';

export type MorseCardViewMode = 'browse' | 'learn' | 'exam';
export type MorseCardDisplayMode = 'card' | 'list';

export interface MorseCardProgress {
	known: Set<string>;
	unknown: Set<string>;
}

export interface MorseCardFilterState {
	selectedCategories: Set<MorseCardCategory>;
	searchQuery: string;
}

export interface MorseCardViewState {
	viewMode: MorseCardViewMode;
	displayMode: MorseCardDisplayMode;
	sortColumn: MorseCardSortColumn;
	sortDirection: MorseCardSortDirection;
	learnQuestionType: MorseCardQuestionType;
	examQuestionType: MorseCardQuestionType;
}

export class MorseCardState {
	private static readonly STORAGE_PREFIX = 'v13.morseCard.';

	static saveProgress(progress: MorseCardProgress): void {
		this.setJson('progress', {
			known: Array.from(progress.known),
			unknown: Array.from(progress.unknown)
		});
	}

	static loadProgress(): MorseCardProgress {
		const data = this.getJson<{ known?: string[]; unknown?: string[] }>('progress');
		return {
			known: new Set(data?.known || []),
			unknown: new Set(data?.unknown || [])
		};
	}

	static clearProgress(): void {
		try {
			localStorage.removeItem(`${this.STORAGE_PREFIX}progress`);
		} catch (error) {
			console.error('Failed to clear morse card progress:', error);
		}
	}

	static saveFilters(filters: MorseCardFilterState): void {
		this.setJson('filters', {
			selectedCategories: Array.from(filters.selectedCategories),
			searchQuery: filters.searchQuery
		});
	}

	static loadFilters(): MorseCardFilterState {
		const data = this.getJson<{
			selectedCategories?: MorseCardCategory[];
			searchQuery?: string;
		}>('filters');

		return {
			selectedCategories: new Set(data?.selectedCategories || ['letter']),
			searchQuery: data?.searchQuery || ''
		};
	}

	static saveViewState(state: MorseCardViewState): void {
		this.setJson('viewState', state);
	}

	static loadViewState(): MorseCardViewState {
		const data = this.getJson<Partial<MorseCardViewState>>('viewState');
		return {
			viewMode: data?.viewMode || 'browse',
			displayMode: data?.displayMode || 'card',
			sortColumn: data?.sortColumn || 'character',
			sortDirection: data?.sortDirection || 'asc',
			learnQuestionType: data?.learnQuestionType || 'char-to-morse',
			examQuestionType: data?.examQuestionType || 'char-to-morse'
		};
	}

	static saveViewMode(viewMode: MorseCardViewMode): void {
		const state = this.loadViewState();
		state.viewMode = viewMode;
		this.saveViewState(state);
	}

	static saveDisplayMode(displayMode: MorseCardDisplayMode): void {
		const state = this.loadViewState();
		state.displayMode = displayMode;
		this.saveViewState(state);
	}

	static saveLearnQuestionType(questionType: MorseCardQuestionType): void {
		const state = this.loadViewState();
		state.learnQuestionType = questionType;
		this.saveViewState(state);
	}

	static saveExamQuestionType(questionType: MorseCardQuestionType): void {
		const state = this.loadViewState();
		state.examQuestionType = questionType;
		this.saveViewState(state);
	}

	static saveSortState(column: MorseCardSortColumn, direction: MorseCardSortDirection): void {
		const state = this.loadViewState();
		state.sortColumn = column;
		state.sortDirection = direction;
		this.saveViewState(state);
	}

	private static setJson(key: string, value: unknown): void {
		try {
			localStorage.setItem(`${this.STORAGE_PREFIX}${key}`, JSON.stringify(value));
		} catch (error) {
			console.error(`Failed to save morse card ${key}:`, error);
		}
	}

	private static getJson<T>(key: string): T | null {
		try {
			const saved = localStorage.getItem(`${this.STORAGE_PREFIX}${key}`);
			return saved ? JSON.parse(saved) as T : null;
		} catch (error) {
			console.error(`Failed to load morse card ${key}:`, error);
			return null;
		}
	}
}
