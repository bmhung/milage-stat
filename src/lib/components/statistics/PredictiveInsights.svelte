<script lang="ts">
	import { generatePredictions, analyzeTrends } from '$lib/utils/stats';
	import type { FuelEntry, PredictionData, TrendAnalysis } from '$lib/types/fuel';
	import { getUnitLabel, units } from '$lib/settings';

	interface Props {
		entries: FuelEntry[];
	}

	let { entries }: Props = $props();

	let predictions = $derived(() => {
		if (entries.length >= 3) {
			return generatePredictions(entries);
		}
		return [];
	});

	let analysis = $derived(() => analyzeTrends(entries));

	function formatEfficiency(value: number): string {
		const unitLabel = getUnitLabel();
		const currentUnits = $units;

		if (!value) return '0';
		if (currentUnits === 'metric') {
			return `${value.toFixed(2)} L/100km`;
		} else {
			return `${value.toFixed(2)} MPG`;
		}
	}

	function generateActionableInsight(trend: string, efficiency: number): string {
		if (trend === 'up') {
			return 'Great! Your fuel efficiency is improving. Keep up the good work!';
		} else if (trend === 'down') {
			return `Your efficiency is declining. Consider vehicle maintenance check. Current: ${efficiency.toFixed(2)}`;
		} else {
			return 'Your fuel efficiency is stable. Consider driving habits optimization.';
		}
	}
</script>

<div class="card bg-base-100 shadow-sm">
	<div class="card-body p-4">
		<h3 class="card-title mb-4 text-base">🔮 Predictive Insights</h3>

		{#if entries.length < 3}
			<div class="py-4 text-center text-sm opacity-70">
				Need at least 3 fuel entries to generate predictions. Predictions will appear here once you
				have more data.
			</div>
		{:else if predictions().length > 0}
			<div class="space-y-4">
				<div class="bg-base-200 mb-4 rounded-lg p-3">
					<h4 class="mb-2 font-semibold">📈 Next 3 Months Forecast</h4>
					<div class="space-y-2">
						{#each predictions() as prediction, i}
							<div
								class="flex items-center justify-between p-2 {i % 2 === 0
									? 'bg-base-300'
									: 'bg-white'} rounded"
							>
								<div class="text-sm">
									<span class="opacity-70">{prediction.month}</span>
								</div>
								<div class="text-right">
									<div class="font-semibold">
										{formatEfficiency(prediction.predictedEfficiency)}
									</div>
									<div class="text-xs opacity-70">
										Confidence: {prediction.confidence}%
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<div class="bg-warning/10 rounded-lg p-3">
					<h4 class="mb-2 font-semibold">💡 Recommendations</h4>
					<div class="space-y-1 text-sm">
						{#each predictions() as prediction, i}
							{#if i === 0}
								<div class="flex items-start gap-2">
									<span class="text-lg">•</span>
									<div>
										<strong>Next Month:</strong>
										{prediction.recommendation}
									</div>
								</div>
							{/if}
						{/each}
					</div>
				</div>
			</div>
		{/if}

		{#if analysis().seasonalVariation > 0}
			<div class="bg-info/10 mt-4 rounded-lg p-3">
				<h4 class="mb-2 font-semibold">📊 Seasonal Analysis</h4>
				<div class="text-sm">
					Your fuel efficiency varies by <strong>{analysis().seasonalVariation.toFixed(1)}%</strong>
					throughout the year. Consider factors like weather conditions, driving patterns, or maintenance
					schedules.
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.space-y-1 > * + * {
		margin-top: 0.25rem;
	}
	.space-y-2 > * + * {
		margin-top: 0.5rem;
	}
	.space-y-4 > * + * {
		margin-top: 1rem;
	}
</style>
