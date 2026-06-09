/**
 * 言語切り替えコンポーネント
 */

import {
	getCurrentLanguage,
	setLanguage,
	getLanguageName,
	onLanguageChange,
	SUPPORTED_LANGUAGES,
	type Language
} from '../../i18n';

/**
 * 言語切り替えボタンのコンポーネント
 */
export class LanguageSwitcher {
	private isOpen = false;
	private boundCloseDropdown: ((e: MouseEvent) => void) | null = null;

	/**
	 * コンポーネントのHTMLを生成
	 */
	render(): string {
		const currentLang = getCurrentLanguage();
		const currentLangName = getLanguageName(currentLang);

		return `
			<div class="language-switcher">
				<button class="language-switcher-button" id="languageSwitcherButton">
					<svg class="language-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10"></circle>
						<line x1="2" y1="12" x2="22" y2="12"></line>
						<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
					</svg>
					<span class="language-name">${currentLangName}</span>
					<svg class="chevron-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="6 9 12 15 18 9"></polyline>
					</svg>
				</button>
				<div class="language-dropdown" id="languageDropdown">
					${SUPPORTED_LANGUAGES.map(lang => `
						<button
							class="language-option ${lang === currentLang ? 'active' : ''}"
							data-lang="${lang}"
						>
							${getLanguageName(lang)}
							${lang === currentLang ? '<span class="checkmark">✓</span>' : ''}
						</button>
					`).join('')}
				</div>
			</div>
		`;
	}

	/**
	 * イベントリスナーを設定
	 */
	attachEventListeners(container: HTMLElement): void {
		const button = container.querySelector('#languageSwitcherButton') as HTMLButtonElement;
		const dropdown = container.querySelector('#languageDropdown') as HTMLElement;

		if (!button || !dropdown) {
			console.warn('LanguageSwitcher: Required elements not found');
			return;
		}

		//! ボタンクリックでドロップダウンを開閉。
		button.addEventListener('click', (e) => {
			e.stopPropagation();
			this.toggleDropdown(dropdown);
		});

		//! 言語オプションのクリックイベント。
		const options = container.querySelectorAll('.language-option');
		options.forEach(option => {
			option.addEventListener('click', (e) => {
				e.stopPropagation();
				const lang = (option as HTMLElement).dataset.lang as Language;
				if (lang && SUPPORTED_LANGUAGES.includes(lang)) {
					this.selectLanguage(lang);
				}
			});
		});

		//! ドロップダウン外をクリックしたら閉じる。
		this.boundCloseDropdown = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (!container.contains(target)) {
				this.closeDropdown(dropdown);
			}
		};

		//! 言語変更時のコールバック登録。
		onLanguageChange(() => {
			//! 言語が変更されたらページをリロード。
			window.location.reload();
		});
	}

	/**
	 * ドロップダウンを開閉
	 */
	private toggleDropdown(dropdown: HTMLElement): void {
		this.isOpen = !this.isOpen;

		if (this.isOpen) {
			dropdown.classList.add('open');
			//! ドロップダウンが開いているときは外クリックで閉じる。
			setTimeout(() => {
				document.addEventListener('click', this.boundCloseDropdown!);
			}, 0);
		} else {
			this.closeDropdown(dropdown);
		}
	}

	/**
	 * ドロップダウンを閉じる
	 */
	private closeDropdown(dropdown: HTMLElement): void {
		dropdown.classList.remove('open');
		this.isOpen = false;
		if (this.boundCloseDropdown) {
			document.removeEventListener('click', this.boundCloseDropdown);
		}
	}

	/**
	 * 言語を選択
	 */
	private selectLanguage(lang: Language): void {
		setLanguage(lang);
		//! setLanguageがコールバックを実行し、ページがリロードされる。
	}

	/**
	 * クリーンアップ
	 */
	destroy(): void {
		if (this.boundCloseDropdown) {
			document.removeEventListener('click', this.boundCloseDropdown);
			this.boundCloseDropdown = null;
		}
		this.isOpen = false;
	}
}
