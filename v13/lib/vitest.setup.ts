/**
 * Vitestセットアップファイル
 * グローバルなモックの設定
 */

import { vi } from 'vitest';

// AudioContextのモック
// モックのファクトリー関数
const createMockOscillator = () => ({
	connect: vi.fn(),
	start: vi.fn(),
	stop: vi.fn(),
	disconnect: vi.fn(),
	frequency: { value: 0 },
	type: 'sine' as OscillatorType,
	onended: null
});

const createMockGainNode = () => ({
	connect: vi.fn(),
	disconnect: vi.fn(),
	gain: {
		value: 0.7,
		setValueAtTime: vi.fn(),
		linearRampToValueAtTime: vi.fn(),
		exponentialRampToValueAtTime: vi.fn(),
		setTargetAtTime: vi.fn(),
		setValueCurveAtTime: vi.fn(),
		cancelScheduledValues: vi.fn(),
		cancelAndHoldAtTime: vi.fn()
	}
});

const mockAudioContext = {
	createOscillator: vi.fn(() => createMockOscillator()),
	createGain: vi.fn(() => createMockGainNode()),
	destination: {},
	currentTime: 0,
	resume: vi.fn().mockResolvedValue(undefined),
	suspend: vi.fn().mockResolvedValue(undefined),
	close: vi.fn().mockResolvedValue(undefined),
	state: 'running' as AudioContextState,
	sampleRate: 44100,
	baseLatency: 0,
	outputLatency: 0,
	onstatechange: null
};

// AudioContextのグローバルモック
global.AudioContext = vi.fn(() => mockAudioContext) as any;
(global as any).webkitAudioContext = vi.fn(() => mockAudioContext);

// エクスポート（テストで使用するため）
export { mockAudioContext, mockOscillator, mockGainNode };
