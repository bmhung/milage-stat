<script lang="ts">
	let { children } = $props();
</script>

<div class="app">
	<main>
		{@render children()}
	</main>
	<footer>
		<div role="tablist" class="tabs tabs-box flex w-full">
			<span role="tab" class="tab flex-1/3">Statistic</span>
			<span role="tab" class="tab tab-active flex-1/3">Fuel Up</span>
			<span role="tab" class="tab flex-1/3">Data</span>
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
