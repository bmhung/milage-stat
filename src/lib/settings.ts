import { writable, derived, get } from 'svelte/store';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface Settings {
	currency: 'USD' | 'VND';
	units: 'imperial' | 'metric';
}

function detectDefaultSettings(): Settings {
	// Default to USD + imperial
	const defaults: Settings = {
		currency: 'USD',
		units: 'imperial'
	};

	// Detect user locale
	if (typeof navigator !== 'undefined') {
		const locale = navigator.language || 'en-US';
		const countryCode = locale.split('-')[1]?.toUpperCase();

		// Currency detection - Vietnamese users get VND
		if (locale.includes('vi') || countryCode === 'VN') {
			defaults.currency = 'VND';
		}

		// Unit detection - Most countries use metric, except US, Liberia, and Myanmar
		// These 3 countries use imperial system
		if (!['US', 'LR', 'MM'].includes(countryCode || '')) {
			defaults.units = 'metric';
		}
	}

	return defaults;
}

// Create writable store for settings
export const userSettings = writable<Settings>(detectDefaultSettings());

// Derived stores for easy access
export const currency = derived(userSettings, ($settings) => $settings.currency);
export const units = derived(userSettings, ($settings) => $settings.units);

// Settings management functions
export async function loadUserSettings(userId: string): Promise<Settings> {
	try {
		const docRef = doc(db, 'userSettings', userId);
		const docSnap = await getDoc(docRef);

		if (docSnap.exists()) {
			const savedSettings = docSnap.data() as Settings;
			userSettings.set(savedSettings);
			return savedSettings;
		} else {
			// No saved settings, use defaults
			const defaults = detectDefaultSettings();
			await saveUserSettings(userId, defaults);
			userSettings.set(defaults);
			return defaults;
		}
	} catch (error) {
		console.error('Error loading settings:', error);
		// Fallback to defaults
		const defaults = detectDefaultSettings();
		userSettings.set(defaults);
		return defaults;
	}
}

export async function saveUserSettings(userId: string, settings: Partial<Settings>): Promise<void> {
	try {
		const docRef = doc(db, 'userSettings', userId);
		const currentSettings = get(userSettings);
		const updatedSettings = { ...currentSettings, ...settings };

		await setDoc(docRef, {
			...updatedSettings,
			userId,
			updatedAt: new Date()
		});

		userSettings.set(updatedSettings);
	} catch (error) {
		console.error('Error saving settings:', error);
		throw error;
	}
}

// Currency formatting functions
export function formatCurrency(amount: number, targetCurrency?: 'USD' | 'VND'): string {
	const currencyToUse = targetCurrency || get(userSettings).currency;

	if (currencyToUse === 'VND') {
		// Vietnamese formatting: no decimals, dot thousands separator, symbol after
		return new Intl.NumberFormat('vi-VN', {
			style: 'currency',
			currency: 'VND',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount || 0);
	} else {
		// US formatting: 2 decimals, comma thousands separator, symbol before
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(amount || 0);
	}
}

// Unit formatting functions
export function getUnitLabel(): string {
	const currentUnits = get(units);
	return currentUnits === 'metric' ? 'L' : 'gal';
}

export function formatAmount(amount: number, targetUnits?: 'imperial' | 'metric'): string {
	const unitsToUse = targetUnits || get(units);

	if (unitsToUse === 'metric') {
		// Convert gallons to liters: 1 gal ≈ 3.78541 L
		const liters = amount * 3.78541;
		return `${liters.toFixed(2)} L`;
	} else {
		return `${amount} gal`;
	}
}

export function getPriceLabel(): string {
	const currentUnits = get(units);
	return currentUnits === 'metric' ? 'Price/L' : 'Price/gal';
}

export function getAmountLabel(): string {
	const currentUnits = get(units);
	return currentUnits === 'metric' ? 'Amount (L)' : 'Amount (gal)';
}

// Conversion functions for display
export function convertAmount(
	amount: number,
	fromUnits: 'imperial' | 'metric',
	toUnits: 'imperial' | 'metric'
): number {
	if (fromUnits === toUnits) return amount;

	if (fromUnits === 'imperial' && toUnits === 'metric') {
		// Gallons to liters
		return amount * 3.78541;
	} else {
		// Liters to gallons
		return amount / 3.78541;
	}
}
