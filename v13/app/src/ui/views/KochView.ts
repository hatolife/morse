/**
 * コッホ法トレーニングビュー
 */

import type { View } from '../../router';
import {
	KochTrainer,
	KOCH_SEQUENCE,
	AudioGenerator,
	MorseCodec,
	type PracticeSettings
} from 'morse-engine';
import { SettingsModal, ALL_SETTING_ITEMS, type SettingValues } from 'morse-engine';
import { t } from '../../i18n';
import { getSettingsModalTexts, localizeSettingItems } from '../../i18n/settings-modal';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

type ViewMode = 'learning' | 'custom';

interface LessonState {
	currentLesson: number;
	isPlaying: boolean;
	userInput: string;
	correctAnswer: string;
	groups: string[];
	currentGroupIndex: number;
}

interface CustomState {
	selectedChars: Set<string>;
	isCustomRunning: boolean;
	customUserInput: string;
	customCorrectAnswer: string;
	customGroups: string[];
	customCurrentGroupIndex: number;
	customIsPlaying: boolean;
}

interface KochSettings {
	characterSpeed: number;
	effectiveSpeed: number;
	frequency: number;
	volume: number;
	practiceDuration: number;
	groupSize: number;
	showInput: boolean;
}

const DEFAULT_SETTINGS: KochSettings = {
	characterSpeed: 20,
	effectiveSpeed: 15,
	frequency: 700,
	volume: 0.7,
	practiceDuration: 60,
	groupSize: 5,
	showInput: true
};

/**
 * コッホ法トレーニングビュークラス
 */
export class KochView implements View {
	private audio: AudioGenerator;
	private viewMode: ViewMode = 'learning';
	private settings: KochSettings = { ...DEFAULT_SETTINGS };
	private languageSwitcher = new LanguageSwitcher();

	private state: LessonState = {
		currentLesson: 1,
		isPlaying: false,
		userInput: '',
		correctAnswer: '',
		groups: [],
		currentGroupIndex: 0,
	};

	private customState: CustomState = {
		selectedChars: new Set(),
		isCustomRunning: false,
		customUserInput: '',
		customCorrectAnswer: '',
		customGroups: [],
		customCurrentGroupIndex: 0,
		customIsPlaying: false,
	};

	constructor() {
		//! 設定を読み込む。
		this.loadSettings();
		this.loadProgress();
		this.loadViewMode();
		this.loadSelectedChars();

		//! AudioGeneratorを初期化。
		this.audio = new AudioGenerator({
			frequency: this.settings.frequency,
			volume: this.settings.volume,
			wpm: this.settings.characterSpeed,
			effectiveWpm: this.settings.effectiveSpeed
		});
	}

	//! ========== 設定管理 ==========

	private loadSettings(): void {
		try {
			const saved = localStorage.getItem('v10.koch.settings');
			if (saved) {
				this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
			}
		} catch (error) {
			console.error('Failed to load settings:', error);
		}
	}

	private saveSettings(): void {
		try {
			localStorage.setItem('v10.koch.settings', JSON.stringify(this.settings));
		} catch (error) {
			console.error('Failed to save settings:', error);
		}
	}

	private loadProgress(): void {
		try {
			const saved = localStorage.getItem('v10.koch.currentLesson');
			if (saved) {
				this.state.currentLesson = parseInt(saved, 10);
			}
		} catch (error) {
			console.error('Failed to load progress:', error);
		}
	}

	private saveProgress(): void {
		try {
			localStorage.setItem('v10.koch.currentLesson', this.state.currentLesson.toString());
		} catch (error) {
			console.error('Failed to save progress:', error);
		}
	}

	private loadViewMode(): void {
		try {
			const saved = localStorage.getItem('v10.koch.viewMode') as ViewMode | null;
			if (saved && ['learning', 'custom'].includes(saved)) {
				this.viewMode = saved;
			}
		} catch (error) {
			console.error('Failed to load view mode:', error);
		}
	}

	private saveViewMode(): void {
		try {
			localStorage.setItem('v10.koch.viewMode', this.viewMode);
		} catch (error) {
			console.error('Failed to save view mode:', error);
		}
	}

	private loadSelectedChars(): void {
		try {
			const saved = localStorage.getItem('v10.koch.selectedChars');
			if (saved) {
				const chars = JSON.parse(saved) as string[];
				this.customState.selectedChars = new Set(chars);
			}
		} catch (error) {
			console.error('Failed to load selected chars:', error);
		}
	}

	private saveSelectedChars(): void {
		try {
			const chars = Array.from(this.customState.selectedChars);
			localStorage.setItem('v10.koch.selectedChars', JSON.stringify(chars));
		} catch (error) {
			console.error('Failed to save selected chars:', error);
		}
	}

	//! ========== レッスン管理 ==========

	private async startLesson(): Promise<void> {
		const chars = KochTrainer.getCharsForLesson(this.state.currentLesson);
		const practiceSettings: PracticeSettings = {
			groupSize: this.settings.groupSize,
			duration: this.settings.practiceDuration,
			wpm: this.settings.characterSpeed
		};
		this.state.groups = KochTrainer.generateRandomGroups(chars, practiceSettings);
		this.state.currentGroupIndex = 0;
		this.state.userInput = '';
		this.state.correctAnswer = this.state.groups.join('');
		this.state.isPlaying = false;

		//! AudioGeneratorの設定を更新。
		this.audio.updateSettings({
			frequency: this.settings.frequency,
			volume: this.settings.volume,
			wpm: this.settings.characterSpeed,
			effectiveWpm: this.settings.effectiveSpeed
		});

		this.renderPractice();
	}

	private async playMorse(): Promise<void> {
		if (this.state.isPlaying) return;

		this.state.isPlaying = true;
		this.state.currentGroupIndex = 0;
		this.updateProgress();
		this.updatePlaybackButtons();

		//! モールス信号を再生。
		for (let i = 0; i < this.state.groups.length && this.state.isPlaying; i++) {
			const group = this.state.groups[i];
			const morse = MorseCodec.textToMorse(group);
			await this.audio.playMorseString(morse + ' /');

			this.state.currentGroupIndex = i + 1;
			this.updateProgress();
		}

		this.state.isPlaying = false;
		this.updatePlaybackButtons();
		if (this.state.currentGroupIndex >= this.state.groups.length) {
			this.showResult();
		}
	}

	private pauseMorse(): void {
		this.state.isPlaying = false;
		this.audio.stopPlaying();
		this.updatePlaybackButtons();
	}

	private stopLesson(): void {
		this.state.isPlaying = false;
		this.audio.stopPlaying();
		this.render();
	}

	private showResult(): void {
		const accuracy = KochTrainer.calculateAccuracy(this.state.correctAnswer, this.state.userInput);
		const passed = accuracy >= 90;

		const resultContainer = document.getElementById('resultContainer');
		if (!resultContainer) return;

		resultContainer.innerHTML = `
			<div class="result ${passed ? 'passed' : 'failed'}">
				<h2>${passed ? t('koch.result.passed') : t('koch.result.failed')}</h2>
				<div class="accuracy">${t('koch.result.accuracy')} ${accuracy.toFixed(1)}%</div>
				<div class="comparison">
					<div>${t('koch.result.sent')} ${this.state.correctAnswer}</div>
					<div>${t('koch.result.input')} ${this.state.userInput || t('koch.result.noInput')}</div>
				</div>
				<div class="actions">
					${passed ? `<button class="btn primary" id="nextLessonBtn">${t('koch.result.nextLesson')}</button>` : ''}
					<button class="btn" id="retryBtn">${t('koch.result.retry')}</button>
				</div>
			</div>
		`;

		if (passed && this.state.currentLesson < 40) {
			this.state.currentLesson++;
			this.saveProgress();

			document.getElementById('nextLessonBtn')?.addEventListener('click', () => {
				this.render();
			});
		}

		document.getElementById('retryBtn')?.addEventListener('click', () => {
			this.render();
		});
	}

	private updateProgress(): void {
		const progressEl = document.getElementById('lessonProgress');
		const progressBar = document.getElementById('progressBar');

		if (progressEl && progressBar) {
			const percent = (this.state.currentGroupIndex / this.state.groups.length) * 100;
			progressEl.textContent = `${t('koch.practice.progress')} ${this.state.currentGroupIndex}/${this.state.groups.length} (${percent.toFixed(0)}%)`;
			progressBar.style.width = `${percent}%`;
		}

		this.updatePlaybackButtons();
	}

	private updatePlaybackButtons(): void {
		const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
		const pauseBtn = document.getElementById('pauseBtn') as HTMLButtonElement;

		if (playBtn && pauseBtn) {
			if (this.state.isPlaying) {
				playBtn.disabled = true;
				pauseBtn.disabled = false;
			} else {
				playBtn.disabled = false;
				pauseBtn.disabled = true;
			}
		}
	}

	//! ========== カスタムモード管理 ==========

	private async startCustom(): Promise<void> {
		const chars = Array.from(this.customState.selectedChars);
		const practiceSettings: PracticeSettings = {
			groupSize: this.settings.groupSize,
			duration: this.settings.practiceDuration,
			wpm: this.settings.characterSpeed
		};
		this.customState.customGroups = KochTrainer.generateRandomGroups(chars, practiceSettings);
		this.customState.customCurrentGroupIndex = 0;
		this.customState.customUserInput = '';
		this.customState.customCorrectAnswer = this.customState.customGroups.join('');
		this.customState.customIsPlaying = false;
		this.customState.isCustomRunning = true;

		//! AudioGeneratorの設定を更新。
		this.audio.updateSettings({
			frequency: this.settings.frequency,
			volume: this.settings.volume,
			wpm: this.settings.characterSpeed,
			effectiveWpm: this.settings.effectiveSpeed
		});

		this.render();
		this.renderCustomPractice();
	}

	private async playCustomMorse(): Promise<void> {
		if (this.customState.customIsPlaying) return;

		this.customState.customIsPlaying = true;
		this.customState.customCurrentGroupIndex = 0;
		this.updateCustomProgress();
		this.updateCustomPlaybackButtons();

		//! モールス信号を再生。
		for (let i = 0; i < this.customState.customGroups.length && this.customState.customIsPlaying; i++) {
			const group = this.customState.customGroups[i];
			const morse = MorseCodec.textToMorse(group);
			await this.audio.playMorseString(morse + ' /');

			this.customState.customCurrentGroupIndex = i + 1;
			this.updateCustomProgress();
		}

		this.customState.customIsPlaying = false;
		this.updateCustomPlaybackButtons();
	}

	private pauseCustomMorse(): void {
		this.customState.customIsPlaying = false;
		this.audio.stopPlaying();
		this.updateCustomPlaybackButtons();
	}

	private stopCustom(): void {
		this.customState.customIsPlaying = false;
		this.audio.stopPlaying();
		this.customState.isCustomRunning = false;
		this.render();
	}

	private updateCustomProgress(): void {
		const progressEl = document.getElementById('customProgress');
		const progressBar = document.getElementById('customProgressBar');

		if (progressEl && progressBar) {
			const percent = (this.customState.customCurrentGroupIndex / this.customState.customGroups.length) * 100;
			progressEl.textContent = `${t('koch.practice.progress')} ${this.customState.customCurrentGroupIndex}/${this.customState.customGroups.length} (${percent.toFixed(0)}%)`;
			progressBar.style.width = `${percent}%`;
		}

		this.updateCustomPlaybackButtons();
	}

	private updateCustomPlaybackButtons(): void {
		const playBtn = document.getElementById('customPlayBtn') as HTMLButtonElement;
		const pauseBtn = document.getElementById('customPauseBtn') as HTMLButtonElement;

		if (playBtn && pauseBtn) {
			if (this.customState.customIsPlaying) {
				playBtn.disabled = true;
				pauseBtn.disabled = false;
			} else {
				playBtn.disabled = false;
				pauseBtn.disabled = true;
			}
		}
	}

	private showCustomResult(): void {
		const resultContainer = document.getElementById('customResultContainer');
		if (!resultContainer) return;

		//! lib側の関数を使用して正答率を計算。
		const accuracy = KochTrainer.calculateAccuracy(
			this.customState.customCorrectAnswer,
			this.customState.customUserInput
		);

		const userAnswer = this.customState.customUserInput.replace(/\s+/g, '');
		const correctAnswer = this.customState.customCorrectAnswer.replace(/\s+/g, '');

		resultContainer.innerHTML = `
			<div class="result">
				<h2>${t('koch.result.customTitle')}</h2>
				<div class="accuracy">${t('koch.result.accuracy')} ${accuracy}%</div>
				<div class="comparison">
					<div>${t('koch.result.sent')} ${correctAnswer}</div>
					<div>${t('koch.result.yourInput')} ${userAnswer}</div>
				</div>
				<div class="actions">
					<button id="retryCustomBtn" class="btn">${t('koch.result.retry')}</button>
					<button id="backToCustomMenuBtn" class="btn primary">${t('koch.result.back')}</button>
				</div>
			</div>
		`;

		document.getElementById('retryCustomBtn')?.addEventListener('click', () => {
			this.customState.isCustomRunning = false;
			this.render();
			this.startCustom();
		});

		document.getElementById('backToCustomMenuBtn')?.addEventListener('click', () => {
			this.customState.isCustomRunning = false;
			this.render();
		});
	}

	//! ========== 設定モーダル ==========

	private showSettings(): void {
		//! 現在の設定値を取得（volumeを0-100の範囲に変換）。
		const currentValues: SettingValues = {
			volume: Math.round(this.settings.volume * 100),
			frequency: this.settings.frequency,
			wpm: this.settings.characterSpeed,
			characterSpeed: this.settings.characterSpeed,
			effectiveSpeed: this.settings.effectiveSpeed,
			practiceDuration: this.settings.practiceDuration,
			groupSize: this.settings.groupSize,
			showInput: this.settings.showInput
		};

		//! 設定変更前の値を保存（キャンセル時の復元用）。
		const savedSettings = { ...this.settings };

		//! SettingsModalを作成。
		const modal = new SettingsModal(
			'koch-settings-modal',
			localizeSettingItems(ALL_SETTING_ITEMS),
			currentValues,
			{
				onSave: (values: SettingValues) => {
					//! 実効速度は文字速度を上限とする。
					let effSpeed = values.effectiveSpeed as number;
					const charSpeed = values.characterSpeed as number;
					if (effSpeed > charSpeed) {
						effSpeed = charSpeed;
					}

					//! 設定を保存。
					this.settings.characterSpeed = charSpeed;
					this.settings.effectiveSpeed = effSpeed;
					this.settings.frequency = values.frequency as number;
					this.settings.volume = (values.volume as number) / 100;
					this.settings.practiceDuration = values.practiceDuration as number;
					this.settings.groupSize = values.groupSize as number;
					this.settings.showInput = values.showInput as boolean;

					this.saveSettings();

					//! AudioGeneratorを更新。
					this.audio.updateSettings({
						frequency: this.settings.frequency,
						volume: this.settings.volume,
						wpm: this.settings.characterSpeed,
						effectiveWpm: this.settings.effectiveSpeed
					});

					//! 練習中の場合、表示を更新。
					if (this.state.groups.length > 0) {
						this.renderPractice();
					}
				},
				onCancel: () => {
					//! 設定を元に戻す。
					this.settings = { ...savedSettings };
					this.audio.updateSettings({
						frequency: savedSettings.frequency,
						volume: savedSettings.volume,
						wpm: savedSettings.characterSpeed,
						effectiveWpm: savedSettings.effectiveSpeed
					});
				}
			},
			getSettingsModalTexts()
		);

		//! モーダルを表示。
		modal.show('koch');
	}

	//! ========== レンダリング ==========

	render(): void {
		const app = document.getElementById('app');
		if (!app) return;

		app.innerHTML = `
			<div class="header-top">
				<div class="settings-icon" id="settingsIcon">
					<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
						<path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
					</svg>
				</div>
				<div id="languageSwitcherContainer"></div>
			</div>

			<div class="container">
				<header class="header">
					<button class="back-btn" id="back-btn">${t('common.backToMenu')}</button>
					<h1>${t('koch.title')}</h1>
				</header>

				<div class="tabs">
					<button class="tab-button ${this.viewMode === 'learning' ? 'active' : ''}" data-tab="learning">${t('koch.tabs.learning')}</button>
					<button class="tab-button ${this.viewMode === 'custom' ? 'active' : ''}" data-tab="custom">${t('koch.tabs.custom')}</button>
				</div>

				${this.renderModeContent()}
			</div>
		`;

		this.attachEventListeners();
	}

	private renderModeContent(): string {
		switch (this.viewMode) {
			case 'learning':
				return this.renderLearningMode();
			case 'custom':
				return this.renderCustomMode();
			default:
				return this.renderLearningMode();
		}
	}

	private renderLearningMode(): string {
		const chars = KochTrainer.getCharsForLesson(this.state.currentLesson);
		const lessonList = KOCH_SEQUENCE.slice(0, 40).map((_, index) => {
			const lessonNum = index + 1;
			const lessonChars = KochTrainer.getCharsForLesson(lessonNum);
			const isCurrent = lessonNum === this.state.currentLesson;
			const isPassed = lessonNum < this.state.currentLesson;
			return `
				<div class="lesson-item ${isCurrent ? 'current' : ''} ${isPassed ? 'passed' : ''}" data-lesson="${lessonNum}">
					<div class="lesson-num">L${lessonNum}</div>
					<div class="lesson-chars">${lessonChars.join('')}</div>
				</div>
			`;
		}).join('');

		return `
			<div class="flashcard-container">
				<div class="lesson-info">
					<h2>${t('koch.learning.lessonTitle')} ${this.state.currentLesson}${t('koch.learning.lessonProgress')}</h2>
					<div class="chars">${t('koch.learning.learnedChars')} ${chars.join('')}</div>
					<button id="startBtn" class="btn btn-primary">${t('koch.learning.startPractice')}</button>
				</div>

				<div id="practiceContainer"></div>
				<div id="resultContainer"></div>

				<div class="instructions">
					<h3>${t('koch.learning.howToUse')}</h3>
					<ul>
						<li>${t('koch.learning.instruction1')}</li>
						<li>${t('koch.learning.instruction2')}</li>
						<li>${t('koch.learning.instruction3')}</li>
					</ul>
				</div>

				<div class="lesson-list-section">
					<h3>${t('koch.learning.lessonListTitle')}</h3>
					<div class="lesson-list">
						${lessonList}
					</div>
				</div>
			</div>
		`;
	}

	private renderCustomMode(): string {
		if (!this.customState.isCustomRunning) {
			//! 文字選択画面。
			const charButtons = KOCH_SEQUENCE.map(char => `
				<button class="char-select-btn ${this.customState.selectedChars.has(char) ? 'selected' : ''}" data-char="${char}">
					${char}
				</button>
			`).join('');

			return `
				<div class="flashcard-container">
					<div class="lesson-info">
						<h2>${t('koch.custom.title')}</h2>
						<p>${t('koch.custom.selectPrompt')}</p>
						<div class="char-selection">
							${charButtons}
						</div>
						<button id="startCustomBtn" class="btn btn-primary" ${this.customState.selectedChars.size < 2 ? 'disabled' : ''}>${t('koch.custom.startPractice')}</button>
					</div>

					<div class="instructions">
						<h3>${t('koch.custom.howToUse')}</h3>
						<ul>
							<li>${t('koch.custom.instruction1')}</li>
							<li>${t('koch.custom.instruction2')}</li>
							<li>${t('koch.custom.instruction3')}</li>
						</ul>
					</div>
				</div>
			`;
		} else {
			//! 練習実行画面。
			return `
				<div class="flashcard-container">
					<div id="customPracticeContainer"></div>
					<div id="customResultContainer"></div>
				</div>
			`;
		}
	}

	private renderPractice(): void {
		const practiceContainer = document.getElementById('practiceContainer');
		if (!practiceContainer) return;

		const chars = KochTrainer.getCharsForLesson(this.state.currentLesson);

		practiceContainer.innerHTML = `
			<div class="practice-area">
				<div class="progress-section">
					<div class="progress-bar-container">
						<div id="progressBar" class="progress-bar" style="width: 0%"></div>
					</div>
					<div id="lessonProgress" class="progress-text">${t('koch.practice.ready')}</div>
				</div>

				<div class="playback-controls">
					<button id="playBtn" class="control-btn" title="${t('koch.practice.playButton')}">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
							<path d="M8 5v14l11-7z"/>
						</svg>
					</button>
					<button id="pauseBtn" class="control-btn" title="${t('koch.practice.pauseButton')}" disabled>
						<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
							<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
						</svg>
					</button>
					<button id="stopBtn" class="control-btn" title="${t('koch.practice.stopButton')}">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
							<rect x="6" y="6" width="12" height="12"/>
						</svg>
					</button>
				</div>

				<textarea id="userInput" class="input-area" placeholder="${t('koch.practice.inputPlaceholder')}" ${this.settings.showInput ? '' : 'style="opacity: 0.3; pointer-events: none;"'}></textarea>
				${this.renderKeyboard(chars)}
			</div>
		`;

		const inputEl = document.getElementById('userInput') as HTMLTextAreaElement;
		if (inputEl) {
			inputEl.addEventListener('input', (e) => {
				this.state.userInput = (e.target as HTMLTextAreaElement).value.toUpperCase();
			});
		}

		document.getElementById('playBtn')?.addEventListener('click', () => {
			this.playMorse();
		});

		document.getElementById('pauseBtn')?.addEventListener('click', () => {
			this.pauseMorse();
		});

		document.getElementById('stopBtn')?.addEventListener('click', () => {
			this.stopLesson();
		});

		//! キーボードボタンのイベント設定。
		this.setupKeyboardEvents(chars);
		this.updatePlaybackButtons();
	}

	private renderCustomPractice(): void {
		const container = document.getElementById('customPracticeContainer');
		if (!container) return;

		container.innerHTML = `
			<div class="practice-area">
				<div class="progress-section">
					<div class="progress-bar-container">
						<div id="customProgressBar" class="progress-bar" style="width: 0%"></div>
					</div>
					<div id="customProgress" class="progress-text">${t('koch.practice.ready')}</div>
				</div>

				<div class="playback-controls">
					<button id="customPlayBtn" class="control-btn" title="${t('koch.practice.playButton')}">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
							<path d="M8 5v14l11-7z"/>
						</svg>
					</button>
					<button id="customPauseBtn" class="control-btn" title="${t('koch.practice.pauseButton')}" disabled>
						<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
							<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
						</svg>
					</button>
					<button id="customStopBtn" class="control-btn" title="${t('koch.practice.stopButton')}">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
							<rect x="6" y="6" width="12" height="12"/>
						</svg>
					</button>
				</div>

				${this.settings.showInput ? `
					<textarea id="customInputArea" class="input-area" placeholder="${t('koch.practice.customInputPlaceholder')}"></textarea>
				` : ''}

				<button id="customEndBtn" class="btn btn-primary">${t('koch.practice.showResult')}</button>
			</div>
		`;

		this.setupCustomControls();
	}

	private renderKeyboard(availableChars: string[]): string {
		const groups: string[][] = [];

		//! KOCH_SEQUENCEをgroupSizeごとに分割。
		for (let i = 0; i < KOCH_SEQUENCE.length; i += this.settings.groupSize) {
			groups.push(KOCH_SEQUENCE.slice(i, i + this.settings.groupSize));
		}

		return `
			<div class="keyboard">
				<div class="keyboard-header">
					<small>${t('koch.keyboard.header')}</small>
				</div>
				<div class="keyboard-controls">
					<button id="spaceBtn" class="key-btn special">${t('koch.keyboard.space')}</button>
					<button id="backspaceBtn" class="key-btn special">${t('koch.keyboard.backspace')}</button>
				</div>
				<div class="keyboard-groups-wrapper">
					<div class="keyboard-groups">
						${groups.map((group, groupIndex) => `
							<div class="keyboard-group">
								<div class="group-label">${t('koch.keyboard.groupLabel')}${groupIndex + 1}</div>
								<div class="group-keys">
									${group.map(char => {
										const isLearned = availableChars.includes(char);
										return `
											<button class="key-btn ${isLearned ? '' : 'disabled'}"
											        data-char="${char}"
											        ${isLearned ? '' : 'disabled'}>
												${char}
											</button>
										`;
									}).join('')}
								</div>
							</div>
						`).join('')}
					</div>
				</div>
			</div>
		`;
	}

	private setupKeyboardEvents(availableChars: string[]): void {
		const inputEl = document.getElementById('userInput') as HTMLTextAreaElement;
		if (!inputEl) return;

		//! 文字キー。
		document.querySelectorAll('.key-btn:not(.special)').forEach(btn => {
			btn.addEventListener('click', (e) => {
				e.preventDefault();
				const char = (e.target as HTMLButtonElement).getAttribute('data-char');
				if (char && availableChars.includes(char)) {
					inputEl.value += char;
					this.state.userInput = inputEl.value.toUpperCase();
				}
			});
		});

		//! スペースキー。
		document.getElementById('spaceBtn')?.addEventListener('click', (e) => {
			e.preventDefault();
			inputEl.value += ' ';
			this.state.userInput = inputEl.value.toUpperCase();
		});

		//! バックスペースキー。
		document.getElementById('backspaceBtn')?.addEventListener('click', (e) => {
			e.preventDefault();
			inputEl.value = inputEl.value.slice(0, -1);
			this.state.userInput = inputEl.value.toUpperCase();
		});
	}

	private setupCustomControls(): void {
		//! 入力欄のイベントリスナー。
		const inputEl = document.getElementById('customInputArea') as HTMLTextAreaElement;
		if (inputEl) {
			inputEl.addEventListener('input', (e) => {
				this.customState.customUserInput = (e.target as HTMLTextAreaElement).value.toUpperCase();
			});
		}

		document.getElementById('customPlayBtn')?.addEventListener('click', () => {
			this.playCustomMorse();
		});

		document.getElementById('customPauseBtn')?.addEventListener('click', () => {
			this.pauseCustomMorse();
		});

		document.getElementById('customStopBtn')?.addEventListener('click', () => {
			this.stopCustom();
		});

		document.getElementById('customEndBtn')?.addEventListener('click', () => {
			this.showCustomResult();
		});

		this.updateCustomPlaybackButtons();
	}

	private attachEventListeners(): void {
		//! 戻るボタン。
		document.getElementById('back-btn')?.addEventListener('click', () => {
			window.location.hash = '#menu';
		});

		//! 設定アイコン。
		document.getElementById('settingsIcon')?.addEventListener('click', () => {
			this.showSettings();
		});

		//! 言語切り替え。
		const languageSwitcherContainer = document.getElementById('languageSwitcherContainer');
		if (languageSwitcherContainer) {
			this.languageSwitcher.attachEventListeners(languageSwitcherContainer);
		}

		//! タブボタン。
		document.querySelectorAll('.tab-button').forEach(btn => {
			btn.addEventListener('click', () => {
				const tab = btn.getAttribute('data-tab') as ViewMode;
				if (tab) {
					this.viewMode = tab;
					this.saveViewMode();
					this.render();
				}
			});
		});

		//! モード別のイベントリスナーを設定。
		this.setupModeEventListeners();
	}

	private setupModeEventListeners(): void {
		if (this.viewMode === 'learning') {
			document.getElementById('startBtn')?.addEventListener('click', () => {
				this.startLesson();
			});

			//! レッスンアイテムのクリックイベント。
			document.querySelectorAll('.lesson-item').forEach(item => {
				item.addEventListener('click', () => {
					const lessonNum = parseInt(item.getAttribute('data-lesson') || '1', 10);
					this.state.currentLesson = lessonNum;
					this.saveProgress();
					this.render();
					window.scrollTo({ top: 0, behavior: 'smooth' });
				});
			});
		} else if (this.viewMode === 'custom') {
			if (!this.customState.isCustomRunning) {
				document.getElementById('startCustomBtn')?.addEventListener('click', () => {
					this.startCustom();
				});

				//! 文字選択ボタン。
				document.querySelectorAll('.char-select-btn').forEach(btn => {
					btn.addEventListener('click', () => {
						const char = btn.getAttribute('data-char');
						if (char) {
							if (this.customState.selectedChars.has(char)) {
								this.customState.selectedChars.delete(char);
							} else {
								this.customState.selectedChars.add(char);
							}
							this.saveSelectedChars();
							this.render();
						}
					});
				});
			}
		}
	}

	destroy(): void {
		//! 音声を停止。
		this.audio.stopPlaying();
	}
}
