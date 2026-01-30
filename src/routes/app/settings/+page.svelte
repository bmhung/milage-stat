<script lang="ts">
	import {
		userSettings,
		currency,
		units,
		saveUserSettings,
		loadUserSettings,
		formatCurrency,
		getUnitLabel
	} from '$lib/settings';
	import { get } from 'svelte/store';
	import { user as currentUser } from '$lib/firebase';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let settings = $state({
		currency: 'USD' as 'USD' | 'VND',
		units: 'imperial' as 'imperial' | 'metric'
	});

	let loading = $state(true);
	let saving = $state(false);
	let message = $state<string | null>(null);
	let originalSettings = $state(settings);

	onMount(async () => {
		if (!get(currentUser)) {
			goto('/app/login');
			return;
		}

		try {
			const loadedSettings = await loadUserSettings(get(currentUser)!.uid);
			settings = { ...loadedSettings };
			originalSettings = { ...loadedSettings };
		} catch (error) {
			message = 'Failed to load settings';
		} finally {
			loading = false;
		}
	});

	async function saveSettings() {
		if (!get(currentUser)) return;

		try {
			saving = true;
			message = null;

			await saveUserSettings(get(currentUser)!.uid, settings);
			originalSettings = { ...settings };

			message = 'Settings saved successfully!';
			setTimeout(() => (message = null), 3000);
		} catch (error) {
			message = 'Failed to save settings';
		} finally {
			saving = false;
		}
	}

	function detectDefaultSettingsLocal() {
		// Default to USD + imperial
		const defaults = {
			currency: 'USD' as 'USD' | 'VND',
			units: 'imperial' as 'imperial' | 'metric'
		};

		// Detect user locale
		if (typeof navigator !== 'undefined') {
			const locale = navigator.language || 'en-US';
			const countryCode = locale.split('-')[1]?.toUpperCase();

			// Currency detection - Vietnamese users get VND
			if (locale.includes('vi') || countryCode === 'VN') {
				defaults.currency = 'VND';
			}

			// Unit detection - Most countries use metric, except US, Liberia, and Myanmar
			if (!['US', 'LR', 'MM'].includes(countryCode || '')) {
				defaults.units = 'metric';
			}
		}

		return defaults;
	}

	async function resetToDefaults() {
		const defaults = detectDefaultSettingsLocal();
		settings = { ...defaults };
	}

	function hasChanges() {
		return (
			settings.currency !== originalSettings.currency || settings.units !== originalSettings.units
		);
	}

	function previewAmount() {
		return formatCurrency(123.45);
	}
</script>

<svelte:head>
	<title>Settings</title>
	<meta name="description" content="Configure your currency and unit preferences" />
</svelte:head>

<div class="container mx-auto p-4">
	<h1 class="mb-6 text-2xl font-bold">Settings</h1>

	{#if loading}
		<div class="flex justify-center py-8">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else}
		<!-- Currency Settings -->
		<div class="card bg-base-100 mb-6 shadow-sm">
			<div class="card-body">
				<h2 class="card-title">Currency</h2>

				<div class="form-control">
					<label class="label cursor-pointer">
						<input
							type="radio"
							name="currency"
							value="USD"
							bind:group={settings.currency}
							class="radio"
						/>
						<span class="label-text">USD ($) - US Dollar</span>
					</label>
				</div>

				<div class="form-control">
					<label class="label cursor-pointer">
						<input
							type="radio"
							name="currency"
							value="VND"
							bind:group={settings.currency}
							class="radio"
						/>
						<span class="label-text">VND (₫) - Vietnamese Dong</span>
					</label>
				</div>

				<!-- Preview -->
				<div class="bg-base-200 mt-4 rounded p-3">
					<div class="text-sm opacity-70">Preview:</div>
					<div class="text-lg font-semibold">{previewAmount()}</div>
				</div>
			</div>
		</div>

		<!-- Units Settings -->
		<div class="card bg-base-100 mb-6 shadow-sm">
			<div class="card-body">
				<h2 class="card-title">Fuel Units</h2>

				<div class="form-control">
					<label class="label cursor-pointer">
						<input
							type="radio"
							name="units"
							value="imperial"
							bind:group={settings.units}
							class="radio"
						/>
						<span class="label-text">Imperial (gallons)</span>
					</label>
				</div>

				<div class="form-control">
					<label class="label cursor-pointer">
						<input
							type="radio"
							name="units"
							value="metric"
							bind:group={settings.units}
							class="radio"
						/>
						<span class="label-text">Metric (liters)</span>
					</label>
				</div>

				<div class="bg-base-200 mt-4 rounded p-3">
					<div class="text-sm opacity-70">This will affect:</div>
					<ul class="mt-1 list-inside list-disc text-sm">
						<li>Fuel amount display ({getUnitLabel()})</li>
						<li>Price display format (per {getUnitLabel()})</li>
						<li>Form labels in fuel entry</li>
					</ul>
				</div>
			</div>
		</div>

		<!-- Actions -->
		<div class="mb-4 flex gap-2">
			<button onclick={saveSettings} class="btn btn-primary" disabled={!hasChanges() || saving}>
				{#if saving}
					<span class="loading loading-spinner loading-sm"></span>
					Saving...
				{:else}
					Save Settings
				{/if}
			</button>

			<button onclick={resetToDefaults} class="btn btn-ghost" disabled={saving}>
				Reset to Defaults
			</button>
		</div>

		<!-- Messages -->
		{#if message}
			<div class="alert {message.includes('Failed') ? 'alert-error' : 'alert-success'}">
				{message}
			</div>
		{/if}

		<!-- Help Section -->
		<div class="card bg-base-100 shadow-sm">
			<div class="card-body">
				<h3 class="card-title text-base">About Settings</h3>
				<div class="space-y-2 text-sm opacity-70">
					<p>
						<strong>Currency:</strong> Affects how prices and totals are displayed throughout the app.
					</p>
					<p>
						<strong>Units:</strong> Determines whether fuel amounts are shown in gallons or liters.
					</p>
					<p>
						<strong>Default:</strong> Settings are automatically detected from your browser locale when
						you first visit.
					</p>
					<p>
						<strong>Note:</strong> Historical fuel entries remain in their original units. Only display
						formatting is affected.
					</p>
				</div>
			</div>
		</div>
	{/if}
</div>
