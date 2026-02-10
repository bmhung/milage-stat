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
			label: 'Last 30 Days',
			value: '30days',
			getStartEnd: () => {
				const end = new Date();
				const start = subDays(end, 30);
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
</script>

<div class="dropdown dropdown-bottom dropdown-end">
	<div tabindex="0" role="button" class="btn btn-primary btn-sm m-1">
		{dateRanges.find((r) => r.value === selectedPeriod)?.label || 'Select Period'}
	</div>
	<ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box w-52 p-2 shadow">
		{#each dateRanges as range}
			<li>
				<a
					href="#"
					class="menu-item"
					class:selected={selectedPeriod === range.value}
					onclick={() => onPeriodChange(range.value)}
				>
					{range.label}
				</a>
			</li>
		{/each}
	</ul>
</div>
