import { showFuelReminder, showEfficiencyAlert, showSyncComplete } from './notifications';
import { notificationPermission } from '$lib/pwa/notifications';
import type { FuelEntry } from '$lib/types/fuel';

export interface NotificationSettings {
	fuelReminders: boolean;
	efficiencyAlerts: boolean;
	syncNotifications: boolean;
	reminderDays: number; // Days after last fuel entry to remind
}

export const defaultNotificationSettings: NotificationSettings = {
	fuelReminders: true,
	efficiencyAlerts: true,
	syncNotifications: true,
	reminderDays: 7
};

class NotificationScheduler {
	private settings: NotificationSettings = defaultNotificationSettings;
	private checkInterval: number | null = null;
	private lastCheck: number = 0;

	constructor() {
		this.loadSettings();
		this.startScheduler();
	}

	private loadSettings() {
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('notificationSettings');
			if (saved) {
				try {
					this.settings = { ...defaultNotificationSettings, ...JSON.parse(saved) };
				} catch (error) {
					console.error('Failed to load notification settings:', error);
				}
			}
		}
	}

	updateSettings(newSettings: Partial<NotificationSettings>) {
		this.settings = { ...this.settings, ...newSettings };
		if (typeof window !== 'undefined') {
			localStorage.setItem('notificationSettings', JSON.stringify(this.settings));
		}
	}

	getSettings(): NotificationSettings {
		return { ...this.settings };
	}

	startScheduler() {
		if (typeof window === 'undefined') return;

		// Check every hour
		this.checkInterval = window.setInterval(
			() => {
				this.performChecks();
			},
			60 * 60 * 1000
		);

		// Also check immediately
		this.performChecks();
	}

	stopScheduler() {
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
		}
	}

	private async performChecks() {
		// Only check if notifications are enabled and permission is granted
		const permission = await new Promise<boolean>((resolve) => {
			const unsubscribe = notificationPermission.subscribe((status) => {
				resolve(status.granted);
				unsubscribe();
			});
		});

		if (!permission) return;

		// Prevent too frequent checks
		const now = Date.now();
		if (now - this.lastCheck < 30 * 60 * 1000) return; // 30 minutes
		this.lastCheck = now;

		// Get fuel entries from localStorage or Firebase
		const entries = this.getFuelEntries();

		if (this.settings.fuelReminders) {
			this.checkFuelReminders(entries);
		}

		if (this.settings.efficiencyAlerts) {
			this.checkEfficiencyAlerts(entries);
		}
	}

	private getFuelEntries(): FuelEntry[] {
		if (typeof window === 'undefined') return [];

		try {
			const saved = localStorage.getItem('fuelEntries');
			return saved ? JSON.parse(saved) : [];
		} catch (error) {
			console.error('Failed to load fuel entries:', error);
			return [];
		}
	}

	private checkFuelReminders(entries: FuelEntry[]) {
		if (entries.length === 0) return;

		// Find the most recent fuel entry
		const latestEntry = entries.reduce((latest, entry) => {
			const entryDate =
				entry.createdAt instanceof Date ? entry.createdAt : new Date(entry.createdAt);
			const latestDate =
				latest.createdAt instanceof Date ? latest.createdAt : new Date(latest.createdAt);
			return entryDate > latestDate ? entry : latest;
		});

		const latestDate =
			latestEntry.createdAt instanceof Date
				? latestEntry.createdAt
				: new Date(latestEntry.createdAt);
		const daysSinceLastFuel = Math.floor(
			(Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24)
		);

		// Show reminder if it's been more than the configured days
		if (daysSinceLastFuel >= this.settings.reminderDays) {
			showFuelReminder(latestDate);
		}
	}

	private checkEfficiencyAlerts(entries: FuelEntry[]) {
		if (entries.length < 5) return; // Need at least 5 entries for meaningful analysis

		// Calculate efficiency for recent entries
		const recentEntries = entries.slice(-10); // Last 10 entries
		const efficiencies = recentEntries
			.map((entry, index) => {
				if (index === 0 || !entry.amount || !entry.odo) return null;

				const prevEntry = recentEntries[index - 1];
				if (!prevEntry.odo) return null;

				const distance = entry.odo - prevEntry.odo;
				const volume = entry.amount;

				return distance > 0 && volume > 0 ? distance / volume : null; // km per liter or mpg
			})
			.filter(Boolean) as number[];

		if (efficiencies.length < 3) return;

		// Compare recent average to overall average
		const recentAverage = efficiencies.reduce((sum, eff) => sum + eff, 0) / efficiencies.length;

		// Calculate overall efficiency from all entries
		const allEfficiencies = entries
			.map((entry, index) => {
				if (index === 0 || !entry.amount || !entry.odo) return null;

				const prevEntry = entries[index - 1];
				if (!prevEntry.odo) return null;

				const distance = entry.odo - prevEntry.odo;
				const volume = entry.amount;

				return distance > 0 && volume > 0 ? distance / volume : null;
			})
			.filter(Boolean) as number[];

		if (allEfficiencies.length === 0) return;

		const overallAverage =
			allEfficiencies.reduce((sum, eff) => sum + eff, 0) / allEfficiencies.length;

		// Determine if efficiency is significantly improving or declining
		const difference = (recentAverage - overallAverage) / overallAverage;
		const threshold = 0.1; // 10% difference threshold

		if (Math.abs(difference) > threshold) {
			const trend = difference > 0 ? 'improving' : 'declining';
			showEfficiencyAlert(recentAverage, trend);
		}
	}

	// Public method to trigger sync notification
	showSyncNotification(count: number) {
		if (this.settings.syncNotifications) {
			showSyncComplete(count);
		}
	}
}

// Singleton instance
export const notificationScheduler = new NotificationScheduler();

// Cleanup on page unload
if (typeof window !== 'undefined') {
	window.addEventListener('beforeunload', () => {
		notificationScheduler.stopScheduler();
	});
}
