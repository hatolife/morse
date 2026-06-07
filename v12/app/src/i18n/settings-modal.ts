import type { SettingItemDef, SettingsModalTexts } from 'morse-engine';
import { t } from './index';

const labelKeys: Record<string, string> = {
	volume: 'settings.audio.volume',
	frequency: 'settings.audio.frequency',
	wpm: 'settings.audio.wpm',
	characterSpeed: 'settings.audio.characterSpeed',
	effectiveSpeed: 'settings.audio.effectiveSpeed',
	bFrequency: 'settings.audio.bFrequency',
	testPlay: 'settings.audio.testPlay',
	practiceDuration: 'settings.practice.duration',
	groupSize: 'settings.practice.groupSize',
	showInput: 'settings.practice.showInput',
	iambicMode: 'horizontalKey.iambicMode',
	paddleLayout: 'settings.keybindings.paddleLayout',
	leftKeyCode: 'settings.keybindings.leftPaddle',
	rightKeyCode: 'settings.keybindings.rightPaddle',
	keyCode: 'settings.keybindings.straightKey'
};

export function localizeSettingItems(items: SettingItemDef[]): SettingItemDef[] {
	return items.map(item => ({
		...item,
		label: labelKeys[item.key] ? t(labelKeys[item.key]) : item.label,
		buttonText: item.key === 'testPlay' ? t('listening.play') : item.buttonText,
		hint: item.inputType === 'keybinding' ? t('settings.keybindings.clickToSet') : item.hint,
		options: item.options?.map(option => {
			if (item.key === 'paddleLayout' && option.value === 'normal') {
				return { ...option, label: t('settings.keybindings.paddleLayoutNormal') };
			}
			if (item.key === 'paddleLayout' && option.value === 'reversed') {
				return { ...option, label: t('settings.keybindings.paddleLayoutReversed') };
			}
			return option;
		})
	}));
}

export function getSettingsModalTexts(): SettingsModalTexts {
	return {
		title: t('common.settings'),
		cancel: t('common.cancel'),
		ok: 'OK',
		defaultButtonText: t('listening.play'),
		keybindingPlaceholder: t('settings.keybindings.pressKey'),
		keybindingWaiting: `${t('settings.keybindings.pressKey')}...`
	};
}
