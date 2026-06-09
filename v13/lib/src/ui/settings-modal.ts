/**
 * 共通設定モーダルコンポーネント
 * 各画面で共通利用できる設定画面を生成
 */

//! 画面の種類。
export type ScreenType = 'flashcard' | 'listening' | 'koch' | 'horizontal-key' | 'vertical-key';

//! 入力タイプ。
export type SettingInputType = 'number' | 'range-with-number' | 'button' | 'checkbox' | 'select' | 'keybinding';

//! 設定項目の定義。
export interface SettingItemDef {
	/** この設定が表示される画面 */
	screens: ScreenType[];
	/** 表示順序（小さいほど上） */
	priority: number;
	/** 設定のキー名 */
	key: string;
	/** 表示ラベル */
	label: string;
	/** 入力タイプ */
	inputType: SettingInputType;
	/** 最小値 */
	min?: number;
	/** 最大値 */
	max?: number;
	/** ステップ */
	step?: number;
	/** 単位（%, Hz, WPMなど） */
	unit?: string;
	/** ボタンの場合のテキスト */
	buttonText?: string;
	/** ボタンの場合のクラス */
	buttonClass?: string;
	/** selectの場合の選択肢 */
	options?: { value: string; label: string }[];
	/** checkboxの初期値 */
	defaultChecked?: boolean;
	/** keybindingの場合のヒントテキスト */
	hint?: string;
}

//! 設定値の型。
export interface SettingValues {
	[key: string]: number | string | boolean;
}

//! モーダルのコールバック関数。
export interface SettingsModalCallbacks {
	/** 保存時のコールバック */
	onSave: (values: SettingValues) => void;
	/** キャンセル時のコールバック */
	onCancel: () => void;
	/** テスト再生時のコールバック */
	onTestPlay?: () => void;
}

//! 設定モーダルの表示文言。
export interface SettingsModalTexts {
	title?: string;
	cancel?: string;
	ok?: string;
	defaultButtonText?: string;
	keybindingPlaceholder?: string;
	keybindingWaiting?: string;
}

/**
 * 共通設定モーダルクラス
 */
export class SettingsModal {
	private modalId: string;
	private items: SettingItemDef[];
	private callbacks: SettingsModalCallbacks;
	private currentValues: SettingValues;
	private initialValues: SettingValues;
	private texts: Required<SettingsModalTexts>;

	/**
	 * コンストラクタ
	 *
	 * @param modalId - モーダルのID（重複を避けるため）
	 * @param items - 設定項目の配列
	 * @param currentValues - 現在の設定値
	 * @param callbacks - コールバック関数
	 */
	constructor(
		modalId: string,
		items: SettingItemDef[],
		currentValues: SettingValues,
		callbacks: SettingsModalCallbacks,
		texts: SettingsModalTexts = {}
	) {
		this.modalId = modalId;
		this.items = items;
		this.currentValues = { ...currentValues };
		this.initialValues = { ...currentValues };
		this.callbacks = callbacks;
		this.texts = {
			title: texts.title || 'Settings',
			cancel: texts.cancel || 'Cancel',
			ok: texts.ok || 'OK',
			defaultButtonText: texts.defaultButtonText || 'Play',
			keybindingPlaceholder: texts.keybindingPlaceholder || 'Press a key',
			keybindingWaiting: texts.keybindingWaiting || 'Press a key...'
		};
	}

	/**
	 * モーダルを表示する
	 *
	 * @param screenType - 表示する画面の種類
	 */
	show(screenType: ScreenType): void {
		//! この画面用の設定項目をフィルタリングして優先度順にソート。
		const filteredItems = this.items
			.filter(item => item.screens.includes(screenType))
			.sort((a, b) => a.priority - b.priority);

		//! モーダルのHTMLを生成。
		const modalHTML = this.generateModalHTML(filteredItems);

		//! DOMに追加。
		document.body.insertAdjacentHTML('beforeend', modalHTML);

		//! イベントリスナーを設定。
		this.attachEventListeners(filteredItems);
	}

	/**
	 * モーダルのHTMLを生成する
	 *
	 * @param items - 表示する設定項目
	 * @returns モーダルのHTML
	 */
	private generateModalHTML(items: SettingItemDef[]): string {
		//! FlashcardかListeningかで使い分ける。
		const isFlashcard = this.modalId.includes('flashcard');

		if (isFlashcard) {
			//! Flashcard用のモーダル（.settings-modal）。
			return `
				<div class="settings-modal active" id="${this.modalId}">
					<div class="settings-content">
						<h2>${this.texts.title}</h2>
						<div class="settings-grid">
							${items.map(item => this.generateSettingItemHTML(item)).join('')}
						</div>
						<div class="settings-buttons">
							<button id="${this.modalId}-cancel" class="secondary-button">${this.texts.cancel}</button>
							<button id="${this.modalId}-save" class="primary-button">${this.texts.ok}</button>
						</div>
					</div>
				</div>
			`;
		} else {
			//! Listening用のモーダル（.modal）。
			return `
				<div class="modal" id="${this.modalId}">
					<div class="modal-content">
						<div class="modal-header">
							<h2>${this.texts.title}</h2>
							<button id="${this.modalId}-close" class="close-btn">×</button>
						</div>
						<div class="modal-body">
							${items.map(item => this.generateSettingItemHTML(item)).join('')}
						</div>
						<div class="modal-footer">
							<button id="${this.modalId}-cancel" class="btn">${this.texts.cancel}</button>
							<button id="${this.modalId}-save" class="btn primary">${this.texts.ok}</button>
						</div>
					</div>
				</div>
			`;
		}
	}

	/**
	 * 設定項目のHTMLを生成する
	 *
	 * @param item - 設定項目
	 * @returns 設定項目のHTML
	 */
	private generateSettingItemHTML(item: SettingItemDef): string {
		const value = this.currentValues[item.key];

		switch (item.inputType) {
			case 'number':
				return `
					<div class="setting-item">
						<label for="${this.modalId}-${item.key}">${item.label}</label>
						<input type="number" id="${this.modalId}-${item.key}"
							min="${item.min}" max="${item.max}" step="${item.step || 1}"
							value="${value}" data-key="${item.key}">
					</div>
				`;

			case 'range-with-number':
				return `
					<div class="setting-item">
						<label for="${this.modalId}-${item.key}-range">${item.label}</label>
						<input type="range" id="${this.modalId}-${item.key}-range"
							min="${item.min}" max="${item.max}" step="${item.step || 1}"
							value="${value}" data-key="${item.key}">
						<input type="number" id="${this.modalId}-${item.key}-number"
							min="${item.min}" max="${item.max}" step="${item.step || 1}"
							value="${value}" data-key="${item.key}">
						${item.unit ? `<span>${item.unit}</span>` : ''}
					</div>
				`;

			case 'button':
				return `
					<div class="setting-item">
						<span>${item.label}</span>
						<button id="${this.modalId}-${item.key}" class="${item.buttonClass || 'test-button'}">${item.buttonText || this.texts.defaultButtonText}</button>
					</div>
				`;

			case 'checkbox':
				return `
					<div class="setting-item">
						<label>
							<input type="checkbox" id="${this.modalId}-${item.key}"
								data-key="${item.key}" ${value ? 'checked' : ''}>
							${item.label}
						</label>
					</div>
				`;

			case 'select':
				return `
					<div class="setting-item">
						<label for="${this.modalId}-${item.key}">${item.label}</label>
						<select id="${this.modalId}-${item.key}" data-key="${item.key}">
							${(item.options || []).map(opt => `
								<option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>${opt.label}</option>
							`).join('')}
						</select>
					</div>
				`;

			case 'keybinding':
				const formattedValue = typeof value === 'string' ? value.replace(/^Key/, '') : value;
				return `
					<div class="setting-item">
						<label for="${this.modalId}-${item.key}">${item.label}</label>
						<input type="text" id="${this.modalId}-${item.key}" class="keybinding-input"
							value="${formattedValue}" readonly placeholder="${this.texts.keybindingPlaceholder}" data-key="${item.key}">
						${item.hint ? `<span class="key-hint">${item.hint}</span>` : ''}
					</div>
				`;

			default:
				return '';
		}
	}

	/**
	 * イベントリスナーを設定する
	 *
	 * @param items - 表示する設定項目
	 */
	private attachEventListeners(items: SettingItemDef[]): void {
		const modal = document.getElementById(this.modalId);
		if (!modal) return;

		//! 各設定項目のイベントリスナー。
		items.forEach(item => {
			if (item.inputType === 'range-with-number') {
				//! レンジとナンバーの同期。
				const rangeInput = document.getElementById(`${this.modalId}-${item.key}-range`) as HTMLInputElement;
				const numberInput = document.getElementById(`${this.modalId}-${item.key}-number`) as HTMLInputElement;

				rangeInput?.addEventListener('input', () => {
					numberInput.value = rangeInput.value;
					this.currentValues[item.key] = parseFloat(rangeInput.value);
				});

				numberInput?.addEventListener('input', () => {
					rangeInput.value = numberInput.value;
					this.currentValues[item.key] = parseFloat(numberInput.value);
				});
			} else if (item.inputType === 'number') {
				const input = document.getElementById(`${this.modalId}-${item.key}`) as HTMLInputElement;
				input?.addEventListener('input', () => {
					this.currentValues[item.key] = parseFloat(input.value);
				});
			} else if (item.inputType === 'button' && item.key === 'testPlay') {
				//! テスト再生ボタン。
				const button = document.getElementById(`${this.modalId}-${item.key}`);
				button?.addEventListener('click', () => {
					this.callbacks.onTestPlay?.();
				});
			} else if (item.inputType === 'checkbox') {
				const input = document.getElementById(`${this.modalId}-${item.key}`) as HTMLInputElement;
				input?.addEventListener('change', () => {
					this.currentValues[item.key] = input.checked;
				});
			} else if (item.inputType === 'select') {
				const select = document.getElementById(`${this.modalId}-${item.key}`) as HTMLSelectElement;
				select?.addEventListener('change', () => {
					this.currentValues[item.key] = select.value;
				});
			} else if (item.inputType === 'keybinding') {
				const input = document.getElementById(`${this.modalId}-${item.key}`) as HTMLInputElement;
				input?.addEventListener('click', () => {
					input.value = this.texts.keybindingWaiting;
					input.classList.add('waiting-key');
				});
				input?.addEventListener('keydown', (e) => {
					e.preventDefault();
					e.stopPropagation();
					this.currentValues[item.key] = e.code;
					input.value = e.code.replace(/^Key/, '');
					input.classList.remove('waiting-key');
				});
			}
		});

		//! 保存ボタン。
		const saveBtn = document.getElementById(`${this.modalId}-save`);
		saveBtn?.addEventListener('click', () => {
			this.callbacks.onSave(this.currentValues);
			this.close();
		});

		//! キャンセルボタン。
		const cancelBtn = document.getElementById(`${this.modalId}-cancel`);
		cancelBtn?.addEventListener('click', () => {
			this.currentValues = { ...this.initialValues };
			this.callbacks.onCancel();
			this.close();
		});

		//! 閉じるボタン（×）。
		const closeBtn = document.getElementById(`${this.modalId}-close`);
		closeBtn?.addEventListener('click', () => {
			this.currentValues = { ...this.initialValues };
			this.callbacks.onCancel();
			this.close();
		});

		//! モーダル外クリックで閉じる。
		modal.addEventListener('click', (e) => {
			if (e.target === modal) {
				this.currentValues = { ...this.initialValues };
				this.callbacks.onCancel();
				this.close();
			}
		});
	}

	/**
	 * モーダルを閉じる
	 */
	private close(): void {
		const modal = document.getElementById(this.modalId);
		modal?.remove();
	}
}

/**
 * 全設定項目の定義（グローバル）
 */
export const ALL_SETTING_ITEMS: SettingItemDef[] = [
	//! Flashcard, Koch, 電鍵練習用の設定。
	{
		screens: ['flashcard', 'koch', 'horizontal-key', 'vertical-key'],
		priority: 10,
		key: 'volume',
		label: 'Volume',
		inputType: 'range-with-number',
		min: 0,
		max: 100,
		step: 1,
		unit: '%'
	},
	{
		screens: ['flashcard', 'koch', 'horizontal-key', 'vertical-key'],
		priority: 20,
		key: 'frequency',
		label: 'Frequency (Hz)',
		inputType: 'number',
		min: 400,
		max: 1200,
		step: 50
	},
	{
		screens: ['flashcard', 'koch', 'horizontal-key', 'vertical-key'],
		priority: 30,
		key: 'wpm',
		label: 'WPM (Speed: 5-40)',
		inputType: 'number',
		min: 5,
		max: 40,
		step: 1
	},
	//! Listening専用の設定。
	{
		screens: ['listening'],
		priority: 5,
		key: 'characterSpeed',
		label: 'Character Speed (WPM)',
		inputType: 'number',
		min: 5,
		max: 40,
		step: 1
	},
	{
		screens: ['listening'],
		priority: 6,
		key: 'effectiveSpeed',
		label: 'Effective Speed (WPM)',
		inputType: 'number',
		min: 5,
		max: 40,
		step: 1
	},
	{
		screens: ['listening'],
		priority: 20,
		key: 'frequency',
		label: 'Side A Frequency (Hz)',
		inputType: 'number',
		min: 400,
		max: 1000,
		step: 10
	},
	{
		screens: ['listening'],
		priority: 21,
		key: 'bFrequency',
		label: 'Side B Frequency (Hz)',
		inputType: 'number',
		min: 400,
		max: 1000,
		step: 10
	},
	{
		screens: ['listening'],
		priority: 10,
		key: 'volume',
		label: 'Volume',
		inputType: 'range-with-number',
		min: 0,
		max: 100,
		step: 5,
		unit: '%'
	},
	//! テスト再生ボタン。
	{
		screens: ['flashcard', 'listening'],
		priority: 100,
		key: 'testPlay',
		label: 'Test Playback',
		inputType: 'button',
		buttonText: 'Play',
		buttonClass: 'test-button'
	},
	//! Koch専用の設定。
	{
		screens: ['koch'],
		priority: 5,
		key: 'characterSpeed',
		label: 'Character Speed (WPM: 5-40)',
		inputType: 'number',
		min: 5,
		max: 40,
		step: 1
	},
	{
		screens: ['koch'],
		priority: 6,
		key: 'effectiveSpeed',
		label: 'Effective Speed (WPM: 5-40)',
		inputType: 'number',
		min: 5,
		max: 40,
		step: 1
	},
	{
		screens: ['koch'],
		priority: 40,
		key: 'practiceDuration',
		label: 'Practice Duration (sec: 30-300)',
		inputType: 'number',
		min: 30,
		max: 300,
		step: 30
	},
	{
		screens: ['koch'],
		priority: 50,
		key: 'groupSize',
		label: 'Group Size (chars: 3-10)',
		inputType: 'number',
		min: 3,
		max: 10,
		step: 1
	},
	{
		screens: ['koch'],
		priority: 60,
		key: 'showInput',
		label: 'Show Input',
		inputType: 'checkbox'
	},
	//! HorizontalKey専用の設定。
	{
		screens: ['horizontal-key'],
		priority: 40,
		key: 'iambicMode',
		label: 'Iambic Mode',
		inputType: 'select',
		options: [
			{ value: 'A', label: 'Iambic A' },
			{ value: 'B', label: 'Iambic B' }
		]
	},
	{
		screens: ['horizontal-key'],
		priority: 50,
		key: 'paddleLayout',
		label: 'Paddle Layout',
		inputType: 'select',
		options: [
			{ value: 'normal', label: 'Normal (Left=dit / Right=dah)' },
			{ value: 'reversed', label: 'Reversed (Left=dah / Right=dit)' }
		]
	},
	{
		screens: ['horizontal-key'],
		priority: 60,
		key: 'leftKeyCode',
		label: 'Left Paddle Key',
		inputType: 'keybinding',
		hint: 'Click, then press a key'
	},
	{
		screens: ['horizontal-key'],
		priority: 70,
		key: 'rightKeyCode',
		label: 'Right Paddle Key',
		inputType: 'keybinding',
		hint: 'Click, then press a key'
	},
	//! VerticalKey専用の設定。
	{
		screens: ['vertical-key'],
		priority: 40,
		key: 'keyCode',
		label: 'Key Binding',
		inputType: 'keybinding',
		hint: 'Click, then press a key'
	}
];
