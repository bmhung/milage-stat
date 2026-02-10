<script lang="ts">
	import { syncStatus, syncProgress, backgroundSync } from '$lib/pwa/background-sync';
	import { onMount } from 'svelte';

	let currentStatus = $state({
		isOnline: true,
		isSyncing: false,
		pendingCount: 0,
		lastSync: null as number | null,
		syncError: null as string | null
	});

	let currentProgress = $state<{
		current: number;
		total: number;
		item: string;
	} | null>(null);

	let showDetails = $state(false);

	onMount(() => {
		// Subscribe to sync status
		const unsubscribeStatus = syncStatus.subscribe((status) => {
			currentStatus = { ...status };
		});

		// Subscribe to sync progress
		const unsubscribeProgress = syncProgress.subscribe((progress) => {
			currentProgress = progress;
		});

		return () => {
			unsubscribeStatus();
			unsubscribeProgress();
		};
	});

	function formatLastSync(timestamp: number | null): string {
		if (!timestamp) return 'Never';

		const now = Date.now();
		const diff = now - timestamp;

		if (diff < 60000) return 'Just now';
		if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
		if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;

		return new Date(timestamp).toLocaleDateString();
	}

	function getProgressPercentage(): number {
		if (!currentProgress || currentProgress.total === 0) return 0;
		return Math.round((currentProgress.current / currentProgress.total) * 100);
	}

	async function forceSync() {
		try {
			await backgroundSync.forceSync();
		} catch (error) {
			console.error('Force sync failed:', error);
		}
	}
</script>

<!-- Sync Status Bar -->
<div class="fixed top-0 right-0 left-0 z-50">
	{#if currentStatus.isSyncing && currentProgress}
		<!-- Active Sync Progress -->
		<div class="alert alert-info px-3 py-2">
			<div class="flex flex-1 items-center gap-2">
				<div class="loading loading-spinner loading-xs"></div>
				<span class="text-sm">{currentProgress.item}</span>
			</div>
			<div class="flex items-center gap-2">
				<span class="text-xs opacity-70">
					{currentProgress.current}/{currentProgress.total}
				</span>
				<div class="bg-base-300 h-1.5 w-16 rounded-full">
					<div
						class="bg-primary h-1.5 rounded-full transition-all duration-300"
						style="width: {getProgressPercentage()}%"
					></div>
				</div>
			</div>
		</div>
	{:else if currentStatus.syncError}
		<!-- Sync Error -->
		<div class="alert alert-error px-3 py-2">
			<div class="flex flex-1 items-center gap-2">
				<span class="text-sm">⚠️ Sync Error: {currentStatus.syncError}</span>
			</div>
			<button class="btn btn-ghost btn-xs" onclick={forceSync}> Retry </button>
		</div>
	{:else if currentStatus.pendingCount > 0 && !currentStatus.isOnline}
		<!-- Offline with Pending Items -->
		<div class="alert alert-warning px-3 py-2">
			<div class="flex flex-1 items-center gap-2">
				<span class="text-sm">📴 Offline - {currentStatus.pendingCount} items pending sync</span>
			</div>
		</div>
	{:else if currentStatus.pendingCount > 0}
		<!-- Online with Pending Items -->
		<div class="alert alert-info px-3 py-2">
			<div class="flex flex-1 items-center gap-2">
				<span class="text-sm">🔄 {currentStatus.pendingCount} items pending sync</span>
			</div>
			<button class="btn btn-ghost btn-xs" onclick={forceSync}> Sync Now </button>
		</div>
	{/if}
</div>

<!-- Sync Status Indicator (can be placed in navigation) -->
<div class="dropdown dropdown-end">
	<div class="dropdown-content menu bg-base-100 rounded-box z-[1] w-80 p-4 shadow">
		{#if currentStatus.isSyncing}
			<div class="loading loading-spinner loading-xs"></div>
		{:else if currentStatus.syncError}
			<span>⚠️</span>
		{:else if currentStatus.pendingCount > 0}
			<span>🔄</span>
		{:else}
			<span>✅</span>
		{/if}
	</div>

	<div tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-80 p-4 shadow">
		<div class="menu-title">
			<h3 class="font-semibold">Sync Status</h3>
		</div>

		<div class="space-y-3">
			<!-- Connection Status -->
			<div class="flex items-center justify-between">
				<span class="text-sm opacity-70">Connection:</span>
				<span class="badge {currentStatus.isOnline ? 'badge-success' : 'badge-error'}">
					{currentStatus.isOnline ? 'Online' : 'Offline'}
				</span>
			</div>

			<!-- Sync Status -->
			<div class="flex items-center justify-between">
				<span class="text-sm opacity-70">Status:</span>
				<span
					class="badge {currentStatus.isSyncing
						? 'badge-info'
						: currentStatus.pendingCount > 0
							? 'badge-warning'
							: 'badge-success'}"
				>
					{currentStatus.isSyncing
						? 'Syncing'
						: currentStatus.pendingCount > 0
							? 'Pending'
							: 'Synced'}
				</span>
			</div>

			<!-- Pending Items -->
			<div class="flex items-center justify-between">
				<span class="text-sm opacity-70">Pending Items:</span>
				<span class="font-semibold">{currentStatus.pendingCount}</span>
			</div>

			<!-- Last Sync -->
			<div class="flex items-center justify-between">
				<span class="text-sm opacity-70">Last Sync:</span>
				<span class="text-sm">{formatLastSync(currentStatus.lastSync)}</span>
			</div>

			<!-- Error Message -->
			{#if currentStatus.syncError}
				<div class="alert alert-error mt-3">
					<span class="text-xs">{currentStatus.syncError}</span>
				</div>
			{/if}

			<!-- Actions -->
			<div class="divider"></div>
			<div class="flex gap-2">
				{#if currentStatus.pendingCount > 0 && currentStatus.isOnline}
					<button class="btn btn-primary btn-sm flex-1" onclick={forceSync}> Sync Now </button>
				{/if}
				<button class="btn btn-ghost btn-sm flex-1" onclick={() => (showDetails = !showDetails)}>
					{showDetails ? 'Hide' : 'Show'} Details
				</button>
			</div>

			<!-- Detailed Info -->
			{#if showDetails}
				<div class="bg-base-200 mt-3 rounded p-3 text-xs">
					<div class="space-y-1">
						<div>Background sync is active and monitoring network status.</div>
						<div>Items are automatically synced when connection is restored.</div>
						<div>Failed items are retried with exponential backoff.</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
