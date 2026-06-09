/**
 * ルーター
 * ハッシュベースのSPAルーティング
 */

import { MenuView } from '../ui/views/MenuView';
import { VerticalKeyView } from '../ui/views/VerticalKeyView';
import { HorizontalKeyView } from '../ui/views/HorizontalKeyView';
import { FlashcardView } from '../ui/views/FlashcardView';
import { MorseCardView } from '../ui/views/MorseCardView';
import { KochView } from '../ui/views/KochView';
import { ListeningView } from '../ui/views/ListeningView';

/**
 * ビューインターフェース
 */
export interface View {
	/**
	 * ビューをレンダリングする
	 */
	render(): void | Promise<void>;

	/**
	 * ビューを破棄する
	 */
	destroy(): void;
}

/**
 * ルート定義
 */
type Route = {
	path: string;
	view: new () => View;
};

/**
 * ルータークラス
 */
export class Router {
	private currentView: View | null = null;
	private routes: Route[] = [];

	constructor() {
		//! ルート定義。
		this.routes = [
			{ path: '', view: MenuView },
			{ path: 'menu', view: MenuView },
			{ path: 'vertical', view: VerticalKeyView },
			{ path: 'horizontal', view: HorizontalKeyView },
			{ path: 'flashcard', view: FlashcardView },
			{ path: 'morse-card', view: MorseCardView },
			{ path: 'koch', view: KochView },
			{ path: 'listening', view: ListeningView },
		];
	}

	/**
	 * ルーターを初期化する
	 */
	init(): void {
		//! ハッシュ変更時のリスナーを登録。
		window.addEventListener('hashchange', () => this.handleRoute());

		//! 初回ルーティング。
		this.handleRoute();
	}

	/**
	 * 現在のハッシュに基づいてルーティングする
	 */
	private handleRoute(): void {
		//! 現在のビューを破棄。
		if (this.currentView) {
			this.currentView.destroy();
			this.currentView = null;
		}

		//! ハッシュからパスを取得（#を除去）。
		const hash = window.location.hash.slice(1);
		const route = this.routes.find(r => r.path === hash);

		if (route) {
			//! ビューを作成してレンダリング。
			this.currentView = new route.view();
			this.currentView.render();
		} else {
			//! 該当するルートがない場合はメニューに遷移。
			window.location.hash = '#menu';
		}
	}

	/**
	 * 指定したパスに遷移する
	 */
	navigate(path: string): void {
		window.location.hash = `#${path}`;
	}
}
