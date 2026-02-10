import { writable } from 'svelte/store';

export interface NotificationPermission {
	granted: boolean;
	denied: boolean;
	prompt: boolean;
}

export interface NotificationData {
	id: string;
	title: string;
	body: string;
	icon?: string;
	tag?: string;
	requireInteraction?: boolean;
	actions?: NotificationAction[];
}

export interface NotificationAction {
	action: string;
	title: string;
	icon?: string;
}

export const notificationPermission = writable<NotificationPermission>({
	granted: false,
	denied: false,
	prompt: false
});

export async function requestNotificationPermission(): Promise<NotificationPermission> {
	if (!('Notification' in window)) {
		return { granted: false, denied: true, prompt: false };
	}

	const permission = await Notification.requestPermission();
	const status = {
		granted: permission === 'granted',
		denied: permission === 'denied',
		prompt: permission === 'default'
	};

	notificationPermission.set(status);
	return status;
}

export async function showNotification(notification: NotificationData) {
	if (!('Notification' in window)) {
		console.warn('Notifications not supported');
		return;
	}

	const permission = await Notification.requestPermission();
	if (permission !== 'granted') {
		console.warn('Notification permission denied');
		return;
	}

	const notificationInstance = new Notification(notification.title, {
		body: notification.body,
		icon: notification.icon || '/pwa-192x192.png',
		tag: notification.tag,
		requireInteraction: notification.requireInteraction || false
	});

	notificationInstance.onclick = () => {
		if (notification.tag === 'fuel-reminder') {
			window.location.href = '/app';
		}
	};

	return notificationInstance;
}

export function showFuelReminder(lastFuelDate: Date) {
	const daysSinceLastFuel = Math.floor(
		(Date.now() - lastFuelDate.getTime()) / (1000 * 60 * 60 * 24)
	);

	if (daysSinceLastFuel > 7) {
		showNotification({
			id: 'fuel-reminder',
			title: 'Time to Refuel?',
			body: `It's been ${daysSinceLastFuel} days since your last fuel entry. Track your consumption now!`,
			tag: 'fuel-reminder',
			requireInteraction: true
		});
	}
}

export function showSyncComplete(count: number) {
	showNotification({
		id: 'sync-complete',
		title: 'Data Synced',
		body: `Successfully synced ${count} fuel ${count === 1 ? 'entry' : 'entries'}`,
		tag: 'sync-complete'
	});
}

export function showEfficiencyAlert(efficiency: number, trend: 'improving' | 'declining') {
	const trendText = trend === 'improving' ? 'improving' : 'declining';
	const emoji = trend === 'improving' ? '📈' : '📉';

	showNotification({
		id: 'efficiency-alert',
		title: `${emoji} Fuel Efficiency ${trendText}`,
		body: `Your fuel efficiency is ${trendText}: ${efficiency.toFixed(2)} ${trend === 'improving' ? 'better' : 'worse'} than average`,
		tag: 'efficiency-alert'
	});
}

export function showInstallPrompt() {
	showNotification({
		id: 'install-prompt',
		title: '📱 Install Milage Stat',
		body: 'Add Milage Stat to your home screen for quick access to your fuel tracking!',
		tag: 'install-prompt',
		requireInteraction: true,
		actions: [
			{
				action: 'install',
				title: 'Install App'
			},
			{
				action: 'dismiss',
				title: 'Maybe Later'
			}
		]
	});
}
