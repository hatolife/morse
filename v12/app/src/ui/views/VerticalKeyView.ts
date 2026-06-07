/**
 * 縦振り電鍵練習ビュー
 */

import type { View } from '../../router';
import {
	VerticalKeyTrainer,
	MorseBuffer,
	TimerManager,
	TimingCalculator,
	AudioGenerator,
	type TimingEvaluation,
	type TimingStatistics
} from 'morse-engine';
import { SettingsModal, ALL_SETTING_ITEMS, type SettingValues } from 'morse-engine';
import { t } from '../../i18n';
import { getSettingsModalTexts, localizeSettingItems } from '../../i18n/settings-modal';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

/**
 * 縦振り電鍵練習ビュークラス
 */
export class VerticalKeyView implements View {
	private trainer: VerticalKeyTrainer;
	private buffer: MorseBuffer;
	private timer: TimerManager;
	private audio: AudioGenerator;
	private isKeyPressed = false;
	private keyPressHandler: ((e: KeyboardEvent) => void) | null = null;
	private keyReleaseHandler: ((e: KeyboardEvent) => void) | null = null;
	private updateIntervalId: number | null = null;
	private currentWPM = 20;
	private keyCode = 'Space';
	private latestEvaluation: TimingEvaluation | null = null;
	private overallStats: TimingStatistics | null = null;
	private dotStats: TimingStatistics | null = null;
	private dashStats: TimingStatistics | null = null;
	private languageSwitcher = new LanguageSwitcher();

	constructor() {
		//! 設定を読み込む。
		const savedWPM = localStorage.getItem('verticalKeyWPM');
		if (savedWPM) {
			this.currentWPM = parseInt(savedWPM, 10);
		}

		const savedKeyCode = localStorage.getItem('verticalKeyCode');
		if (savedKeyCode) {
			this.keyCode = savedKeyCode;
		}

		//! コアコンポーネントを初期化。
		this.buffer = new MorseBuffer();
		this.timer = new TimerManager();
		this.audio = new AudioGenerator({
			frequency: 700,
			volume: 0.5,
			wpm: this.currentWPM
		});

		//! タイミング計算。
		const timings = TimingCalculator.calculate(this.currentWPM);

		//! トレーナーを初期化（コールバックで音声制御とタイミング評価）。
		this.trainer = new VerticalKeyTrainer(
			this.buffer,
			this.timer,
			timings,
			{
				onKeyPress: () => {
					//! キー押下時に音を鳴らす。
					this.audio.startContinuousTone();
				},
				onKeyRelease: () => {
					//! キー解放時に音を止める。
					this.audio.stopContinuousTone();
				},
				onTimingEvaluated: (evaluation: TimingEvaluation) => {
					//! タイミング評価結果を保存。
					this.latestEvaluation = evaluation;
					this.updateTimingStatistics();
				}
			}
		);
	}

	/**
	 * ビューをレンダリングする
	 */
	render(): void {
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
						<h1>${t('verticalKey.title')}</h1>
						<div id="languageSwitcherContainer">
							${this.languageSwitcher.render()}
						</div>
					</div>
				</header>

				<div class="key-button-container">
					<button class="key-button" id="morse-key">
						KEY
						<span class="key-label">${t('verticalKey.keyLabel')}</span>
					</button>
				</div>

				<div class="practice-container">
					<div class="display-area">
						<div class="display-section">
							<h3>${t('verticalKey.morseSignal')}</h3>
							<div class="display-output morse-buffer" id="morse-buffer">${t('verticalKey.morseBufferPlaceholder')}</div>
						</div>
						<div class="display-section">
							<h3>${t('verticalKey.decodedResult')}</h3>
							<div class="display-output" id="decoded-text">${t('verticalKey.decodedTextPlaceholder')}</div>
						</div>
					</div>

					<div class="action-area">
						<button class="btn btn-large btn-danger" id="clear-btn">${t('common.reset')}</button>
					</div>

					<div class="status-area">
						<div class="status-item">
							<span class="label">${t('verticalKey.currentSpeed')}</span>
							<span class="value" id="current-wpm">${this.currentWPM}</span>
						</div>
						<div class="status-item" id="key-status">
							<span class="label">${t('verticalKey.keyState')}</span>
							<span class="value">${t('verticalKey.released')}</span>
						</div>
						<div class="status-item">
							<span class="label">${t('verticalKey.charCount')}</span>
							<span class="value" id="char-count">0</span>
						</div>
					</div>

					<div class="timing-evaluation-area">
						<h3>${t('verticalKey.timingEvaluation')}</h3>
						<div class="evaluation-panel">
							<div class="latest-evaluation">
								<h4>${t('verticalKey.latestInput')}</h4>
								<div id="latest-evaluation-content" class="evaluation-content">
									${t('verticalKey.waitingForInput')}
								</div>
							</div>
							<div class="statistics-panel">
								<h4>${t('verticalKey.overallStats')}</h4>
								<div id="overall-stats-content" class="stats-content">
									${t('verticalKey.noStatsData')}
								</div>
							</div>
							<div class="element-stats-panel">
								<div class="dot-stats">
									<h4>${t('verticalKey.ditStats')}</h4>
									<div id="dot-stats-content" class="stats-content">
										${t('verticalKey.noData')}
									</div>
								</div>
								<div class="dash-stats">
									<h4>${t('verticalKey.dahStats')}</h4>
									<div id="dash-stats-content" class="stats-content">
										${t('verticalKey.noData')}
									</div>
								</div>
							</div>
						</div>
					</div>

					<div class="instructions">
						<h3>${t('verticalKey.howToUse')}</h3>
						<ul>
							<li>${t('verticalKey.instruction1')}</li>
							<li>${t('verticalKey.instruction2')}</li>
							<li>${t('verticalKey.instruction3')}</li>
							<li>${t('verticalKey.instruction4')}</li>
							<li>${t('verticalKey.instruction5')}</li>
							<li>${t('verticalKey.instruction6')}</li>
						</ul>
					</div>
				</div>
			</div>
		`;

		//! イベントリスナーを設定。
		this.attachEventListeners();
		//! 定期更新を開始。
		this.startUpdate();
	}

	/**
	 * イベントリスナーを設定する
	 */
	private attachEventListeners(): void {
		//! 戻るボタン。
		const backBtn = document.querySelector('.back-btn');
		backBtn?.addEventListener('click', () => {
			window.location.hash = '#menu';
		});

		//! 設定アイコン。
		document.getElementById('settingsIcon')?.addEventListener('click', () => {
			this.openSettingsModal();
		});

		//! クリアボタン。
		const clearBtn = document.getElementById('clear-btn');
		clearBtn?.addEventListener('click', () => {
			this.trainer.clear();
			this.updateDisplay();
		});

		//! キーボードイベント（設定されたキー）。
		this.keyPressHandler = (e: KeyboardEvent) => {
			if (e.code === this.keyCode && !e.repeat) {
				e.preventDefault();
				if (!this.isKeyPressed) {
					this.handleKeyDown();
				}
			}
		};

		this.keyReleaseHandler = (e: KeyboardEvent) => {
			if (e.code === this.keyCode) {
				e.preventDefault();
				if (this.isKeyPressed) {
					this.handleKeyUp();
				}
			}
		};

		window.addEventListener('keydown', this.keyPressHandler);
		window.addEventListener('keyup', this.keyReleaseHandler);

		//! ボタンイベント（マウス/タッチ）。
		const keyButton = document.getElementById('morse-key');
		if (keyButton) {
			//! マウスイベント。
			keyButton.addEventListener('mousedown', (e) => {
				e.preventDefault();
				if (!this.isKeyPressed) {
					this.handleKeyDown();
				}
			});

			keyButton.addEventListener('mouseup', (e) => {
				e.preventDefault();
				if (this.isKeyPressed) {
					this.handleKeyUp();
				}
			});

			keyButton.addEventListener('mouseleave', () => {
				if (this.isKeyPressed) {
					this.handleKeyUp();
				}
			});

			//! タッチイベント。
			keyButton.addEventListener('touchstart', (e) => {
				e.preventDefault();
				if (!this.isKeyPressed) {
					this.handleKeyDown();
				}
			});

			keyButton.addEventListener('touchend', (e) => {
				e.preventDefault();
				if (this.isKeyPressed) {
					this.handleKeyUp();
				}
			});

			keyButton.addEventListener('touchcancel', () => {
				if (this.isKeyPressed) {
					this.handleKeyUp();
				}
			});
		}

		//! LanguageSwitcherのイベントリスナーを設定。
		const languageSwitcherContainer = document.getElementById('languageSwitcherContainer');
		if (languageSwitcherContainer) {
			this.languageSwitcher.attachEventListeners(languageSwitcherContainer);
		}
	}

	/**
	 * キー押下処理
	 */
	private handleKeyDown(): void {
		this.isKeyPressed = true;
		this.trainer.keyPress();
		this.updateKeyStatus(true);

		//! ボタンの見た目を更新。
		const keyButton = document.getElementById('morse-key');
		if (keyButton) {
			keyButton.classList.add('pressed');
		}
	}

	/**
	 * キー解放処理
	 */
	private handleKeyUp(): void {
		this.isKeyPressed = false;
		this.trainer.keyRelease();
		this.updateKeyStatus(false);

		//! ボタンの見た目を更新。
		const keyButton = document.getElementById('morse-key');
		if (keyButton) {
			keyButton.classList.remove('pressed');
		}
	}

	/**
	 * 定期更新を開始する
	 */
	private startUpdate(): void {
		//! 100msごとに画面を更新。
		this.updateIntervalId = window.setInterval(() => {
			this.updateDisplay();
		}, 100);
	}

	/**
	 * 表示を更新する
	 */
	private updateDisplay(): void {
		const morseBuffer = document.getElementById('morse-buffer');
		const decodedText = document.getElementById('decoded-text');
		const charCount = document.getElementById('char-count');

		if (morseBuffer) {
			const buffer = this.trainer.getBuffer();
			const sequence = this.trainer.getSequence();
			const fullDisplay = sequence ? `${buffer} ${sequence}` : buffer;
			morseBuffer.textContent = fullDisplay || t('verticalKey.morseBufferPlaceholder');
		}

		if (decodedText) {
			const text = this.trainer.getDecoded();
			decodedText.textContent = text || t('verticalKey.decodedTextPlaceholder');
		}

		if (charCount) {
			const text = this.trainer.getDecoded();
			charCount.textContent = text.length.toString();
		}

		//! タイミング評価表示を更新。
		this.updateTimingDisplay();
	}

	/**
	 * タイミング統計情報を更新する
	 */
	private updateTimingStatistics(): void {
		this.overallStats = this.trainer.getTimingStatistics();
		const elementStats = this.trainer.getStatisticsByElement();
		this.dotStats = elementStats.dot;
		this.dashStats = elementStats.dash;
	}

	/**
	 * タイミング評価表示を更新する
	 */
	private updateTimingDisplay(): void {
		//! 最新評価を表示。
		const latestContent = document.getElementById('latest-evaluation-content');
		if (latestContent && this.latestEvaluation) {
			const eval_ = this.latestEvaluation;
			const element = eval_.record.element === '.' ? t('verticalKey.dit') : t('verticalKey.dah');
			const accuracy = eval_.accuracy.toFixed(1);
			const accuracyClass = this.getAccuracyClass(eval_.accuracy);

			//! 棒グラフの幅計算（8短点分を100%とする固定スケール）。
			const timings = TimingCalculator.calculate(this.currentWPM);
			const dotDuration = timings.dot;
			const maxDuration = dotDuration * 8; // 8短点分を100%とする
			const expected = eval_.record.expectedDuration;
			const actual = eval_.record.actualDuration;
			const expectedPercent = (expected / maxDuration) * 100;
			const actualPercent = (actual / maxDuration) * 100;

			//! 誤差の方向（長い/短い）を判定。
			const diff = actual - expected;
			const diffClass = diff > 0 ? 'longer' : diff < 0 ? 'shorter' : 'perfect';
			const diffText = diff > 0 ? `+${diff}ms (${t('verticalKey.longer')})` : diff < 0 ? `${diff}ms (${t('verticalKey.shorter')})` : t('verticalKey.perfect');

			latestContent.innerHTML = `
				<div class="eval-item">
					<span class="eval-label">${t('verticalKey.element')}</span>
					<span class="eval-value">${element}</span>
				</div>
				<div class="timing-chart">
					<div class="chart-row">
						<div class="chart-label">${t('verticalKey.expected')}</div>
						<div class="chart-bar-container">
							<div class="chart-bar expected" style="width: ${expectedPercent}%">
								<span class="chart-value">${expected}ms</span>
							</div>
						</div>
					</div>
					<div class="chart-row">
						<div class="chart-label">${t('verticalKey.actual')}</div>
						<div class="chart-bar-container">
							<div class="chart-bar actual ${accuracyClass}" style="width: ${actualPercent}%">
								<span class="chart-value">${actual}ms</span>
							</div>
						</div>
					</div>
					<div class="chart-scale">
						<span>0ms</span>
						<span>${Math.round(dotDuration * 4)}ms</span>
						<span>${Math.round(maxDuration)}ms</span>
					</div>
				</div>
				<div class="eval-item">
					<span class="eval-label">${t('verticalKey.accuracy')}</span>
					<span class="eval-value accuracy-${accuracyClass}">${accuracy}%</span>
				</div>
				<div class="eval-item">
					<span class="eval-label">${t('verticalKey.error')}</span>
					<span class="eval-value timing-diff-${diffClass}">${diffText}</span>
				</div>
			`;
		}

		//! 全体統計を表示。
		const overallContent = document.getElementById('overall-stats-content');
		if (overallContent && this.overallStats && this.overallStats.count > 0) {
			const stats = this.overallStats;
			const accuracyClass = this.getAccuracyClass(stats.averageAccuracy);

			overallContent.innerHTML = `
				<div class="stat-item">
					<span class="stat-label">${t('verticalKey.inputCount')}</span>
					<span class="stat-value">${stats.count}${t('verticalKey.times')}</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">${t('verticalKey.avgAccuracy')}</span>
					<span class="stat-value accuracy-${accuracyClass}">${stats.averageAccuracy.toFixed(1)} ± ${stats.standardDeviation.toFixed(1)}%</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">${t('verticalKey.maxAccuracy')}</span>
					<span class="stat-value">${stats.maxAccuracy.toFixed(1)}%</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">${t('verticalKey.minAccuracy')}</span>
					<span class="stat-value">${stats.minAccuracy.toFixed(1)}%</span>
				</div>
			`;
		}

		//! 短点統計を表示。
		const dotContent = document.getElementById('dot-stats-content');
		if (dotContent && this.dotStats && this.dotStats.count > 0) {
			const stats = this.dotStats;
			const accuracyClass = this.getAccuracyClass(stats.averageAccuracy);

			dotContent.innerHTML = `
				<div class="stat-item">
					<span class="stat-label">${t('verticalKey.inputCount')}</span>
					<span class="stat-value">${stats.count}${t('verticalKey.times')}</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">${t('verticalKey.avgAccuracy')}</span>
					<span class="stat-value accuracy-${accuracyClass}">${stats.averageAccuracy.toFixed(1)} ± ${stats.standardDeviation.toFixed(1)}%</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">${t('verticalKey.avgError')}</span>
					<span class="stat-value">${stats.averageAbsoluteError.toFixed(1)}ms</span>
				</div>
			`;
		}

		//! 長点統計を表示。
		const dashContent = document.getElementById('dash-stats-content');
		if (dashContent && this.dashStats && this.dashStats.count > 0) {
			const stats = this.dashStats;
			const accuracyClass = this.getAccuracyClass(stats.averageAccuracy);

			dashContent.innerHTML = `
				<div class="stat-item">
					<span class="stat-label">${t('verticalKey.inputCount')}</span>
					<span class="stat-value">${stats.count}${t('verticalKey.times')}</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">${t('verticalKey.avgAccuracy')}</span>
					<span class="stat-value accuracy-${accuracyClass}">${stats.averageAccuracy.toFixed(1)} ± ${stats.standardDeviation.toFixed(1)}%</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">${t('verticalKey.avgError')}</span>
					<span class="stat-value">${stats.averageAbsoluteError.toFixed(1)}ms</span>
				</div>
			`;
		}
	}

	/**
	 * 精度に応じたCSSクラス名を取得する
	 */
	private getAccuracyClass(accuracy: number): string {
		if (accuracy >= 90) return 'excellent';
		if (accuracy >= 70) return 'good';
		if (accuracy >= 50) return 'fair';
		return 'poor';
	}

	/**
	 * キー状態表示を更新する
	 */
	private updateKeyStatus(isPressed: boolean): void {
		const keyStatus = document.getElementById('key-status');
		if (keyStatus) {
			const valueSpan = keyStatus.querySelector('.value');
			if (valueSpan) {
				valueSpan.textContent = isPressed ? t('verticalKey.pressed') : t('verticalKey.released');
			}
			if (isPressed) {
				keyStatus.classList.add('active');
			} else {
				keyStatus.classList.remove('active');
			}
		}
	}

	/**
	 * 設定モーダルを開く
	 */
	private openSettingsModal(): void {
		//! 現在の設定値を取得。
		const currentValues: SettingValues = {
			volume: Math.round(this.audio.getVolume() * 100),
			frequency: this.audio.getFrequency(),
			wpm: this.currentWPM,
			keyCode: this.keyCode
		};

		//! 設定変更前の値を保存（キャンセル時の復元用）。
		const savedSettings = {
			volume: this.audio.getVolume(),
			frequency: this.audio.getFrequency(),
			wpm: this.currentWPM,
			keyCode: this.keyCode
		};

		//! SettingsModalを作成。
		const modal = new SettingsModal(
			'vertical-key-settings-modal',
			localizeSettingItems(ALL_SETTING_ITEMS),
			currentValues,
			{
				onSave: (values: SettingValues) => {
					//! 設定を保存。
					this.audio.setVolume((values.volume as number) / 100);
					this.audio.setFrequency(values.frequency as number);
					this.audio.setWPM(values.wpm as number);
					this.currentWPM = values.wpm as number;
					this.keyCode = values.keyCode as string;

					//! localStorageに保存。
					localStorage.setItem('verticalKeyWPM', this.currentWPM.toString());
					localStorage.setItem('verticalKeyCode', this.keyCode);

					//! タイミングを再計算してトレーナーを再初期化。
					const timings = TimingCalculator.calculate(this.currentWPM);
					this.trainer = new VerticalKeyTrainer(
						this.buffer,
						this.timer,
						timings,
						{
							onKeyPress: () => {
								this.audio.startContinuousTone();
							},
							onKeyRelease: () => {
								this.audio.stopContinuousTone();
							},
							onTimingEvaluated: (evaluation: TimingEvaluation) => {
								this.latestEvaluation = evaluation;
								this.updateTimingStatistics();
							}
						}
					);

					//! 現在のWPM表示を更新。
					const currentWpmDisplay = document.getElementById('current-wpm');
					if (currentWpmDisplay) currentWpmDisplay.textContent = this.currentWPM.toString();
				},
				onCancel: () => {
					//! 設定を元に戻す。
					this.audio.setVolume(savedSettings.volume);
					this.audio.setFrequency(savedSettings.frequency);
					this.audio.setWPM(savedSettings.wpm);
					this.currentWPM = savedSettings.wpm;
					this.keyCode = savedSettings.keyCode;
				}
			},
			getSettingsModalTexts()
		);

		//! モーダルを表示。
		modal.show('vertical-key');
	}

	/**
	 * ビューを破棄する
	 */
	destroy(): void {
		//! イベントリスナーを削除。
		if (this.keyPressHandler) {
			window.removeEventListener('keydown', this.keyPressHandler);
			this.keyPressHandler = null;
		}
		if (this.keyReleaseHandler) {
			window.removeEventListener('keyup', this.keyReleaseHandler);
			this.keyReleaseHandler = null;
		}

		//! 定期更新を停止。
		if (this.updateIntervalId !== null) {
			clearInterval(this.updateIntervalId);
			this.updateIntervalId = null;
		}

		//! 音声を停止。
		this.audio.stopContinuousTone();

		//! トレーナーをクリア。
		this.trainer.clear();
	}
}
