<script lang="ts">
	import { networkStatus } from '$lib/pwa/network-manager';
	import { syncStatus, syncProgress, backgroundSync } from '$lib/pwa/background-sync';
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';

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

	// Brief "Synced ✓" confirmation shown right after a sync finishes cleanly.
	let justSynced = $state(false);
	let syncedTimer: ReturnType<typeof setTimeout> | null = null;
	let wasSyncing = false;

	onMount(() => {
		const unsubscribeStatus = syncStatus.subscribe((status) => {
			if (wasSyncing && !status.isSyncing && !status.syncError && status.pendingCount === 0) {
				justSynced = true;
				if (syncedTimer) clearTimeout(syncedTimer);
				syncedTimer = setTimeout(() => (justSynced = false), 2500);
			}
			wasSyncing = status.isSyncing;
			currentStatus = { ...status };
		});

		const unsubscribeProgress = syncProgress.subscribe((progress) => {
			currentProgress = progress;
		});

		return () => {
			unsubscribeStatus();
			unsubscribeProgress();
			if (syncedTimer) clearTimeout(syncedTimer);
		};
	});

	let isOnline = $derived($networkStatus.isOnline);

	// Stay invisible while everything is healthy; only surface something actionable.
	let mode = $derived.by(() => {
		if (currentStatus.syncError) return 'error';
		if (!isOnline) return 'offline';
		if (currentStatus.isSyncing) return 'syncing';
		if (currentStatus.pendingCount > 0) return 'pending';
		if (justSynced) return 'synced';
		return 'hidden';
	});
</script>

{#if mode !== 'hidden'}
	<div
		class="pointer-events-none fixed right-2 z-50"
		style="top: calc(0.5rem + env(safe-area-inset-top));"
	>
		<div
			class="border-base-300 bg-base-100/90 pointer-events-auto flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs shadow-lg backdrop-blur"
			transition:fly={{ y: -8, duration: 200 }}
		>
			{#if mode === 'error'}
				<span class="bg-error inline-block h-2 w-2 rounded-full"></span>
				<span class="text-error">Sync error</span>
				<button
					class="text-primary font-medium hover:underline"
					onclick={() => backgroundSync.forceSync()}
				>
					Retry
				</button>
			{:else if mode === 'offline'}
				<span class="bg-warning inline-block h-2 w-2 rounded-full"></span>
				<span class="opacity-80">
					Offline{currentStatus.pendingCount > 0 ? ` · ${currentStatus.pendingCount} pending` : ''}
				</span>
			{:else if mode === 'syncing'}
				<span class="loading loading-spinner loading-xs text-primary"></span>
				<span class="opacity-80">
					Syncing{currentProgress ? ` ${currentProgress.current}/${currentProgress.total}` : '…'}
				</span>
			{:else if mode === 'pending'}
				<span class="bg-warning inline-block h-2 w-2 rounded-full"></span>
				<span class="opacity-80">{currentStatus.pendingCount} pending</span>
				<button
					class="text-primary font-medium hover:underline"
					onclick={() => backgroundSync.forceSync()}
				>
					Sync
				</button>
			{:else if mode === 'synced'}
				<svg class="text-success h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.8-6.8a1 1 0 0 1 1.4 0z"
						clip-rule="evenodd"
					/>
				</svg>
				<span class="text-success">Synced</span>
			{/if}
		</div>
	</div>
{/if}
