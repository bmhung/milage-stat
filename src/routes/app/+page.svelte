<script lang="ts">
	import { addDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
	import { db, user as currentUser } from '$lib/firebase';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		loadUserSettings,
		getPriceLabel,
		getAmountLabel,
		getUnitLabel,
		formatCurrency,
		units
	} from '$lib/settings';
	import { onMount } from 'svelte';

	interface FuelEntry {
		id: string;
		userId: string;
		odo: number;
		createdAt: Date | null;
		price: number;
		amount: number;
		total: number;
	}

	let odo = $state('');
	let createdAt = new Date();
	let price = $state('');
	let amount = $state('');
	let total = $derived(Number(price) * Number(amount));
	let lastEntry: FuelEntry | null = $state(null);
	let loadingPrevious = $state(true);

	// Real-time calculations
	let distanceSinceLastFill = $derived(
		lastEntry && odo ? Number(odo) - (lastEntry as FuelEntry).odo : 0
	);
	let fuelEfficiency = $derived(() => {
		if (!distanceSinceLastFill || !amount) return 0;
		const currentUnits = $units;
		if (currentUnits === 'metric') {
			// L/100km = (liters / distance) * 100
			return (Number(amount) / distanceSinceLastFill) * 100;
		} else {
			// MPG = distance / gallons
			return distanceSinceLastFill / Number(amount);
		}
	});
	let costPerDistance = $derived(
		distanceSinceLastFill && total ? total / distanceSinceLastFill : 0
	);

	// Validation
	let validationErrors = $state<string[]>([]);
	let odoError = $derived(
		lastEntry && odo && Number(odo) <= (lastEntry as FuelEntry).odo
			? `ODO must be greater than last entry (${(lastEntry as FuelEntry).odo})`
			: ''
	);

	$effect(() => {
		async function loadUserData() {
			if ($currentUser) {
				await loadUserSettings($currentUser.uid);
				await fetchLastEntry();
			} else if (!$currentUser && loadingPrevious) {
				// Set loading to false if user is null and we haven't loaded yet
				loadingPrevious = false;
			}
		}

		loadUserData();
	});

	async function fetchLastEntry() {
		if (!$currentUser) return;

		try {
			const q = query(
				collection(db, 'fills'),
				where('userId', '==', $currentUser.uid),
				orderBy('createdAt', 'desc'),
				limit(1)
			);

			const querySnapshot = await getDocs(q);
			if (!querySnapshot.empty) {
				const doc = querySnapshot.docs[0];
				lastEntry = {
					id: doc.id,
					...doc.data()
				} as FuelEntry;
			}
		} catch (error) {
			console.error('Error fetching last entry:', error);
		} finally {
			loadingPrevious = false;
		}
	}

	function formatDate(timestamp: any) {
		if (!timestamp) return '';
		const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
		return new Intl.DateTimeFormat('en-GB').format(date);
	}

	function formatNumber(num: number) {
		return Number(num || 0).toLocaleString();
	}

	function formatEfficiency(value: number, units: string): string {
		if (!value) return '0';
		if (units === 'metric') {
			return `${value.toFixed(2)} L/100km`;
		} else {
			return `${value.toFixed(2)} MPG`;
		}
	}

	async function fuelUp() {
		if (!$currentUser) {
			goto(resolve('/app/login'));
			return;
		}

		await addDoc(collection(db, 'fills'), {
			userId: $currentUser.uid,
			odo,
			createdAt,
			price,
			amount,
			total
		});

		// Reset form after successful save
		odo = '';
		price = '';
		amount = '';

		// Refresh last entry data
		await fetchLastEntry();
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		// Validate before submission
		if (odoError) {
			return;
		}

		fuelUp();
	}
</script>

<div class="mb-6">
	<h2 class="mb-3 text-lg font-semibold">Previously</h2>
	{#if loadingPrevious}
		<div class="card bg-base-100 shadow-sm">
			<div class="card-body p-4">
				<div class="animate-pulse">
					<div class="bg-base-300 mb-2 h-4 w-20 rounded"></div>
					<div class="grid grid-cols-2 gap-2">
						<div class="bg-base-300 h-3 w-16 rounded"></div>
						<div class="bg-base-300 h-3 w-20 rounded"></div>
						<div class="bg-base-300 h-3 w-16 rounded"></div>
						<div class="bg-base-300 h-3 w-20 rounded"></div>
					</div>
				</div>
			</div>
		</div>
	{:else if lastEntry}
		<div class="card bg-base-100 shadow-sm">
			<div class="card-body p-4">
				<div class="mb-2 text-sm opacity-70">{formatDate(lastEntry.createdAt)}</div>
				<div class="grid grid-cols-2 gap-2 text-sm">
					<span>📍 ODO: {formatNumber(lastEntry.odo)}</span>
					<span>💰 {formatCurrency(lastEntry.price)}/{getUnitLabel()}</span>
					<span>⛽ {formatNumber(lastEntry.amount)} {getUnitLabel()}</span>
					<span>💵 {formatCurrency(lastEntry.total)}</span>
				</div>
			</div>
		</div>
	{:else}
		<div class="card bg-base-100 shadow-sm">
			<div class="card-body p-4">
				<p class="text-sm opacity-70">No previous fuel entries found</p>
			</div>
		</div>
	{/if}
</div>

<!-- Real-time Calculations -->
{#if lastEntry && (odo || price || amount)}
	<div class="mb-6">
		<h3 class="mb-3 text-lg font-semibold">Real-time Calculations</h3>
		<div class="card bg-base-100 shadow-sm">
			<div class="card-body p-4">
				<div class="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
					{#if distanceSinceLastFill > 0}
						<div>
							<span class="opacity-70">Distance since last fill:</span>
							<span class="font-semibold">{formatNumber(distanceSinceLastFill)} miles/km</span>
						</div>
					{/if}
					{#if fuelEfficiency() > 0}
						<div>
							<span class="opacity-70">Fuel Efficiency:</span>
							<span class="font-semibold">
								{formatEfficiency(fuelEfficiency(), $units)}
							</span>
						</div>
					{/if}
					{#if costPerDistance > 0}
						<div>
							<span class="opacity-70">Cost per {$units === 'metric' ? 'km' : 'mile'}:</span>
							<span class="font-semibold"
								>{formatCurrency(costPerDistance)}/{$units === 'metric' ? 'km' : 'mile'}</span
							>
						</div>
					{/if}
					{#if total > 0}
						<div>
							<span class="opacity-70">Total Cost:</span>
							<span class="font-semibold">{formatCurrency(total)}</span>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Validation Errors -->
{#if odoError}
	<div class="alert alert-error mb-4">
		<span>{odoError}</span>
	</div>
{/if}

<form class="grid grid-cols-[100px_1fr] items-center" onsubmit={handleSubmit}>
	<label for="date">Date</label>
	<p>{createdAt.toString()}</p>

	<label for="odo">ODO</label>
	<input id="odo" type="number" bind:value={odo} />

	<label for="price">{getPriceLabel()}</label>
	<input id="price" type="number" bind:value={price} placeholder="Price per {getUnitLabel()}" />

	<label for="amount">{getAmountLabel()}</label>
	<input
		id="amount"
		type="number"
		bind:value={amount}
		placeholder={`Amount in ${getUnitLabel()}`}
	/>

	<label for="total">Total</label>
	<input id="total" type="number" bind:value={total} disabled />

	<div class="col-span-2">
		<button class="btn btn-primary w-full" type="submit" value="submit" aria-label="submit">
			Submit
		</button>
	</div>
</form>
