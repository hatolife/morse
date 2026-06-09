/**
 * morse-engine - モールス信号エンジンライブラリ
 *
 * UI非依存のモールス信号処理エンジン
 * 各種モールス信号練習機能のコアロジックを提供
 *
 * @packageDocumentation
 */

// コアモジュール
export { MorseCodec } from './core/morse-codec';
export { TimingCalculator } from './core/timing';
export type { MorseTimings, TimingOptions } from './core/timing';
export { TimingEvaluator } from './core/timing-evaluator';
export type {
	TimingRecord,
	TimingEvaluation,
	TimingStatistics,
} from './core/timing-evaluator';
export { MorseBuffer } from './core/buffer';
export { TimerManager } from './core/timer';
export type { TimerCallback } from './core/timer';
export { AudioGenerator } from './core/audio-generator';
export type { AudioSettings } from './core/audio-generator';

// トレーナーモジュール
export { VerticalKeyTrainer } from './trainers/vertical-key';
export type { VerticalKeyCallbacks } from './trainers/vertical-key';
export { HorizontalKeyTrainer } from './trainers/horizontal-key';
export type {
	HorizontalKeyCallbacks,
	HorizontalKeySettings,
	IambicMode,
	PaddleLayout,
	WordTimingData,
	ElementTimingRecord,
	GapTimingRecord,
	PaddleInputEvent,
	SqueezeInterval,
} from './trainers/horizontal-key';
export { KochTrainer, KOCH_SEQUENCE } from './trainers/koch-trainer';
export type { PracticeSettings } from './trainers/koch-trainer';
export { ListeningTrainer } from './trainers/listening-trainer';
export type { ListeningTemplate, TemplateCategory } from './trainers/listening-trainer';
export { FlashcardTrainer } from './trainers/flashcard-trainer';
export type {
	FlashcardEntry,
	QuestionType,
	ExamQuestion,
	ExamResult,
	ScoreInfo,
} from './trainers/flashcard-trainer';
export { FlashcardState } from './trainers/flashcard-state';
export type {
	ViewMode,
	DisplayMode,
	SortColumn,
	SortDirection,
	LearnQuestionType,
	Progress,
	FilterState,
	ViewState,
} from './trainers/flashcard-state';
export { MorseCardTrainer } from './trainers/morse-card-trainer';
export type {
	MorseCardCategory,
	MorseCardQuestionType,
	MorseCardEntry,
	MorseCardQuestion,
	MorseCardExamResult,
	MorseCardScoreInfo,
	MorseCardSortColumn,
	MorseCardSortDirection,
} from './trainers/morse-card-trainer';
export { MorseCardState } from './trainers/morse-card-state';
export type {
	MorseCardViewMode,
	MorseCardDisplayMode,
	MorseCardProgress,
	MorseCardFilterState,
	MorseCardViewState,
} from './trainers/morse-card-state';

// UIモジュール
export { SettingsModal, ALL_SETTING_ITEMS } from './ui/settings-modal';
export type {
	ScreenType,
	SettingInputType,
	SettingItemDef,
	SettingValues,
	SettingsModalCallbacks,
	SettingsModalTexts,
} from './ui/settings-modal';
