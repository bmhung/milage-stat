<script lang="ts">
	import { auth, user as currentUser, isAuthReady } from '$lib/firebase';
	import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let signingIn = $state(false);

	async function signInWithGoogle() {
		try {
			signingIn = true;
			const provider = new GoogleAuthProvider();
			await signInWithPopup(auth, provider);
			goto('/');
		} catch (error) {
			console.error('Sign in failed:', error);
		} finally {
			signingIn = false;
		}
	}

	// Redirect if already logged in
	onMount(() => {
		const unsubscribe = currentUser.subscribe((user) => {
			if (user) {
				goto('/');
			}
		});
		return unsubscribe;
	});
</script>

<svelte:head>
	<title>Login - Milage Stat</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center p-4">
	<div class="card bg-base-100 w-full max-w-md shadow-xl">
		<div class="card-body">
			<h2 class="card-title text-center text-2xl">Welcome to Milage Stat</h2>
			<p class="text-center opacity-70">Track your fuel consumption and expenses</p>

			{#if !$isAuthReady}
				<div class="flex justify-center py-8">
					<span class="loading loading-spinner loading-lg"></span>
				</div>
			{:else if $currentUser}
				<div class="text-center">
					<p class="py-4">Redirecting to home...</p>
					<span class="loading loading-spinner"></span>
				</div>
			{:else}
				<div class="form-control mt-6">
					<button class="btn btn-primary" onclick={signInWithGoogle} disabled={signingIn}>
						{#if signingIn}
							<span class="loading loading-spinner loading-sm"></span>
							Signing in...
						{:else}
							Sign in with Google
						{/if}
					</button>
				</div>
			{/if}

			<div class="divider">OR</div>

			<div class="text-center text-sm opacity-70">
				<p>Continue without signing in</p>
				<p class="mt-2 text-xs">Your data will only be stored locally on this device</p>
				<a href="/" class="btn btn-ghost btn-sm mt-4">Continue as Guest</a>
			</div>
		</div>
	</div>
</div>
