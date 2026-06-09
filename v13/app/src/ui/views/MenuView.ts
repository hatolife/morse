/**
 * メニュービュー
 */

import type { View } from '../../router';
import { t } from '../../i18n';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

/**
 * メニュー項目の定義
 */
interface MenuItem {
	id: string;
	title: string;
	description: string;
	route: string;
}

/**
 * メニュービュークラス
 */
export class MenuView implements View {
	private languageSwitcher = new LanguageSwitcher();

	/**
	 * メニュー項目を取得（多言語対応）
	 */
	private getMenuItems(): MenuItem[] {
		return [
			{
				id: 'vertical',
				title: t('menu.items.vertical.title'),
				description: t('menu.items.vertical.description'),
				route: 'vertical'
			},
			{
				id: 'horizontal',
				title: t('menu.items.horizontal.title'),
				description: t('menu.items.horizontal.description'),
				route: 'horizontal'
			},
			{
				id: 'flashcard',
				title: t('menu.items.flashcard.title'),
				description: t('menu.items.flashcard.description'),
				route: 'flashcard'
			},
			{
				id: 'morse-card',
				title: t('menu.items.morseCard.title'),
				description: t('menu.items.morseCard.description'),
				route: 'morse-card'
			},
			{
				id: 'koch',
				title: t('menu.items.koch.title'),
				description: t('menu.items.koch.description'),
				route: 'koch'
			},
			{
				id: 'listening',
				title: t('menu.items.listening.title'),
				description: t('menu.items.listening.description'),
				route: 'listening'
			}
		];
	}

	/**
	 * ビューをレンダリングする
	 */
	render(): void {
		const app = document.getElementById('app');
		if (!app) return;

		const menuItems = this.getMenuItems();

		app.innerHTML = `
			<div class="container">
				<header class="menu-header">
					<div class="menu-header-top">
						<div>
							<h1>${t('menu.title')}</h1>
							<p class="version">${t('common.version')}</p>
						</div>
						<div id="languageSwitcherContainer">
							${this.languageSwitcher.render()}
						</div>
					</div>
				</header>

				<main class="menu-main">
					<div class="menu-grid">
						${menuItems.map(item => this.renderMenuItem(item)).join('')}
					</div>
				</main>

				<footer class="menu-footer">
					<p>${t('common.copyright')}</p>
				</footer>
			</div>
		`;

		//! イベントリスナーを設定。
		this.attachEventListeners();

		//! LanguageSwitcherのイベントリスナーを設定。
		const languageSwitcherContainer = document.getElementById('languageSwitcherContainer');
		if (languageSwitcherContainer) {
			this.languageSwitcher.attachEventListeners(languageSwitcherContainer);
		}
	}

	/**
	 * メニュー項目を描画する
	 */
	private renderMenuItem(item: MenuItem): string {
		return `
			<div class="menu-item" data-route="${item.route}">
				<h2 class="menu-item-title">${item.title}</h2>
				<p class="menu-item-description">${item.description}</p>
			</div>
		`;
	}

	/**
	 * イベントリスナーを設定する
	 */
	private attachEventListeners(): void {
		const menuItems = document.querySelectorAll('.menu-item');
		menuItems.forEach(item => {
			item.addEventListener('click', () => {
				const route = item.getAttribute('data-route');
				if (route) {
					window.location.hash = `#${route}`;
				}
			});
		});
	}

	/**
	 * ビューを破棄する
	 */
	destroy(): void {
		//! イベントリスナーは新しいHTMLで上書きされるため、特に処理不要。
	}
}
