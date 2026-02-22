// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
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
