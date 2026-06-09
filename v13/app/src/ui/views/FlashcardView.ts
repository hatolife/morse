/**
 * フラッシュカードビュー
 * CW略語・Q符号学習
 */

import type { View } from '../../router';
import {
	FlashcardTrainer,
	FlashcardState,
	AudioGenerator,
	MorseCodec,
	type FlashcardEntry,
	type ExamQuestion,
	type ExamResult,
	type QuestionType,
	type LearnQuestionType,
	type Progress,
	type SortColumn,
	type SortDirection,
	type DisplayMode
} from 'morse-engine';
import { loadFlashcardData } from '../../utils/flashcard-loader';
import { SettingsModal, ALL_SETTING_ITEMS, type SettingValues } from 'morse-engine';
import { t } from '../../i18n';
import { getSettingsModalTexts, localizeSettingItems } from '../../i18n/settings-modal';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

/**
 * 画面状態（ローディングと結果表示用）
 */
type ViewState = 'loading' | 'browse' | 'learn' | 'exam' | 'exam-result';

/**
 * フラッシュカードビュークラス
 */
export class FlashcardView implements View {
	private languageSwitcher = new LanguageSwitcher();
	private allEntries: FlashcardEntry[] = [];
	private filteredEntries: FlashcardEntry[] = [];
	private currentState: ViewState = 'loading';

	// フィルター関連
	private selectedTags: Set<string> = new Set();
	private selectedFrequencies: Set<number> = new Set([5]);
	private searchQuery = '';

	// 一覧表示関連
	private displayMode: DisplayMode = 'card';
	private sortColumn: SortColumn = 'abbreviation';
	private sortDirection: SortDirection = 'asc';

	// 学習モード関連
	private learnQuestionType: LearnQuestionType = 'abbr-to-meaning';
	private learnCards: FlashcardEntry[] = [];
	private currentLearnIndex = 0;
	private isFlipped = false;
	private reviewMode = false;
	private progress: Progress = {
		known: new Set(),
		unknown: new Set()
	};

	// 試験関連
	private questionType: QuestionType = 'abbr-to-meaning';
	private questionCount: number | 'all' = 10;
	private questions: ExamQuestion[] = [];
	private currentQuestionIndex = 0;
	private results: ExamResult[] = [];

	// 音声関連
	private audio: AudioGenerator;
	private currentlyPlaying: string | null = null;

	constructor() {
		this.audio = new AudioGenerator({
			frequency: 700,
			volume: 0.5,
			wpm: 20
		});
		//! ライブラリから状態を読み込む。
		this.progress = FlashcardState.loadProgress();
		const filters = FlashcardState.loadFilters();
		this.selectedTags = filters.selectedTags;
		this.selectedFrequencies = filters.selectedFrequencies;
		this.searchQuery = filters.searchQuery;

		const viewState = FlashcardState.loadViewState();
		this.displayMode = viewState.displayMode;
		this.sortColumn = viewState.sortColumn;
		this.sortDirection = viewState.sortDirection;
		this.learnQuestionType = viewState.learnQuestionType;
		this.questionType = viewState.examQuestionType as QuestionType;
	}

	/**
	 * 進捗データを保存する
	 */
	private saveProgress(): void {
		FlashcardState.saveProgress(this.progress);
	}

	/**
	 * 進捗データをクリアする
	 */
	private clearProgress(): void {
		this.progress = { known: new Set(), unknown: new Set() };
		FlashcardState.clearProgress();
	}

	/**
	 * フィルター状態を保存する
	 */
	private saveFilters(): void {
		FlashcardState.saveFilters({
			selectedTags: this.selectedTags,
			selectedFrequencies: this.selectedFrequencies,
			searchQuery: this.searchQuery
		});
	}

	async render(): Promise<void> {
		const app = document.getElementById('app');
		if (!app) return;

		if (this.currentState === 'loading') {
			//! ローディング画面を表示。
			app.innerHTML = `
				<div class="container">
					<header class="header">
						<div class="header-top">
							<button class="back-btn">${t('common.backToMenu')}</button>
							<h1>${t('flashcard.title')}</h1>
							<div id="languageSwitcherContainer">
								${this.languageSwitcher.render()}
							</div>
						</div>
					</header>
					<div class="loading-container">
						<p>${t('flashcard.loading')}</p>
					</div>
				</div>
			`;

			const backBtn = document.querySelector('.back-btn');
			backBtn?.addEventListener('click', () => {
				window.location.hash = '#menu';
			});

			//! データをロード。
			try {
				this.allEntries = await loadFlashcardData('flashcard.tsv');
				this.updateFilteredEntries();
				//! データロード完了後、保存されていたviewModeを復元。
				const viewState = FlashcardState.loadViewState();
				this.currentState = viewState.viewMode;
				this.render();
			} catch (error) {
				console.error('Failed to load flashcard data:', error);
				app.innerHTML = `
					<div class="container">
						<header class="header">
							<div class="header-top">
								<button class="back-btn">${t('common.backToMenu')}</button>
								<h1>${t('flashcard.title')}</h1>
								<div id="languageSwitcherContainer">
									${this.languageSwitcher.render()}
								</div>
							</div>
						</header>
						<div class="error-container">
							<p>${t('flashcard.loadError')}</p>
							<p>${t('flashcard.error')} ${error}</p>
						</div>
					</div>
				`;
			}
		} else if (this.currentState === 'browse') {
			this.renderBrowseMode();
		} else if (this.currentState === 'learn') {
			this.renderLearnMode();
		} else if (this.currentState === 'exam') {
			this.renderExamMode();
		} else if (this.currentState === 'exam-result') {
			this.renderExamResultMode();
		}
	}

	/**
	 * 共通のフィルターセクションHTMLを生成
	 */
	private renderFilterSection(): string {
		const allTags = FlashcardTrainer.getAllTags(this.allEntries);
		const frequencyCriteria = {
			1: t('flashcard.filter.frequencyCriteria.1'),
			2: t('flashcard.filter.frequencyCriteria.2'),
			3: t('flashcard.filter.frequencyCriteria.3'),
			4: t('flashcard.filter.frequencyCriteria.4'),
			5: t('flashcard.filter.frequencyCriteria.5')
		};

		return `
			<div class="filter-section">
				<h3>${t('flashcard.filter.title')}</h3>

				<div class="filter-group">
					<label>${t('flashcard.filter.tagLabel')}</label>
					<div class="tag-filter" id="tag-filter">
						${allTags.map(tag => `
							<label class="tag-checkbox">
								<input type="checkbox" value="${tag}" ${this.selectedTags.has(tag) ? 'checked' : ''}>
								<span>${tag}</span>
							</label>
						`).join('')}
					</div>
				</div>

				<div class="filter-group">
					<label>${t('flashcard.filter.frequencyLabel')}</label>
					<p class="frequency-summary">${t('flashcard.filter.frequencySummary')}</p>
					<div class="frequency-filter" id="frequency-filter">
						${[5, 4, 3, 2, 1].map(freq => `
							<label class="frequency-checkbox" title="★${freq}: ${frequencyCriteria[freq as keyof typeof frequencyCriteria]}" tabindex="0">
								<input type="checkbox" value="${freq}" ${this.selectedFrequencies.has(freq) ? 'checked' : ''}>
								<span>★${freq}</span>
								<span class="frequency-tooltip" role="tooltip">★${freq}: ${frequencyCriteria[freq as keyof typeof frequencyCriteria]}</span>
							</label>
						`).join('')}
					</div>
				</div>

				<div class="filter-group">
					<label for="search-input">${t('flashcard.filter.searchLabel')}</label>
					<input type="text" id="search-input" class="search-input" placeholder="${t('flashcard.filter.searchPlaceholder')}" value="${this.searchQuery}">
				</div>

				<div class="filter-stats">
					<span>${t('flashcard.filter.filteredCount')} <strong id="filtered-count">${this.filteredEntries.length}</strong> ${t('flashcard.filter.items')}</span>
					<span>${t('flashcard.filter.totalCount')} <strong>${this.allEntries.length}</strong> ${t('flashcard.filter.items')}</span>
				</div>
			</div>
		`;
	}

	/**
	 * 一覧モード（browse）をレンダリング
	 */
	private renderBrowseMode(): void {
		const app = document.getElementById('app');
		if (!app) return;

		app.innerHTML = `
			<div class="settings-icon" id="settingsIcon">
				<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
					<path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
				</svg>
			</div>

			<div class="container">
				<header class="header">
					<div class="header-top">
						<button class="back-btn">${t('common.backToMenu')}</button>
						<h1>${t('flashcard.title')}</h1>
						<div id="languageSwitcherContainer">
							${this.languageSwitcher.render()}
						</div>
					</div>
				</header>

				<div class="tabs">
					<button class="tab-button active" data-tab="browse">${t('flashcard.tabs.browse')}</button>
					<button class="tab-button" data-tab="learn">${t('flashcard.tabs.learn')}</button>
					<button class="tab-button" data-tab="exam">${t('flashcard.tabs.exam')}</button>
				</div>

				<div class="flashcard-container">
					${this.renderFilterSection()}

					<div class="entries-section" id="entries-section">
						<!-- ここに一覧が表示される -->
					</div>

					<div class="instructions">
						<h3>${t('flashcard.browse.howToUse')}</h3>
						<ul>
							<li>${t('flashcard.browse.instruction1')}</li>
							<li>${t('flashcard.browse.instruction2')}</li>
							<li>${t('flashcard.browse.instruction3')}</li>
							<li>${t('flashcard.browse.instruction4')}</li>
							<li>${t('flashcard.browse.instruction5')}</li>
							<li>${t('flashcard.browse.instruction6')}</li>
						</ul>
					</div>
				</div>
			</div>
		`;

		this.renderEntries();
		this.attachBrowseModeListeners();
	}

	/**
	 * エントリー一覧を表示
	 */
	private renderEntries(): void {
		const container = document.getElementById('entries-section');
		if (!container) return;

		if (this.displayMode === 'card') {
			this.renderCardView(container);
		} else {
			this.renderListView(container);
		}
	}

	/**
	 * カード表示
	 */
	private renderCardView(container: HTMLElement): void {
		container.innerHTML = `
			<div class="entries-header">
				<h3>${t('flashcard.browse.entriesHeader')} (${this.filteredEntries.length}${t('flashcard.browse.entriesCount')})</h3>
				<button id="toggle-display-btn" class="toggle-display-btn">${t('flashcard.browse.toggleList')}</button>
			</div>
			<div class="entries-grid">
				${this.filteredEntries.map(entry => `
					<div class="entry-card ${this.currentlyPlaying === entry.abbreviation ? 'playing' : ''}" data-abbr="${entry.abbreviation}">
						<div class="entry-header">
							<div class="entry-abbr">${this.formatAbbreviation(entry.abbreviation)}</div>
							<div class="entry-frequency" title="${t('flashcard.filter.frequencyLabel')}: ${entry.frequency}/5">${'★'.repeat(entry.frequency)}${'☆'.repeat(5 - entry.frequency)}</div>
						</div>
						<div class="entry-english">${entry.english}</div>
						<div class="entry-japanese">${entry.japanese}</div>
						${entry.description ? `<div class="entry-description">${entry.description}</div>` : ''}
						${entry.example ? `<div class="entry-example">${t('flashcard.browse.examplePrefix')}${entry.example}</div>` : ''}
						<div class="entry-tags">${entry.tags}</div>
					</div>
				`).join('')}
			</div>
		`;

		//! カードクリックでモールス再生。
		container.querySelectorAll('.entry-card').forEach(card => {
			card.addEventListener('click', () => {
				const abbr = card.getAttribute('data-abbr');
				if (abbr) this.playMorse(abbr);
			});
		});

		//! 表示モード切り替えボタン。
		const toggleBtn = document.getElementById('toggle-display-btn');
		if (toggleBtn) {
			toggleBtn.addEventListener('click', () => {
				this.displayMode = 'list';
				FlashcardState.saveDisplayMode(this.displayMode);
				this.renderEntries();
			});
		}
	}

	/**
	 * リスト表示
	 */
	private renderListView(container: HTMLElement): void {
		container.innerHTML = `
			<div class="entries-header">
				<h3>${t('flashcard.browse.entriesHeader')} (${this.filteredEntries.length}${t('flashcard.browse.entriesCount')})</h3>
				<button id="toggle-display-btn" class="toggle-display-btn">${t('flashcard.browse.toggleCard')}</button>
			</div>
			<div class="list-table-container">
				<table class="list-table">
					<thead>
						<tr>
							<th class="sortable" data-column="abbreviation">${t('flashcard.browse.tableHeaders.abbreviation')}${this.getSortIndicator('abbreviation')}</th>
							<th class="sortable" data-column="english">${t('flashcard.browse.tableHeaders.english')}${this.getSortIndicator('english')}</th>
							<th class="sortable" data-column="japanese">${t('flashcard.browse.tableHeaders.japanese')}${this.getSortIndicator('japanese')}</th>
							<th class="sortable" data-column="frequency">${t('flashcard.browse.tableHeaders.frequency')}${this.getSortIndicator('frequency')}</th>
							<th class="sortable" data-column="tags">${t('flashcard.browse.tableHeaders.tags')}${this.getSortIndicator('tags')}</th>
							<th>${t('flashcard.browse.tableHeaders.description')}</th>
							<th>${t('flashcard.browse.tableHeaders.example')}</th>
						</tr>
					</thead>
					<tbody>
						${this.filteredEntries.map(entry => `
							<tr>
								<td class="list-abbr">
									<button class="abbr-play-btn ${this.currentlyPlaying === entry.abbreviation ? 'playing' : ''}" data-abbr="${entry.abbreviation}">
										${this.formatAbbreviation(entry.abbreviation)}
									</button>
								</td>
								<td>${entry.english}</td>
								<td>${entry.japanese}</td>
								<td title="${t('flashcard.filter.frequencyLabel')}: ${entry.frequency}/5">${'★'.repeat(entry.frequency)}${'☆'.repeat(5 - entry.frequency)}</td>
								<td>${entry.tags}</td>
								<td>${entry.description || ''}</td>
								<td>${entry.example || ''}</td>
							</tr>
						`).join('')}
					</tbody>
				</table>
			</div>
		`;

		//! ソートヘッダーのイベントリスナー。
		const sortHeaders = container.querySelectorAll('th.sortable');
		sortHeaders.forEach(header => {
			header.addEventListener('click', () => {
				const column = header.getAttribute('data-column') as SortColumn;
				if (column) this.toggleSort(column);
			});
		});

		//! 略語再生ボタンのイベントリスナー。
		const playButtons = container.querySelectorAll('.abbr-play-btn');
		playButtons.forEach(btn => {
			btn.addEventListener('click', () => {
				const abbr = btn.getAttribute('data-abbr');
				if (abbr) this.playMorse(abbr);
			});
		});

		//! 表示モード切り替えボタン。
		const toggleBtn = document.getElementById('toggle-display-btn');
		if (toggleBtn) {
			toggleBtn.addEventListener('click', () => {
				this.displayMode = 'card';
				FlashcardState.saveDisplayMode(this.displayMode);
				this.renderEntries();
			});
		}
	}

	/**
	 * 学習モードをレンダリング
	 */
	private renderLearnMode(): void {
		if (this.learnCards.length === 0) {
			//! セットアップ画面を表示。
			this.renderLearnSetup();
		} else {
			//! 学習カードを表示。
			this.renderLearnCard();
		}
	}

	/**
	 * 学習モードセットアップ画面
	 */
	private renderLearnSetup(): void {
		const app = document.getElementById('app');
		if (!app) return;

		//! カード枚数を計算。
		let cardCount = this.filteredEntries.length;
		if (this.reviewMode) {
			cardCount = this.filteredEntries.filter(e =>
				this.progress.unknown.has(e.abbreviation)
			).length;
		}

		app.innerHTML = `
			<div class="settings-icon" id="settingsIcon">
				<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
					<path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
				</svg>
			</div>

			<div class="container">
				<header class="header">
					<div class="header-top">
						<button class="back-btn">${t('common.backToMenu')}</button>
						<h1>${t('flashcard.title')}</h1>
						<div id="languageSwitcherContainer">
							${this.languageSwitcher.render()}
						</div>
					</div>
				</header>

				<div class="tabs">
					<button class="tab-button" data-tab="browse">${t('flashcard.tabs.browse')}</button>
					<button class="tab-button active" data-tab="learn">${t('flashcard.tabs.learn')}</button>
					<button class="tab-button" data-tab="exam">${t('flashcard.tabs.exam')}</button>
				</div>

				<div class="flashcard-container">
					${this.renderFilterSection()}

					<div class="learn-setup-section">
						<h3>${t('flashcard.learn.setupTitle')}</h3>

						<div class="filter-group">
							<label>${t('flashcard.learn.modeLabel')}</label>
							<div class="mode-buttons">
								<button class="mode-btn ${this.reviewMode ? 'active' : ''}" id="review-mode-btn">
									${t('flashcard.learn.reviewMode')}${this.progress.unknown.size}${t('flashcard.learn.reviewModeCount')}
								</button>
							</div>
						</div>

						<div class="filter-group">
							<label>${t('flashcard.learn.questionTypeLabel')}</label>
							<div class="question-type-buttons">
								<button class="question-type-btn ${this.learnQuestionType === 'abbr-to-meaning' ? 'active' : ''}" data-type="abbr-to-meaning">${t('flashcard.learn.questionTypes.abbrToMeaning')}</button>
								<button class="question-type-btn ${this.learnQuestionType === 'meaning-to-abbr' ? 'active' : ''}" data-type="meaning-to-abbr">${t('flashcard.learn.questionTypes.meaningToAbbr')}</button>
								<button class="question-type-btn ${this.learnQuestionType === 'morse-to-abbr' ? 'active' : ''}" data-type="morse-to-abbr">${t('flashcard.learn.questionTypes.morseToAbbr')}</button>
								<button class="question-type-btn ${this.learnQuestionType === 'morse-to-meaning' ? 'active' : ''}" data-type="morse-to-meaning">${t('flashcard.learn.questionTypes.morseToMeaning')}</button>
							</div>
						</div>

						<div class="filter-stats">
							<span>${t('flashcard.learn.availableCards')} <strong>${cardCount}</strong> ${t('flashcard.learn.cardsUnit')}</span>
						</div>

						<div class="action-area">
							<button class="btn btn-large btn-primary" id="start-learn-btn" ${cardCount === 0 ? 'disabled' : ''}>${t('flashcard.learn.startButton')}</button>
							<button class="btn btn-large btn-secondary" id="clear-progress-btn">${t('flashcard.learn.clearProgressButton')}</button>
						</div>
					</div>

					<div class="instructions">
						<h3>${t('flashcard.learn.howToUse')}</h3>
						<ul>
							<li>${t('flashcard.learn.instruction1')}</li>
							<li>${t('flashcard.learn.instruction2')}</li>
							<li>${t('flashcard.learn.instruction3')}</li>
							<li>${t('flashcard.learn.instruction4')}</li>
							<li>${t('flashcard.learn.instruction5')}</li>
						</ul>
					</div>
				</div>
			</div>
		`;

		this.attachCommonListeners();
		this.attachLearnSetupListeners();
	}

	/**
	 * 学習セットアップのイベントリスナー
	 */
	private attachLearnSetupListeners(): void {
		//! タグフィルター。
		const tagFilter = document.getElementById('tag-filter');
		tagFilter?.addEventListener('change', (e) => {
			const target = e.target as HTMLInputElement;
			if (target.type === 'checkbox') {
				if (target.checked) {
					this.selectedTags.add(target.value);
				} else {
					this.selectedTags.delete(target.value);
				}
				this.updateFilteredEntries();
				this.renderLearnSetup();
			}
		});

		//! 使用頻度フィルター。
		const frequencyFilter = document.getElementById('frequency-filter');
		frequencyFilter?.addEventListener('change', (e) => {
			const target = e.target as HTMLInputElement;
			if (target.type === 'checkbox') {
				const freq = parseInt(target.value, 10);
				if (target.checked) {
					this.selectedFrequencies.add(freq);
				} else {
					this.selectedFrequencies.delete(freq);
				}
				this.updateFilteredEntries();
				this.renderLearnSetup();
			}
		});

		//! 検索。
		const searchInput = document.getElementById('learn-search-input') as HTMLInputElement;
		searchInput?.addEventListener('input', () => {
			this.searchQuery = searchInput.value;
			this.updateFilteredEntries();
			this.renderLearnSetup();
		});

		//! 復習モードボタン。
		const reviewModeBtn = document.getElementById('review-mode-btn');
		reviewModeBtn?.addEventListener('click', () => {
			this.reviewMode = !this.reviewMode;
			this.renderLearnSetup();
		});

		//! 出題形式ボタン。
		const questionTypeBtns = document.querySelectorAll('.question-type-btn');
		questionTypeBtns.forEach(btn => {
			btn.addEventListener('click', () => {
				const type = btn.getAttribute('data-type') as LearnQuestionType;
				if (type) {
					this.learnQuestionType = type;
					FlashcardState.saveLearnQuestionType(this.learnQuestionType);
					this.renderLearnSetup();
				}
			});
		});

		//! 学習開始ボタン。
		const startLearnBtn = document.getElementById('start-learn-btn');
		startLearnBtn?.addEventListener('click', () => {
			this.startLearn();
		});

		//! 進捗リセットボタン。
		const clearProgressBtn = document.getElementById('clear-progress-btn');
		clearProgressBtn?.addEventListener('click', () => {
			if (confirm(t('flashcard.learn.confirmReset'))) {
				this.clearProgress();
				this.renderLearnSetup();
			}
		});
	}

	/**
	 * 学習を開始
	 */
	private startLearn(): void {
		//! フィルタリング済みのエントリーから学習カードを作成。
		let cards = [...this.filteredEntries];

		if (this.reviewMode) {
			//! 復習モード: わからないカードのみ。
			cards = cards.filter(e => this.progress.unknown.has(e.abbreviation));
		}

		if (cards.length === 0) {
			alert(t('flashcard.learn.noCards'));
			return;
		}

		//! シャッフル。
		cards = cards.sort(() => Math.random() - 0.5);

		this.learnCards = cards;
		this.currentLearnIndex = 0;
		this.isFlipped = false;
		this.renderLearnCard();
	}

	/**
	 * 学習カードを表示
	 */
	private renderLearnCard(): void {
		const app = document.getElementById('app');
		if (!app) return;

		const card = this.learnCards[this.currentLearnIndex];
		const currentNum = this.currentLearnIndex + 1;
		const totalNum = this.learnCards.length;

		//! 問題と正解のコンテンツを生成。
		let frontContent = '';
		let backContent = '';

		switch (this.learnQuestionType) {
			case 'abbr-to-meaning':
				frontContent = `
					<div class="card-label">${t('flashcard.learn.cardLabels.abbreviation')}</div>
					<div class="card-content-abbr">${this.formatAbbreviation(card.abbreviation)}</div>
				`;
				backContent = `
					<div class="card-label">${t('flashcard.learn.cardLabels.meaning')}</div>
					<div class="card-content-text">${card.english}</div>
					<div class="card-content-text">${card.japanese}</div>
				`;
				break;
			case 'meaning-to-abbr':
				frontContent = `
					<div class="card-label">${t('flashcard.learn.cardLabels.meaning')}</div>
					<div class="card-content-text">${card.english}</div>
					<div class="card-content-text">${card.japanese}</div>
				`;
				backContent = `
					<div class="card-label">${t('flashcard.learn.cardLabels.abbreviation')}</div>
					<div class="card-content-abbr">${this.formatAbbreviation(card.abbreviation)}</div>
				`;
				break;
			case 'morse-to-abbr':
				frontContent = `
					<div class="card-label">${t('flashcard.learn.cardLabels.morseToAbbrPrompt')}</div>
					<button class="play-morse-btn" id="play-morse-btn">${t('flashcard.learn.playMorseButton')}</button>
				`;
				backContent = `
					<div class="card-label">${t('flashcard.learn.cardLabels.abbreviation')}</div>
					<div class="card-content-abbr">${this.formatAbbreviation(card.abbreviation)}</div>
				`;
				break;
			case 'morse-to-meaning':
				frontContent = `
					<div class="card-label">${t('flashcard.learn.cardLabels.morseToMeaningPrompt')}</div>
					<button class="play-morse-btn" id="play-morse-btn">${t('flashcard.learn.playMorseButton')}</button>
				`;
				backContent = `
					<div class="card-label">${t('flashcard.learn.cardLabels.meaning')}</div>
					<div class="card-content-abbr">${this.formatAbbreviation(card.abbreviation)}</div>
					<div class="card-content-text">${card.english}</div>
					<div class="card-content-text">${card.japanese}</div>
				`;
				break;
		}

		//! 判定ボタンのHTML。
		const isKnown = this.progress.known.has(card.abbreviation);
		const isUnknown = this.progress.unknown.has(card.abbreviation);
		const judgmentButtons = `
			<div class="judgment-controls">
				<button id="mark-unknown-btn" class="judgment-button unknown ${isUnknown ? 'active' : ''}">
					${t('flashcard.learn.judgmentButtons.unknown')}
				</button>
				<button id="mark-known-btn" class="judgment-button known ${isKnown ? 'active' : ''}">
					${t('flashcard.learn.judgmentButtons.known')}
				</button>
			</div>
		`;

		app.innerHTML = `
			<div class="container learning-view">
				<div class="learning-header">
					<button id="back-to-setup-btn" class="back-btn">${t('flashcard.learn.backToSetup')}</button>
					<div class="progress-indicator">${currentNum}${t('flashcard.learn.progressIndicator')}${totalNum}</div>
				</div>

				<div class="card-container">
					<div class="flashcard ${this.isFlipped ? 'flipped' : ''}" id="flashcard">
						<div class="card-front">
							${frontContent}
						</div>
						<div class="card-back">
							${backContent}
							${card.description ? `<div class="card-description">${card.description}</div>` : ''}
							${card.example ? `<div class="card-example">${t('flashcard.browse.examplePrefix')}${card.example}</div>` : ''}
							<div class="card-tags">${card.tags} / ${'★'.repeat(card.frequency)}</div>
						</div>
					</div>
				</div>

				<div class="card-controls">
					<button id="flip-card-btn" class="control-button">
						${this.isFlipped ? t('flashcard.learn.flipToQuestion') : t('flashcard.learn.flipToAnswer')} ${t('flashcard.learn.spaceHint')}
					</button>
				</div>

				${this.isFlipped ? judgmentButtons : ''}

				<div class="navigation-controls">
					<button id="prev-card-btn" class="nav-button" ${this.currentLearnIndex === 0 ? 'disabled' : ''}>
						${t('flashcard.learn.navigation.prev')}
					</button>
					<button id="next-card-btn" class="nav-button" ${this.currentLearnIndex >= this.learnCards.length - 1 ? 'disabled' : ''}>
						${t('flashcard.learn.navigation.next')}
					</button>
				</div>
			</div>
		`;

		this.attachLearnCardListeners();
	}

	/**
	 * 学習カードのイベントリスナー
	 */
	private attachLearnCardListeners(): void {
		//! 設定に戻るボタン。
		const backToSetupBtn = document.getElementById('back-to-setup-btn');
		backToSetupBtn?.addEventListener('click', () => {
			this.learnCards = [];
			this.currentLearnIndex = 0;
			this.isFlipped = false;
			this.renderLearnSetup();
		});

		//! フリップボタン。
		const flipCardBtn = document.getElementById('flip-card-btn');
		flipCardBtn?.addEventListener('click', () => {
			this.isFlipped = !this.isFlipped;
			this.renderLearnCard();
		});

		//! スペースキーでフリップ。
		const spaceHandler = (e: KeyboardEvent) => {
			if (e.code === 'Space' && e.target === document.body) {
				e.preventDefault();
				this.isFlipped = !this.isFlipped;
				this.renderLearnCard();
			}
		};
		document.addEventListener('keydown', spaceHandler);

		//! モールス再生ボタン。
		const playMorseBtn = document.getElementById('play-morse-btn');
		if (playMorseBtn) {
			playMorseBtn.addEventListener('click', () => {
				const card = this.learnCards[this.currentLearnIndex];
				this.playMorse(card.abbreviation);
			});
		}

		//! 判定ボタン（わからない）。
		const markUnknownBtn = document.getElementById('mark-unknown-btn');
		markUnknownBtn?.addEventListener('click', () => {
			const card = this.learnCards[this.currentLearnIndex];
			this.progress.unknown.add(card.abbreviation);
			this.progress.known.delete(card.abbreviation);
			this.saveProgress();
			this.moveToNextCard();
		});

		//! 判定ボタン（わかる）。
		const markKnownBtn = document.getElementById('mark-known-btn');
		markKnownBtn?.addEventListener('click', () => {
			const card = this.learnCards[this.currentLearnIndex];
			this.progress.known.add(card.abbreviation);
			this.progress.unknown.delete(card.abbreviation);
			this.saveProgress();
			this.moveToNextCard();
		});

		//! 前のカードボタン。
		const prevCardBtn = document.getElementById('prev-card-btn');
		prevCardBtn?.addEventListener('click', () => {
			if (this.currentLearnIndex > 0) {
				this.currentLearnIndex--;
				this.isFlipped = false;
				this.renderLearnCard();
			}
		});

		//! 次のカードボタン。
		const nextCardBtn = document.getElementById('next-card-btn');
		nextCardBtn?.addEventListener('click', () => {
			if (this.currentLearnIndex < this.learnCards.length - 1) {
				this.currentLearnIndex++;
				this.isFlipped = false;
				this.renderLearnCard();
			}
		});
	}

	/**
	 * 次のカードに移動する（判定ボタンクリック時の自動遷移用）
	 */
	private moveToNextCard(): void {
		if (this.currentLearnIndex < this.learnCards.length - 1) {
			//! 次のカードがあれば移動。
			this.currentLearnIndex++;
			this.isFlipped = false;
			this.renderLearnCard();
		} else {
			//! 最後のカードの場合は学習完了。
			alert(t('flashcard.learn.completed'));
			this.learnCards = [];
			this.currentLearnIndex = 0;
			this.isFlipped = false;
			this.renderLearnSetup();
		}
	}

	/**
	 * 試験モードをレンダリング
	 */
	private renderExamMode(): void {
		const app = document.getElementById('app');
		if (!app) return;

		if (this.questions.length === 0) {
			// 試験設定画面
			this.renderExamSetup();
		} else {
			// 試験実施画面
			this.renderExamQuestion();
		}
	}

	/**
	 * 試験設定画面
	 */
	private renderExamSetup(): void {
		const app = document.getElementById('app');
		if (!app) return;

		app.innerHTML = `
			<div class="settings-icon" id="settingsIcon">
				<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
					<path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
				</svg>
			</div>

			<div class="container">
				<header class="header">
					<button class="back-btn">${t('common.backToMenu')}</button>
					<h1>${t('flashcard.title')}</h1>
				</header>

				<div class="tabs">
					<button class="tab-button" data-tab="browse">${t('flashcard.tabs.browse')}</button>
					<button class="tab-button" data-tab="learn">${t('flashcard.tabs.learn')}</button>
					<button class="tab-button active" data-tab="exam">${t('flashcard.tabs.exam')}</button>
				</div>

				<div class="flashcard-container">
					${this.renderFilterSection()}

					<div class="exam-setup-section">
						<h3>${t('flashcard.exam.questionTypeLabel')}</h3>
						<div class="question-type-buttons">
							<button class="question-type-btn ${this.questionType === 'abbr-to-meaning' ? 'active' : ''}" data-type="abbr-to-meaning">${t('flashcard.exam.questionTypes.abbrToMeaning')}</button>
							<button class="question-type-btn ${this.questionType === 'meaning-to-abbr' ? 'active' : ''}" data-type="meaning-to-abbr">${t('flashcard.exam.questionTypes.meaningToAbbr')}</button>
							<button class="question-type-btn ${this.questionType === 'morse-to-abbr' ? 'active' : ''}" data-type="morse-to-abbr">${t('flashcard.exam.questionTypes.morseToAbbr')}</button>
							<button class="question-type-btn ${this.questionType === 'morse-to-meaning' ? 'active' : ''}" data-type="morse-to-meaning">${t('flashcard.exam.questionTypes.morseToMeaning')}</button>
						</div>

						<h3>${t('flashcard.exam.questionCountLabel')}</h3>
						<div class="question-count-buttons">
							<button class="question-count-btn ${this.questionCount === 5 ? 'active' : ''}" data-count="5">${t('flashcard.exam.questionCounts.five')}</button>
							<button class="question-count-btn ${this.questionCount === 10 ? 'active' : ''}" data-count="10">${t('flashcard.exam.questionCounts.ten')}</button>
							<button class="question-count-btn ${this.questionCount === 20 ? 'active' : ''}" data-count="20">${t('flashcard.exam.questionCounts.twenty')}</button>
							<button class="question-count-btn ${this.questionCount === 50 ? 'active' : ''}" data-count="50">${t('flashcard.exam.questionCounts.fifty')}</button>
							<button class="question-count-btn ${this.questionCount === 'all' ? 'active' : ''}" data-count="all">${t('flashcard.exam.questionCounts.all')}</button>
						</div>

						<div class="action-area">
							<button class="btn btn-large btn-primary" id="start-exam-btn">${t('flashcard.exam.startButton')}</button>
						</div>
					</div>

					<div class="instructions">
						<h3>${t('flashcard.exam.howToUse')}</h3>
						<ul>
							<li>${t('flashcard.exam.instruction1')}</li>
							<li>${t('flashcard.exam.instruction2')}</li>
							<li>${t('flashcard.exam.instruction3')}</li>
							<li>${t('flashcard.exam.instruction4')}</li>
							<li>${t('flashcard.exam.instruction5')}</li>
						</ul>
					</div>
				</div>
			</div>
		`;

		this.attachExamSetupListeners();
	}

	/**
	 * 試験問題画面
	 */
	private renderExamQuestion(): void {
		const app = document.getElementById('app');
		if (!app) return;

		const question = this.questions[this.currentQuestionIndex];
		const progress = this.currentQuestionIndex + 1;
		const total = this.questions.length;

		let questionText = '';
		switch (question.type) {
			case 'abbr-to-meaning':
				questionText = `${t('flashcard.exam.questionTemplates.abbrToMeaning')}<br><strong class="question-text">${question.entry.abbreviation}</strong>`;
				break;
			case 'meaning-to-abbr':
				questionText = `${t('flashcard.exam.questionTemplates.meaningToAbbr')}<br><strong class="question-text">${question.entry.english} / ${question.entry.japanese}</strong>`;
				break;
			case 'morse-to-abbr':
				questionText = `${t('flashcard.exam.questionTemplates.morseToAbbr')}<br><button id="replay-morse-btn" class="btn btn-secondary">${t('flashcard.exam.replayButton')}</button>`;
				break;
			case 'morse-to-meaning':
				questionText = `${t('flashcard.exam.questionTemplates.morseToMeaning')}<br><button id="replay-morse-btn" class="btn btn-secondary">${t('flashcard.exam.replayButton')}</button>`;
				break;
		}

		app.innerHTML = `
			<div class="container">
				<header class="header">
					<h1>${t('flashcard.exam.titleInProgress')}</h1>
					<button class="back-btn">${t('flashcard.exam.interruptButton')}</button>
				</header>

				<div class="exam-container">
					<div class="exam-progress">
						<span>${t('flashcard.exam.questionProgress')} <strong>${progress}</strong> / ${total}</span>
					</div>

					<div class="question-area">
						<p class="question">${questionText}</p>
					</div>

					<div class="choices-area">
						${question.choices.map((choice, index) => `
							<button class="choice-btn" data-choice="${choice}">
								${index + 1}. ${choice}
							</button>
						`).join('')}
					</div>
				</div>
			</div>
		`;

		this.attachExamQuestionListeners();

		//! モールス音が必要な場合は自動再生。
		if (question.type === 'morse-to-abbr' || question.type === 'morse-to-meaning') {
			setTimeout(() => this.playMorse(question.entry.abbreviation), 500);
		}
	}

	/**
	 * 試験結果画面
	 */
	private renderExamResultMode(): void {
		const app = document.getElementById('app');
		if (!app) return;

		const score = FlashcardTrainer.calculateScore(this.results);
		const isPassed = FlashcardTrainer.isPassed(score.percentage);
		const wrongAnswers = FlashcardTrainer.getWrongAnswers(this.results);

		app.innerHTML = `
			<div class="container">
				<header class="header">
					<h1>${t('flashcard.result.title')}</h1>
					<button class="back-btn">${t('common.backToMenu')}</button>
				</header>

				<div class="result-container">
					<div class="score-area ${isPassed ? 'passed' : 'failed'}">
						<h2>${isPassed ? t('flashcard.result.passed') : t('flashcard.result.failed')}</h2>
						<div class="score-display">
							<span class="score-percentage">${score.percentage}%</span>
							<span class="score-detail">${score.correct}${t('flashcard.result.scoreDetail')}${score.total} ${t('flashcard.result.scoreUnit')}</span>
						</div>
					</div>

					${wrongAnswers.length > 0 ? `
						<div class="wrong-answers-section">
							<h3>${t('flashcard.result.wrongAnswersTitle')}${wrongAnswers.length}${t('flashcard.result.wrongAnswersCount')}</h3>
							<div class="wrong-answers-list">
								${this.results.filter(r => !r.isCorrect).map(result => `
									<div class="wrong-answer-item">
										<div class="wrong-answer-question">
											<strong>${result.question.entry.abbreviation}</strong>
											<span>${result.question.entry.english} / ${result.question.entry.japanese}</span>
										</div>
										<div class="wrong-answer-detail">
											<span class="wrong-label">${t('flashcard.result.yourAnswer')}</span>
											<span class="wrong-user-answer">${result.userAnswer}</span>
											<span class="correct-label">${t('flashcard.result.correctAnswer')}</span>
											<span class="correct-answer">${result.question.correctAnswer}</span>
										</div>
										${result.question.entry.description ? `
											<div class="wrong-answer-description">
												${result.question.entry.description}
											</div>
										` : ''}
									</div>
								`).join('')}
							</div>
						</div>
					` : `
						<div class="perfect-score">
							<p>${t('flashcard.result.perfectScore')}</p>
						</div>
					`}

					<div class="action-area">
						<button class="btn btn-primary btn-large" id="retry-btn">${t('flashcard.result.retryButton')}</button>
						<button class="btn btn-secondary btn-large" id="back-to-setup-btn">${t('flashcard.result.backToSetupButton')}</button>
					</div>
				</div>
			</div>
		`;

		this.attachResultListeners();
	}

	/**
	 * browseモードのイベントリスナーを設定
	 */
	private attachBrowseModeListeners(): void {
		this.attachCommonListeners();

		//! タグフィルター。
		const tagFilter = document.getElementById('tag-filter');
		tagFilter?.addEventListener('change', (e) => {
			const target = e.target as HTMLInputElement;
			if (target.type === 'checkbox') {
				if (target.checked) {
					this.selectedTags.add(target.value);
				} else {
					this.selectedTags.delete(target.value);
				}
				this.saveFilters();
				this.updateFilteredEntries();
				this.updateFilteredCount();
				this.renderEntries();
			}
		});

		//! 使用頻度フィルター。
		const frequencyFilter = document.getElementById('frequency-filter');
		frequencyFilter?.addEventListener('change', (e) => {
			const target = e.target as HTMLInputElement;
			if (target.type === 'checkbox') {
				const freq = parseInt(target.value, 10);
				if (target.checked) {
					this.selectedFrequencies.add(freq);
				} else {
					this.selectedFrequencies.delete(freq);
				}
				this.saveFilters();
				this.updateFilteredEntries();
				this.updateFilteredCount();
				this.renderEntries();
			}
		});

		//! 検索。
		const searchInput = document.getElementById('search-input') as HTMLInputElement;
		searchInput?.addEventListener('input', () => {
			this.searchQuery = searchInput.value;
			this.saveFilters();
			this.updateFilteredEntries();
			this.updateFilteredCount();
			this.renderEntries();
		});
	}

	/**
	 * 試験設定のイベントリスナーを設定
	 */
	private attachExamSetupListeners(): void {
		this.attachCommonListeners();

		//! タグフィルター。
		const tagFilter = document.getElementById('tag-filter');
		tagFilter?.addEventListener('change', (e) => {
			const target = e.target as HTMLInputElement;
			if (target.type === 'checkbox') {
				if (target.checked) {
					this.selectedTags.add(target.value);
				} else {
					this.selectedTags.delete(target.value);
				}
				this.saveFilters();
				this.updateFilteredEntries();
				this.updateFilteredCount();
			}
		});

		//! 使用頻度フィルター。
		const frequencyFilter = document.getElementById('frequency-filter');
		frequencyFilter?.addEventListener('change', (e) => {
			const target = e.target as HTMLInputElement;
			if (target.type === 'checkbox') {
				const freq = parseInt(target.value, 10);
				if (target.checked) {
					this.selectedFrequencies.add(freq);
				} else {
					this.selectedFrequencies.delete(freq);
				}
				this.saveFilters();
				this.updateFilteredEntries();
				this.updateFilteredCount();
			}
		});

		//! 検索。
		const searchInput = document.getElementById('search-input') as HTMLInputElement;
		searchInput?.addEventListener('input', () => {
			this.searchQuery = searchInput.value;
			this.saveFilters();
			this.updateFilteredEntries();
			this.updateFilteredCount();
		});

		//! 出題形式ボタン。
		const questionTypeBtns = document.querySelectorAll('.question-type-btn');
		questionTypeBtns.forEach(btn => {
			btn.addEventListener('click', () => {
				const type = btn.getAttribute('data-type') as QuestionType;
				if (type) {
					this.questionType = type;
					FlashcardState.saveExamQuestionType(this.questionType as LearnQuestionType);
					this.renderExamSetup();
				}
			});
		});

		//! 問題数ボタン。
		const questionCountBtns = document.querySelectorAll('.question-count-btn');
		questionCountBtns.forEach(btn => {
			btn.addEventListener('click', () => {
				const count = btn.getAttribute('data-count');
				if (count) {
					this.questionCount = count === 'all' ? 'all' : parseInt(count, 10);
					this.renderExamSetup();
				}
			});
		});

		//! 試験開始ボタン。
		const startExamBtn = document.getElementById('start-exam-btn');
		startExamBtn?.addEventListener('click', () => {
			this.startExam();
		});
	}

	/**
	 * 試験問題のイベントリスナーを設定
	 */
	private attachExamQuestionListeners(): void {
		//! 中断ボタン。
		const backBtn = document.querySelector('.back-btn');
		backBtn?.addEventListener('click', () => {
			if (confirm(t('flashcard.exam.confirmInterrupt'))) {
				window.location.hash = '#menu';
			}
		});

		//! モールス再生ボタン。
		const replayBtn = document.getElementById('replay-morse-btn');
		if (replayBtn) {
			const question = this.questions[this.currentQuestionIndex];
			replayBtn.addEventListener('click', () => {
				this.playMorse(question.entry.abbreviation);
			});
		}

		//! 選択肢ボタン。
		const choiceBtns = document.querySelectorAll('.choice-btn');
		choiceBtns.forEach(btn => {
			btn.addEventListener('click', (e) => {
				const target = e.currentTarget as HTMLButtonElement;
				const userAnswer = target.dataset.choice || '';
				this.handleAnswer(userAnswer);
			});
		});
	}

	/**
	 * 結果画面のイベントリスナーを設定
	 */
	private attachResultListeners(): void {
		//! 戻るボタン。
		const backBtn = document.querySelector('.back-btn');
		backBtn?.addEventListener('click', () => {
			window.location.hash = '#menu';
		});

		//! もう一度ボタン。
		const retryBtn = document.getElementById('retry-btn');
		retryBtn?.addEventListener('click', () => {
			this.questions = [];
			this.results = [];
			this.currentQuestionIndex = 0;
			this.currentState = 'exam';
			this.render();
		});

		//! 設定に戻るボタン。
		const backToSetupBtn = document.getElementById('back-to-setup-btn');
		backToSetupBtn?.addEventListener('click', () => {
			this.questions = [];
			this.results = [];
			this.currentQuestionIndex = 0;
			this.currentState = 'exam';
			this.render();
		});
	}

	/**
	 * 共通のイベントリスナーを設定（タブ切り替えなど）
	 */
	private attachCommonListeners(): void {
		//! 戻るボタン。
		const backBtn = document.querySelector('.back-btn');
		backBtn?.addEventListener('click', () => {
			window.location.hash = '#menu';
		});

		//! 設定アイコン。
		document.getElementById('settingsIcon')?.addEventListener('click', () => {
			this.openSettingsModal();
		});

		//! 言語切り替え。
		const languageSwitcherContainer = document.getElementById('languageSwitcherContainer');
		if (languageSwitcherContainer) {
			this.languageSwitcher.attachEventListeners(languageSwitcherContainer);
		}

		//! タブ切り替え。
		const tabButtons = document.querySelectorAll('.tab-button');
		tabButtons.forEach(btn => {
			btn.addEventListener('click', () => {
				const tab = btn.getAttribute('data-tab');
				if (tab === 'browse') {
					this.currentState = 'browse';
					FlashcardState.saveViewMode('browse');
					this.render();
				} else if (tab === 'learn') {
					this.currentState = 'learn';
					FlashcardState.saveViewMode('learn');
					this.render();
				} else if (tab === 'exam') {
					this.questions = [];
					this.results = [];
					this.currentQuestionIndex = 0;
					this.currentState = 'exam';
					FlashcardState.saveViewMode('exam');
					this.render();
				}
			});
		});
	}

	/**
	 * フィルター適用後のエントリー数を更新
	 */
	private updateFilteredCount(): void {
		const filteredCountElem = document.getElementById('filtered-count');
		if (filteredCountElem) {
			filteredCountElem.textContent = this.filteredEntries.length.toString();
		}

		//! 問題数の最大値も更新（試験モードの場合）。
		const questionCountInput = document.getElementById('question-count') as HTMLInputElement;
		if (questionCountInput) {
			questionCountInput.max = this.filteredEntries.length.toString();
			if (parseInt(questionCountInput.value, 10) > this.filteredEntries.length) {
				questionCountInput.value = this.filteredEntries.length.toString();
				this.questionCount = this.filteredEntries.length;
			}
		}
	}

	/**
	 * フィルタリングされたエントリーを更新
	 */
	private updateFilteredEntries(): void {
		let entries = this.allEntries;

		//! タグでフィルタリング。
		entries = FlashcardTrainer.filterByTags(entries, this.selectedTags);

		//! 使用頻度でフィルタリング。
		entries = FlashcardTrainer.filterByFrequencies(entries, this.selectedFrequencies);

		//! 検索クエリでフィルタリング。
		entries = FlashcardTrainer.filterByQuery(entries, this.searchQuery);

		//! ソート適用。
		this.filteredEntries = this.sortEntries(entries);
	}

	/**
	 * エントリーをソート
	 */
	private sortEntries(entries: FlashcardEntry[]): FlashcardEntry[] {
		const ascending = this.sortDirection === 'asc';

		switch (this.sortColumn) {
			case 'abbreviation':
				return FlashcardTrainer.sortByAbbreviation(entries, ascending);
			case 'english':
				return FlashcardTrainer.sortByEnglish(entries, ascending);
			case 'japanese':
				return FlashcardTrainer.sortByJapanese(entries, ascending);
			case 'frequency':
				return FlashcardTrainer.sortByFrequency(entries, ascending);
			case 'tags':
				return FlashcardTrainer.sortByTags(entries, ascending);
			default:
				return entries;
		}
	}

	/**
	 * ソートを切り替え
	 */
	private toggleSort(column: SortColumn): void {
		if (this.sortColumn === column) {
			//! 同じ列なら方向を反転。
			this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			//! 異なる列なら昇順で開始。
			this.sortColumn = column;
			this.sortDirection = 'asc';
		}
		//! ソート状態を保存。
		FlashcardState.saveSortState(this.sortColumn, this.sortDirection);
		this.updateFilteredEntries();
		this.renderEntries();
	}

	/**
	 * ソートインジケーターを取得
	 */
	private getSortIndicator(column: SortColumn): string {
		if (this.sortColumn !== column) return '';
		return this.sortDirection === 'asc' ? ' ▲' : ' ▼';
	}

	/**
	 * 略語をフォーマット（プロサインをオーバーラインで表示）
	 */
	private formatAbbreviation(abbr: string): string {
		const prosignMatch = abbr.match(/^\[([A-Z]+)\]$/);
		if (prosignMatch) {
			return `<span class="prosign">${prosignMatch[1]}</span>`;
		}
		return abbr;
	}

	/**
	 * モールス符号を再生
	 */
	private async playMorse(text: string): Promise<void> {
		try {
			//! 既に再生中の場合は停止。
			if (this.currentlyPlaying === text) {
				this.audio.stopContinuousTone();
				this.currentlyPlaying = null;
				this.renderEntries();
				return;
			}

			//! 別のものが再生中なら停止。
			if (this.currentlyPlaying) {
				this.audio.stopContinuousTone();
			}

			this.currentlyPlaying = text;
			this.renderEntries();

			//! モールス符号に変換。
			const morseSequence = MorseCodec.textToMorse(text);
			if (morseSequence) {
				//! シンプルな再生実装（scheduleToneを使用）。
				for (const char of morseSequence) {
					if (char === '.') {
						this.audio.scheduleTone(0, 60);  // 短点
						await new Promise(resolve => setTimeout(resolve, 120));
					} else if (char === '-') {
						this.audio.scheduleTone(0, 180);  // 長点
						await new Promise(resolve => setTimeout(resolve, 240));
					} else if (char === ' ') {
						await new Promise(resolve => setTimeout(resolve, 60));  // Element spacing
					}
				}
			}

			this.currentlyPlaying = null;
			this.renderEntries();
		} catch (error) {
			console.error('Morse playback error:', error);
			this.currentlyPlaying = null;
			this.renderEntries();
		}
	}

	/**
	 * 試験を開始
	 */
	private startExam(): void {
		if (this.filteredEntries.length === 0) {
			alert(t('flashcard.exam.noEntries'));
			return;
		}

		const count = this.questionCount === 'all' ? this.filteredEntries.length : this.questionCount;
		const actualCount = Math.min(count, this.filteredEntries.length);
		if (actualCount === 0) {
			alert(t('flashcard.exam.invalidCount'));
			return;
		}

		//! 問題を生成。
		this.questions = FlashcardTrainer.generateExamQuestions(
			this.filteredEntries,
			this.questionType,
			actualCount
		);

		this.currentQuestionIndex = 0;
		this.results = [];
		this.render();
	}

	/**
	 * 回答を処理
	 */
	private handleAnswer(userAnswer: string): void {
		const question = this.questions[this.currentQuestionIndex];
		const isCorrect = FlashcardTrainer.checkAnswer(question, userAnswer);

		//! 結果を記録。
		this.results.push({
			question,
			userAnswer,
			isCorrect
		});

		//! 次の問題に進むか結果表示。
		this.currentQuestionIndex++;
		if (this.currentQuestionIndex < this.questions.length) {
			this.render();
		} else {
			this.currentState = 'exam-result';
			this.render();
		}
	}

	/**
	 * 設定モーダルを開く
	 */
	private openSettingsModal(): void {
		//! 現在の設定値を取得（0-100の範囲に変換）。
		const currentValues: SettingValues = {
			volume: Math.round(this.audio.getVolume() * 100),
			frequency: this.audio.getFrequency(),
			wpm: this.audio.getWPM()
		};

		//! 設定変更前の値を保存（キャンセル時の復元用）。
		const savedSettings = {
			volume: this.audio.getVolume(),
			frequency: this.audio.getFrequency(),
			wpm: this.audio.getWPM()
		};

		//! SettingsModalを作成。
		const modal = new SettingsModal(
			'flashcard-settings-modal',
			localizeSettingItems(ALL_SETTING_ITEMS),
			currentValues,
			{
				onSave: (values: SettingValues) => {
					//! 設定を保存。
					this.audio.setVolume((values.volume as number) / 100);
					this.audio.setFrequency(values.frequency as number);
					this.audio.setWPM(values.wpm as number);
				},
				onCancel: () => {
					//! 設定を元に戻す。
					this.audio.setVolume(savedSettings.volume);
					this.audio.setFrequency(savedSettings.frequency);
					this.audio.setWPM(savedSettings.wpm);
				},
				onTestPlay: async () => {
					//! テスト再生。
					await this.playMorse('CQ');
				}
			},
			getSettingsModalTexts()
		);

		//! モーダルを表示。
		modal.show('flashcard');
	}

	/**
	 * ビューを破棄
	 */
	destroy(): void {
		//! 音声を停止。
		if (this.currentlyPlaying) {
			this.audio.stopContinuousTone();
		}
	}
}
