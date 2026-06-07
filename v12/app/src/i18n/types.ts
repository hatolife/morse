/**
 * i18n型定義
 */

/**
 * サポートされている言語
 */
export type Language = 'ja' | 'en' | 'zh-CN' | 'zh-TW' | 'ko';

/**
 * 翻訳データの型
 */
export interface Translations {
	common: {
		appName: string;
		version: string;
		backToMenu: string;
		settings: string;
		start: string;
		stop: string;
		reset: string;
		download: string;
		language: string;
		close: string;
		save: string;
		cancel: string;
		copyright: string;
	};
	menu: {
		title: string;
		subtitle: string;
		items: {
			vertical: {
				title: string;
				description: string;
			};
			horizontal: {
				title: string;
				description: string;
			};
			flashcard: {
				title: string;
				description: string;
			};
			koch: {
				title: string;
				description: string;
			};
			listening: {
				title: string;
				description: string;
			};
		};
	};
	verticalKey: {
		title: string;
		instructions: string;
		keyLabel: string;
		morseSignal: string;
		morseBufferPlaceholder: string;
		decodedResult: string;
		decodedTextPlaceholder: string;
		currentSpeed: string;
		keyState: string;
		released: string;
		pressed: string;
		charCount: string;
		timingEvaluation: string;
		latestInput: string;
		waitingForInput: string;
		overallStats: string;
		noStatsData: string;
		ditStats: string;
		dahStats: string;
		dit: string;
		dah: string;
		noData: string;
		howToUse: string;
		instruction1: string;
		instruction2: string;
		instruction3: string;
		instruction4: string;
		instruction5: string;
		instruction6: string;
		element: string;
		expected: string;
		actual: string;
		accuracy: string;
		error: string;
		longer: string;
		shorter: string;
		perfect: string;
		avgAccuracy: string;
		maxAccuracy: string;
		minAccuracy: string;
		avgError: string;
		count: string;
		avgDuration: string;
		inputCount: string;
		times: string;
	};
	horizontalKey: {
		title: string;
		instructions: string;
		leftPaddle: string;
		rightPaddle: string;
		dit: string;
		dah: string;
		ditLabel: string;
		dahLabel: string;
		jKey: string;
		kKey: string;
		morseSignal: string;
		morseBufferPlaceholder: string;
		decodedResult: string;
		decodedTextPlaceholder: string;
		clear: string;
		currentSpeed: string;
		iambicMode: string;
		charCount: string;
		timingDiagramTitle: string;
		timingDiagramPlaceholder: string;
		mode: string;
		modeA: string;
		modeB: string;
		spacingEvaluation: string;
		avgAccuracy: string;
		avgError: string;
		evaluationCount: string;
		charSpacing: string;
		wordSpacing: string;
		expected: string;
		accuracy: string;
		error: string;
		count: string;
		howToUse: string;
		instruction1: string;
		instruction2: string;
		instruction3: string;
		instruction4: string;
		timingDiagram: string;
		debugInfo: string;
		paddleInput: string;
		ditInput: string;
		dahInput: string;
		output: string;
		squeezeZone: string;
		gapZone: string;
		press: string;
		release: string;
		squeezeOn: string;
		squeezeOff: string;
		gapOn: string;
		gapOff: string;
		noPaddleInputData: string;
		noEvent: string;
		noSqueeze: string;
		noGap: string;
		relativeTime: string;
	};
	flashcard: {
		title: string;
		loading: string;
		loadError: string;
		error: string;
		tabs: {
			browse: string;
			learn: string;
			exam: string;
		};
		filter: {
			title: string;
			tagLabel: string;
			frequencyLabel: string;
			searchLabel: string;
			searchPlaceholder: string;
			filteredCount: string;
			totalCount: string;
			items: string;
		};
		browse: {
			entriesHeader: string;
			entriesCount: string;
			toggleList: string;
			toggleCard: string;
			examplePrefix: string;
			tableHeaders: {
				abbreviation: string;
				english: string;
				japanese: string;
				frequency: string;
				tags: string;
				description: string;
				example: string;
			};
			howToUse: string;
			instruction1: string;
			instruction2: string;
			instruction3: string;
			instruction4: string;
			instruction5: string;
			instruction6: string;
		};
		learn: {
			setupTitle: string;
			modeLabel: string;
			reviewMode: string;
			reviewModeCount: string;
			questionTypeLabel: string;
			questionTypes: {
				abbrToMeaning: string;
				meaningToAbbr: string;
				morseToAbbr: string;
				morseToMeaning: string;
			};
			availableCards: string;
			cardsUnit: string;
			startButton: string;
			clearProgressButton: string;
			backToSetup: string;
			progressIndicator: string;
			cardLabels: {
				abbreviation: string;
				meaning: string;
				morseToAbbrPrompt: string;
				morseToMeaningPrompt: string;
			};
			playMorseButton: string;
			flipToAnswer: string;
			flipToQuestion: string;
			spaceHint: string;
			judgmentButtons: {
				unknown: string;
				known: string;
			};
			navigation: {
				prev: string;
				next: string;
			};
			confirmReset: string;
			noCards: string;
			completed: string;
			howToUse: string;
			instruction1: string;
			instruction2: string;
			instruction3: string;
			instruction4: string;
			instruction5: string;
		};
		exam: {
			setupTitle: string;
			questionTypeLabel: string;
			questionTypes: {
				abbrToMeaning: string;
				meaningToAbbr: string;
				morseToAbbr: string;
				morseToMeaning: string;
			};
			questionCountLabel: string;
			questionCounts: {
				five: string;
				ten: string;
				twenty: string;
				fifty: string;
				all: string;
			};
			startButton: string;
			titleInProgress: string;
			interruptButton: string;
			questionProgress: string;
			questionTemplates: {
				abbrToMeaning: string;
				meaningToAbbr: string;
				morseToAbbr: string;
				morseToMeaning: string;
			};
			replayButton: string;
			confirmInterrupt: string;
			noEntries: string;
			invalidCount: string;
			howToUse: string;
			instruction1: string;
			instruction2: string;
			instruction3: string;
			instruction4: string;
			instruction5: string;
		};
		result: {
			title: string;
			passed: string;
			failed: string;
			scoreDetail: string;
			scoreUnit: string;
			wrongAnswersTitle: string;
			wrongAnswersCount: string;
			yourAnswer: string;
			correctAnswer: string;
			perfectScore: string;
			retryButton: string;
			backToSetupButton: string;
		};
	};
	koch: {
		title: string;
		tabs: {
			learning: string;
			custom: string;
		};
		learning: {
			lessonTitle: string;
			lessonProgress: string;
			learnedChars: string;
			startPractice: string;
			lessonListTitle: string;
			howToUse: string;
			instruction1: string;
			instruction2: string;
			instruction3: string;
		};
		custom: {
			title: string;
			selectPrompt: string;
			startPractice: string;
			howToUse: string;
			instruction1: string;
			instruction2: string;
			instruction3: string;
		};
		practice: {
			ready: string;
			progress: string;
			inputPlaceholder: string;
			customInputPlaceholder: string;
			showResult: string;
			playButton: string;
			pauseButton: string;
			stopButton: string;
		};
		keyboard: {
			header: string;
			space: string;
			backspace: string;
			groupLabel: string;
		};
		result: {
			passed: string;
			failed: string;
			accuracy: string;
			sent: string;
			input: string;
			noInput: string;
			nextLesson: string;
			retry: string;
			customTitle: string;
			yourInput: string;
			back: string;
		};
	};
	listening: {
		title: string;
		types: {
			qso: string;
			text: string;
			random: string;
		};
		generate: string;
		play: string;
		pause: string;
		stop: string;
		showText: string;
		hideText: string;
		downloadAudio: string;
		qsoType: {
			rubberStamp: string;
			random: string;
		};
		textType: {
			news: string;
			literature: string;
			technical: string;
		};
		categories: {
			qso: string;
			text100: string;
			text200: string;
			text300: string;
			custom: string;
		};
		templates: {
			randomQso: string;
			randomQsoDescription: string;
			qsoRubberstamp1: string;
			qsoShort1: string;
			qsoShort2: string;
			text1001: string;
			text1002: string;
			text1003: string;
			text2001: string;
			text2002: string;
			text3001: string;
			text3002: string;
		};
		customTemplate: {
			createTitle: string;
			editTitle: string;
			titleLabel: string;
			titlePlaceholder: string;
			contentLabel: string;
			contentPlaceholder: string;
			requiredAlert: string;
			deleteConfirm: string;
			empty: string;
			createButton: string;
			selectButton: string;
			editButton: string;
			deleteButton: string;
		};
		practice: {
			backToList: string;
			playTitle: string;
			pauseTitle: string;
			stopTitle: string;
			downloadTitle: string;
			inputLabel: string;
			inputPlaceholder: string;
			checkButton: string;
			showAnswer: string;
			hideAnswer: string;
			answerTitle: string;
			resultTitle: string;
			accuracy: string;
			correctText: string;
			inputText: string;
			noInput: string;
			normalView: string;
			dialogView: string;
			wavError: string;
		};
	};
	settings: {
		title: string;
		audio: {
			title: string;
			frequency: string;
			frequencyValue: string;
			volume: string;
			volumeValue: string;
			wpm: string;
			wpmValue: string;
			characterSpeed: string;
			effectiveSpeed: string;
			bFrequency: string;
			testPlay: string;
		};
		keybindings: {
			title: string;
			leftPaddle: string;
			rightPaddle: string;
			straightKey: string;
			pressKey: string;
			clickToSet: string;
			paddleLayout: string;
			paddleLayoutNormal: string;
			paddleLayoutReversed: string;
		};
		practice: {
			duration: string;
			groupSize: string;
			showInput: string;
		};
		display: {
			title: string;
			theme: string;
			fontSize: string;
			light: string;
			dark: string;
		};
		saveSuccess: string;
		resetToDefault: string;
	};
	errors: {
		audioContextFailed: string;
		fileLoadFailed: string;
		invalidInput: string;
		networkError: string;
		unknownError: string;
	};
}
