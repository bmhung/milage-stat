<script lang="ts">
	import { onMount } from 'svelte';
	import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
	import { db, user as currentUser } from '$lib/firebase';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { formatCurrency, getUnitLabel, units } from '$lib/settings';
	import { loadUserSettings } from '$lib/settings';
	import StatCard from '$lib/components/statistics/StatCard.svelte';
	import EfficiencyChart from '$lib/components/statistics/EfficiencyChart.svelte';
	import CostChart from '$lib/components/statistics/CostChart.svelte';
	import PriceHistoryChart from '$lib/components/statistics/PriceHistoryChart.svelte';
	import PredictiveInsights from '$lib/components/statistics/PredictiveInsights.svelte';
	import PeriodSelector from '$lib/components/statistics/PeriodSelector.svelte';
	import { analyzeTrends, filterEntriesByDateRange } from '$lib/utils/stats';
	import { subDays, subMonths, subYears } from 'date-fns';
	import type { FuelEntry } from '$lib/types/fuel';

	interface DateRange {
		label: string;
		value: string;
		getStartEnd: () => { start: Date; end: Date };
	}

	let entries: FuelEntry[] = $state([]);
	let loading = $state(true);
	let selectedPeriod = $state('3months');
	let isMobile = $state(false);
	let error = $state<string | null>(null);

	// Derived state for filtered data
	let filteredEntries = $derived(() => {
		if (entries.length === 0) return [];

		const dateRanges: { [key: string]: () => { start: Date; end: Date } } = {
			'30days': () => ({ start: subDays(new Date(), 30), end: new Date() }),
			'3months': () => ({ start: subMonths(new Date(), 3), end: new Date() }),
			'6months': () => ({ start: subMonths(new Date(), 6), end: new Date() }),
			'1year': () => ({ start: subYears(new Date(), 1), end: new Date() }),
			'2years': () => ({ start: subYears(new Date(), 2), end: new Date() })
		};

		const rangeFn = dateRanges[selectedPeriod];
		return rangeFn ? filterEntriesByDateRange(entries, rangeFn().start, rangeFn().end) : entries;
	});

	// Derived statistics
	let statistics = $derived(() => {
		const filtered = filteredEntries();
		return filtered.length > 0
			? analyzeTrends(filtered)
			: {
					overallTrend: 'stable',
					averageEfficiency: 0,
					totalCost: 0,
					totalDistance: 0,
					fillUpCount: 0,
					seasonalVariation: 0
				};
	});

	// Check mobile viewport
	onMount(() => {
		isMobile = window.innerWidth < 768;
		const handleResize = () => {
			isMobile = window.innerWidth < 768;
		};
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	});

	onMount(async () => {
		if (!$currentUser) {
			goto(resolve('/app/login'));
			return;
		}

		try {
			await loadUserSettings($currentUser.uid);

			const q = query(
				collection(db, 'fills'),
				where('userId', '==', $currentUser.uid),
				orderBy('createdAt', 'asc')
			);

			const querySnapshot = await getDocs(q);
			entries = querySnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
				createdAt: doc.data().createdAt?.toDate
					? doc.data().createdAt.toDate()
					: new Date(doc.data().createdAt)
			})) as FuelEntry[];
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	});

	function handlePeriodChange(period: string) {
		selectedPeriod = period;
	}

	function formatEfficiencyValue(value: number): string {
		const unitLabel = getUnitLabel();
		const currentUnits = $units;

		if (!value) return '0';
		if (currentUnits === 'metric') {
			return `${value.toFixed(2)} L/100km`;
		} else {
			return `${value.toFixed(2)} MPG`;
		}
	}

	function formatDistance(value: number): string {
		const currentUnits = $units;

		return `${value.toLocaleString()} ${currentUnits === 'metric' ? 'km' : 'miles'}`;
	}
</script>

<svelte:head>
	<title>Statistics Dashboard</title>
	<meta name="description" content="Fuel efficiency and cost statistics dashboard" />
</svelte:head>

<div class="container mx-auto p-4">
	<h1 class="mb-6 text-2xl font-bold">Statistics Dashboard</h1>

	<!-- Period Selector -->
	<div class="mb-6 flex justify-center">
		<PeriodSelector {selectedPeriod} onPeriodChange={handlePeriodChange} />
	</div>

	{#if loading}
		<div class="flex justify-center py-8">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if error}
		<div class="alert alert-error mb-6">
			<span>Error loading data: {error}</span>
		</div>
	{:else if entries.length === 0}
		<div class="py-8 text-center opacity-70">
			<h3 class="mb-2 text-lg font-semibold">No fuel data available</h3>
			<p>Add your first fuel entry to see statistics and trends!</p>
		</div>
	{:else}
		<!-- KPI Cards -->
		<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
			<StatCard
				title="Average Efficiency"
				value={formatEfficiencyValue(statistics().averageEfficiency)}
				icon="📈"
				trend={statistics().overallTrend}
				trendValue={statistics().overallTrend === 'up'
					? 'Improving'
					: statistics().overallTrend === 'down'
						? 'Declining'
						: 'Stable'}
			/>
			<StatCard title="Total Cost" value={formatCurrency(statistics().totalCost)} icon="💰" />
			<StatCard
				title="Total Distance"
				value={formatDistance(statistics().totalDistance)}
				icon="📍"
			/>
			<StatCard title="Number of Fill-ups" value={statistics().fillUpCount} icon="⛽" />
		</div>

		<!-- Charts Section - Mobile First Layout -->
		<div class="space-y-6">
			<!-- Efficiency Chart - Full Width -->
			<EfficiencyChart entries={filteredEntries()} {isMobile} showPredictions={true} />

			<!-- Cost Analysis - Full Width on Mobile, Half on Desktop -->
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<!-- Cost Chart -->
				<div class="lg:col-span-1">
					<CostChart entries={filteredEntries()} {isMobile} />
				</div>

				<!-- Price History Chart -->
				<div class="lg:col-span-1">
					<PriceHistoryChart entries={filteredEntries()} {isMobile} />
				</div>
			</div>

			<!-- Predictive Insights - Full Width -->
			<PredictiveInsights entries={filteredEntries()} />
		</div>
	{/if}
</div>

