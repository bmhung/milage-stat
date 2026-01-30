<script lang="ts">
	import { collection, getDocs, query, where, orderBy, deleteDoc, doc } from 'firebase/firestore';
	import { user as currentUser, db } from '$lib/firebase';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { loadUserSettings, formatCurrency, getUnitLabel, formatAmount } from '$lib/settings';

	let entries: any[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let sortBy = $state('createdAt');
	let sortOrder = $state('desc');
	let startDate = $state('');
	let endDate = $state('');
	let filterActive = $state(false);

	onMount(async () => {
		if (!$currentUser) {
			goto(resolve('/app/login'));
			return;
		}
		await loadUserSettings($currentUser.uid);
		await fetchEntries();
	});

	async function fetchEntries() {
		if (!$currentUser) return;

		try {
			loading = true;
			error = null;

			let q = query(
				collection(db, 'fills'),
				where('userId', '==', $currentUser.uid),
				orderBy(sortBy, sortOrder as 'asc' | 'desc')
			);

			// Apply date filter if active
			if (filterActive && startDate && endDate) {
				const start = new Date(startDate);
				const end = new Date(endDate);
				end.setHours(23, 59, 59, 999); // End of day
				q = query(
					collection(db, 'fills'),
					where('userId', '==', $currentUser.uid),
					where('createdAt', '>=', start),
					where('createdAt', '<=', end),
					orderBy(sortBy, sortOrder as 'asc' | 'desc')
				);
			}

			const querySnapshot = await getDocs(q);
			entries = querySnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data()
			}));
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	function toggleSort(field: string) {
		if (sortBy === field) {
			sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
		} else {
			sortBy = field;
			sortOrder = 'desc';
		}
		fetchEntries();
	}

	async function deleteEntry(id: string) {
		if (!confirm('Delete this fuel entry?')) return;

		try {
			await deleteDoc(doc(db, 'fills', id));
			// Optimistic UI update
			entries = entries.filter((entry) => entry.id !== id);
		} catch (err: any) {
			error = 'Failed to delete entry';
			fetchEntries(); // Refresh on error
		}
	}

	function applyFilter() {
		if (!startDate || !endDate) {
			error = 'Please select both start and end dates';
			return;
		}
		filterActive = true;
		fetchEntries();
	}

	function clearFilter() {
		filterActive = false;
		startDate = '';
		endDate = '';
		fetchEntries();
	}

	function formatDate(timestamp: any) {
		if (!timestamp) return '';
		const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
		return new Intl.DateTimeFormat('en-GB').format(date); // en-GB gives DD/MM/YYYY
	}

	function formatNumber(num: any) {
		return Number(num || 0).toLocaleString();
	}
</script>

<svelte:head>
	<title>Fuel Data</title>
	<meta name="description" content="Your fuel entries and statistics" />
</svelte:head>

<div class="container mx-auto p-4">
	<h1 class="mb-6 text-2xl font-bold">Fuel Data</h1>

	<!-- Filter Controls -->
	<div class="mb-6">
		<div class="mb-4 flex flex-wrap gap-2">
			<input
				type="date"
				bind:value={startDate}
				class="input input-sm input-bordered"
				placeholder="Start date"
			/>
			<input
				type="date"
				bind:value={endDate}
				class="input input-sm input-bordered"
				placeholder="End date"
			/>
			<button onclick={applyFilter} class="btn btn-sm btn-primary">Apply Filter</button>
			<button onclick={clearFilter} class="btn btn-sm btn-ghost">Clear</button>
		</div>

		<!-- Sort Controls -->
		<div class="mb-4 flex flex-wrap gap-2">
			<button
				class="btn btn-sm {sortBy === 'createdAt' ? 'btn-primary' : 'btn-outline'}"
				onclick={() => toggleSort('createdAt')}
			>
				Date {sortBy === 'createdAt' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
			</button>
			<button
				class="btn btn-sm {sortBy === 'odo' ? 'btn-primary' : 'btn-outline'}"
				onclick={() => toggleSort('odo')}
			>
				ODO {sortBy === 'odo' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
			</button>
			<button
				class="btn btn-sm {sortBy === 'price' ? 'btn-primary' : 'btn-outline'}"
				onclick={() => toggleSort('price')}
			>
				Price {sortBy === 'price' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
			</button>
			<button
				class="btn btn-sm {sortBy === 'amount' ? 'btn-primary' : 'btn-outline'}"
				onclick={() => toggleSort('amount')}
			>
				Amount {sortBy === 'amount' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
			</button>
		</div>
	</div>

	<!-- Error Display -->
	{#if error}
		<div class="alert alert-error mb-4">
			<span>{error}</span>
			<button onclick={fetchEntries} class="btn btn-sm btn-ghost">Retry</button>
		</div>
	{/if}

	<!-- Loading State -->
	{#if loading}
		<div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
			{#each Array(5) as _}
				<div class="card compact bg-base-100 animate-pulse shadow-sm">
					<div class="card-body p-3">
						<div class="flex items-start justify-between">
							<div class="bg-base-300 h-4 w-20 rounded"></div>
							<div class="bg-base-300 h-6 w-6 rounded"></div>
						</div>
						<div class="grid grid-cols-2 gap-1 text-sm">
							<div class="bg-base-300 h-3 rounded"></div>
							<div class="bg-base-300 h-3 rounded"></div>
							<div class="bg-base-300 h-3 rounded"></div>
							<div class="bg-base-300 h-3 rounded"></div>
						</div>
					</div>
				</div>
			{/each}
		</div>
		<!-- Empty State -->
	{:else if entries.length === 0}
		<div class="py-8 text-center opacity-70">
			<h3 class="text-lg font-semibold">No fuel entries found</h3>
			<p>
				{#if filterActive}
					No entries match your filter criteria.
				{:else}
					Add your first fuel entry to get started!
				{/if}
			</p>
			{#if filterActive}
				<button onclick={clearFilter} class="btn btn-sm btn-primary mt-2">Clear Filter</button>
			{/if}
		</div>
		<!-- Data Grid -->
	{:else}
		<div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
			{#each entries as entry}
				<div class="card compact bg-base-100 shadow-sm transition-shadow hover:shadow-md">
					<div class="card-body p-3">
						<div class="flex items-start justify-between">
							<div class="text-sm opacity-70">{formatDate(entry.createdAt)}</div>
							<button
								class="btn btn-ghost btn-xs text-error hover:bg-error hover:text-error-content"
								onclick={() => deleteEntry(entry.id)}
								title="Delete entry"
							>
								🗑️
							</button>
						</div>
						<div class="grid grid-cols-2 gap-1 text-sm">
							<span>📍 ODO: {formatNumber(entry.odo)}</span>
							<span>💰 {formatCurrency(entry.price)}/{getUnitLabel()}</span>
							<span>⛽ {formatAmount(entry.amount)}</span>
							<span>💵 {formatCurrency(entry.total)}</span>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
