/**
 * 聞き取り練習ビュー
 */

import type { View } from '../../router';
import {
	ListeningTrainer,
	AudioGenerator,
	MorseCodec,
	type ListeningTemplate,
	type TemplateCategory
} from 'morse-engine';
import { downloadBlob, sanitizeFilename } from '../../utils/download-helper';
import { SettingsModal, ALL_SETTING_ITEMS, type SettingValues } from 'morse-engine';
import { t } from '../../i18n';
import { getSettingsModalTexts, localizeSettingItems } from '../../i18n/settings-modal';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

interface ListeningSettings {
	characterSpeed: number;
	effectiveSpeed: number;
	frequency: number;
	bFrequency: number;  // B側（相手方）の周波数
	volume: number;
}

const DEFAULT_SETTINGS: ListeningSettings = {
	characterSpeed: 20,
	effectiveSpeed: 15,
	frequency: 700,
	bFrequency: 600,  // B側のデフォルト周波数
	volume: 0.7
};

const TEMPLATE_TITLE_KEYS: Record<string, string> = {
	'qso-random-generate': 'listening.templates.randomQso',
	'qso-rubberstamp-1': 'listening.templates.qsoRubberstamp1',
	'qso-short-1': 'listening.templates.qsoShort1',
	'qso-short-2': 'listening.templates.qsoShort2',
	'text100-1': 'listening.templates.text1001',
	'text100-2': 'listening.templates.text1002',
	'text100-3': 'listening.templates.text1003',
	'text200-1': 'listening.templates.text2001',
	'text200-2': 'listening.templates.text2002',
	'text300-1': 'listening.templates.text3001',
	'text300-2': 'listening.templates.text3002'
};

interface State {
	currentCategory: TemplateCategory | 'custom';
	selectedTemplate: ListeningTemplate | null;
	isPlaying: boolean;
	userInput: string;
	showResult: boolean;
	showAnswer: boolean;
	showDialogFormat: boolean;
}

/**
 * 聞き取り練習ビュークラス
 */
export class ListeningView implements View {
	private audio: AudioGenerator;  // A側（自局）のAudioGenerator
	private audioB: AudioGenerator;  // B側（相手方）のAudioGenerator
	private settings: ListeningSettings = { ...DEFAULT_SETTINGS };
	private languageSwitcher = new LanguageSwitcher();

	private state: State = {
		currentCategory: 'qso',
		selectedTemplate: null,
		isPlaying: false,
		userInput: '',
		showResult: false,
		showAnswer: false,
		showDialogFormat: false
	};

	private customTemplates: ListeningTemplate[] = [];

	constructor() {
		//! 設定を読み込む。
		this.loadSettings();
		this.loadCategory();
		this.loadCustomTemplates();

		//! A側のAudioGeneratorを初期化。
		this.audio = new AudioGenerator({
			frequency: this.settings.frequency,
			volume: this.settings.volume,
			wpm: this.settings.characterSpeed,
			effectiveWpm: this.settings.effectiveSpeed
		});

		//! B側のAudioGeneratorを初期化。
		this.audioB = new AudioGenerator({
			frequency: this.settings.bFrequency,
			volume: this.settings.volume,
			wpm: this.settings.characterSpeed,
			effectiveWpm: this.settings.effectiveSpeed
		});
	}

	//! ========== 設定管理 ==========

	private loadSettings(): void {
		try {
			const saved = localStorage.getItem('v10.listening.settings');
			if (saved) {
				this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
			}
		} catch (error) {
			console.error('Failed to load settings:', error);
		}
	}

	private saveSettings(): void {
		try {
			localStorage.setItem('v10.listening.settings', JSON.stringify(this.settings));
		} catch (error) {
			console.error('Failed to save settings:', error);
		}
	}

	private loadCategory(): void {
		try {
			const saved = localStorage.getItem('v10.listening.category') as TemplateCategory | 'custom' | null;
			if (saved && ['qso', 'text100', 'text200', 'text300', 'custom'].includes(saved)) {
				this.state.currentCategory = saved;
			}
		} catch (error) {
			console.error('Failed to load category:', error);
		}
	}

	private saveCategory(): void {
		try {
			localStorage.setItem('v10.listening.category', this.state.currentCategory);
		} catch (error) {
			console.error('Failed to save category:', error);
		}
	}

	private loadCustomTemplates(): void {
		try {
			const saved = localStorage.getItem('v10.listening.customTemplates');
			if (saved) {
				this.customTemplates = JSON.parse(saved);
			}
		} catch (error) {
			console.error('Failed to load custom templates:', error);
		}
	}

	private saveCustomTemplates(): void {
		try {
			localStorage.setItem('v10.listening.customTemplates', JSON.stringify(this.customTemplates));
		} catch (error) {
			console.error('Failed to save custom templates:', error);
		}
	}

	//! ========== テンプレート管理 ==========

	private getTemplates(): ListeningTemplate[] {
		if (this.state.currentCategory === 'custom') {
			//! ランダムQSO生成ボタンを追加。
			const randomButton: ListeningTemplate = {
				id: 'qso-random-generate',
				category: 'qso',
				title: t('listening.templates.randomQso'),
				content: ''
			};
			return [randomButton, ...this.customTemplates];
		} else {
			const builtin = ListeningTrainer.getBuiltinTemplates(this.state.currentCategory);
			//! QSOカテゴリーにはランダムQSO生成ボタンを追加。
			if (this.state.currentCategory === 'qso') {
				const randomButton: ListeningTemplate = {
					id: 'qso-random-generate',
					category: 'qso',
					title: t('listening.templates.randomQso'),
					content: ''
				};
				return [randomButton, ...builtin];
			}
			return builtin;
		}
	}

	//! ========== 再生制御 ==========

	private async playMorse(): Promise<void> {
		if (!this.state.selectedTemplate || this.state.isPlaying) return;

		this.state.isPlaying = true;
		this.updatePlaybackButtons();

		//! テンプレートに応じて再生（dialogがあればA/B交互、なければcontentを再生）。
		if (this.state.showDialogFormat && this.state.selectedTemplate.dialog) {
			//! 対話形式で再生（A側とB側を交互に再生）。
			await this.playDialogQSO(this.state.selectedTemplate);
		} else if (this.state.selectedTemplate.content) {
			//! 通常モードで再生（全体をA側で再生）。
			const morse = MorseCodec.textToMorse(this.state.selectedTemplate.content);
			await this.audio.playMorseString(morse);
		}

		this.state.isPlaying = false;
		this.updatePlaybackButtons();
	}

	/**
	 * テンプレートからテキストを取得する
	 * @param template - テンプレート
	 * @returns 表示用テキスト
	 */
	private getTemplateText(template: ListeningTemplate): string {
		if (template.dialog && template.dialog.length > 0) {
			return template.dialog.map(seg => seg.text).join(' BT ');
		}
		return template.content || '';
	}

	private getTemplateTitle(template: ListeningTemplate): string {
		if (template.id.startsWith('qso-random-')) {
			return t('listening.templates.randomQso');
		}
		const key = TEMPLATE_TITLE_KEYS[template.id];
		return key ? t(key) : template.title;
	}

	/**
	 * 対話形式のQSOを再生する
	 * A側とB側を交互に異なる周波数で再生
	 * @param template - 再生するテンプレート
	 */
	private async playDialogQSO(template: ListeningTemplate): Promise<void> {
		//! dialogがない場合（テキストカテゴリ）はcontentを再生。
		if (!template.dialog || template.dialog.length === 0) {
			if (template.content) {
				const morse = MorseCodec.textToMorse(template.content);
				await this.audio.playMorseString(morse);
			}
			return;
		}

		//! 各セグメントを交互にA側とB側で再生。
		for (let i = 0; i < template.dialog.length; i++) {
			const segment = template.dialog[i];
			const morse = MorseCodec.textToMorse(segment.text);

			//! A側またはB側のAudioGeneratorを選択。
			const generator = segment.side === 'A' ? this.audio : this.audioB;
			await generator.playMorseString(morse);

			//! セグメント間に短い間隔を入れる。
			if (i < template.dialog.length - 1) {
				await new Promise(resolve => setTimeout(resolve, 500));
			}
		}
	}

	private pauseMorse(): void {
		this.audio.stopPlaying();
		this.state.isPlaying = false;
		this.updatePlaybackButtons();
	}

	private stopMorse(): void {
		this.audio.stopPlaying();
		this.state.isPlaying = false;
		this.state.userInput = '';
		this.state.showResult = false;
		this.state.showAnswer = false;
		this.renderPracticeArea();
	}


	private updatePlaybackButtons(): void {
		const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
		const pauseBtn = document.getElementById('pauseBtn') as HTMLButtonElement;

		if (playBtn) playBtn.disabled = this.state.isPlaying;
		if (pauseBtn) pauseBtn.disabled = !this.state.isPlaying;
	}

	//! ========== 採点と結果表示 ==========

	private checkAnswer(): void {
		if (!this.state.selectedTemplate) return;

		this.state.showResult = true;
		this.state.showAnswer = true;
		this.renderPracticeArea();
	}

	private toggleAnswer(): void {
		this.state.showAnswer = !this.state.showAnswer;
		this.renderPracticeArea();
	}

	private toggleDialogFormat(): void {
		this.state.showDialogFormat = !this.state.showDialogFormat;
		this.renderAnswer();
	}

	//! ========== カスタムテンプレート管理 ==========

	private showCustomTemplateDialog(template?: ListeningTemplate): void {
		const isEdit = !!template;
		const title = isEdit ? template.title : '';
		const content = isEdit ? template.content : '';

		const modal = document.createElement('div');
		modal.className = 'modal-overlay';
		modal.innerHTML = `
			<div class="modal">
				<h2>${isEdit ? t('listening.customTemplate.editTitle') : t('listening.customTemplate.createTitle')}</h2>
				<div class="form-group">
					<label for="templateTitle">${t('listening.customTemplate.titleLabel')}</label>
					<input type="text" id="templateTitle" value="${title}" placeholder="${t('listening.customTemplate.titlePlaceholder')}">
				</div>
				<div class="form-group">
					<label for="templateContent">${t('listening.customTemplate.contentLabel')}</label>
					<textarea id="templateContent" placeholder="${t('listening.customTemplate.contentPlaceholder')}">${content}</textarea>
				</div>
				<div class="modal-actions">
					<button id="saveTemplateBtn" class="btn btn-primary">${t('common.save')}</button>
					<button id="cancelTemplateBtn" class="btn">${t('common.cancel')}</button>
				</div>
			</div>
		`;
		document.body.appendChild(modal);

		//! 保存ボタン。
		document.getElementById('saveTemplateBtn')?.addEventListener('click', () => {
			const titleInput = document.getElementById('templateTitle') as HTMLInputElement;
			const contentInput = document.getElementById('templateContent') as HTMLTextAreaElement;

			if (!titleInput.value.trim() || !contentInput.value.trim()) {
				alert(t('listening.customTemplate.requiredAlert'));
				return;
			}

			if (isEdit && template) {
				//! 既存テンプレートを更新。
				template.title = titleInput.value.trim();
				template.content = contentInput.value.trim().toUpperCase();
			} else {
				//! 新規テンプレートを追加。
				const newTemplate: ListeningTemplate = {
					id: `custom-${Date.now()}`,
					category: 'qso',
					title: titleInput.value.trim(),
					content: contentInput.value.trim().toUpperCase()
				};
				this.customTemplates.push(newTemplate);
			}

			this.saveCustomTemplates();
			modal.remove();
			this.render();
		});

		//! キャンセルボタン。
		document.getElementById('cancelTemplateBtn')?.addEventListener('click', () => {
			modal.remove();
		});

		//! モーダル外クリックで閉じる。
		modal.addEventListener('click', (e) => {
			if (e.target === modal) {
				modal.remove();
			}
		});
	}

	private deleteCustomTemplate(id: string): void {
		if (confirm(t('listening.customTemplate.deleteConfirm'))) {
			this.customTemplates = this.customTemplates.filter(t => t.id !== id);
			this.saveCustomTemplates();
			this.render();
		}
	}

	//! ========== 設定モーダル ==========

	private showSettings(): void {
		//! 現在の設定値を取得（volumeを0-100の範囲に変換）。
		const currentValues: SettingValues = {
			characterSpeed: this.settings.characterSpeed,
			effectiveSpeed: this.settings.effectiveSpeed,
			frequency: this.settings.frequency,
			bFrequency: this.settings.bFrequency,
			volume: Math.round(this.settings.volume * 100)
		};

		//! 設定変更前の値を保存（キャンセル時の復元用）。
		const savedSettings = { ...this.settings };

		//! SettingsModalを作成。
		const modal = new SettingsModal(
			'listening-settings-modal',
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
					this.settings.bFrequency = values.bFrequency as number;
					this.settings.volume = (values.volume as number) / 100;

					this.saveSettings();

					//! A側のAudioGeneratorを更新。
					this.audio.updateSettings({
						frequency: this.settings.frequency,
						volume: this.settings.volume,
						wpm: this.settings.characterSpeed,
						effectiveWpm: this.settings.effectiveSpeed
					});

					//! B側のAudioGeneratorを更新。
					this.audioB.updateSettings({
						frequency: this.settings.bFrequency,
						volume: this.settings.volume,
						wpm: this.settings.characterSpeed,
						effectiveWpm: this.settings.effectiveSpeed
					});
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
					this.audioB.updateSettings({
						frequency: savedSettings.bFrequency,
						volume: savedSettings.volume,
						wpm: savedSettings.characterSpeed,
						effectiveWpm: savedSettings.effectiveSpeed
					});
				},
				onTestPlay: async () => {
					//! テスト再生: A側とB側の周波数で順番に再生。
					const morse = MorseCodec.textToMorse('CQ');
					await this.audio.playMorseString(morse);
					await new Promise(resolve => setTimeout(resolve, 500));
					await this.audioB.playMorseString(morse);
				}
			},
			getSettingsModalTexts()
		);

		//! モーダルを表示。
		modal.show('listening');
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
					<button id="backBtn" class="back-btn">${t('common.backToMenu')}</button>
					<h1>${t('listening.title')}</h1>
				</header>

				<div class="tabs">
					${this.renderCategoryTabs()}
				</div>

				<div class="content-area">
					${this.state.selectedTemplate ? this.renderPracticeContent() : this.renderTemplateList()}
				</div>
			</div>
		`;

		this.attachEventListeners();
	}

	private renderCategoryTabs(): string {
		const categories: { id: TemplateCategory | 'custom'; label: string }[] = [
			{ id: 'qso', label: t('listening.categories.qso') },
			{ id: 'text100', label: t('listening.categories.text100') },
			{ id: 'text200', label: t('listening.categories.text200') },
			{ id: 'text300', label: t('listening.categories.text300') },
			{ id: 'custom', label: t('listening.categories.custom') }
		];

		return categories
			.map(
				cat => `
			<button class="tab-button ${this.state.currentCategory === cat.id ? 'active' : ''}" data-category="${cat.id}">
				${cat.label}
			</button>
		`
			)
			.join('');
	}

	private renderTemplateList(): string {
		const templates = this.getTemplates();

		if (templates.length === 0 || (templates.length === 1 && templates[0].id === 'qso-random-generate')) {
			return `
				<div class="empty-state">
					<p>${t('listening.customTemplate.empty')}</p>
					${this.state.currentCategory === 'custom' ? `<button id="addCustomBtn" class="btn btn-primary">${t('listening.customTemplate.createButton')}</button>` : ''}
				</div>
			`;
		}

		return `
			<div class="template-list">
				${this.state.currentCategory === 'custom' ? `<button id="addCustomBtn" class="btn btn-primary">${t('listening.customTemplate.createButton')}</button>` : ''}
				${templates
					.map(template => {
						const text = this.getTemplateText(template);
						const preview = template.id === 'qso-random-generate'
							? t('listening.templates.randomQsoDescription')
							: `${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`;
						return `
					<div class="template-card" data-template-id="${template.id}">
						<h3>${this.getTemplateTitle(template)}</h3>
						<p class="template-preview">${preview}</p>
						<div class="template-actions">
							<button class="btn select-btn" data-template-id="${template.id}">${t('listening.customTemplate.selectButton')}</button>
							${
								this.state.currentCategory === 'custom' && template.id !== 'qso-random-generate'
									? `
								<button class="btn edit-btn" data-template-id="${template.id}">${t('listening.customTemplate.editButton')}</button>
								<button class="btn delete-btn" data-template-id="${template.id}">${t('listening.customTemplate.deleteButton')}</button>
							`
									: ''
							}
						</div>
					</div>
				`;
					})
					.join('')}
			</div>
		`;
	}

	private renderPracticeContent(): string {
		if (!this.state.selectedTemplate) return '';

		return `
			<div class="practice-area">
				<div class="practice-header">
					<h2>${this.getTemplateTitle(this.state.selectedTemplate)}</h2>
					<button id="backToListBtn" class="btn">${t('listening.practice.backToList')}</button>
				</div>

				<div class="playback-controls">
					<button id="playBtn" class="control-btn" title="${t('listening.practice.playTitle')}" ${this.state.isPlaying ? 'disabled' : ''}>
						<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
							<path d="M8 5v14l11-7z"/>
						</svg>
					</button>
					<button id="pauseBtn" class="control-btn" title="${t('listening.practice.pauseTitle')}" ${!this.state.isPlaying ? 'disabled' : ''}>
						<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
							<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
						</svg>
					</button>
					<button id="stopBtn" class="control-btn" title="${t('listening.practice.stopTitle')}">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
							<rect x="6" y="6" width="12" height="12"/>
						</svg>
					</button>
					<button id="downloadBtn" class="control-btn" title="${t('listening.practice.downloadTitle')}">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
							<path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
						</svg>
					</button>
				</div>

				<div id="practiceInputArea"></div>
			</div>
		`;
	}

	private renderPracticeArea(): void {
		const practiceInputArea = document.getElementById('practiceInputArea');
		if (!practiceInputArea) return;

		practiceInputArea.innerHTML = `
			<div class="input-section">
				<label for="userInput">${t('listening.practice.inputLabel')}</label>
				<textarea id="userInput" class="input-area" placeholder="${t('listening.practice.inputPlaceholder')}">${this.state.userInput}</textarea>
			</div>

			<div class="action-buttons">
				<button id="checkBtn" class="btn btn-primary">${t('listening.practice.checkButton')}</button>
				<button id="showAnswerBtn" class="btn">${this.state.showAnswer ? t('listening.practice.hideAnswer') : t('listening.practice.showAnswer')}</button>
			</div>

			${this.state.showAnswer ? '<div id="answerArea"></div>' : ''}
			${this.state.showResult ? '<div id="resultArea"></div>' : ''}
		`;

		//! ユーザー入力の監視。
		const userInput = document.getElementById('userInput') as HTMLTextAreaElement;
		userInput?.addEventListener('input', () => {
			this.state.userInput = userInput.value;
		});

		//! 採点ボタン。
		document.getElementById('checkBtn')?.addEventListener('click', () => {
			this.checkAnswer();
		});

		//! 正解表示ボタン。
		document.getElementById('showAnswerBtn')?.addEventListener('click', () => {
			this.toggleAnswer();
		});

		//! 正解と結果を描画。
		if (this.state.showAnswer) {
			this.renderAnswer();
		}
		if (this.state.showResult) {
			this.renderResult();
		}
	}

	private renderAnswer(): void {
		const answerArea = document.getElementById('answerArea');
		if (!answerArea || !this.state.selectedTemplate) return;

		const isQSO = this.state.selectedTemplate.category === 'qso';
		const content = this.getTemplateText(this.state.selectedTemplate);

		//! 対話形式ボタン（QSOの場合のみ表示）。
		const dialogButton = isQSO
			? `<button id="toggleDialogBtn" class="btn" style="margin-left: 10px;">${this.state.showDialogFormat ? t('listening.practice.normalView') : t('listening.practice.dialogView')}</button>`
			: '';

		//! 対話形式表示の生成。
		let answerContent = '';
		if (isQSO && this.state.showDialogFormat) {
			//! BTで区切って話者別に表示。
			const segments = content.split(/\s+BT\s+/);
			answerContent = `
				<table class="dialog-table">
					<tbody>
						${segments.map((segment, index) => {
							const speaker = index % 2 === 0 ? 'A' : 'B';
							return `
								<tr>
									<td class="speaker-cell">${speaker}</td>
									<td class="content-cell">${segment.trim()}</td>
								</tr>
							`;
						}).join('')}
					</tbody>
				</table>
			`;
		} else {
			answerContent = `<div class="answer-text">${content}</div>`;
		}

		answerArea.innerHTML = `
			<div class="answer-area">
				<h3 style="display: inline-block;">${t('listening.practice.answerTitle')}</h3>
				${dialogButton}
				${answerContent}
			</div>
		`;

		//! 対話形式ボタン。
		document.getElementById('toggleDialogBtn')?.addEventListener('click', () => {
			this.toggleDialogFormat();
		});
	}

	private renderResult(): void {
		const resultArea = document.getElementById('resultArea');
		if (!resultArea || !this.state.selectedTemplate) return;

		const correctText = this.getTemplateText(this.state.selectedTemplate);
		const accuracy = ListeningTrainer.calculateAccuracy(
			correctText,
			this.state.userInput
		);

		resultArea.innerHTML = `
			<div class="result-area">
				<h3>${t('listening.practice.resultTitle')}</h3>
				<div class="accuracy">${t('listening.practice.accuracy')} ${accuracy}%</div>
				<div class="comparison">
					<div class="comparison-row">
						<strong>${t('listening.practice.correctText')}</strong>
						<div class="comparison-text">${correctText}</div>
					</div>
					<div class="comparison-row">
						<strong>${t('listening.practice.inputText')}</strong>
						<div class="comparison-text">${this.state.userInput || t('listening.practice.noInput')}</div>
					</div>
				</div>
			</div>
		`;
	}

	//! ========== イベントリスナー ==========

	private attachEventListeners(): void {
		//! 戻るボタン。
		document.getElementById('backBtn')?.addEventListener('click', () => {
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

		//! カテゴリータブ。
		document.querySelectorAll('.tab-button').forEach(btn => {
			btn.addEventListener('click', () => {
				const category = btn.getAttribute('data-category') as TemplateCategory | 'custom';
				if (category) {
					this.state.currentCategory = category;
					this.state.selectedTemplate = null;
					this.state.showResult = false;
					this.state.showAnswer = false;
					this.state.showDialogFormat = false;
					this.state.userInput = '';
					this.saveCategory();
					this.render();
				}
			});
		});

		//! 定型文選択ボタン。
		document.querySelectorAll('.select-btn').forEach(btn => {
			btn.addEventListener('click', () => {
				const id = btn.getAttribute('data-template-id');
				if (id) {
					//! ランダムQSO生成ボタンの場合。
					if (id === 'qso-random-generate') {
						this.state.selectedTemplate = ListeningTrainer.generateRandomQSO();
						this.state.showResult = false;
						this.state.showAnswer = false;
						this.state.showDialogFormat = false;
						this.state.userInput = '';
						this.render();
						this.renderPracticeArea();
					} else {
						//! 通常のテンプレート選択。
						const allTemplates = [...ListeningTrainer.getBuiltinTemplates(), ...this.customTemplates];
						const template = allTemplates.find(t => t.id === id);
						if (template) {
							this.state.selectedTemplate = template;
							this.state.showResult = false;
							this.state.showAnswer = false;
							this.state.showDialogFormat = false;
							this.state.userInput = '';
							this.render();
							this.renderPracticeArea();
						}
					}
				}
			});
		});

		//! 一覧に戻るボタン。
		document.getElementById('backToListBtn')?.addEventListener('click', () => {
			this.state.selectedTemplate = null;
			this.state.showResult = false;
			this.state.showAnswer = false;
			this.state.showDialogFormat = false;
			this.state.userInput = '';
			this.audio.stopPlaying();
			this.render();
		});

		//! ユーザー定義定型文の新規作成ボタン。
		document.getElementById('addCustomBtn')?.addEventListener('click', () => {
			this.showCustomTemplateDialog();
		});

		//! ユーザー定義定型文の編集ボタン。
		document.querySelectorAll('.edit-btn').forEach(btn => {
			btn.addEventListener('click', () => {
				const id = btn.getAttribute('data-template-id');
				if (id) {
					const template = this.customTemplates.find(t => t.id === id);
					if (template) {
						this.showCustomTemplateDialog(template);
					}
				}
			});
		});

		//! ユーザー定義定型文の削除ボタン。
		document.querySelectorAll('.delete-btn').forEach(btn => {
			btn.addEventListener('click', () => {
				const id = btn.getAttribute('data-template-id');
				if (id) {
					this.deleteCustomTemplate(id);
				}
			});
		});

		//! 再生コントロール（練習画面のみ）。
		if (this.state.selectedTemplate) {
			document.getElementById('playBtn')?.addEventListener('click', () => {
				this.playMorse();
			});

			document.getElementById('pauseBtn')?.addEventListener('click', () => {
				this.pauseMorse();
			});

			document.getElementById('stopBtn')?.addEventListener('click', () => {
				this.stopMorse();
			});

			document.getElementById('downloadBtn')?.addEventListener('click', () => {
				this.downloadWav();
			});

			this.renderPracticeArea();
		}
	}

	/**
	 * モールス信号をWAVファイルとしてダウンロードする
	 */
	private async downloadWav(): Promise<void> {
		if (!this.state.selectedTemplate) return;

		try {
			//! テキストをモールス符号に変換。
			const text = this.getTemplateText(this.state.selectedTemplate);
			const morse = MorseCodec.textToMorse(text);

			//! WAVファイルを生成。
			const wavBlob = await this.audio.generateWav(morse);

			//! ダウンロード。
			const filename = `${sanitizeFilename(this.state.selectedTemplate.title)}.wav`;
			downloadBlob(wavBlob, filename);
		} catch (error) {
			console.error('WAV download error:', error);
			alert(t('listening.practice.wavError'));
		}
	}

	destroy(): void {
		//! AudioGeneratorを停止。
		this.audio.stopPlaying();
	}
}
