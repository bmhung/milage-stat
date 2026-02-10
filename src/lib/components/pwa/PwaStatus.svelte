<script lang="ts">
	import { onMount } from 'svelte';
	import { networkStatus, installPrompt } from '$lib/pwa/network-manager';

	let showInstallButton = $state(false);
	let isInstalling = $state(false);

	onMount(() => {
		// Check if app is already installed
		if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
			showInstallButton = false;
		} else {
			installPrompt.subscribe((prompt: any) => {
				showInstallButton = !!prompt && !window.matchMedia('(display-mode: standalone)').matches;
			});
		}
	});

	async function handleInstall() {
		if (!installPrompt) return;

		isInstalling = true;
		try {
			const promptResult = await installPrompt.prompt();
			if (promptResult.outcome === 'accepted') {
				showInstallButton = false;
			}
		} catch (error) {
			console.error('Install failed:', error);
		} finally {
			isInstalling = false;
		}
	}

	function dismissInstall() {
		showInstallButton = false;
	}

	const statusClass = $derived(() => ($networkStatus.isOnline ? 'online' : 'offline'));
	const statusText = $derived(() => ($networkStatus.isOnline ? 'Online' : 'Offline'));
	const statusIcon = $derived(() => ($networkStatus.isOnline ? '🌐' : '📴'));
</script>

{#if showInstallButton}
	<div class="install-banner bg-primary text-primary-content mb-4 rounded-lg p-4 shadow-lg">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<span class="text-2xl">📱</span>
				<div>
					<h3 class="mb-1 font-bold">Install Milage Stat</h3>
					<p class="text-sm opacity-90">Add to home screen for quick access and offline support!</p>
				</div>
			</div>
			<div class="flex gap-2">
				<button onclick={handleInstall} disabled={isInstalling} class="btn btn-accent">
					{#if isInstalling}
						<span class="loading loading-spinner loading-sm mr-2"></span>
						Installing...
					{:else}
						Install App
					{/if}
				</button>
				<button onclick={dismissInstall} class="btn btn-ghost btn-sm"> ✕ </button>
			</div>
		</div>
	</div>
{/if}

<!-- Network Status Indicator -->
<div
	class="network-status bg-base-100 fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg border px-3 py-2 shadow-md {statusClass()}"
>
	<span class="text-lg">{statusIcon()}</span>
	<span class="text-sm font-medium">{statusText()}</span>
	{#if !$networkStatus.isOnline && $networkStatus.connectionType}
		<span class="text-xs opacity-70">({$networkStatus.connectionType})</span>
	{/if}
</div>

<style>
	.install-banner {
		animation: slideIn 0.3s ease-out;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.network-status {
		transition: all 0.3s ease;
	}

	.network-status.online {
		border-color: #10b981;
		color: #10b981;
	}

	.network-status.offline {
		border-color: #ef4444;
		color: #ef4444;
	}
</style>
