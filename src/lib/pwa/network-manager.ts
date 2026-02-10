import { writable } from 'svelte/store';

export interface NetworkStatus {
	isOnline: boolean;
	isSupported: boolean;
	connectionType?: string;
}

export interface SyncQueueItem {
	id: string;
	type: 'fuel-entry' | 'settings-update';
	data: any;
	timestamp: number;
}

export const networkStatus = writable<NetworkStatus>({
	isOnline: navigator.onLine,
	isSupported: 'connection' in navigator,
	connectionType: (navigator as any).connection?.effectiveType
});

export const syncQueue = writable<SyncQueueItem[]>([]);

export let installPrompt: any = writable(null);

// Initialize network status listeners
if (typeof window !== 'undefined') {
	const updateNetworkStatus = () => {
		networkStatus.update((status) => ({
			...status,
			isOnline: navigator.onLine,
			connectionType: (navigator as any).connection?.effectiveType
		}));
	};

	window.addEventListener('online', updateNetworkStatus);
	window.addEventListener('offline', updateNetworkStatus);

	// Listen for PWA install prompt
	window.addEventListener('beforeinstallprompt', (e) => {
		e.preventDefault();
		installPrompt.set((e as any).prompt);
	});
}

export function addToSyncQueue(item: SyncQueueItem) {
	syncQueue.update((queue) => [...queue, item]);
}

export function removeFromSyncQueue(id: string) {
	syncQueue.update((queue) => queue.filter((item) => item.id !== id));
}

export function clearSyncQueue() {
	syncQueue.set([]);
}

export async function processSyncQueue() {
	const queue = await new Promise<SyncQueueItem[]>((resolve) => {
		const unsubscribe = syncQueue.subscribe(resolve);
		unsubscribe();
	});

	for (const item of queue) {
		try {
			await processSyncItem(item);
			removeFromSyncQueue(item.id);
		} catch (error) {
			console.error('Failed to sync item:', item, error);
		}
	}
}

async function processSyncItem(item: SyncQueueItem) {
	switch (item.type) {
		case 'fuel-entry':
			// TODO: Implement Firebase sync for fuel entry
			console.log('Syncing fuel entry:', item.data);
			break;
		case 'settings-update':
			// TODO: Implement Firebase sync for settings
			console.log('Syncing settings update:', item.data);
			break;
		default:
			console.warn('Unknown sync item type:', item.type);
	}
}
