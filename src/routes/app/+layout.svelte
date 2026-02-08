<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	let { children } = $props();
</script>

<div class="app">
	<main>
		{@render children()}
	</main>
	<footer>
		<div role="tablist" class="tabs tabs-box flex w-full">
			<a
				href={resolve('/app/dashboard')}
				role="tab"
				class="tab flex-1/3"
				class:tab-active={page.url.pathname === '/app/dashboard'}>Statistic</a
			>
			<a
				href={resolve('/app')}
				role="tab"
				class="tab flex-1/3"
				class:tab-active={page.url.pathname === '/app'}>Fuel Up</a
			>
			<a
				href={resolve('/app/settings')}
				role="tab"
				class="tab flex-1/3"
				class:tab-active={page.url.pathname === '/app/settings'}>Settings</a
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
		padding: 12px;
	}

	footer a {
		font-weight: bold;
	}

	@media (min-width: 480px) {
		footer {
			padding: 12px 0;
		}
	}
</style>
