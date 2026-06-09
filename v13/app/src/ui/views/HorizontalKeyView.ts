/**
 * 横振り電鍵練習ビュー
 */

import type { View } from '../../router';
import {
	HorizontalKeyTrainer,
	MorseBuffer,
	TimerManager,
	TimingCalculator,
	AudioGenerator,
	type IambicMode,
	type PaddleLayout,
	type MorseTimings,
	type WordTimingData
} from 'morse-engine';
import { SettingsModal, ALL_SETTING_ITEMS, type SettingValues } from 'morse-engine';
import { t } from '../../i18n';
import { getSettingsModalTexts, localizeSettingItems } from '../../i18n/settings-modal';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

/**
 * 横振り電鍵練習ビュークラス
 */
export class HorizontalKeyView implements View {
	private trainer!: HorizontalKeyTrainer;
	private buffer: MorseBuffer;
	private timer: TimerManager;
	private audio: AudioGenerator;
	private timings!: MorseTimings;
	private leftPressed = false;
	private rightPressed = false;
	private updateIntervalId: number | null = null;
	private currentWPM = 20;
	private iambicMode: IambicMode = 'B';
	private paddleLayout: PaddleLayout = 'normal';
	private leftKeyCode = 'KeyJ';
	private rightKeyCode = 'KeyK';

	// イベントハンドラーの参照を保持
	private keyPressHandler: ((e: KeyboardEvent) => void) | null = null;
	private keyReleaseHandler: ((e: KeyboardEvent) => void) | null = null;
	private languageSwitcher = new LanguageSwitcher();

	constructor() {
		//! 設定を読み込む。
		const savedWPM = localStorage.getItem('horizontalKeyWPM');
		if (savedWPM) {
			this.currentWPM = parseInt(savedWPM, 10);
		}

		const savedIambicMode = localStorage.getItem('horizontalKeyIambicMode');
		if (savedIambicMode === 'A' || savedIambicMode === 'B') {
			this.iambicMode = savedIambicMode;
		}

		const savedPaddleLayout = localStorage.getItem('horizontalKeyPaddleLayout');
		if (savedPaddleLayout === 'normal' || savedPaddleLayout === 'reversed') {
			this.paddleLayout = savedPaddleLayout;
		}

		const savedLeftKeyCode = localStorage.getItem('horizontalKeyLeftCode');
		if (savedLeftKeyCode) {
			this.leftKeyCode = savedLeftKeyCode;
		}

		const savedRightKeyCode = localStorage.getItem('horizontalKeyRightCode');
		if (savedRightKeyCode) {
			this.rightKeyCode = savedRightKeyCode;
		}

		//! コアコンポーネントを初期化。
		this.buffer = new MorseBuffer();
		this.timer = new TimerManager();
		this.audio = new AudioGenerator({
			frequency: 700,
			volume: 0.5,
			wpm: this.currentWPM
		});

		//! トレーナーを初期化。
		this.initializeTrainer();
	}

	/**
	 * トレーナーを初期化する
	 */
	private initializeTrainer(): void {
		this.timings = TimingCalculator.calculate(this.currentWPM);

		this.trainer = new HorizontalKeyTrainer(
			this.buffer,
			this.timer,
			this.timings,
			{
				onElementStart: (_element: '.' | '-', duration: number) => {
					//! 要素送信開始時に指定時間だけ音を鳴らす。
					// scheduleToneに0を渡すと現在時刻から再生される
					this.audio.scheduleTone(0, duration);
				},
				onSpacingEvaluated: () => {
					//! スペーシング評価が完了したら画面を更新。
					this.updateDisplay();
				}
			},
			{
				iambicMode: this.iambicMode,
				paddleLayout: this.paddleLayout
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
						<h1>${t('horizontalKey.title')}</h1>
						<div id="languageSwitcherContainer">
							${this.languageSwitcher.render()}
						</div>
					</div>
				</header>

				<div class="paddle-container">
					<button class="paddle-button dit" id="left-paddle">
						${t('horizontalKey.dit')}
						<span class="paddle-label">${t('horizontalKey.ditLabel')}</span>
						<span class="paddle-key">${t('horizontalKey.jKey')}</span>
					</button>
					<button class="paddle-button dah" id="right-paddle">
						${t('horizontalKey.dah')}
						<span class="paddle-label">${t('horizontalKey.dahLabel')}</span>
						<span class="paddle-key">${t('horizontalKey.kKey')}</span>
					</button>
				</div>

				<div class="practice-container">
					<div class="display-area">
						<div class="display-section">
							<h3>${t('horizontalKey.morseSignal')}</h3>
							<div class="display-output morse-buffer" id="morse-buffer">${t('horizontalKey.morseBufferPlaceholder')}</div>
						</div>
						<div class="display-section">
							<h3>${t('horizontalKey.decodedResult')}</h3>
							<div class="display-output" id="decoded-text">${t('horizontalKey.decodedTextPlaceholder')}</div>
						</div>
					</div>

					<div class="action-area">
						<button class="btn btn-large btn-danger" id="clear-btn">${t('horizontalKey.clear')}</button>
					</div>

					<div class="status-area">
						<div class="status-item">
							<span class="label">${t('horizontalKey.currentSpeed')}</span>
							<span class="value" id="current-wpm">${this.currentWPM}</span>
						</div>
						<div class="status-item">
							<span class="label">${t('horizontalKey.iambicMode')}</span>
							<span class="value" id="current-iambic-mode">${this.iambicMode}</span>
						</div>
						<div class="status-item">
							<span class="label">${t('horizontalKey.charCount')}</span>
							<span class="value" id="char-count">0</span>
						</div>
					</div>

					<div class="timing-diagram-section">
						<h3>${t('horizontalKey.timingDiagramTitle')}</h3>
						<div id="timing-diagram-content" class="timing-diagram-content">
							${t('horizontalKey.timingDiagramPlaceholder')}
						</div>
					</div>

					<div class="timing-diagram-section timing-evaluation-section">
						<h3>${t('horizontalKey.spacingEvaluation')}</h3>
						<div class="timing-stats-grid">
							<div class="timing-stat-card">
								<div class="timing-stat-label">${t('horizontalKey.avgAccuracy')}</div>
								<div class="timing-stat-value" id="timing-avg-accuracy">--%</div>
							</div>
							<div class="timing-stat-card">
								<div class="timing-stat-label">${t('horizontalKey.avgError')}</div>
								<div class="timing-stat-value" id="timing-avg-error">--ms</div>
							</div>
							<div class="timing-stat-card">
								<div class="timing-stat-label">${t('horizontalKey.evaluationCount')}</div>
								<div class="timing-stat-value" id="timing-count">0</div>
							</div>
						</div>
						<div class="timing-element-stats">
							<div class="timing-element-stat">
								<h4>${t('horizontalKey.charSpacing')}</h4>
								<div class="timing-element-detail">
									<span>${t('horizontalKey.expected')} <span id="timing-char-expected">--ms</span></span>
									<span>${t('horizontalKey.accuracy')} <span id="timing-char-accuracy">--%</span></span>
									<span>${t('horizontalKey.error')} <span id="timing-char-error">--ms</span></span>
									<span>${t('horizontalKey.count')} <span id="timing-char-count">0</span></span>
								</div>
							</div>
							<div class="timing-element-stat">
								<h4>${t('horizontalKey.wordSpacing')}</h4>
								<div class="timing-element-detail">
									<span>${t('horizontalKey.expected')} <span id="timing-word-expected">--ms</span></span>
									<span>${t('horizontalKey.accuracy')} <span id="timing-word-accuracy">--%</span></span>
									<span>${t('horizontalKey.error')} <span id="timing-word-error">--ms</span></span>
									<span>${t('horizontalKey.count')} <span id="timing-word-count">0</span></span>
								</div>
							</div>
						</div>
					</div>

					<div class="instructions">
						<h3>${t('horizontalKey.howToUse')}</h3>
						<ul>
							<li>${t('horizontalKey.instruction1')}</li>
							<li>${t('horizontalKey.instruction2')}</li>
							<li>${t('horizontalKey.instruction3')}</li>
							<li>${t('horizontalKey.instruction4')}</li>
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
			if (e.repeat) return;

			if (e.code === this.leftKeyCode) {
				e.preventDefault();
				this.handleLeftPaddlePress();
			} else if (e.code === this.rightKeyCode) {
				e.preventDefault();
				this.handleRightPaddlePress();
			}
		};

		this.keyReleaseHandler = (e: KeyboardEvent) => {
			if (e.code === this.leftKeyCode) {
				e.preventDefault();
				this.handleLeftPaddleRelease();
			} else if (e.code === this.rightKeyCode) {
				e.preventDefault();
				this.handleRightPaddleRelease();
			}
		};

		window.addEventListener('keydown', this.keyPressHandler);
		window.addEventListener('keyup', this.keyReleaseHandler);

		//! ボタンイベント（左パドル）。
		const leftPaddle = document.getElementById('left-paddle');
		if (leftPaddle) {
			leftPaddle.addEventListener('mousedown', (e) => {
				e.preventDefault();
				this.handleLeftPaddlePress();
			});
			leftPaddle.addEventListener('mouseup', (e) => {
				e.preventDefault();
				this.handleLeftPaddleRelease();
			});
			leftPaddle.addEventListener('mouseleave', () => {
				if (this.leftPressed) this.handleLeftPaddleRelease();
			});
			leftPaddle.addEventListener('touchstart', (e) => {
				e.preventDefault();
				this.handleLeftPaddlePress();
			});
			leftPaddle.addEventListener('touchend', (e) => {
				e.preventDefault();
				this.handleLeftPaddleRelease();
			});
			leftPaddle.addEventListener('touchcancel', () => {
				if (this.leftPressed) this.handleLeftPaddleRelease();
			});
		}

		//! ボタンイベント（右パドル）。
		const rightPaddle = document.getElementById('right-paddle');
		if (rightPaddle) {
			rightPaddle.addEventListener('mousedown', (e) => {
				e.preventDefault();
				this.handleRightPaddlePress();
			});
			rightPaddle.addEventListener('mouseup', (e) => {
				e.preventDefault();
				this.handleRightPaddleRelease();
			});
			rightPaddle.addEventListener('mouseleave', () => {
				if (this.rightPressed) this.handleRightPaddleRelease();
			});
			rightPaddle.addEventListener('touchstart', (e) => {
				e.preventDefault();
				this.handleRightPaddlePress();
			});
			rightPaddle.addEventListener('touchend', (e) => {
				e.preventDefault();
				this.handleRightPaddleRelease();
			});
			rightPaddle.addEventListener('touchcancel', () => {
				if (this.rightPressed) this.handleRightPaddleRelease();
			});
		}

		//! LanguageSwitcherのイベントリスナーを設定。
		const languageSwitcherContainer = document.getElementById('languageSwitcherContainer');
		if (languageSwitcherContainer) {
			this.languageSwitcher.attachEventListeners(languageSwitcherContainer);
		}
	}

	/**
	 * 左パドル押下処理
	 */
	private handleLeftPaddlePress(): void {
		if (this.leftPressed) return;
		this.leftPressed = true;
		this.trainer.leftPaddlePress();

		const leftPaddle = document.getElementById('left-paddle');
		if (leftPaddle) leftPaddle.classList.add('pressed');
	}

	/**
	 * 左パドル解放処理
	 */
	private handleLeftPaddleRelease(): void {
		if (!this.leftPressed) return;
		this.leftPressed = false;
		this.trainer.leftPaddleRelease();

		const leftPaddle = document.getElementById('left-paddle');
		if (leftPaddle) leftPaddle.classList.remove('pressed');
	}

	/**
	 * 右パドル押下処理
	 */
	private handleRightPaddlePress(): void {
		if (this.rightPressed) return;
		this.rightPressed = true;
		this.trainer.rightPaddlePress();

		const rightPaddle = document.getElementById('right-paddle');
		if (rightPaddle) rightPaddle.classList.add('pressed');
	}

	/**
	 * 右パドル解放処理
	 */
	private handleRightPaddleRelease(): void {
		if (!this.rightPressed) return;
		this.rightPressed = false;
		this.trainer.rightPaddleRelease();

		const rightPaddle = document.getElementById('right-paddle');
		if (rightPaddle) rightPaddle.classList.remove('pressed');
	}

	/**
	 * パドルラベルを更新する
	 */
	private updatePaddleLabels(): void {
		const leftPaddle = document.getElementById('left-paddle');
		const rightPaddle = document.getElementById('right-paddle');

		if (this.paddleLayout === 'normal') {
			if (leftPaddle) {
				leftPaddle.className = 'paddle-button dit';
				leftPaddle.innerHTML = `
					${t('horizontalKey.dit')}
					<span class="paddle-label">${t('horizontalKey.ditLabel')}</span>
					<span class="paddle-key">${t('horizontalKey.jKey')}</span>
				`;
			}
			if (rightPaddle) {
				rightPaddle.className = 'paddle-button dah';
				rightPaddle.innerHTML = `
					${t('horizontalKey.dah')}
					<span class="paddle-label">${t('horizontalKey.dahLabel')}</span>
					<span class="paddle-key">${t('horizontalKey.kKey')}</span>
				`;
			}
		} else {
			if (leftPaddle) {
				leftPaddle.className = 'paddle-button dah';
				leftPaddle.innerHTML = `
					${t('horizontalKey.dah')}
					<span class="paddle-label">${t('horizontalKey.dahLabel')}</span>
					<span class="paddle-key">${t('horizontalKey.jKey')}</span>
				`;
			}
			if (rightPaddle) {
				rightPaddle.className = 'paddle-button dit';
				rightPaddle.innerHTML = `
					${t('horizontalKey.dit')}
					<span class="paddle-label">${t('horizontalKey.ditLabel')}</span>
					<span class="paddle-key">${t('horizontalKey.kKey')}</span>
				`;
			}
		}

		//! イベントリスナーを再設定。
		this.attachEventListeners();
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
			morseBuffer.textContent = fullDisplay || t('horizontalKey.morseBufferPlaceholder');
		}

		if (decodedText) {
			const text = this.trainer.getDecoded();
			decodedText.textContent = text || t('horizontalKey.decodedTextPlaceholder');
		}

		if (charCount) {
			const text = this.trainer.getDecoded();
			charCount.textContent = text.length.toString();
		}

		//! スペーシング評価統計を更新。
		const stats = this.trainer.getSpacingStatistics();
		const spacingStats = this.trainer.getStatisticsBySpacingType();

		const avgAccuracyEl = document.getElementById('timing-avg-accuracy');
		const avgErrorEl = document.getElementById('timing-avg-error');
		const countEl = document.getElementById('timing-count');

		if (avgAccuracyEl) {
			avgAccuracyEl.textContent = stats.count > 0
				? `${stats.averageAccuracy.toFixed(1)} ± ${stats.standardDeviation.toFixed(1)}%`
				: '--%';
		}

		if (avgErrorEl) {
			avgErrorEl.textContent = stats.count > 0
				? `${Math.round(stats.averageAbsoluteError)}ms`
				: '--ms';
		}

		if (countEl) {
			countEl.textContent = stats.count.toString();
		}

		//! 文字間スペース統計。
		const charExpectedEl = document.getElementById('timing-char-expected');
		const charAccuracyEl = document.getElementById('timing-char-accuracy');
		const charErrorEl = document.getElementById('timing-char-error');
		const charCountEl = document.getElementById('timing-char-count');

		if (charExpectedEl) {
			charExpectedEl.textContent = `${Math.round(this.timings.charGap)}ms`;
		}

		if (charAccuracyEl) {
			charAccuracyEl.textContent = spacingStats.character.count > 0
				? `${spacingStats.character.averageAccuracy.toFixed(1)} ± ${spacingStats.character.standardDeviation.toFixed(1)}%`
				: '--%';
		}

		if (charErrorEl) {
			charErrorEl.textContent = spacingStats.character.count > 0
				? `${Math.round(spacingStats.character.averageAbsoluteError)}ms`
				: '--ms';
		}

		if (charCountEl) {
			charCountEl.textContent = spacingStats.character.count.toString();
		}

		//! 単語間スペース統計。
		const wordExpectedEl = document.getElementById('timing-word-expected');
		const wordAccuracyEl = document.getElementById('timing-word-accuracy');
		const wordErrorEl = document.getElementById('timing-word-error');
		const wordCountEl = document.getElementById('timing-word-count');

		if (wordExpectedEl) {
			wordExpectedEl.textContent = `${Math.round(this.timings.wordGap)}ms`;
		}

		if (wordAccuracyEl) {
			wordAccuracyEl.textContent = spacingStats.word.count > 0
				? `${spacingStats.word.averageAccuracy.toFixed(1)} ± ${spacingStats.word.standardDeviation.toFixed(1)}%`
				: '--%';
		}

		if (wordErrorEl) {
			wordErrorEl.textContent = spacingStats.word.count > 0
				? `${Math.round(spacingStats.word.averageAbsoluteError)}ms`
				: '--ms';
		}

		if (wordCountEl) {
			wordCountEl.textContent = spacingStats.word.count.toString();
		}

		//! タイミング図を更新。
		this.updateTimingDiagram();
	}

	/**
	 * タイミング図を更新する
	 */
	private updateTimingDiagram(): void {
		const wordData = this.trainer.getLastWordTimingData();
		const container = document.getElementById('timing-diagram-content');

		if (!container) return;

		if (!wordData) {
			container.innerHTML = t('horizontalKey.timingDiagramPlaceholder');
			return;
		}

		//! タイミング図HTMLを生成。
		const html = this.generateTimingDiagramHTML(wordData);
		container.innerHTML = html;
	}

	/**
	 * タイミング図のHTMLを生成する
	 */
	private generateTimingDiagramHTML(wordData: WordTimingData): string {
		//! タイミングチャート（PlantUML風）を生成。
		const timingChart = this.generateTimingChart(wordData);

		return `
			<div class="timing-diagram-header">
				<span class="timing-diagram-char">${wordData.decodedChar}</span>
				<span class="timing-diagram-morse">${wordData.morseCode}</span>
			</div>
			${timingChart}
		`;
	}

	/**
	 * タイミングチャート（PlantUML風）を生成する
	 */
	private generateTimingChart(wordData: WordTimingData): string {
		if (wordData.paddleInputs.length === 0) {
			return `<div class="timing-chart-empty">${t('horizontalKey.noPaddleInputData')}</div>`;
		}

		//! パドル入力イベントを時刻順にソート。
		const sortedPaddleInputs = [...wordData.paddleInputs].sort((a, b) => a.timestamp - b.timestamp);

		//! 時間範囲を決定（最初のイベントから最後のイベントまで）。
		const allTimestamps = [
			...sortedPaddleInputs.map(e => e.timestamp),
			...wordData.elements.map(e => e.startTime),
			...wordData.elements.map(e => e.endTime),
			...wordData.squeezeIntervals.flatMap(s => [s.startTime, s.endTime])
		];
		const startTime = Math.min(...allTimestamps);
		const endTime = Math.max(...allTimestamps);
		const totalTime = endTime - startTime;

		//! 3本の信号ラインを生成。
		const ditInputLine = this.generatePaddleSignalLine('left', wordData, startTime, totalTime);
		const dahInputLine = this.generatePaddleSignalLine('right', wordData, startTime, totalTime);
		const outputLine = this.generateOutputSignalLine(wordData, startTime, totalTime);

		//! スクイーズ区間のハイライトを生成。
		const squeezeHighlights = wordData.squeezeIntervals.map(interval => {
			const offsetPercent = ((interval.startTime - startTime) / totalTime) * 100;
			const widthPercent = ((interval.endTime - interval.startTime) / totalTime) * 100;
			return `<div class="squeeze-highlight" style="left: ${offsetPercent}%; width: ${widthPercent}%"></div>`;
		}).join('');

		//! パドル入力がない期間（両方のパドルが解放されている期間）を抽出。
		const paddleGaps: { startTime: number; endTime: number }[] = [];
		let leftDown = false;
		let rightDown = false;
		let gapStartTime: number | null = null;

		for (const event of sortedPaddleInputs) {
			const prevBothReleased = !leftDown && !rightDown;

			if (event.paddle === 'left') {
				leftDown = (event.state === 'press');
			} else {
				rightDown = (event.state === 'press');
			}

			const currentBothReleased = !leftDown && !rightDown;

			if (prevBothReleased && !currentBothReleased) {
				//! ギャップ終了（どちらかのパドルが押された）。
				if (gapStartTime !== null) {
					paddleGaps.push({
						startTime: gapStartTime,
						endTime: event.timestamp
					});
					gapStartTime = null;
				}
			} else if (!prevBothReleased && currentBothReleased) {
				//! ギャップ開始（両方のパドルが解放された）。
				gapStartTime = event.timestamp;
			}
		}

		//! ギャップのハイライトを生成。
		const gapHighlights = paddleGaps.map(gap => {
			const offsetPercent = ((gap.startTime - startTime) / totalTime) * 100;
			const widthPercent = ((gap.endTime - gap.startTime) / totalTime) * 100;
			return `<div class="gap-highlight" style="left: ${offsetPercent}%; width: ${widthPercent}%"></div>`;
		}).join('');

		//! 時間軸を生成。
		const timeAxis = this.generateTimeAxis(totalTime);

		//! デバッグ情報を生成。
		const debugInfo = this.generateDebugInfo(wordData, startTime, paddleGaps);

		return `
			<div class="timing-chart-section">
				<h4>${t('horizontalKey.timingDiagram')}</h4>
				<div class="timing-chart-container">
					<div class="timing-chart-signals">
						<div class="squeeze-highlights-layer">
							${squeezeHighlights}
							${gapHighlights}
						</div>
						${ditInputLine}
						${dahInputLine}
						${outputLine}
					</div>
					<div class="timing-chart-axis">${timeAxis}</div>
				</div>
				${debugInfo}
			</div>
		`;
	}

	/**
	 * パドル信号ラインを生成する
	 */
	private generatePaddleSignalLine(
		paddle: 'left' | 'right',
		wordData: WordTimingData,
		startTime: number,
		totalTime: number
	): string {
		const label = paddle === 'left' ? t('horizontalKey.ditInput') : t('horizontalKey.dahInput');
		//! 該当パドルのイベントを抽出して時刻順にソート。
		const events = wordData.paddleInputs
			.filter(e => e.paddle === paddle)
			.sort((a, b) => a.timestamp - b.timestamp);

		//! 信号の状態変化を時系列で追跡。
		let isHigh = false;
		const segments: { start: number; end: number; high: boolean }[] = [];
		let lastTime = startTime;

		for (const event of events) {
			if (event.timestamp > lastTime) {
				segments.push({
					start: lastTime,
					end: event.timestamp,
					high: isHigh,
				});
			}
			isHigh = (event.state === 'press');
			lastTime = event.timestamp;
		}

		// 最後のセグメント
		segments.push({
			start: lastTime,
			end: startTime + totalTime,
			high: isHigh,
		});

		//! セグメントをHTMLに変換。
		const segmentsHTML = segments.map(seg => {
			const offsetPercent = ((seg.start - startTime) / totalTime) * 100;
			const widthPercent = ((seg.end - seg.start) / totalTime) * 100;
			const heightClass = seg.high ? 'signal-high' : 'signal-low';
			return `<div class="signal-segment ${heightClass}" style="left: ${offsetPercent}%; width: ${widthPercent}%"></div>`;
		}).join('');

		return `
			<div class="timing-chart-signal">
				<div class="signal-label">${label}</div>
				<div class="signal-timeline">${segmentsHTML}</div>
			</div>
		`;
	}

	/**
	 * 出力信号ラインを生成する
	 */
	private generateOutputSignalLine(
		wordData: WordTimingData,
		startTime: number,
		totalTime: number
	): string {
		//! 要素の送信期間をセグメントとして生成（時刻順にソート）。
		const segments: { start: number; end: number; element: '.' | '-' }[] = [];

		for (const element of wordData.elements) {
			segments.push({
				start: element.startTime,
				end: element.endTime,
				element: element.element,
			});
		}

		//! 開始時刻順にソート。
		segments.sort((a, b) => a.start - b.start);

		//! セグメントをHTMLに変換。
		let lastEnd = startTime;
		const segmentsHTML: string[] = [];

		for (const seg of segments) {
			// ギャップ（Low）
			if (seg.start > lastEnd) {
				const offsetPercent = ((lastEnd - startTime) / totalTime) * 100;
				const widthPercent = ((seg.start - lastEnd) / totalTime) * 100;
				segmentsHTML.push(
					`<div class="signal-segment signal-low" style="left: ${offsetPercent}%; width: ${widthPercent}%"></div>`
				);
			}

			// 要素（High）
			const offsetPercent = ((seg.start - startTime) / totalTime) * 100;
			const widthPercent = ((seg.end - seg.start) / totalTime) * 100;
			const elementClass = seg.element === '.' ? 'output-dit' : 'output-dah';
			segmentsHTML.push(
				`<div class="signal-segment signal-high ${elementClass}" style="left: ${offsetPercent}%; width: ${widthPercent}%">
					<span class="element-label">${seg.element}</span>
				</div>`
			);

			lastEnd = seg.end;
		}

		// 最後のギャップ
		if (lastEnd < startTime + totalTime) {
			const offsetPercent = ((lastEnd - startTime) / totalTime) * 100;
			const widthPercent = ((startTime + totalTime - lastEnd) / totalTime) * 100;
			segmentsHTML.push(
				`<div class="signal-segment signal-low" style="left: ${offsetPercent}%; width: ${widthPercent}%"></div>`
			);
		}

		return `
			<div class="timing-chart-signal">
				<div class="signal-label">${t('horizontalKey.output')}</div>
				<div class="signal-timeline">${segmentsHTML.join('')}</div>
			</div>
		`;
	}

	/**
	 * 時間軸を生成する
	 */
	private generateTimeAxis(totalTime: number): string {
		const step = totalTime / 4;
		return `
			<span class="axis-tick" style="left: 0%">0ms</span>
			<span class="axis-tick" style="left: 25%">${Math.round(step)}ms</span>
			<span class="axis-tick" style="left: 50%">${Math.round(step * 2)}ms</span>
			<span class="axis-tick" style="left: 75%">${Math.round(step * 3)}ms</span>
			<span class="axis-tick" style="left: 100%">${Math.round(totalTime)}ms</span>
		`;
	}

	/**
	 * デバッグ情報を生成する
	 */
	private generateDebugInfo(
		wordData: WordTimingData,
		startTime: number,
		paddleGaps: { startTime: number; endTime: number }[]
	): string {
		//! パドル入力イベントをソートして整理。
		const sortedInputs = [...wordData.paddleInputs].sort((a, b) => a.timestamp - b.timestamp);

		//! イベントリストを生成。
		const eventLines = sortedInputs.map(event => {
			const relativeTime = event.timestamp - startTime;
			const paddleLabel = event.paddle === 'left' ? 'Dit' : 'Dash';
			const stateLabel = event.state === 'press' ? t('horizontalKey.press') : t('horizontalKey.release');
			return `${relativeTime.toFixed(0)}ms: ${paddleLabel}${stateLabel}`;
		});

		//! スクイーズ区間リストを生成。
		const squeezeLines = wordData.squeezeIntervals.map(interval => {
			const startRelative = interval.startTime - startTime;
			const endRelative = interval.endTime - startTime;
			const duration = interval.endTime - interval.startTime;
			return `${t('horizontalKey.squeezeOn')}: ${startRelative.toFixed(0)}ms, ${t('horizontalKey.squeezeOff')}: ${endRelative.toFixed(0)}ms (${duration.toFixed(0)}ms)`;
		});

		//! 無入力期間（ギャップ）リストを生成。
		const gapLines = paddleGaps.map(gap => {
			const startRelative = gap.startTime - startTime;
			const endRelative = gap.endTime - startTime;
			const duration = gap.endTime - gap.startTime;
			return `${t('horizontalKey.gapOn')}: ${startRelative.toFixed(0)}ms, ${t('horizontalKey.gapOff')}: ${endRelative.toFixed(0)}ms (${duration.toFixed(0)}ms)`;
		});

		return `
			<div class="timing-debug-info">
				<div class="debug-section">
					<h5>${t('horizontalKey.paddleInput')} (${t('horizontalKey.relativeTime')})</h5>
					<div class="debug-events">
						${eventLines.length > 0 ? eventLines.join('<br>') : t('horizontalKey.noEvent')}
					</div>
				</div>
				<div class="debug-section">
					<h5>${t('horizontalKey.squeezeZone')}</h5>
					<div class="debug-squeezes">
						${squeezeLines.length > 0 ? squeezeLines.join('<br>') : t('horizontalKey.noSqueeze')}
					</div>
				</div>
				<div class="debug-section">
					<h5>${t('horizontalKey.gapZone')}</h5>
					<div class="debug-gaps">
						${gapLines.length > 0 ? gapLines.join('<br>') : t('horizontalKey.noGap')}
					</div>
				</div>
			</div>
		`;
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
			iambicMode: this.iambicMode,
			paddleLayout: this.paddleLayout,
			leftKeyCode: this.leftKeyCode,
			rightKeyCode: this.rightKeyCode
		};

		//! 設定変更前の値を保存（キャンセル時の復元用）。
		const savedSettings = {
			volume: this.audio.getVolume(),
			frequency: this.audio.getFrequency(),
			wpm: this.currentWPM,
			iambicMode: this.iambicMode,
			paddleLayout: this.paddleLayout,
			leftKeyCode: this.leftKeyCode,
			rightKeyCode: this.rightKeyCode
		};

		//! SettingsModalを作成。
		const modal = new SettingsModal(
			'horizontal-key-settings-modal',
			localizeSettingItems(ALL_SETTING_ITEMS),
			currentValues,
			{
				onSave: (values: SettingValues) => {
					//! 設定を保存。
					this.audio.setVolume((values.volume as number) / 100);
					this.audio.setFrequency(values.frequency as number);
					this.audio.setWPM(values.wpm as number);
					this.currentWPM = values.wpm as number;
					this.iambicMode = values.iambicMode as IambicMode;
					this.paddleLayout = values.paddleLayout as PaddleLayout;
					this.leftKeyCode = values.leftKeyCode as string;
					this.rightKeyCode = values.rightKeyCode as string;

					//! localStorageに保存。
					localStorage.setItem('horizontalKeyWPM', this.currentWPM.toString());
					localStorage.setItem('horizontalKeyIambicMode', this.iambicMode);
					localStorage.setItem('horizontalKeyPaddleLayout', this.paddleLayout);
					localStorage.setItem('horizontalKeyLeftCode', this.leftKeyCode);
					localStorage.setItem('horizontalKeyRightCode', this.rightKeyCode);

					//! 現在のWPM表示を更新。
					const currentWpmDisplay = document.getElementById('current-wpm');
					if (currentWpmDisplay) currentWpmDisplay.textContent = this.currentWPM.toString();

					//! 現在のIambicモード表示を更新。
					const currentIambicModeDisplay = document.getElementById('current-iambic-mode');
					if (currentIambicModeDisplay) currentIambicModeDisplay.textContent = this.iambicMode;

					//! パドルレイアウトに応じてラベルを更新。
					this.updatePaddleLabels();

					//! トレーナーを再初期化。
					this.initializeTrainer();
				},
				onCancel: () => {
					//! 設定を元に戻す。
					this.audio.setVolume(savedSettings.volume);
					this.audio.setFrequency(savedSettings.frequency);
					this.audio.setWPM(savedSettings.wpm);
					this.currentWPM = savedSettings.wpm;
					this.iambicMode = savedSettings.iambicMode;
					this.paddleLayout = savedSettings.paddleLayout;
					this.leftKeyCode = savedSettings.leftKeyCode;
					this.rightKeyCode = savedSettings.rightKeyCode;
				}
			},
			getSettingsModalTexts()
		);

		//! モーダルを表示。
		modal.show('horizontal-key');
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

		//! トレーナーをクリア。
		this.trainer.clear();
	}
}
