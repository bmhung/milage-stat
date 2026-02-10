<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Chart from 'chart.js/auto';
	import type { PriceData } from '$lib/utils/stats';
	import { createPriceChartOptions } from '$lib/utils/charts';
	import { formatCurrency, getUnitLabel } from '$lib/settings';

	interface Props {
		entries: import('$lib/types/fuel').FuelEntry[];
		isMobile: boolean;
	}

	let { entries, isMobile }: Props = $props();

	let chartElement: HTMLCanvasElement;
	let priceChart: any;
	let chartData = $state<{ labels: string[]; datasets: any[] }>({ labels: [], datasets: [] });

	$effect(() => {
		if (entries && entries.length > 0) {
			updateChartData();
		}
	});

	function updateChartData() {
		const sortedEntries = entries
			.filter((e) => e.price && e.price > 0)
			.sort((a, b) => {
				const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
				const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
				return dateA.getTime() - dateB.getTime();
			});

		const priceData: PriceData[] = sortedEntries.map((entry) => {
			const entryDate =
				entry.createdAt instanceof Date ? entry.createdAt : new Date(entry.createdAt);
			return {
				date: entryDate,
				price: entry.price
			};
		});

		const labels = priceData.map((d) =>
			d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
		);

		const priceDataArray = priceData.map((d) => d.price);
		const averagePrice =
			priceDataArray.length > 0
				? priceDataArray.reduce((sum, price) => sum + price, 0) / priceDataArray.length
				: 0;

		chartData = {
			labels,
			datasets: [
				{
					label: 'Price per Unit',
					data: priceDataArray,
					borderColor: '#EF4444',
					backgroundColor: 'rgba(239, 68, 68, 0.1)',
					borderWidth: 2,
					fill: true,
					tension: 0.4
				}
			]
		};

		updateChart();
	}

	function updateChart() {
		if (priceChart && chartData.labels.length > 0) {
			priceChart.data = chartData;
			priceChart.update('none');
		}
	}

	onMount(() => {
		if (chartElement) {
			const config = createPriceChartOptions(isMobile);
			config.data = chartData;
			priceChart = new Chart(chartElement, config);
		}
	});

	onDestroy(() => {
		if (priceChart) {
			priceChart.destroy();
		}
	});

	function analyzePriceTrends(): {
		min: number;
		max: number;
		average: number;
		trend: 'up' | 'down' | 'stable';
	} {
		const prices = chartData.datasets[0]?.data || [];
		if (prices.length < 2) {
			return { min: 0, max: 0, average: 0, trend: 'stable' };
		}

		const sortedPrices = [...prices].sort((a, b) => a - b);
		const min = sortedPrices[0];
		const max = sortedPrices[sortedPrices.length - 1];
		const average = prices.reduce((sum: number, price: number) => sum + price, 0) / prices.length;

		// Simple trend detection - compare first half vs second half
		const halfLength = Math.floor(prices.length / 2);
		const firstHalf = sortedPrices.slice(0, halfLength);
		const secondHalf = sortedPrices.slice(halfLength);

		const firstHalfAvg =
			firstHalf.reduce((sum: number, price: number) => sum + price, 0) / firstHalf.length;
		const secondHalfAvg =
			secondHalf.reduce((sum: number, price: number) => sum + price, 0) / secondHalf.length;

		let trend: 'up' | 'down' | 'stable' = 'stable';
		const trendThreshold = 0.05; // 5% difference threshold

		if (secondHalfAvg > firstHalfAvg * (1 + trendThreshold)) {
			trend = 'up';
		} else if (secondHalfAvg < firstHalfAvg * (1 - trendThreshold)) {
			trend = 'down';
		}

		return { min, max, average, trend };
	}
</script>

<div class="card bg-base-100 shadow-sm">
	<div class="card-body p-4">
		<h3 class="card-title mb-4 text-base">Price Trends</h3>
		<div class="chart-container" style="height: {isMobile ? '250px' : '300px'};">
			<canvas bind:this={chartElement}></canvas>
		</div>
		{#if chartData.labels.length > 0}
			<div class="mt-4 grid grid-cols-2 gap-4 text-sm">
				<div class="bg-base-200 rounded p-2 text-center">
					<div class="opacity-70">Average Price</div>
					<div class="font-semibold">
						{formatCurrency(analyzePriceTrends().average)}/{getUnitLabel()}
					</div>
				</div>
				<div class="bg-base-200 rounded p-2 text-center">
					<div class="opacity-70">Price Range</div>
					<div class="font-semibold">
						{formatCurrency(analyzePriceTrends().min)} - {formatCurrency(analyzePriceTrends().max)}
					</div>
				</div>
			</div>
			<div class="mt-2 flex items-center justify-center gap-2">
				<div class="flex items-center gap-1">
					<span class="opacity-70">Trend:</span>
					<span
						class="font-semibold {analyzePriceTrends().trend === 'up'
							? 'text-success'
							: analyzePriceTrends().trend === 'down'
								? 'text-error'
								: 'text-base-content'}"
					>
						{analyzePriceTrends().trend === 'up'
							? '↑'
							: analyzePriceTrends().trend === 'down'
								? '↓'
								: '→'}
						{analyzePriceTrends().trend === 'up'
							? 'Rising'
							: analyzePriceTrends().trend === 'down'
								? 'Falling'
								: 'Stable'} prices
					</span>
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
