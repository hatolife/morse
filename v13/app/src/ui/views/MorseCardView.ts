import type { View } from '../../router';
import {
	AudioGenerator,
	ALL_SETTING_ITEMS,
	MorseCardState,
	MorseCardTrainer,
	SettingsModal,
	type MorseCardCategory,
	type MorseCardDisplayMode,
	type MorseCardEntry,
	type MorseCardExamResult,
	type MorseCardProgress,
	type MorseCardQuestion,
	type MorseCardQuestionType,
	type MorseCardSortColumn,
	type MorseCardSortDirection,
	type SettingValues,
} from 'morse-engine';
import { loadMorseCardData } from '../../utils/morse-card-loader';
import { t } from '../../i18n';
import { getSettingsModalTexts, localizeSettingItems } from '../../i18n/settings-modal';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

type ViewState = 'loading' | 'browse' | 'learn' | 'exam' | 'exam-result';

const QUESTION_TYPES: MorseCardQuestionType[] = [
	'char-to-morse',
	'morse-to-char',
	'sound-to-char',
	'sound-to-morse'
];

const CATEGORIES: MorseCardCategory[] = ['letter', 'number', 'symbol'];

export class MorseCardView implements View {
	private languageSwitcher = new LanguageSwitcher();
	private allEntries: MorseCardEntry[] = [];
	private filteredEntries: MorseCardEntry[] = [];
	private currentState: ViewState = 'loading';
	private selectedCategories: Set<MorseCardCategory>;
	private selectedDifficulties: Set<number>;
	private searchQuery: string;
	private displayMode: MorseCardDisplayMode;
	private sortColumn: MorseCardSortColumn;
	private sortDirection: MorseCardSortDirection;
	private learnQuestionType: MorseCardQuestionType;
	private examQuestionType: MorseCardQuestionType;
	private questionCount: number | 'all' = 10;
	private learnCards: MorseCardEntry[] = [];
	private currentLearnIndex = 0;
	private isFlipped = false;
	private reviewMode = false;
	private progress: MorseCardProgress;
	private questions: MorseCardQuestion[] = [];
	private currentQuestionIndex = 0;
	private results: MorseCardExamResult[] = [];
	private settingValues: SettingValues = {
		volume: 50,
		frequency: 700,
		wpm: 20,
		effectiveWpm: 20
	};
	private audio: AudioGenerator;

	constructor() {
		const filters = MorseCardState.loadFilters();
		const viewState = MorseCardState.loadViewState();
		this.progress = MorseCardState.loadProgress();
		this.selectedCategories = filters.selectedCategories;
		this.selectedDifficulties = filters.selectedDifficulties;
		this.searchQuery = filters.searchQuery;
		this.displayMode = viewState.displayMode;
		this.sortColumn = viewState.sortColumn;
		this.sortDirection = viewState.sortDirection;
		this.learnQuestionType = viewState.learnQuestionType;
		this.examQuestionType = viewState.examQuestionType;
		this.settingValues = this.loadAudioSettings();
		this.audio = new AudioGenerator({
			frequency: Number(this.settingValues.frequency),
			volume: Number(this.settingValues.volume) / 100,
			wpm: Number(this.settingValues.wpm),
			effectiveWpm: Number(this.settingValues.effectiveWpm)
		});
	}

	async render(): Promise<void> {
		if (this.currentState === 'loading') {
			this.renderLoading();
			try {
				this.allEntries = await loadMorseCardData('morse-flashcard.tsv');
				this.updateFilteredEntries();
				this.currentState = MorseCardState.loadViewState().viewMode;
				this.render();
			} catch (error) {
				this.renderError(error);
			}
			return;
		}

		if (this.currentState === 'browse') this.renderBrowse();
		if (this.currentState === 'learn') this.renderLearn();
		if (this.currentState === 'exam') this.renderExam();
		if (this.currentState === 'exam-result') this.renderExamResult();
	}

	destroy(): void {
		this.audio.stopContinuousTone();
	}

	private renderLoading(): void {
		this.setApp(`
			${this.renderHeader()}
			<div class="loading-container"><p>${t('morseCard.loading')}</p></div>
		`);
		this.attachHeaderListeners();
	}

	private renderError(error: unknown): void {
		this.setApp(`
			${this.renderHeader()}
			<div class="error-container">
				<p>${t('morseCard.loadError')}</p>
				<p>${String(error)}</p>
			</div>
		`);
		this.attachHeaderListeners();
	}

	private renderBrowse(): void {
		this.setApp(`
			${this.renderHeader()}
			${this.renderTabs('browse')}
			<div class="flashcard-container">
				${this.renderFilterSection()}
				<div class="entries-section" id="entries-section">
					${this.displayMode === 'card' ? this.renderCardEntries() : this.renderListEntries()}
				</div>
			</div>
		`);
		this.attachCommonListeners();
		this.attachFilterListeners(() => this.renderBrowse());
		this.attachEntryListeners();
	}

	private renderLearn(): void {
		if (this.learnCards.length === 0) {
			const count = this.getLearnSourceCards().length;
			this.setApp(`
				${this.renderHeader()}
				${this.renderTabs('learn')}
				<div class="flashcard-container">
					${this.renderFilterSection()}
					<div class="learn-setup-section">
						<h3>${t('morseCard.learn.setupTitle')}</h3>
						<div class="filter-group">
							<label>${t('morseCard.learn.questionTypeLabel')}</label>
							<div class="question-type-buttons">${this.renderQuestionTypeButtons(this.learnQuestionType)}</div>
						</div>
						<div class="filter-group">
							<button class="mode-btn ${this.reviewMode ? 'active' : ''}" id="review-mode-btn">
								${t('morseCard.learn.reviewMode')} ${this.progress.unknown.size}
							</button>
						</div>
						<div class="filter-stats">
							<span>${t('morseCard.learn.availableCards')} <strong>${count}</strong></span>
						</div>
						<div class="action-area">
							<button class="btn btn-primary btn-large" id="start-learn-btn" ${count === 0 ? 'disabled' : ''}>${t('morseCard.learn.start')}</button>
							<button class="btn btn-secondary btn-large" id="clear-progress-btn">${t('morseCard.learn.clearProgress')}</button>
						</div>
					</div>
				</div>
			`);
			this.attachCommonListeners();
			this.attachFilterListeners(() => this.renderLearn());
			this.attachLearnSetupListeners();
			return;
		}

		const card = this.learnCards[this.currentLearnIndex];
		const front = this.getPrompt(card, this.learnQuestionType);
		const back = this.getAnswer(card, this.learnQuestionType);
		this.setApp(`
			${this.renderHeader()}
			${this.renderTabs('learn')}
			<div class="flashcard-container">
				<div class="learn-card-container">
					<div class="learn-progress">${this.currentLearnIndex + 1} / ${this.learnCards.length}</div>
					<div class="learn-card ${this.isFlipped ? 'flipped' : ''}" id="learn-card">
						<div class="card-content">
							<div class="card-label">${this.isFlipped ? t('morseCard.learn.answer') : t('morseCard.learn.question')}</div>
							<div class="morse-card-main">${this.isFlipped ? back : front}</div>
							<div class="card-description">${card.description}</div>
						</div>
					</div>
					<div class="action-area">
						<button class="btn btn-secondary" id="play-card-btn">${t('morseCard.play')}</button>
						<button class="btn btn-primary" id="flip-card-btn">${this.isFlipped ? t('morseCard.learn.hideAnswer') : t('morseCard.learn.showAnswer')}</button>
					</div>
					<div class="judgment-buttons">
						<button class="judgment-button unknown" id="unknown-btn">${t('morseCard.learn.unknown')}</button>
						<button class="judgment-button known" id="known-btn">${t('morseCard.learn.known')}</button>
					</div>
					<div class="action-area">
						<button class="btn btn-secondary" id="back-to-setup-btn">${t('morseCard.learn.backToSetup')}</button>
					</div>
				</div>
			</div>
		`);
		this.attachCommonListeners();
		document.getElementById('learn-card')?.addEventListener('click', () => this.flipLearnCard());
		document.getElementById('flip-card-btn')?.addEventListener('click', () => this.flipLearnCard());
		document.getElementById('play-card-btn')?.addEventListener('click', () => this.playMorse(card.morse));
		document.getElementById('known-btn')?.addEventListener('click', () => this.markLearnCard(true));
		document.getElementById('unknown-btn')?.addEventListener('click', () => this.markLearnCard(false));
		document.getElementById('back-to-setup-btn')?.addEventListener('click', () => this.resetLearn());
		if (this.learnQuestionType.startsWith('sound-to')) this.playMorse(card.morse);
	}

	private renderExam(): void {
		if (this.questions.length === 0) {
			this.setApp(`
				${this.renderHeader()}
				${this.renderTabs('exam')}
				<div class="flashcard-container">
					${this.renderFilterSection()}
					<div class="exam-setup-section">
						<h3>${t('morseCard.exam.setupTitle')}</h3>
						<div class="filter-group">
							<label>${t('morseCard.exam.questionTypeLabel')}</label>
							<div class="question-type-buttons">${this.renderQuestionTypeButtons(this.examQuestionType)}</div>
						</div>
						<div class="filter-group">
							<label>${t('morseCard.exam.questionCount')}</label>
							<div class="question-count-buttons">
								${[10, 20, 50, 'all'].map(count => `
									<button class="question-count-btn ${this.questionCount === count ? 'active' : ''}" data-count="${count}">${count === 'all' ? t('morseCard.exam.all') : count}</button>
								`).join('')}
							</div>
						</div>
						<div class="filter-stats">
							<span>${t('morseCard.filter.filteredCount')} <strong>${this.filteredEntries.length}</strong></span>
						</div>
						<div class="action-area">
							<button class="btn btn-primary btn-large" id="start-exam-btn" ${this.filteredEntries.length === 0 ? 'disabled' : ''}>${t('morseCard.exam.start')}</button>
						</div>
					</div>
				</div>
			`);
			this.attachCommonListeners();
			this.attachFilterListeners(() => this.renderExam());
			this.attachExamSetupListeners();
			return;
		}

		const question = this.questions[this.currentQuestionIndex];
		this.setApp(`
			${this.renderHeader()}
			<div class="exam-container">
				<div class="exam-progress"><strong>${this.currentQuestionIndex + 1}</strong> / ${this.questions.length}</div>
				<div class="question-card">
					<div class="question-type">${this.questionTypeLabel(question.type)}</div>
					<div class="question-text">${this.getPrompt(question.entry, question.type)}</div>
					${question.type.startsWith('sound-to') ? `<button class="btn btn-secondary" id="replay-btn">${t('morseCard.play')}</button>` : ''}
				</div>
				<div class="choices-grid">
					${question.choices.map(choice => `<button class="choice-btn" data-choice="${this.escapeAttr(choice)}">${choice}</button>`).join('')}
				</div>
			</div>
		`);
		this.attachHeaderListeners();
		document.getElementById('replay-btn')?.addEventListener('click', () => this.playMorse(question.entry.morse));
		document.querySelectorAll('.choice-btn').forEach(button => {
			button.addEventListener('click', event => {
				const target = event.currentTarget as HTMLButtonElement;
				this.handleExamAnswer(target.dataset.choice || '');
			});
		});
		if (question.type.startsWith('sound-to')) this.playMorse(question.entry.morse);
	}

	private renderExamResult(): void {
		const score = MorseCardTrainer.calculateScore(this.results);
		const wrongResults = this.results.filter(result => !result.isCorrect);
		this.setApp(`
			${this.renderHeader()}
			<div class="exam-container">
				<div class="result-summary">
					<h2>${MorseCardTrainer.isPassed(score.percentage) ? t('morseCard.result.passed') : t('morseCard.result.failed')}</h2>
					<div class="score-display">${score.percentage}%</div>
					<div class="score-detail">${score.correct} / ${score.total}</div>
				</div>
				${wrongResults.length > 0 ? `
					<div class="wrong-answers-section">
						<h3>${t('morseCard.result.wrongAnswers')}</h3>
						<div class="wrong-answers-list">
							${wrongResults.map(result => `
								<div class="wrong-answer-item">
									<div class="wrong-answer-question"><strong>${result.question.entry.character}</strong><span>${result.question.entry.morse}</span></div>
									<div class="wrong-answer-detail">
										<span>${t('morseCard.result.yourAnswer')}</span>
										<span class="wrong-user-answer">${result.userAnswer}</span>
										<span>${t('morseCard.result.correctAnswer')}</span>
										<span class="correct-answer">${result.question.correctAnswer}</span>
									</div>
								</div>
							`).join('')}
						</div>
					</div>
				` : `<div class="perfect-score"><p>${t('morseCard.result.perfect')}</p></div>`}
				<div class="action-area">
					<button class="btn btn-primary btn-large" id="retry-btn">${t('morseCard.result.retry')}</button>
					<button class="btn btn-secondary btn-large" id="back-to-setup-btn">${t('morseCard.result.backToSetup')}</button>
				</div>
			</div>
		`);
		this.attachHeaderListeners();
		document.getElementById('retry-btn')?.addEventListener('click', () => this.startExam());
		document.getElementById('back-to-setup-btn')?.addEventListener('click', () => {
			this.questions = [];
			this.results = [];
			this.currentQuestionIndex = 0;
			this.currentState = 'exam';
			this.render();
		});
	}

	private renderHeader(): string {
		return `
			<div class="settings-icon" id="settingsIcon">
				<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
					<path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
				</svg>
			</div>
			<div class="container">
				<header class="header">
					<div class="header-top">
						<button class="back-btn">${t('common.backToMenu')}</button>
						<h1>${t('morseCard.title')}</h1>
						<div id="languageSwitcherContainer">${this.languageSwitcher.render()}</div>
					</div>
				</header>
			</div>
		`;
	}

	private renderTabs(active: 'browse' | 'learn' | 'exam'): string {
		return `
			<div class="tabs">
				${(['browse', 'learn', 'exam'] as const).map(tab => `
					<button class="tab-button ${active === tab ? 'active' : ''}" data-tab="${tab}">${t(`morseCard.tabs.${tab}`)}</button>
				`).join('')}
			</div>
		`;
	}

	private renderFilterSection(): string {
		return `
			<div class="filter-section">
				<h3>${t('morseCard.filter.title')}</h3>
				<div class="filter-group">
					<label>${t('morseCard.filter.category')}</label>
					<div class="tag-filter" id="category-filter">
						${CATEGORIES.map(category => `
							<label class="tag-checkbox">
								<input type="checkbox" value="${category}" ${this.selectedCategories.has(category) ? 'checked' : ''}>
								<span>${t(`morseCard.categories.${category}`)}</span>
							</label>
						`).join('')}
					</div>
				</div>
				<div class="filter-group">
					<label>${t('morseCard.filter.difficulty')}</label>
					<div class="frequency-filter" id="difficulty-filter">
						${[1, 2, 3, 4, 5].map(difficulty => `
							<label class="frequency-checkbox">
								<input type="checkbox" value="${difficulty}" ${this.selectedDifficulties.has(difficulty) ? 'checked' : ''}>
								<span>${difficulty}</span>
							</label>
						`).join('')}
					</div>
				</div>
				<div class="filter-group">
					<label for="search-input">${t('morseCard.filter.search')}</label>
					<input type="text" id="search-input" class="search-input" value="${this.escapeAttr(this.searchQuery)}" placeholder="${t('morseCard.filter.searchPlaceholder')}">
				</div>
				<div class="filter-stats">
					<span>${t('morseCard.filter.filteredCount')} <strong>${this.filteredEntries.length}</strong></span>
					<span>${t('morseCard.filter.totalCount')} <strong>${this.allEntries.length}</strong></span>
				</div>
			</div>
		`;
	}

	private renderCardEntries(): string {
		return `
			<div class="entries-header">
				<h3>${t('morseCard.browse.entries')} (${this.filteredEntries.length})</h3>
				<button id="toggle-display-btn" class="toggle-display-btn">${t('morseCard.browse.toggleList')}</button>
			</div>
			<div class="entries-grid">
				${this.filteredEntries.map(entry => `
					<div class="entry-card" data-morse="${this.escapeAttr(entry.morse)}">
						<div class="entry-header">
							<div class="entry-abbr morse-character">${entry.character}</div>
							<div class="entry-frequency">${'★'.repeat(entry.difficulty)}${'☆'.repeat(5 - entry.difficulty)}</div>
						</div>
						<div class="entry-english morse-code-text">${entry.morse}</div>
						<div class="entry-japanese">${t(`morseCard.categories.${entry.category}`)} / ${entry.description}</div>
						<div class="entry-tags">${entry.label}</div>
					</div>
				`).join('')}
			</div>
		`;
	}

	private renderListEntries(): string {
		return `
			<div class="entries-header">
				<h3>${t('morseCard.browse.entries')} (${this.filteredEntries.length})</h3>
				<button id="toggle-display-btn" class="toggle-display-btn">${t('morseCard.browse.toggleCard')}</button>
			</div>
			<div class="list-table-container">
				<table class="list-table">
					<thead>
						<tr>
							${this.renderSortableHeader('character', t('morseCard.table.character'))}
							${this.renderSortableHeader('morse', t('morseCard.table.morse'))}
							${this.renderSortableHeader('category', t('morseCard.table.category'))}
							${this.renderSortableHeader('difficulty', t('morseCard.table.difficulty'))}
							<th>${t('morseCard.table.description')}</th>
						</tr>
					</thead>
					<tbody>
						${this.filteredEntries.map(entry => `
							<tr>
								<td><button class="abbr-play-btn" data-morse="${this.escapeAttr(entry.morse)}">${entry.character}</button></td>
								<td class="morse-code-text">${entry.morse}</td>
								<td>${t(`morseCard.categories.${entry.category}`)}</td>
								<td>${entry.difficulty}</td>
								<td>${entry.description}</td>
							</tr>
						`).join('')}
					</tbody>
				</table>
			</div>
		`;
	}

	private renderSortableHeader(column: MorseCardSortColumn, label: string): string {
		const indicator = this.sortColumn === column ? (this.sortDirection === 'asc' ? ' ▲' : ' ▼') : '';
		return `<th class="sortable" data-column="${column}">${label}${indicator}</th>`;
	}

	private renderQuestionTypeButtons(activeType: MorseCardQuestionType): string {
		return QUESTION_TYPES.map(type => `
			<button class="question-type-btn ${activeType === type ? 'active' : ''}" data-type="${type}">${this.questionTypeLabel(type)}</button>
		`).join('');
	}

	private attachHeaderListeners(): void {
		document.querySelector('.back-btn')?.addEventListener('click', () => {
			window.location.hash = '#menu';
		});
		document.getElementById('settingsIcon')?.addEventListener('click', () => this.openSettingsModal());
		const languageSwitcherContainer = document.getElementById('languageSwitcherContainer');
		if (languageSwitcherContainer) this.languageSwitcher.attachEventListeners(languageSwitcherContainer);
	}

	private attachCommonListeners(): void {
		this.attachHeaderListeners();
		document.querySelectorAll('.tab-button').forEach(button => {
			button.addEventListener('click', () => {
				const tab = button.getAttribute('data-tab') as 'browse' | 'learn' | 'exam';
				this.currentState = tab;
				if (tab !== 'learn') this.resetLearn();
				if (tab === 'exam') this.resetExam();
				MorseCardState.saveViewMode(tab);
				this.render();
			});
		});
	}

	private attachFilterListeners(afterChange: () => void): void {
		document.getElementById('category-filter')?.addEventListener('change', event => {
			const target = event.target as HTMLInputElement;
			if (target.type !== 'checkbox') return;
			const category = target.value as MorseCardCategory;
			if (target.checked) this.selectedCategories.add(category);
			else this.selectedCategories.delete(category);
			this.saveFiltersAndUpdate();
			afterChange();
		});
		document.getElementById('difficulty-filter')?.addEventListener('change', event => {
			const target = event.target as HTMLInputElement;
			if (target.type !== 'checkbox') return;
			const difficulty = Number.parseInt(target.value, 10);
			if (target.checked) this.selectedDifficulties.add(difficulty);
			else this.selectedDifficulties.delete(difficulty);
			this.saveFiltersAndUpdate();
			afterChange();
		});
		document.getElementById('search-input')?.addEventListener('input', event => {
			this.searchQuery = (event.target as HTMLInputElement).value;
			this.saveFiltersAndUpdate();
			afterChange();
		});
	}

	private attachEntryListeners(): void {
		document.querySelectorAll<HTMLElement>('[data-morse]').forEach(element => {
			element.addEventListener('click', () => this.playMorse(element.dataset.morse || ''));
		});
		document.getElementById('toggle-display-btn')?.addEventListener('click', () => {
			this.displayMode = this.displayMode === 'card' ? 'list' : 'card';
			MorseCardState.saveDisplayMode(this.displayMode);
			this.renderBrowse();
		});
		document.querySelectorAll('th.sortable').forEach(header => {
			header.addEventListener('click', () => {
				const column = header.getAttribute('data-column') as MorseCardSortColumn;
				this.sortDirection = this.sortColumn === column && this.sortDirection === 'asc' ? 'desc' : 'asc';
				this.sortColumn = column;
				MorseCardState.saveSortState(this.sortColumn, this.sortDirection);
				this.updateFilteredEntries();
				this.renderBrowse();
			});
		});
	}

	private attachLearnSetupListeners(): void {
		document.getElementById('review-mode-btn')?.addEventListener('click', () => {
			this.reviewMode = !this.reviewMode;
			this.renderLearn();
		});
		document.getElementById('start-learn-btn')?.addEventListener('click', () => this.startLearn());
		document.getElementById('clear-progress-btn')?.addEventListener('click', () => {
			if (confirm(t('morseCard.learn.confirmReset'))) {
				this.progress = { known: new Set(), unknown: new Set() };
				MorseCardState.clearProgress();
				this.renderLearn();
			}
		});
		document.querySelectorAll('.question-type-btn').forEach(button => {
			button.addEventListener('click', () => {
				this.learnQuestionType = button.getAttribute('data-type') as MorseCardQuestionType;
				MorseCardState.saveLearnQuestionType(this.learnQuestionType);
				this.renderLearn();
			});
		});
	}

	private attachExamSetupListeners(): void {
		document.querySelectorAll('.question-type-btn').forEach(button => {
			button.addEventListener('click', () => {
				this.examQuestionType = button.getAttribute('data-type') as MorseCardQuestionType;
				MorseCardState.saveExamQuestionType(this.examQuestionType);
				this.renderExam();
			});
		});
		document.querySelectorAll('.question-count-btn').forEach(button => {
			button.addEventListener('click', () => {
				const count = button.getAttribute('data-count');
				this.questionCount = count === 'all' ? 'all' : Number.parseInt(count || '10', 10);
				this.renderExam();
			});
		});
		document.getElementById('start-exam-btn')?.addEventListener('click', () => this.startExam());
	}

	private startLearn(): void {
		this.learnCards = MorseCardTrainer.shuffleCards(this.getLearnSourceCards());
		this.currentLearnIndex = 0;
		this.isFlipped = false;
		this.renderLearn();
	}

	private getLearnSourceCards(): MorseCardEntry[] {
		if (!this.reviewMode) return this.filteredEntries;
		return this.filteredEntries.filter(entry => this.progress.unknown.has(entry.character));
	}

	private flipLearnCard(): void {
		this.isFlipped = !this.isFlipped;
		this.renderLearn();
	}

	private markLearnCard(known: boolean): void {
		const card = this.learnCards[this.currentLearnIndex];
		if (known) {
			this.progress.known.add(card.character);
			this.progress.unknown.delete(card.character);
		} else {
			this.progress.unknown.add(card.character);
			this.progress.known.delete(card.character);
		}
		MorseCardState.saveProgress(this.progress);
		this.currentLearnIndex++;
		this.isFlipped = false;
		if (this.currentLearnIndex >= this.learnCards.length) this.resetLearn();
		else this.renderLearn();
	}

	private startExam(): void {
		const count = this.questionCount === 'all' ? this.filteredEntries.length : this.questionCount;
		this.questions = MorseCardTrainer.generateExamQuestions(this.filteredEntries, this.examQuestionType, count);
		this.currentQuestionIndex = 0;
		this.results = [];
		this.renderExam();
	}

	private handleExamAnswer(userAnswer: string): void {
		const question = this.questions[this.currentQuestionIndex];
		this.results.push({
			question,
			userAnswer,
			isCorrect: MorseCardTrainer.checkAnswer(question, userAnswer)
		});
		this.currentQuestionIndex++;
		if (this.currentQuestionIndex >= this.questions.length) this.currentState = 'exam-result';
		this.render();
	}

	private resetLearn(): void {
		this.learnCards = [];
		this.currentLearnIndex = 0;
		this.isFlipped = false;
	}

	private resetExam(): void {
		this.questions = [];
		this.currentQuestionIndex = 0;
		this.results = [];
	}

	private saveFiltersAndUpdate(): void {
		MorseCardState.saveFilters({
			selectedCategories: this.selectedCategories,
			selectedDifficulties: this.selectedDifficulties,
			searchQuery: this.searchQuery
		});
		this.updateFilteredEntries();
	}

	private updateFilteredEntries(): void {
		let entries = MorseCardTrainer.filterByCategories(this.allEntries, this.selectedCategories);
		entries = MorseCardTrainer.filterByDifficulties(entries, this.selectedDifficulties);
		entries = MorseCardTrainer.filterByQuery(entries, this.searchQuery);
		this.filteredEntries = MorseCardTrainer.sortEntries(entries, this.sortColumn, this.sortDirection);
	}

	private getPrompt(entry: MorseCardEntry, type: MorseCardQuestionType): string {
		if (type === 'char-to-morse') return entry.character;
		if (type === 'morse-to-char') return entry.morse;
		return t('morseCard.soundPrompt');
	}

	private getAnswer(entry: MorseCardEntry, type: MorseCardQuestionType): string {
		if (type === 'char-to-morse' || type === 'sound-to-morse') return entry.morse;
		return entry.character;
	}

	private questionTypeLabel(type: MorseCardQuestionType): string {
		return t(`morseCard.questionTypes.${type}`);
	}

	private async playMorse(morse: string): Promise<void> {
		for (const symbol of morse) {
			if (symbol === '.') {
				this.audio.scheduleTone(0, 60);
				await new Promise(resolve => setTimeout(resolve, 120));
			} else if (symbol === '-') {
				this.audio.scheduleTone(0, 180);
				await new Promise(resolve => setTimeout(resolve, 240));
			}
		}
	}

	private openSettingsModal(): void {
		const modal = new SettingsModal(
			'morse-flashcard-settings-modal',
			localizeSettingItems(ALL_SETTING_ITEMS),
			this.settingValues,
			{
				onSave: values => {
					this.settingValues = values;
					this.saveAudioSettings(values);
					this.audio.updateSettings({
						frequency: Number(values.frequency),
						volume: Number(values.volume) / 100,
						wpm: Number(values.wpm),
						effectiveWpm: Number(values.effectiveWpm)
					});
				},
				onCancel: () => undefined,
				onTestPlay: () => {
					this.playMorse('.-');
				}
			},
			getSettingsModalTexts()
		);
		modal.show('flashcard');
	}

	private loadAudioSettings(): SettingValues {
		try {
			const saved = localStorage.getItem('v13.morseCard.audioSettings');
			if (saved) {
				return { ...this.settingValues, ...JSON.parse(saved) };
			}
		} catch (error) {
			console.error('Failed to load morse card audio settings:', error);
		}
		return this.settingValues;
	}

	private saveAudioSettings(values: SettingValues): void {
		try {
			localStorage.setItem('v13.morseCard.audioSettings', JSON.stringify(values));
		} catch (error) {
			console.error('Failed to save morse card audio settings:', error);
		}
	}

	private setApp(content: string): void {
		const app = document.getElementById('app');
		if (!app) return;
		app.innerHTML = `<div class="morse-card-view">${content}</div>`;
	}

	private escapeAttr(value: string): string {
		return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}
}
