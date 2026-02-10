<script lang="ts">
	import { onMount } from 'svelte';
	import { notificationPermission, requestNotificationPermission } from '$lib/pwa/notifications';

	interface Props {
		onClose?: () => void;
	}

	let { onClose }: Props = $props();

	let showPermissionBanner = $state(false);
	let permissionStatus = $state<'granted' | 'denied' | 'prompt' | 'unsupported'>('prompt');

	onMount(() => {
		// Check if notifications are supported
		if (!('Notification' in window)) {
			permissionStatus = 'unsupported';
			return;
		}

		// Check current permission status
		const currentPermission = Notification.permission;
		permissionStatus = currentPermission as 'granted' | 'denied' | 'prompt';

		// Show banner if permission is prompt (not asked yet)
		if (currentPermission === 'default') {
			// Only show banner after a delay to avoid immediate popup
			setTimeout(() => {
				showPermissionBanner = true;
			}, 3000);
		}

		// Subscribe to permission changes
		const unsubscribe = notificationPermission.subscribe((status) => {
			if (status.granted) {
				permissionStatus = 'granted';
				showPermissionBanner = false;
			} else if (status.denied) {
				permissionStatus = 'denied';
				showPermissionBanner = false;
			}
		});

		return unsubscribe;
	});

	async function handleRequestPermission() {
		try {
			const status = await requestNotificationPermission();
			if (status.granted) {
				// Show a welcome notification
				await showWelcomeNotification();
			}
		} catch (error) {
			console.error('Failed to request notification permission:', error);
		}
	}

	async function showWelcomeNotification() {
		if ('Notification' in window && Notification.permission === 'granted') {
			new Notification('🎉 Notifications Enabled!', {
				body: "You'll now receive fuel reminders and efficiency alerts from Milage Stat.",
				icon: '/pwa-192x192.png',
				tag: 'welcome-notification'
			});
		}
	}

	function dismissBanner() {
		showPermissionBanner = false;
		onClose?.();
	}
</script>

{#if permissionStatus === 'unsupported'}
	<div class="alert alert-warning mb-4">
		<span class="text-xl">🔕</span>
		<span>Push notifications are not supported in your browser.</span>
	</div>
{:else if showPermissionBanner && permissionStatus === 'prompt'}
	<div class="alert alert-info mb-4">
		<span class="text-xl">🔔</span>
		<div class="flex-1">
			<div class="font-semibold">Enable Notifications</div>
			<div class="text-sm opacity-90">
				Get fuel reminders and efficiency alerts. Never miss tracking your fuel consumption!
			</div>
			<div class="mt-2 flex gap-2">
				<button class="btn btn-primary btn-sm" onclick={handleRequestPermission}>
					Enable Notifications
				</button>
				<button class="btn btn-ghost btn-sm" onclick={dismissBanner}> Maybe Later </button>
			</div>
		</div>
		<button class="btn btn-ghost btn-sm btn-circle" onclick={dismissBanner}>
			<span>✕</span>
		</button>
	</div>
{:else if permissionStatus === 'granted'}
	<div class="alert alert-success mb-4">
		<span class="text-xl">🔔</span>
		<span>✅ Notifications are enabled! You'll receive fuel reminders and efficiency alerts.</span>
	</div>
{:else if permissionStatus === 'denied'}
	<div class="alert alert-warning mb-4">
		<span class="text-xl">🔕</span>
		<span
			>Notifications are blocked. Enable them in your browser settings to receive fuel reminders.</span
		>
	</div>
{/if}
