<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Chart from 'chart.js/auto';
	import type { CostData } from '$lib/utils/stats';
	import { groupByMonth } from '$lib/utils/stats';
	import { createCostChartOptions } from '$lib/utils/charts';
	import { formatCurrency } from '$lib/settings';

	interface Props {
		entries: import('$lib/types/fuel').FuelEntry[];
		isMobile: boolean;
	}

	let { entries, isMobile }: Props = $props();

	let chartElement: HTMLCanvasElement;
	let costChart: any;
	let chartData: { labels: string[]; datasets: any[] } = { labels: [], datasets: [] };

	$effect(() => {
		if (entries && entries.length > 0) {
			updateChartData();
		}
	});

	function updateChartData() {
		const monthlyData = groupByMonth(entries);

		chartData = {
			labels: monthlyData.map((d) => d.month),
			datasets: [
				{
					label: 'Total Cost',
					data: monthlyData.map((d) => d.cost),
					backgroundColor: '#10B981',
					borderColor: '#10B981',
					borderWidth: 1,
					yAxisID: 'y'
				},
				{
					label: 'Volume',
					data: monthlyData.map((d) => d.volume),
					backgroundColor: '#F59E0B',
					borderColor: '#F59E0B',
					borderWidth: 1,
					yAxisID: 'y1'
				}
			]
		};

		updateChart();
	}

	function updateChart() {
		if (costChart && chartData.labels.length > 0) {
			costChart.data = chartData;
			costChart.update('none');
		}
	}

	onMount(() => {
		if (chartElement) {
			const config = createCostChartOptions(isMobile);
			config.data = chartData;
			costChart = new Chart(chartElement, config);
		}
	});

	onDestroy(() => {
		if (costChart) {
			costChart.destroy();
		}
	});
</script>

<div class="card bg-base-100 shadow-sm">
	<div class="card-body p-4">
		<h3 class="card-title mb-4 text-base">Monthly Cost Analysis</h3>
		<div class="chart-container" style="height: {isMobile ? '250px' : '300px'};">
			<canvas bind:this={chartElement}></canvas>
		</div>
		{#if chartData.labels.length > 0}
			<div class="mt-4 grid grid-cols-1 gap-2 text-sm">
				<div class="bg-base-200 rounded p-2 text-center">
					<div class="opacity-70">Highest Monthly Cost</div>
					<div class="font-semibold">
						{formatCurrency(Math.max(...chartData.datasets[0].data))}
					</div>
				</div>
				<div class="bg-base-200 rounded p-2 text-center">
					<div class="opacity-70">Average Monthly Cost</div>
					<div class="font-semibold">
						{formatCurrency(
							chartData.datasets[0].data.reduce((a: number, b: number) => a + b, 0) /
								chartData.datasets[0].data.length
						)}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.chart-container {
		position: relative;
		width: 100%;
	}
</style>
