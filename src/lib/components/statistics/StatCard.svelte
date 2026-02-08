<script lang="ts">
	import { formatCurrency } from '$lib/settings';

	interface Props {
		title: string;
		value: string | number;
		icon: string;
		trend?: string;
		trendValue?: string;
	}

	let { title, value, icon, trend, trendValue }: Props = $props();

	function formatDisplayValue(value: string | number): string {
		if (typeof value === 'number') {
			return formatCurrency(value);
		}
		return value;
	}

	function getTrendColor(trend: string | undefined): string {
		switch (trend) {
			case 'up':
				return 'text-success';
			case 'down':
				return 'text-error';
			default:
				return 'text-base-content';
		}
	}

	function getTrendIcon(trend: string | undefined): string {
		switch (trend) {
			case 'up':
				return '↑';
			case 'down':
				return '↓';
			default:
				return '→';
		}
	}
</script>

<div class="card bg-base-100 compact shadow-sm">
	<div class="card-body p-4">
		<div class="flex items-start justify-between">
			<div class="flex items-center gap-2">
				<span class="text-lg">{icon}</span>
				<div>
					<div class="text-sm opacity-70">{title}</div>
					<div class="text-lg font-bold">{formatDisplayValue(value)}</div>
				</div>
			</div>
			{#if trend && trendValue}
				<div class="text-right">
					<div class="text-sm opacity-70">Trend</div>
					<div class="flex items-center gap-1">
						<span class="{getTrendColor(trend)} font-semibold">
							{getTrendIcon(trend)}
						</span>
						<span class="text-sm">{trendValue}</span>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
