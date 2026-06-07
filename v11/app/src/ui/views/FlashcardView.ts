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

/**
 * 画面状態（ローディングと結果表示用）
 */
type ViewState = 'loading' | 'browse' | 'learn' | 'exam' | 'exam-result';

/**
 * フラッシュカードビュークラス
 */
export class FlashcardView implements View {
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
						<h1>CW略語・Q符号学習</h1>
						<button class="back-btn">メニューに戻る</button>
					</header>
					<div class="loading-container">
						<p>フラッシュカードデータを読み込み中...</p>
					</div>
				</div>
			`;

			const backBtn = document.querySelector('.back-btn');
			backBtn?.addEventListener('click', () => {
				window.location.hash = '#menu';
			});

			//! データをロード。
			try {
				this.allEntries = await loadFlashcardData('/flashcard.tsv');
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
							<h1>CW略語・Q符号学習</h1>
							<button class="back-btn">メニューに戻る</button>
						</header>
						<div class="error-container">
							<p>データの読み込みに失敗しました。</p>
							<p>エラー: ${error}</p>
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
		const frequencyDescriptions: Record<number, string> = {
			5: '前に指定された最重要語、固定',
			4: '実 QSO でよく見る語',
			3: '覚えておくと役立つ一般語・周辺語',
			2: '低頻度だが場面によっては使う略語',
			1: '古風、特殊用途、通常 QSO でほぼ出ない、または意味が狭い略語'
		};

		return `
			<div class="filter-section">
				<h3>フィルター設定</h3>

				<div class="filter-group">
					<label>タグで絞り込み</label>
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
					<label>使用頻度で絞り込み（1=低頻度、5=高頻度）</label>
					<div class="frequency-guide">
						5: 最重要・固定 / 4: 実QSO頻出 / 3: 一般語・周辺語 / 2: 低頻度・場面依存 / 1: 古風・特殊・狭義
					</div>
					<div class="frequency-filter" id="frequency-filter">
						${[5, 4, 3, 2, 1].map(freq => `
							<label class="frequency-checkbox" title="★${freq}: ${frequencyDescriptions[freq]}" tabindex="0">
								<input type="checkbox" value="${freq}" ${this.selectedFrequencies.has(freq) ? 'checked' : ''}>
								<span>★${freq}</span>
								<span class="frequency-tooltip">★${freq}: ${frequencyDescriptions[freq]}</span>
							</label>
						`).join('')}
					</div>
				</div>

				<div class="filter-group">
					<label for="search-input">検索（略語・意味・タグ）</label>
					<input type="text" id="search-input" class="search-input" placeholder="例: QTH, location, Q符号" value="${this.searchQuery}">
				</div>

				<div class="filter-stats">
					<span>該当: <strong id="filtered-count">${this.filteredEntries.length}</strong> 件</span>
					<span>全体: <strong>${this.allEntries.length}</strong> 件</span>
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
					<button class="back-btn">メニューに戻る</button>
					<h1>CW略語・Q符号学習</h1>
				</header>

				<div class="tabs">
					<button class="tab-button active" data-tab="browse">一覧</button>
					<button class="tab-button" data-tab="learn">学習モード</button>
					<button class="tab-button" data-tab="exam">試験モード</button>
				</div>

				<div class="flashcard-container">
					${this.renderFilterSection()}

					<div class="entries-section" id="entries-section">
						<!-- ここに一覧が表示される -->
					</div>

					<div class="instructions">
						<h3>使い方</h3>
						<ul>
							<li>タグ、使用頻度、検索で略語を絞り込めます</li>
							<li>略語カードをクリックするとモールス信号を再生できます</li>
							<li>カード表示とリスト表示を切り替えられます</li>
							<li>「学習モード」タブでフラッシュカード学習ができます</li>
							<li>「試験モード」タブで理解度テストができます</li>
							<li>画面右上の⚙アイコンから音量・周波数・速度を調整できます</li>
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
				<h3>略語一覧 (${this.filteredEntries.length}件)</h3>
				<button id="toggle-display-btn" class="toggle-display-btn">📋 リスト表示</button>
			</div>
			<div class="entries-grid">
				${this.filteredEntries.map(entry => `
					<div class="entry-card ${this.currentlyPlaying === entry.abbreviation ? 'playing' : ''}" data-abbr="${entry.abbreviation}">
						<div class="entry-header">
							<div class="entry-abbr">${this.formatAbbreviation(entry.abbreviation)}</div>
							<div class="entry-frequency" title="使用頻度: ${entry.frequency}/5">${'★'.repeat(entry.frequency)}${'☆'.repeat(5 - entry.frequency)}</div>
						</div>
						<div class="entry-english">${entry.english}</div>
						<div class="entry-japanese">${entry.japanese}</div>
						${entry.description ? `<div class="entry-description">${entry.description}</div>` : ''}
						${entry.example ? `<div class="entry-example">例: ${entry.example}</div>` : ''}
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
				<h3>略語一覧 (${this.filteredEntries.length}件)</h3>
				<button id="toggle-display-btn" class="toggle-display-btn">🃏 カード表示</button>
			</div>
			<div class="list-table-container">
				<table class="list-table">
					<thead>
						<tr>
							<th class="sortable" data-column="abbreviation">略語${this.getSortIndicator('abbreviation')}</th>
							<th class="sortable" data-column="english">英文${this.getSortIndicator('english')}</th>
							<th class="sortable" data-column="japanese">和訳${this.getSortIndicator('japanese')}</th>
							<th class="sortable" data-column="frequency">頻度${this.getSortIndicator('frequency')}</th>
							<th class="sortable" data-column="tags">タグ${this.getSortIndicator('tags')}</th>
							<th>説明</th>
							<th>具体例</th>
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
								<td title="使用頻度: ${entry.frequency}/5">${'★'.repeat(entry.frequency)}${'☆'.repeat(5 - entry.frequency)}</td>
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
					<button class="back-btn">メニューに戻る</button>
					<h1>CW略語・Q符号学習</h1>
				</header>

				<div class="tabs">
					<button class="tab-button" data-tab="browse">一覧</button>
					<button class="tab-button active" data-tab="learn">学習モード</button>
					<button class="tab-button" data-tab="exam">試験モード</button>
				</div>

				<div class="flashcard-container">
					${this.renderFilterSection()}

					<div class="learn-setup-section">
						<h3>学習設定</h3>

						<div class="filter-group">
							<label>モード</label>
							<div class="mode-buttons">
								<button class="mode-btn ${this.reviewMode ? 'active' : ''}" id="review-mode-btn">
									復習モード（わからないカードのみ: ${this.progress.unknown.size}件）
								</button>
							</div>
						</div>

						<div class="filter-group">
							<label>出題形式</label>
							<div class="question-type-buttons">
								<button class="question-type-btn ${this.learnQuestionType === 'abbr-to-meaning' ? 'active' : ''}" data-type="abbr-to-meaning">略語→意味（基本）</button>
								<button class="question-type-btn ${this.learnQuestionType === 'meaning-to-abbr' ? 'active' : ''}" data-type="meaning-to-abbr">意味→略語（応用）</button>
								<button class="question-type-btn ${this.learnQuestionType === 'morse-to-abbr' ? 'active' : ''}" data-type="morse-to-abbr">モールス音→略語（実践）</button>
								<button class="question-type-btn ${this.learnQuestionType === 'morse-to-meaning' ? 'active' : ''}" data-type="morse-to-meaning">モールス音→意味（実践）</button>
							</div>
						</div>

						<div class="filter-stats">
							<span>学習可能: <strong>${cardCount}</strong> 枚</span>
						</div>

						<div class="action-area">
							<button class="btn btn-large btn-primary" id="start-learn-btn" ${cardCount === 0 ? 'disabled' : ''}>学習開始</button>
							<button class="btn btn-large btn-secondary" id="clear-progress-btn">進捗をリセット</button>
						</div>
					</div>

					<div class="instructions">
						<h3>使い方</h3>
						<ul>
							<li>フィルターで学習する略語を絞り込みます</li>
							<li>出題形式を選択します（略語→意味、意味→略語、モールス音からの解読）</li>
							<li>カードをクリックで裏返し、「わかる」「わからない」で進捗を記録</li>
							<li>復習モードで「わからない」カードのみを学習できます</li>
							<li>学習進捗はブラウザに自動保存されます</li>
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
			if (confirm('学習進捗をリセットしますか？')) {
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
			alert('学習可能なカードがありません。');
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
					<div class="card-label">略語</div>
					<div class="card-content-abbr">${this.formatAbbreviation(card.abbreviation)}</div>
				`;
				backContent = `
					<div class="card-label">意味</div>
					<div class="card-content-text">${card.english}</div>
					<div class="card-content-text">${card.japanese}</div>
				`;
				break;
			case 'meaning-to-abbr':
				frontContent = `
					<div class="card-label">意味</div>
					<div class="card-content-text">${card.english}</div>
					<div class="card-content-text">${card.japanese}</div>
				`;
				backContent = `
					<div class="card-label">略語</div>
					<div class="card-content-abbr">${this.formatAbbreviation(card.abbreviation)}</div>
				`;
				break;
			case 'morse-to-abbr':
				frontContent = `
					<div class="card-label">モールス音を聞いて略語を答えてください</div>
					<button class="play-morse-btn" id="play-morse-btn">🔊 モールス再生</button>
				`;
				backContent = `
					<div class="card-label">略語</div>
					<div class="card-content-abbr">${this.formatAbbreviation(card.abbreviation)}</div>
				`;
				break;
			case 'morse-to-meaning':
				frontContent = `
					<div class="card-label">モールス音を聞いて意味を答えてください</div>
					<button class="play-morse-btn" id="play-morse-btn">🔊 モールス再生</button>
				`;
				backContent = `
					<div class="card-label">意味</div>
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
					× わからない
				</button>
				<button id="mark-known-btn" class="judgment-button known ${isKnown ? 'active' : ''}">
					○ わかる
				</button>
			</div>
		`;

		app.innerHTML = `
			<div class="container learning-view">
				<div class="learning-header">
					<button id="back-to-setup-btn" class="back-btn">← 設定に戻る</button>
					<div class="progress-indicator">${currentNum} / ${totalNum}</div>
				</div>

				<div class="card-container">
					<div class="flashcard ${this.isFlipped ? 'flipped' : ''}" id="flashcard">
						<div class="card-front">
							${frontContent}
						</div>
						<div class="card-back">
							${backContent}
							${card.description ? `<div class="card-description">${card.description}</div>` : ''}
							${card.example ? `<div class="card-example">例: ${card.example}</div>` : ''}
							<div class="card-tags">${card.tags} / ${'★'.repeat(card.frequency)}</div>
						</div>
					</div>
				</div>

				<div class="card-controls">
					<button id="flip-card-btn" class="control-button">
						${this.isFlipped ? '問題に戻る' : '正解を確認する'} (Space)
					</button>
				</div>

				${this.isFlipped ? judgmentButtons : ''}

				<div class="navigation-controls">
					<button id="prev-card-btn" class="nav-button" ${this.currentLearnIndex === 0 ? 'disabled' : ''}>
						← 前のカード
					</button>
					<button id="next-card-btn" class="nav-button" ${this.currentLearnIndex >= this.learnCards.length - 1 ? 'disabled' : ''}>
						次のカード →
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
			alert('学習完了しました！');
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
					<button class="back-btn">メニューに戻る</button>
					<h1>CW略語・Q符号学習</h1>
				</header>

				<div class="tabs">
					<button class="tab-button" data-tab="browse">一覧</button>
					<button class="tab-button" data-tab="learn">学習モード</button>
					<button class="tab-button active" data-tab="exam">試験モード</button>
				</div>

				<div class="flashcard-container">
					${this.renderFilterSection()}

					<div class="exam-setup-section">
						<h3>出題形式</h3>
						<div class="question-type-buttons">
							<button class="question-type-btn ${this.questionType === 'abbr-to-meaning' ? 'active' : ''}" data-type="abbr-to-meaning">略語→意味（基礎）</button>
							<button class="question-type-btn ${this.questionType === 'meaning-to-abbr' ? 'active' : ''}" data-type="meaning-to-abbr">意味→略語（応用）</button>
							<button class="question-type-btn ${this.questionType === 'morse-to-abbr' ? 'active' : ''}" data-type="morse-to-abbr">モールス音→略語（実践）</button>
							<button class="question-type-btn ${this.questionType === 'morse-to-meaning' ? 'active' : ''}" data-type="morse-to-meaning">モールス音→意味（実践）</button>
						</div>

						<h3>問題数</h3>
						<div class="question-count-buttons">
							<button class="question-count-btn ${this.questionCount === 5 ? 'active' : ''}" data-count="5">5問</button>
							<button class="question-count-btn ${this.questionCount === 10 ? 'active' : ''}" data-count="10">10問</button>
							<button class="question-count-btn ${this.questionCount === 20 ? 'active' : ''}" data-count="20">20問</button>
							<button class="question-count-btn ${this.questionCount === 50 ? 'active' : ''}" data-count="50">50問</button>
							<button class="question-count-btn ${this.questionCount === 'all' ? 'active' : ''}" data-count="all">全問</button>
						</div>

						<div class="action-area">
							<button class="btn btn-large btn-primary" id="start-exam-btn">試験開始</button>
						</div>
					</div>

					<div class="instructions">
						<h3>使い方</h3>
						<ul>
							<li>フィルターで出題範囲を絞り込みます</li>
							<li>出題形式を選択します（略語→意味、意味→略語、モールス音から）</li>
							<li>問題数を選択します（5問〜全問）</li>
							<li>4つの選択肢から正解を選びます</li>
							<li>80%以上で合格です</li>
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
				questionText = `次の略語の意味は？<br><strong class="question-text">${question.entry.abbreviation}</strong>`;
				break;
			case 'meaning-to-abbr':
				questionText = `次の意味を表す略語は？<br><strong class="question-text">${question.entry.english} / ${question.entry.japanese}</strong>`;
				break;
			case 'morse-to-abbr':
				questionText = `モールス音を聞いて、対応する略語は？<br><button id="replay-morse-btn" class="btn btn-secondary">🔊 もう一度再生</button>`;
				break;
			case 'morse-to-meaning':
				questionText = `モールス音を聞いて、対応する意味は？<br><button id="replay-morse-btn" class="btn btn-secondary">🔊 もう一度再生</button>`;
				break;
		}

		app.innerHTML = `
			<div class="container">
				<header class="header">
					<h1>CW略語・Q符号学習 - 試験中</h1>
					<button class="back-btn">中断</button>
				</header>

				<div class="exam-container">
					<div class="exam-progress">
						<span>問題 <strong>${progress}</strong> / ${total}</span>
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
					<h1>CW略語・Q符号学習 - 結果</h1>
					<button class="back-btn">メニューに戻る</button>
				</header>

				<div class="result-container">
					<div class="score-area ${isPassed ? 'passed' : 'failed'}">
						<h2>${isPassed ? '合格！' : '不合格'}</h2>
						<div class="score-display">
							<span class="score-percentage">${score.percentage}%</span>
							<span class="score-detail">${score.correct} / ${score.total} 問正解</span>
						</div>
					</div>

					${wrongAnswers.length > 0 ? `
						<div class="wrong-answers-section">
							<h3>間違えた問題（${wrongAnswers.length}件）</h3>
							<div class="wrong-answers-list">
								${this.results.filter(r => !r.isCorrect).map(result => `
									<div class="wrong-answer-item">
										<div class="wrong-answer-question">
											<strong>${result.question.entry.abbreviation}</strong>
											<span>${result.question.entry.english} / ${result.question.entry.japanese}</span>
										</div>
										<div class="wrong-answer-detail">
											<span class="wrong-label">あなたの回答:</span>
											<span class="wrong-user-answer">${result.userAnswer}</span>
											<span class="correct-label">正解:</span>
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
							<p>すべて正解しました！</p>
						</div>
					`}

					<div class="action-area">
						<button class="btn btn-primary btn-large" id="retry-btn">もう一度</button>
						<button class="btn btn-secondary btn-large" id="back-to-setup-btn">設定に戻る</button>
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
			if (confirm('試験を中断してメニューに戻りますか？')) {
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
						await new Promise(resolve => setTimeout(resolve, 60));  // 要素間スペース
					}
				}
			}

			this.currentlyPlaying = null;
			this.renderEntries();
		} catch (error) {
			console.error('モールス再生エラー:', error);
			this.currentlyPlaying = null;
			this.renderEntries();
		}
	}

	/**
	 * 試験を開始
	 */
	private startExam(): void {
		if (this.filteredEntries.length === 0) {
			alert('該当するエントリーがありません。フィルターを調整してください。');
			return;
		}

		const count = this.questionCount === 'all' ? this.filteredEntries.length : this.questionCount;
		const actualCount = Math.min(count, this.filteredEntries.length);
		if (actualCount === 0) {
			alert('問題数を1以上に設定してください。');
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
			ALL_SETTING_ITEMS,
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
			}
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
