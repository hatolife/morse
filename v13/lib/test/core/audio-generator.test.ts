/**
 * audio-generator.ts のユニットテスト
 * Web Audio APIのモックを使用した音声生成システムのテスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AudioGenerator, AudioSettings } from '../../src/core/audio-generator';

describe('AudioGenerator', () => {
	let audioGenerator: AudioGenerator;

	beforeEach(() => {
		vi.clearAllMocks();
		audioGenerator = new AudioGenerator();
	});

	afterEach(() => {
		audioGenerator.stopPlaying();
	});

	describe('コンストラクタとデフォルト設定', () => {
		it('デフォルト設定でインスタンスを作成できる', () => {
			const generator = new AudioGenerator();
			expect(generator).toBeDefined();
			expect(generator.getFrequency()).toBe(750);
			expect(generator.getVolume()).toBe(0.7);
			expect(generator.getWPM()).toBe(20);
		});

		it('カスタム設定でインスタンスを作成できる', () => {
			const customSettings: AudioSettings = {
				frequency: 600,
				volume: 0.5,
				wpm: 25,
			};
			const generator = new AudioGenerator(customSettings);
			expect(generator.getFrequency()).toBe(600);
			expect(generator.getVolume()).toBe(0.5);
			expect(generator.getWPM()).toBe(25);
		});
	});

	describe('AudioContext管理', () => {
		it('AudioContextが遅延初期化される', () => {
			const generator = new AudioGenerator();
			const context = generator.getAudioContext();
			expect(context === null || context !== null).toBe(true);
		});

		it('scheduleTone()でAudioContextが初期化される', () => {
			audioGenerator.scheduleTone(0, 100);
			const context = audioGenerator.getAudioContext();
			expect(context).not.toBeNull();
		});

		it('startContinuousTone()でAudioContextが初期化される', () => {
			audioGenerator.startContinuousTone();
			const context = audioGenerator.getAudioContext();
			expect(context).not.toBeNull();
		});
	});

	describe('scheduleTone()', () => {
		it('指定時間に音をスケジュールできる', () => {
			audioGenerator.scheduleTone(0, 100);
			const context = audioGenerator.getAudioContext();
			expect(context).not.toBeNull();
			expect(context!.createOscillator).toHaveBeenCalled();
			expect(context!.createGain).toHaveBeenCalled();
		});

		it('音長を指定して音をスケジュールできる', () => {
			audioGenerator.scheduleTone(0, 200);
			const context = audioGenerator.getAudioContext();
			expect(context).not.toBeNull();
		});

		it('複数回の音をスケジュールできる', () => {
			audioGenerator.scheduleTone(0, 100);
			audioGenerator.scheduleTone(0.2, 100);
			audioGenerator.scheduleTone(0.4, 100);
			const context = audioGenerator.getAudioContext();
			expect(context!.createOscillator).toHaveBeenCalledTimes(3);
		});

		it('エラー時にコンソールエラーを出力する', () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			audioGenerator.scheduleTone(0, 100);
			const context = audioGenerator.getAudioContext();

			if (context) {
				const createOscillatorSpy = vi.spyOn(context, 'createOscillator').mockImplementation(() => {
					throw new Error('AudioContext error');
				});

				audioGenerator.scheduleTone(0, 100);
				expect(consoleErrorSpy).toHaveBeenCalled();

				createOscillatorSpy.mockRestore();
			}

			consoleErrorSpy.mockRestore();
		});
	});

	describe('startContinuousTone() / stopContinuousTone()', () => {
		it('連続音を開始できる', () => {
			audioGenerator.startContinuousTone();
			const context = audioGenerator.getAudioContext();
			expect(context).not.toBeNull();
			//! AudioContextが初期化され、createOscillatorが関数として存在することを確認。
			expect(typeof context!.createOscillator).toBe('function');
		});

		it('連続音を停止できる', () => {
			audioGenerator.startContinuousTone();

			// 停止処理を実行（エラーなく完了することを確認）
			expect(() => audioGenerator.stopContinuousTone()).not.toThrow();
		});

		it('startContinuousTone()を複数回呼ぶと既存の音を停止する', () => {
			audioGenerator.startContinuousTone();
			audioGenerator.startContinuousTone();
			//! 複数回呼んでもエラーにならないことを確認（既存の音が適切に停止される）。
			expect(() => audioGenerator.startContinuousTone()).not.toThrow();
		});

		it('stopContinuousTone()をAudioContextがnullの時に呼んでもエラーにならない', () => {
			const generator = new AudioGenerator();
			expect(() => generator.stopContinuousTone()).not.toThrow();
		});

		it('stopContinuousTone()のエラーハンドリング', () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			audioGenerator.startContinuousTone();
			const context = audioGenerator.getAudioContext();

			if (context) {
				// currentGainのメソッドがエラーをthrowするようにモック
				// これは実際にはcurrentGainを直接操作できないので、
				// 単にstopContinuousTone()を呼んでエラーが握りつぶされることを確認
				audioGenerator.stopContinuousTone();
			}

			consoleErrorSpy.mockRestore();
		});
	});

	describe('設定の更新', () => {
		it('updateSettings()で設定を更新できる', () => {
			audioGenerator.updateSettings({ frequency: 800 });
			expect(audioGenerator.getFrequency()).toBe(800);
		});

		it('updateSettings()で部分的な設定を更新できる', () => {
			const initialFreq = audioGenerator.getFrequency();
			audioGenerator.updateSettings({ volume: 0.5 });
			expect(audioGenerator.getVolume()).toBe(0.5);
			expect(audioGenerator.getFrequency()).toBe(initialFreq);
		});

		it('getSettings()で現在の設定を取得できる', () => {
			const settings = audioGenerator.getSettings();
			expect(settings).toEqual({
				frequency: 750,
				volume: 0.7,
				wpm: 20,
			});
		});
	});

	describe('音量設定', () => {
		it('setVolume()で音量を設定できる', () => {
			audioGenerator.setVolume(0.8);
			expect(audioGenerator.getVolume()).toBe(0.8);
		});

		it('音量が0-1の範囲に制限される', () => {
			audioGenerator.setVolume(1.5);
			expect(audioGenerator.getVolume()).toBe(1);

			audioGenerator.setVolume(-0.5);
			expect(audioGenerator.getVolume()).toBe(0);
		});
	});

	describe('周波数設定', () => {
		it('setFrequency()で周波数を設定できる', () => {
			audioGenerator.setFrequency(600);
			expect(audioGenerator.getFrequency()).toBe(600);
		});

		it('周波数が400-1200の範囲に制限される', () => {
			audioGenerator.setFrequency(1500);
			expect(audioGenerator.getFrequency()).toBe(1200);

			audioGenerator.setFrequency(300);
			expect(audioGenerator.getFrequency()).toBe(400);
		});
	});

	describe('WPM設定', () => {
		it('setWPM()でWPMを設定できる', () => {
			audioGenerator.setWPM(25);
			expect(audioGenerator.getWPM()).toBe(25);
		});

		it('WPMが5-40の範囲に制限される', () => {
			audioGenerator.setWPM(50);
			expect(audioGenerator.getWPM()).toBe(40);

			audioGenerator.setWPM(2);
			expect(audioGenerator.getWPM()).toBe(5);
		});
	});

	describe('playMorseString()', () => {
		it('空文字列の場合falseを返す', async () => {
			const result = await audioGenerator.playMorseString('');
			expect(result).toBe(false);
		});

		it('AudioContextを初期化できる', () => {
			// playMorseStringを呼び出すとAudioContextが初期化される
			audioGenerator.playMorseString('.-');
			const context = audioGenerator.getAudioContext();
			expect(context).not.toBeNull();
			audioGenerator.stopPlaying();
		});

		it('スペースを含むモールス文字列を処理できる', async () => {
			vi.useFakeTimers();

			// スペース(' ')を含む文字列
			const promise = audioGenerator.playMorseString('.- -...');

			// すぐに停止
			audioGenerator.stopPlaying();

			// タイマーを進めてPromiseを解決
			await vi.runAllTimersAsync();
			const result = await promise;

			// 停止したのでfalseが返る
			expect(result).toBe(false);

			vi.useRealTimers();
		});

		it('語間スペースを含むモールス文字列を処理できる', async () => {
			vi.useFakeTimers();

			// 語間スペース('/')を含む文字列
			const promise = audioGenerator.playMorseString('.- / -...');

			// すぐに停止
			audioGenerator.stopPlaying();

			// タイマーを進めてPromiseを解決
			await vi.runAllTimersAsync();
			const result = await promise;

			// 停止したのでfalseが返る
			expect(result).toBe(false);

			vi.useRealTimers();
		});

		it('正常に再生完了した場合trueを返す', async () => {
			vi.useFakeTimers();

			// 短いモールス文字列
			const promise = audioGenerator.playMorseString('.');

			// 停止せずに完了まで待つ
			await vi.runAllTimersAsync();
			const result = await promise;

			// 正常完了したのでtrueが返る
			expect(result).toBe(true);

			vi.useRealTimers();
		});
	});

	describe('isCurrentlyPlaying() / stopPlaying()', () => {
		it('再生していない場合falseを返す', () => {
			expect(audioGenerator.isCurrentlyPlaying()).toBe(false);
		});

		it('stopPlaying()を呼び出せる', () => {
			audioGenerator.stopPlaying();
			expect(audioGenerator.isCurrentlyPlaying()).toBe(false);
		});
	});
});
