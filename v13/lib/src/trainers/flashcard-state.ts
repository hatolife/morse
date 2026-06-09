/**
 * フラッシュカード状態管理
 * UI状態の保存・復元を担当
 */

export type ViewMode = 'browse' | 'learn' | 'exam';
export type DisplayMode = 'card' | 'list';
export type SortColumn = 'abbreviation' | 'english' | 'japanese' | 'frequency' | 'tags';
export type SortDirection = 'asc' | 'desc';
export type LearnQuestionType =
	| 'abbr-to-meaning'
	| 'meaning-to-abbr'
	| 'morse-to-abbr'
	| 'morse-to-meaning';

/**
 * 進捗情報
 */
export interface Progress {
	known: Set<string>;
	unknown: Set<string>;
}

/**
 * フィルター状態
 */
export interface FilterState {
	selectedTags: Set<string>;
	selectedFrequencies: Set<number>;
	searchQuery: string;
}

/**
 * ビュー状態
 */
export interface ViewState {
	viewMode: ViewMode;
	displayMode: DisplayMode;
	sortColumn: SortColumn;
	sortDirection: SortDirection;
	learnQuestionType: LearnQuestionType;
	examQuestionType: LearnQuestionType;
}

/**
 * フラッシュカード状態管理クラス
 */
export class FlashcardState {
	private static readonly STORAGE_PREFIX = 'v10.flashcard.';

	/**
	 * 進捗を保存する
	 */
	static saveProgress(progress: Progress): void {
		try {
			const data = {
				known: Array.from(progress.known),
				unknown: Array.from(progress.unknown)
			};
			localStorage.setItem(
				`${this.STORAGE_PREFIX}progress`,
				JSON.stringify(data)
			);
		} catch (error) {
			console.error('Failed to save progress:', error);
		}
	}

	/**
	 * 進捗を読み込む
	 */
	static loadProgress(): Progress {
		try {
			const saved = localStorage.getItem(`${this.STORAGE_PREFIX}progress`);
			if (saved) {
				const data = JSON.parse(saved);
				return {
					known: new Set(data.known || []),
					unknown: new Set(data.unknown || [])
				};
			}
		} catch (error) {
			console.error('Failed to load progress:', error);
		}
		return { known: new Set(), unknown: new Set() };
	}

	/**
	 * 進捗をクリアする
	 */
	static clearProgress(): void {
		try {
			localStorage.removeItem(`${this.STORAGE_PREFIX}progress`);
		} catch (error) {
			console.error('Failed to clear progress:', error);
		}
	}

	/**
	 * フィルター状態を保存する
	 */
	static saveFilters(filters: FilterState): void {
		try {
			const data = {
				selectedTags: Array.from(filters.selectedTags),
				selectedFrequencies: Array.from(filters.selectedFrequencies),
				searchQuery: filters.searchQuery
			};
			localStorage.setItem(
				`${this.STORAGE_PREFIX}filters`,
				JSON.stringify(data)
			);
		} catch (error) {
			console.error('Failed to save filters:', error);
		}
	}

	/**
	 * フィルター状態を読み込む
	 */
	static loadFilters(): FilterState {
		try {
			const saved = localStorage.getItem(`${this.STORAGE_PREFIX}filters`);
			if (saved) {
				const data = JSON.parse(saved);
				return {
					selectedTags: new Set(data.selectedTags || []),
					selectedFrequencies: new Set(data.selectedFrequencies || [5]),
					searchQuery: data.searchQuery || ''
				};
			}
		} catch (error) {
			console.error('Failed to load filters:', error);
		}
		return {
			selectedTags: new Set(),
			selectedFrequencies: new Set([5]),
			searchQuery: ''
		};
	}

	/**
	 * ビュー状態を保存する
	 */
	static saveViewState(state: ViewState): void {
		try {
			localStorage.setItem(
				`${this.STORAGE_PREFIX}viewState`,
				JSON.stringify(state)
			);
		} catch (error) {
			console.error('Failed to save view state:', error);
		}
	}

	/**
	 * ビュー状態を読み込む
	 */
	static loadViewState(): ViewState {
		try {
			const saved = localStorage.getItem(`${this.STORAGE_PREFIX}viewState`);
			if (saved) {
				return JSON.parse(saved);
			}
		} catch (error) {
			console.error('Failed to load view state:', error);
		}
		return {
			viewMode: 'browse',
			displayMode: 'card',
			sortColumn: 'abbreviation',
			sortDirection: 'asc',
			learnQuestionType: 'abbr-to-meaning',
			examQuestionType: 'abbr-to-meaning'
		};
	}

	/**
	 * viewModeのみ保存する
	 */
	static saveViewMode(viewMode: ViewMode): void {
		const state = this.loadViewState();
		state.viewMode = viewMode;
		this.saveViewState(state);
	}

	/**
	 * displayModeのみ保存する
	 */
	static saveDisplayMode(displayMode: DisplayMode): void {
		const state = this.loadViewState();
		state.displayMode = displayMode;
		this.saveViewState(state);
	}

	/**
	 * learnQuestionTypeのみ保存する
	 */
	static saveLearnQuestionType(questionType: LearnQuestionType): void {
		const state = this.loadViewState();
		state.learnQuestionType = questionType;
		this.saveViewState(state);
	}

	/**
	 * examQuestionTypeのみ保存する
	 */
	static saveExamQuestionType(questionType: LearnQuestionType): void {
		const state = this.loadViewState();
		state.examQuestionType = questionType;
		this.saveViewState(state);
	}

	/**
	 * sortColumnとsortDirectionを保存する
	 */
	static saveSortState(column: SortColumn, direction: SortDirection): void {
		const state = this.loadViewState();
		state.sortColumn = column;
		state.sortDirection = direction;
		this.saveViewState(state);
	}
}
