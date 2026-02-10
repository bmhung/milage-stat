import { writable } from 'svelte/store';
import { networkStatus } from './network-manager';
import { notificationScheduler } from './notification-scheduler';
import { db } from '$lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import type { FuelEntry } from '$lib/types/fuel';

export interface SyncQueueItem {
	id: string;
	type: 'fuel-entry' | 'fuel-update' | 'settings-update';
	data: any;
	timestamp: number;
	retries: number;
	lastRetry?: number;
}

export interface SyncStatus {
	isOnline: boolean;
	isSyncing: boolean;
	pendingCount: number;
	lastSync: number | null;
	syncError: string | null;
}

export interface SyncProgress {
	current: number;
	total: number;
	item: string;
}

export const syncStatus = writable<SyncStatus>({
	isOnline: true,
	isSyncing: false,
	pendingCount: 0,
	lastSync: null,
	syncError: null
});

export const syncProgress = writable<SyncProgress | null>(null);

class BackgroundSyncManager {
	private syncQueue: SyncQueueItem[] = [];
	private isProcessing = false;
	private maxRetries = 3;
	private retryDelay = 5000; // 5 seconds
	private storageKey = 'syncQueue';

	constructor() {
		this.loadSyncQueue();
		this.setupNetworkListener();
		this.startSyncProcessor();
	}

	private loadSyncQueue() {
		if (typeof window === 'undefined') return;

		try {
			const saved = localStorage.getItem(this.storageKey);
			if (saved) {
				this.syncQueue = JSON.parse(saved);
				this.updateSyncStatus();
			}
		} catch (error) {
			console.error('Failed to load sync queue:', error);
		}
	}

	private saveSyncQueue() {
		if (typeof window === 'undefined') return;

		try {
			localStorage.setItem(this.storageKey, JSON.stringify(this.syncQueue));
		} catch (error) {
			console.error('Failed to save sync queue:', error);
		}
	}

	private setupNetworkListener() {
		// Listen for network status changes
		const unsubscribe = networkStatus.subscribe((status) => {
			if (status.isOnline && this.syncQueue.length > 0) {
				// Network restored, start syncing
				this.processSyncQueue();
			}
		});

		// Cleanup on page unload
		if (typeof window !== 'undefined') {
			window.addEventListener('beforeunload', unsubscribe);
		}
	}

	private startSyncProcessor() {
		// Check for pending sync every 30 seconds
		setInterval(() => {
			if (this.syncQueue.length > 0 && !this.isProcessing) {
				const status = this.getNetworkStatus();
				if (status.isOnline) {
					this.processSyncQueue();
				}
			}
		}, 30000);
	}

	private getNetworkStatus() {
		let status = { isOnline: true };
		const unsubscribe = networkStatus.subscribe((s) => {
			status = s;
		});
		unsubscribe();
		return status;
	}

	// Public methods to add items to sync queue
	addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>) {
		const syncItem: SyncQueueItem = {
			...item,
			id: this.generateId(),
			timestamp: Date.now(),
			retries: 0
		};

		this.syncQueue.push(syncItem);
		this.saveSyncQueue();
		this.updateSyncStatus();

		// Try to sync immediately if online
		if (this.getNetworkStatus().isOnline) {
			this.processSyncQueue();
		}
	}

	// Add fuel entry to sync queue
	addFuelEntry(entry: Omit<FuelEntry, 'id'>) {
		this.addToSyncQueue({
			type: 'fuel-entry',
			data: entry
		});
	}

	// Add fuel update to sync queue
	updateFuelEntry(entryId: string, updates: Partial<FuelEntry>) {
		this.addToSyncQueue({
			type: 'fuel-update',
			data: { entryId, updates }
		});
	}

	// Process the sync queue
	async processSyncQueue() {
		if (this.isProcessing || this.syncQueue.length === 0) {
			return;
		}

		const networkStatus = this.getNetworkStatus();
		if (!networkStatus.isOnline) {
			return;
		}

		this.isProcessing = true;
		syncStatus.update((status) => ({ ...status, isSyncing: true, syncError: null }));

		try {
			const itemsToProcess = [...this.syncQueue];
			let processedCount = 0;
			let errorCount = 0;

			// Update progress
			syncProgress.set({
				current: 0,
				total: itemsToProcess.length,
				item: 'Starting sync...'
			});

			for (let i = 0; i < itemsToProcess.length; i++) {
				const item = itemsToProcess[i];

				// Update progress
				syncProgress.set({
					current: i,
					total: itemsToProcess.length,
					item: this.getItemDescription(item)
				});

				try {
					await this.processSyncItem(item);
					this.removeFromSyncQueue(item.id);
					processedCount++;
				} catch (error) {
					console.error('Failed to sync item:', item, error);
					errorCount++;

					// Handle retries
					if (item.retries < this.maxRetries) {
						item.retries++;
						item.lastRetry = Date.now();

						// Exponential backoff
						const delay = this.retryDelay * Math.pow(2, item.retries - 1);
						await new Promise((resolve) => setTimeout(resolve, delay));

						// Try again
						try {
							await this.processSyncItem(item);
							this.removeFromSyncQueue(item.id);
							processedCount++;
						} catch (retryError) {
							console.error('Retry failed for item:', item, retryError);
						}
					} else {
						// Max retries reached, remove from queue
						this.removeFromSyncQueue(item.id);
						console.error('Max retries reached for item:', item);
					}
				}
			}

			// Update final status
			syncStatus.update((status) => ({
				...status,
				lastSync: Date.now(),
				pendingCount: this.syncQueue.length
			}));

			// Show notification if items were synced
			if (processedCount > 0) {
				notificationScheduler.showSyncNotification(processedCount);
			}

			// Update progress to complete
			syncProgress.set({
				current: itemsToProcess.length,
				total: itemsToProcess.length,
				item: `Sync complete (${processedCount} successful, ${errorCount} errors)`
			});

			// Clear progress after a delay
			setTimeout(() => {
				syncProgress.set(null);
			}, 3000);
		} catch (error) {
			console.error('Sync process failed:', error);
			syncStatus.update((status) => ({
				...status,
				syncError: error instanceof Error ? error.message : 'Unknown sync error'
			}));
		} finally {
			this.isProcessing = false;
			syncStatus.update((status) => ({ ...status, isSyncing: false }));
			this.updateSyncStatus();
		}
	}

	private async processSyncItem(item: SyncQueueItem) {
		switch (item.type) {
			case 'fuel-entry':
				await this.syncFuelEntry(item.data);
				break;
			case 'fuel-update':
				await this.syncFuelUpdate(item.data);
				break;
			case 'settings-update':
				await this.syncSettingsUpdate(item.data);
				break;
			default:
				throw new Error(`Unknown sync item type: ${item.type}`);
		}
	}

	private async syncFuelEntry(entryData: any) {
		const collectionRef = collection(db, 'fills');
		await addDoc(collectionRef, {
			...entryData,
			createdAt: serverTimestamp(),
			syncedAt: serverTimestamp()
		});
	}

	private async syncFuelUpdate(updateData: { entryId: string; updates: Partial<FuelEntry> }) {
		const docRef = doc(db, 'fills', updateData.entryId);
		await updateDoc(docRef, {
			...updateData.updates,
			updatedAt: serverTimestamp(),
			syncedAt: serverTimestamp()
		});
	}

	private async syncSettingsUpdate(settingsData: any) {
		// Implementation for settings sync
		// This would depend on how settings are stored in Firebase
		console.log('Syncing settings:', settingsData);
	}

	private removeFromSyncQueue(id: string) {
		const index = this.syncQueue.findIndex((item) => item.id === id);
		if (index !== -1) {
			this.syncQueue.splice(index, 1);
			this.saveSyncQueue();
			this.updateSyncStatus();
		}
	}

	private updateSyncStatus() {
		syncStatus.update((status) => ({
			...status,
			pendingCount: this.syncQueue.length,
			isOnline: this.getNetworkStatus().isOnline
		}));
	}

	private getItemDescription(item: SyncQueueItem): string {
		switch (item.type) {
			case 'fuel-entry':
				return 'Syncing fuel entry...';
			case 'fuel-update':
				return 'Updating fuel entry...';
			case 'settings-update':
				return 'Updating settings...';
			default:
				return 'Syncing data...';
		}
	}

	private generateId(): string {
		return Date.now().toString(36) + Math.random().toString(36).substr(2);
	}

	// Public methods for getting sync status
	getSyncStatus(): SyncStatus {
		return {
			isOnline: this.getNetworkStatus().isOnline,
			isSyncing: this.isProcessing,
			pendingCount: this.syncQueue.length,
			lastSync: null, // Would need to track this
			syncError: null
		};
	}

	getPendingCount(): number {
		return this.syncQueue.length;
	}

	// Force sync manually
	forceSync(): Promise<void> {
		return this.processSyncQueue();
	}

	// Clear sync queue (for testing or reset)
	clearSyncQueue() {
		this.syncQueue = [];
		this.saveSyncQueue();
		this.updateSyncStatus();
	}
}

// Singleton instance
export const backgroundSync = new BackgroundSyncManager();
