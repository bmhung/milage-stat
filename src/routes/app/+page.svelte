<script lang="ts">
	import { addDoc, collection } from 'firebase/firestore';
	import { db, user as currentUser } from '$lib/firebase';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { loadUserSettings, getPriceLabel, getAmountLabel, getUnitLabel } from '$lib/settings';
	import { onMount } from 'svelte';

	let odo = $state('');
	let createdAt = new Date();
	let price = $state('');
	let amount = $state('');
	let total = $derived(Number(price) * Number(amount));

	onMount(async () => {
		if ($currentUser) {
			await loadUserSettings($currentUser.uid);
		}
	});

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
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		fuelUp();
	}
</script>

<span>Previously</span>
<div class="grid grid-cols-[100px_1fr] items-center">
	<span>ODO</span>
	<span></span>
	<span>{getPriceLabel()}</span>
	<span></span>
	<span>{getAmountLabel()}</span>
	<span></span>
</div>

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
