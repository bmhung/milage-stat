<script lang="ts">
	import { auth, user as currentUser } from '$lib/firebase';

	import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

	async function signInWithGoogle() {
		const provider = new GoogleAuthProvider();
		const user = await signInWithPopup(auth, provider);
		console.log(user);
	}
</script>

<h2>Login</h2>

{#if $currentUser}
	<p>Logged in</p>
{:else}
	<button class="btn btn-primary" onclick={signInWithGoogle}>Sign in with Google</button>
{/if}
