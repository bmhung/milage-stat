<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import NetworkStatus from '$lib/components/pwa/NetworkStatus.svelte';
	import PushNotificationManager from '$lib/components/pwa/PushNotificationManager.svelte';
	import { notificationScheduler } from '$lib/pwa/notification-scheduler';
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

	let { children } = $props();
	injectSpeedInsights();

	// Initialize notification scheduler
	notificationScheduler.startScheduler();
</script>

<div class="app">
	<NetworkStatus />
	<PushNotificationManager />
	<main>
		{@render children()}
	</main>
	<footer class="fixed bottom-0 w-full">
		<div role="tablist" class="tabs tabs-box flex w-full">
			<a
				href={resolve('/dashboard')}
				role="tab"
				class="tab flex-1/3"
				class:tab-active={page.url.pathname === '/dashboard'}>Statistic</a
			>
			<a
				href={resolve('/')}
				role="tab"
				class="tab flex-1/3"
				class:tab-active={page.url.pathname === '/'}>Fuel Up</a
			>
			<a
				href={resolve('/settings')}
				role="tab"
				class="tab flex-1/3"
				class:tab-active={page.url.pathname === '/settings'}>Settings</a
			>
		</div>
	</footer>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		padding-bottom: 60px;
		width: 100%;
		max-width: 64rem;
		margin: 0 auto;
		box-sizing: border-box;
	}

	footer {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}

	footer a {
		font-weight: bold;
	}

	@media (min-width: 480px) {
	}
</style>
