<script lang="ts">
	import { networkStatus } from '$lib/pwa/network-manager';
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

	onMount(() => {
		const unsubscribeStatus = syncStatus.subscribe((status) => {
			currentStatus = { ...status };
		});
		const unsubscribeProgress = syncProgress.subscribe((progress) => {
			currentProgress = progress;
		});
		return () => {
			unsubscribeStatus();
			unsubscribeProgress();
		};
	});

	function getProgressPercentage(): number {
		if (!currentProgress || currentProgress.total === 0) return 0;
		return Math.round((currentProgress.current / currentProgress.total) * 100);
	}

	let barColor = $derived(() => {
		if (currentStatus.syncError) return 'bg-error';
		if (!$networkStatus.isOnline) return 'bg-warning';
		if (currentStatus.isSyncing) return 'bg-info';
		if (currentStatus.pendingCount > 0) return 'bg-warning';
		return 'bg-success';
	});

	let label = $derived(() => {
		if (currentStatus.syncError) return '⚠ Sync error';
		if (!$networkStatus.isOnline) return `📴 Offline${currentStatus.pendingCount > 0 ? ` · ${currentStatus.pendingCount} pending` : ''}`;
		if (currentStatus.isSyncing && currentProgress) return `🔄 Syncing ${currentProgress.current}/${currentProgress.total}`;
		if (currentStatus.pendingCount > 0) return `🔄 ${currentStatus.pendingCount} pending`;
		return '🟢 Online';
	});
</script>

<div class="fixed top-0 right-0 left-0 z-50 flex h-6 items-center {barColor()} text-xs">
	<div class="flex w-full items-center justify-between px-3">
		<span class="truncate opacity-90">{label()}</span>
		{#if currentStatus.pendingCount > 0 && $networkStatus.isOnline && !currentStatus.isSyncing}
			<button
				class="ml-2 underline opacity-80 hover:opacity-100"
				onclick={() => backgroundSync.forceSync()}
			>
				Sync
			</button>
		{/if}
	</div>
	{#if currentStatus.isSyncing && currentProgress}
		<div class="bg-base-content/20 absolute bottom-0 left-0 h-0.5 w-full">
			<div
				class="bg-base-content/50 h-full transition-all duration-300"
				style="width: {getProgressPercentage()}%"
			></div>
		</div>
	{/if}
</div>
