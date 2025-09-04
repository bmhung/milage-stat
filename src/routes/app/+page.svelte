<script lang="ts">
	import { addDoc, collection, doc, writeBatch } from 'firebase/firestore';
	import { db } from '$lib/firebase';

	let odo = $state('');
	let createdAt = new Date();
	let price = $state('');
	let amount = $state('');
	let total = $derived(Number(price) * Number(amount));

	async function fuelUp() {
		addDoc(collection(db, 'fills'), {
			odo,
			createdAt,
			price,
			amount,
			total
		});
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		fuelUp();
	}
</script>

<form class="grid grid-cols-[100px_1fr] items-center" onsubmit={handleSubmit}>
	<label for="date">Date</label>
	<p>{createdAt.toString()}</p>

	<label for="odo">ODO</label>
	<input id="odo" type="number" bind:value={odo} />

	<label for="price">Price</label>
	<input id="price" type="number" bind:value={price} />

	<label for="amount">Amount</label>
	<input id="amount" type="number" bind:value={amount} />

	<label for="total">Total</label>
	<input id="total" type="number" bind:value={total} disabled />

	<div class="col-span-2">
		<button class="btn btn-primary w-full" type="submit" value="submit" aria-label="submit">
			Submit
		</button>
	</div>
</form>
