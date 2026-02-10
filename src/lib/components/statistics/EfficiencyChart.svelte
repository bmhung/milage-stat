<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Chart from 'chart.js/auto';
	import type { EfficiencyData } from '$lib/utils/stats';
	import { generateEfficiencyTrend, generatePredictions } from '$lib/utils/stats';
	import { createEfficiencyChartOptions } from '$lib/utils/charts';
	import { units, getUnitLabel } from '$lib/settings';

	interface Props {
		entries: import('$lib/types/fuel').FuelEntry[];
		isMobile: boolean;
		showPredictions?: boolean;
	}

	let { entries, isMobile, showPredictions = true }: Props = $props();

	let chartElement: HTMLCanvasElement;
	let lineChart: any;
	let chartData: { labels: string[]; datasets: any[] } = { labels: [], datasets: [] };

	$effect(() => {
		if (entries && entries.length > 1) {
			updateChartData();
		}
	});

	function updateChartData() {
		const efficiencyData = generateEfficiencyTrend(entries);
		const predictions = showPredictions ? generatePredictions(entries) : [];

		const labels = [
			...efficiencyData.map((d) =>
				d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
			),
			...predictions.map((p) => p.month)
		];

		const actualData = efficiencyData.map((d) => ($units === 'metric' ? d.actual : d.actual));

		const predictedData = predictions.map((p) => p.predictedEfficiency);

		chartData = {
			labels,
			datasets: [
				{
					label: 'Historical Efficiency',
					data: actualData,
					borderColor: '#3B82F6',
					backgroundColor: 'rgba(59, 130, 246, 0.1)',
					borderWidth: 2,
					fill: true,
					tension: 0.4
				},
				{
					label: 'Predicted Efficiency',
					data: [...Array(actualData.length).fill(null), ...predictedData],
					borderColor: '#10B981',
					backgroundColor: 'rgba(16, 185, 129, 0.1)',
					borderWidth: 2,
					borderDash: [5, 5],
					fill: false,
					tension: 0.4
				}
			]
		};

		updateChart();
	}

	function updateChart() {
		if (lineChart && chartData.labels.length > 0) {
			lineChart.data = chartData;
			lineChart.update('none');
		}
	}

	onMount(() => {
		if (chartElement) {
			const config = createEfficiencyChartOptions(isMobile);
			config.data = chartData;
			lineChart = new Chart(chartElement, config);
		}
	});

	onDestroy(() => {
		if (lineChart) {
			lineChart.destroy();
		}
	});

	function formatEfficiencyLabel(value: number): string {
		const unitLabel = getUnitLabel();
		const currentUnits = $units;

		if (!value) return '0';
		if (currentUnits === 'metric') {
			return `${value.toFixed(2)} L/100km`;
		} else {
			return `${value.toFixed(2)} MPG`;
		}
	}
</script>

<div class="card bg-base-100 shadow-sm">
	<div class="card-body p-4">
		<h3 class="card-title mb-4 text-base">Fuel Efficiency Trend</h3>
		<div class="chart-container" style="height: {isMobile ? '250px' : '400px'};">
			<canvas bind:this={chartElement}></canvas>
		</div>
		{#if showPredictions && entries.length >= 3}
			<div class="bg-base-200 mt-4 rounded-lg p-3">
				<div class="text-sm">
					<div class="mb-1 font-semibold">🔮 Efficiency Forecast</div>
					<div class="text-base-content">
						Predictions show expected efficiency over next 3 months based on historical trends.
						Green dashed line indicates forecast with decreasing confidence over time.
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
