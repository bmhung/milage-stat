// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import {
	getAuth,
	onAuthStateChanged,
	sendSignInLinkToEmail,
	isSignInWithEmailLink,
	signInWithEmailLink,
	signOut,
	type User
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { writable, derived } from 'svelte/store';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
	apiKey: import.meta.env.VITE_API_KEY,
	projectId: import.meta.env.VITE_PROJECT_ID,
	messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_APP_ID,
	authDomain: 'milagestat.firebaseapp.com',
	storageBucket: 'milagestat.firebasestorage.app'
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore();
export const auth = getAuth();
export const storage = getStorage();

// Auth state stores
const currentUser = writable<User | null>(null);
const authReady = writable(false);

onAuthStateChanged(auth, (user) => {
	currentUser.set(user);
	authReady.set(true);
});

function userStore() {
	let unsubscribe: () => void;

	if (!auth || !globalThis.window) {
		console.warn('Auth is not initialized or not in browser');
		const { subscribe } = writable<User | null>(null);
		return {
			subscribe
		};
	}

	const { subscribe } = writable(auth?.currentUser ?? null, (set) => {
		unsubscribe = onAuthStateChanged(auth, (user) => {
			set(user);
		});

		return () => unsubscribe();
	});

	return {
		subscribe
	};
}

export const user = userStore();

// Derived store for auth ready state
export const isAuthReady = derived(authReady, ($authReady) => $authReady);

// Helper to check if user is authenticated (synchronous check)
export function isAuthenticated(): boolean {
	let result = false;
	const unsubscribe = user.subscribe((u) => {
		result = u !== null;
	});
	unsubscribe();
	return result;
}

// --- Passwordless email-link (magic link) sign-in ---

const EMAIL_FOR_SIGN_IN_KEY = 'emailForSignIn';

// Send a one-time sign-in link to the given email. The link returns to /login,
// which completes the sign-in via completeEmailLinkSignIn().
export async function sendLoginLink(email: string): Promise<void> {
	const actionCodeSettings = {
		url: `${window.location.origin}/login`,
		handleCodeInApp: true // required for email-link sign-in
	};
	await sendSignInLinkToEmail(auth, email, actionCodeSettings);
	// Remember the email so we don't have to prompt for it when the link is opened.
	window.localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, email);
}

// True if the current URL is a Firebase email sign-in link.
export function isEmailSignInLink(url: string): boolean {
	return isSignInWithEmailLink(auth, url);
}

// Complete sign-in when the user opens the magic link. Returns true on success.
export async function completeEmailLinkSignIn(url: string): Promise<boolean> {
	if (!isSignInWithEmailLink(auth, url)) return false;

	// The link may be opened on a different device, where localStorage is empty —
	// fall back to asking the user to confirm their email.
	let email = window.localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY);
	if (!email) {
		email = window.prompt('Please confirm your email to finish signing in');
	}
	if (!email) return false;

	await signInWithEmailLink(auth, email, url);
	window.localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
	return true;
}

// Sign the current user out.
export async function logout(): Promise<void> {
	await signOut(auth);
}
