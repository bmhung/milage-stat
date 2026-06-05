<script lang="ts">
	import {
		auth,
		user as currentUser,
		isAuthReady,
		sendLoginLink,
		isEmailSignInLink,
		completeEmailLinkSignIn
	} from '$lib/firebase';
	import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let signingIn = $state(false);
	let email = $state('');
	let sendingLink = $state(false);
	let linkSent = $state(false);
	let completing = $state(false);
	let errorMessage = $state('');

	async function signInWithGoogle() {
		try {
			signingIn = true;
			errorMessage = '';
			const provider = new GoogleAuthProvider();
			await signInWithPopup(auth, provider);
			goto('/');
		} catch (error) {
			console.error('Sign in failed:', error);
			errorMessage = 'Google sign in failed. Please try again.';
		} finally {
			signingIn = false;
		}
	}

	async function sendEmailLink(event: Event) {
		event.preventDefault();
		if (!email) return;
		try {
			sendingLink = true;
			errorMessage = '';
			await sendLoginLink(email);
			linkSent = true;
		} catch (error) {
			console.error('Failed to send login link:', error);
			errorMessage = 'Could not send the login link. Check the email and try again.';
		} finally {
			sendingLink = false;
		}
	}

	onMount(() => {
		// If the user arrived via a magic link, complete the sign-in.
		if (isEmailSignInLink(window.location.href)) {
			completing = true;
			completeEmailLinkSignIn(window.location.href)
				.then((ok) => {
					if (ok) {
						goto('/');
					} else {
						errorMessage = 'Sign-in link is invalid or has expired. Please request a new one.';
					}
				})
				.catch((error) => {
					console.error('Email link sign-in failed:', error);
					errorMessage = 'Sign-in link is invalid or has expired. Please request a new one.';
				})
				.finally(() => {
					completing = false;
				});
		}

		// Redirect if already logged in
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

			{#if !$isAuthReady || completing}
				<div class="flex justify-center py-8">
					<span class="loading loading-spinner loading-lg"></span>
				</div>
			{:else if $currentUser}
				<div class="text-center">
					<p class="py-4">Redirecting to home...</p>
					<span class="loading loading-spinner"></span>
				</div>
			{:else}
				{#if errorMessage}
					<div class="alert alert-error mt-4">
						<span class="text-sm">{errorMessage}</span>
					</div>
				{/if}

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

				<div class="divider">OR</div>

				{#if linkSent}
					<div class="alert alert-success">
						<span class="text-sm">Check your inbox — we sent a sign-in link to {email}.</span>
					</div>
					<button
						class="btn btn-ghost btn-sm mt-2"
						onclick={() => {
							linkSent = false;
						}}
					>
						Use a different email
					</button>
				{:else}
					<form class="form-control gap-2" onsubmit={sendEmailLink}>
						<label class="label" for="email">
							<span class="label-text">Sign in with an email link</span>
						</label>
						<input
							id="email"
							type="email"
							required
							bind:value={email}
							placeholder="you@example.com"
							class="input input-bordered w-full"
						/>
						<button class="btn btn-primary mt-2" type="submit" disabled={sendingLink || !email}>
							{#if sendingLink}
								<span class="loading loading-spinner loading-sm"></span>
								Sending link...
							{:else}
								Send login link
							{/if}
						</button>
					</form>
				{/if}
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
