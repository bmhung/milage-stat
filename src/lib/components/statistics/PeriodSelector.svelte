<script lang="ts">
	import { subDays, subMonths, subYears } from 'date-fns';

	interface DateRange {
		label: string;
		value: string;
		getStartEnd: () => { start: Date; end: Date };
	}

	interface Props {
		selectedPeriod: string;
		onPeriodChange: (period: string) => void;
	}

	let { selectedPeriod, onPeriodChange }: Props = $props();

	const dateRanges: DateRange[] = [
		{
			label: 'Since Beginning',
			value: 'all',
			getStartEnd: () => {
				const end = new Date();
				// Start from a very early date to include all data
				const start = new Date('2000-01-01');
				return { start, end };
			}
		},
		{
			label: 'Last 3 Months',
			value: '3months',
			getStartEnd: () => {
				const end = new Date();
				const start = subMonths(end, 3);
				return { start, end };
			}
		},
		{
			label: 'Last 6 Months',
			value: '6months',
			getStartEnd: () => {
				const end = new Date();
				const start = subMonths(end, 6);
				return { start, end };
			}
		},
		{
			label: 'Last 1 Year',
			value: '1year',
			getStartEnd: () => {
				const end = new Date();
				const start = subYears(end, 1);
				return { start, end };
			}
		},
		{
			label: 'Last 2 Years',
			value: '2years',
			getStartEnd: () => {
				const end = new Date();
				const start = subYears(end, 2);
				return { start, end };
			}
		}
	];

	function handlePeriodChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		onPeriodChange(target.value);
	}

	export function getDateRange(period: string): { start: Date; end: Date } {
		const range = dateRanges.find((r) => r.value === period);
		return range ? range.getStartEnd() : { start: new Date(), end: new Date() };
	}

	function handlePeriodSelect(period: string) {
		onPeriodChange(period);
	}
</script>

<!-- Tab-style period selector -->
<div class="w-full">
	<!-- Mobile: stacked buttons, Desktop: horizontal -->
	<div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center" role="group">
		{#each dateRanges as range}
			<button
				type="button"
				class="btn btn-sm min-w-fit justify-center whitespace-nowrap transition-all duration-200 {selectedPeriod ===
				range.value
					? 'btn-primary no-animation'
					: 'btn-outline hover:btn-primary/50'}"
				aria-pressed={selectedPeriod === range.value}
				onclick={() => handlePeriodSelect(range.value)}
			>
				{range.label}
			</button>
		{/each}
	</div>
</div>

<style>
	/* Custom styles for better responsive behavior */
	@media (max-width: 640px) {
		:global(.btn-sm) {
			font-size: 0.75rem;
			height: 2rem;
			padding-left: 0.75rem;
			padding-right: 0.75rem;
		}
	}
</style>
