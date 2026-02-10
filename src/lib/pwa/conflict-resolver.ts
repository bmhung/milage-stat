import { writable } from 'svelte/store';
import type { FuelEntry } from '$lib/types/fuel';

export interface ConflictResolution {
	entryId: string;
	localEntry: FuelEntry;
	remoteEntry: FuelEntry;
	resolution: 'local' | 'remote' | 'merge' | null;
	timestamp: number;
}

export interface ConflictStrategy {
	type: 'local-wins' | 'remote-wins' | 'merge' | 'prompt';
	description: string;
}

export const conflictQueue = writable<ConflictResolution[]>([]);
export const conflictStrategies = writable<Record<string, ConflictStrategy>>({});

class ConflictResolver {
	private defaultStrategy: ConflictStrategy = {
		type: 'prompt',
		description: 'Ask user to resolve conflicts'
	};

	constructor() {
		this.loadStrategies();
	}

	private loadStrategies() {
		if (typeof window === 'undefined') return;

		try {
			const saved = localStorage.getItem('conflictStrategies');
			if (saved) {
				const strategies = JSON.parse(saved);
				conflictStrategies.set(strategies);
			}
		} catch (error) {
			console.error('Failed to load conflict strategies:', error);
		}
	}

	private saveStrategies() {
		if (typeof window === 'undefined') return;

		try {
			const strategies = this.getStrategies();
			localStorage.setItem('conflictStrategies', JSON.stringify(strategies));
		} catch (error) {
			console.error('Failed to save conflict strategies:', error);
		}
	}

	private getStrategies(): Record<string, ConflictStrategy> {
		let strategies: Record<string, ConflictStrategy> = {};
		const unsubscribe = conflictStrategies.subscribe((s) => {
			strategies = s;
		});
		unsubscribe();
		return strategies;
	}

	// Detect conflicts between local and remote entries
	detectConflict(localEntry: FuelEntry, remoteEntry: FuelEntry): boolean {
		// Check if entries have the same ID but different data
		if (localEntry.id !== remoteEntry.id) {
			return false;
		}

		// Check for differences in key fields
		const fieldsToCheck: (keyof FuelEntry)[] = ['odo', 'price', 'amount', 'total'];

		return fieldsToCheck.some((field) => {
			const localValue = localEntry[field];
			const remoteValue = remoteEntry[field];
			return localValue !== remoteValue;
		});
	}

	// Resolve a conflict between local and remote entries
	async resolveConflict(
		localEntry: FuelEntry,
		remoteEntry: FuelEntry,
		strategy?: ConflictStrategy
	): Promise<FuelEntry> {
		const conflictStrategy = strategy || this.getStrategyForEntry(localEntry.id);

		switch (conflictStrategy.type) {
			case 'local-wins':
				return this.resolveLocalWins(localEntry, remoteEntry);

			case 'remote-wins':
				return this.resolveRemoteWins(localEntry, remoteEntry);

			case 'merge':
				return this.resolveMerge(localEntry, remoteEntry);

			case 'prompt':
				return this.resolvePrompt(localEntry, remoteEntry);

			default:
				throw new Error(`Unknown conflict strategy: ${conflictStrategy.type}`);
		}
	}

	private getStrategyForEntry(entryId: string): ConflictStrategy {
		const strategies = this.getStrategies();
		return strategies[entryId] || this.defaultStrategy;
	}

	// Local wins strategy - keep local changes
	private resolveLocalWins(localEntry: FuelEntry, remoteEntry: FuelEntry): FuelEntry {
		console.log('Conflict resolved: Local wins for entry', localEntry.id);
		return { ...localEntry };
	}

	// Remote wins strategy - keep remote changes
	private resolveRemoteWins(localEntry: FuelEntry, remoteEntry: FuelEntry): FuelEntry {
		console.log('Conflict resolved: Remote wins for entry', localEntry.id);
		return { ...remoteEntry };
	}

	// Merge strategy - intelligently merge changes
	private resolveMerge(localEntry: FuelEntry, remoteEntry: FuelEntry): FuelEntry {
		console.log('Conflict resolved: Merging entry', localEntry.id);

		const merged: FuelEntry = { ...localEntry };

		// Use the most recent timestamp for each field
		const localDate =
			localEntry.createdAt instanceof Date ? localEntry.createdAt : new Date(localEntry.createdAt);
		const remoteDate =
			remoteEntry.createdAt instanceof Date
				? remoteEntry.createdAt
				: new Date(remoteEntry.createdAt);

		// If remote is newer, use remote values for certain fields
		if (remoteDate > localDate) {
			// Use remote price if it's different and seems more recent
			if (remoteEntry.price !== localEntry.price) {
				merged.price = remoteEntry.price;
			}
		}

		// Always keep the higher odometer reading (more recent)
		if (remoteEntry.odo > localEntry.odo) {
			merged.odo = remoteEntry.odo;
		}

		// Recalculate total if price or amount changed
		if (merged.price !== localEntry.price || merged.amount !== localEntry.amount) {
			merged.total = merged.price * merged.amount;
		}

		return merged;
	}

	// Prompt strategy - ask user to resolve
	private async resolvePrompt(localEntry: FuelEntry, remoteEntry: FuelEntry): Promise<FuelEntry> {
		// Add to conflict queue for user to resolve
		const conflict: ConflictResolution = {
			entryId: localEntry.id,
			localEntry,
			remoteEntry,
			resolution: null,
			timestamp: Date.now()
		};

		// Add to conflict queue
		conflictQueue.update((queue) => [...queue, conflict]);

		// Return a promise that resolves when user makes a decision
		return new Promise((resolve) => {
			// Watch for resolution
			const unsubscribe = conflictQueue.subscribe((queue) => {
				const resolvedConflict = queue.find((c) => c.entryId === localEntry.id);
				if (resolvedConflict?.resolution) {
					unsubscribe();

					switch (resolvedConflict.resolution) {
						case 'local':
							resolve(this.resolveLocalWins(localEntry, remoteEntry));
							break;
						case 'remote':
							resolve(this.resolveRemoteWins(localEntry, remoteEntry));
							break;
						case 'merge':
							resolve(this.resolveMerge(localEntry, remoteEntry));
							break;
						default:
							resolve(localEntry); // Fallback to local
					}
				}
			});
		});
	}

	// Set conflict strategy for an entry type
	setStrategy(entryType: string, strategy: ConflictStrategy) {
		const strategies = this.getStrategies();
		strategies[entryType] = strategy;
		conflictStrategies.set(strategies);
		this.saveStrategies();
	}

	// Get available strategies
	getAvailableStrategies(): ConflictStrategy[] {
		return [
			{
				type: 'local-wins',
				description: 'Always keep your local changes'
			},
			{
				type: 'remote-wins',
				description: 'Always keep server changes'
			},
			{
				type: 'merge',
				description: 'Automatically merge when possible'
			},
			{
				type: 'prompt',
				description: 'Ask me to decide'
			}
		];
	}

	// Resolve a specific conflict
	async resolveConflictById(
		entryId: string,
		resolution: 'local' | 'remote' | 'merge'
	): Promise<void> {
		const queue = this.getConflictQueue();
		const conflict = queue.find((c) => c.entryId === entryId);

		if (!conflict) {
			throw new Error(`Conflict not found for entry: ${entryId}`);
		}

		// Update conflict with resolution
		conflictQueue.update((currentQueue) =>
			currentQueue.map((c) => (c.entryId === entryId ? { ...c, resolution } : c))
		);

		// Remove resolved conflict after a delay
		setTimeout(() => {
			conflictQueue.update((currentQueue) => currentQueue.filter((c) => c.entryId !== entryId));
		}, 1000);
	}

	private getConflictQueue(): ConflictResolution[] {
		let queue: ConflictResolution[] = [];
		const unsubscribe = conflictQueue.subscribe((q) => {
			queue = q;
		});
		unsubscribe();
		return queue;
	}

	// Get all pending conflicts
	getPendingConflicts(): ConflictResolution[] {
		return this.getConflictQueue().filter((c) => !c.resolution);
	}

	// Clear all conflicts
	clearConflicts(): void {
		conflictQueue.set([]);
	}
}

// Singleton instance
export const conflictResolver = new ConflictResolver();
