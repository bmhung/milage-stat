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
	import { user as currentUser, db } from '$lib/firebase';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

	let settings = $state({
		currency: 'USD' as 'USD' | 'VND',
		units: 'imperial' as 'imperial' | 'metric'
	});

	let loading = $state(true);
	let saving = $state(false);
	let message = $state<string | null>(null);
	let originalSettings = $state({ ...settings });

	// CSV Import states
	let importing = $state(false);
	let importFile = $state<File | null>(null);
	let importProgress = $state('');
	let importStats = $state({ imported: 0, errors: 0, total: 0 });

	onMount(async () => {
		if (!get(currentUser)) {
			goto('/login');
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

	// CSV Import Functions
	async function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		if (!file.name.toLowerCase().endsWith('.csv')) {
			message = 'Please select a CSV file';
			setTimeout(() => (message = null), 3000);
			return;
		}

		importFile = file;
		await processImportFile();
	}

	async function processImportFile() {
		if (!importFile || !get(currentUser)) return;

		try {
			importing = true;
			message = null;
			importProgress = 'Reading CSV file...';

			const text = await importFile.text();
			const rows = parseCSV(text);

			if (rows.length === 0) {
				message = 'No valid data found in CSV file';
				return;
			}

			importProgress = `Importing ${rows.length} entries...`;
			await importToFierebase(rows);

			message = `Successfully imported ${importStats.imported} entries${importStats.errors > 0 ? ` (${importStats.errors} errors)` : ''}`;
			setTimeout(() => (message = null), 5000);
		} catch (error: any) {
			message = `Import failed: ${error.message}`;
		} finally {
			importing = false;
			importProgress = '';
			// Clear file input
			const fileInput = document.getElementById('csv-file-input') as HTMLInputElement;
			if (fileInput) fileInput.value = '';
			importFile = null;
		}
	}

	function parseCSV(text: string): any[] {
		const lines = text.trim().split('\n');
		if (lines.length < 2) {
			throw new Error('CSV file must have header and at least one data row');
		}

		const headers = lines[0].split(';').map((h) => h.trim().toLowerCase());
		const expectedHeaders = ['date', 'odo', 'price', 'amount', 'total'];
		console.log(headers);

		// Validate headers
		for (const expected of expectedHeaders) {
			if (!headers.includes(expected)) {
				throw new Error(`Missing required column: ${expected}`);
			}
		}

		const rows = [];
		importStats = { imported: 0, errors: 0, total: lines.length - 1 };

		for (let i = 1; i < lines.length; i++) {
			try {
				const values = lines[i].split(';').map((v) => v.trim());
				const row: any = {};

				headers.forEach((header, index) => {
					row[header] = values[index];
				});

				// Validate and convert data
				const validatedRow = validateCSVRow(row);
				if (validatedRow) {
					rows.push(validatedRow);
					importStats.imported++;
				} else {
					importStats.errors++;
				}
			} catch (error) {
				importStats.errors++;
			}
		}

		return rows;
	}

	function validateCSVRow(row: any): any | null {
		console.log(row);
		try {
			// Parse date from dd-mm-yyyy format
			const dateStr = row.date;
			const dateParts = dateStr.split('-');
			if (dateParts.length !== 3) {
				throw new Error('Invalid date format');
			}
			const day = parseInt(dateParts[0]);
			const month = parseInt(dateParts[1]);
			const year = parseInt(dateParts[2]);

			const date = new Date(year, month - 1, day);
			if (isNaN(date.getTime())) {
				throw new Error('Invalid date');
			}

			return {
				createdAt: date,
				odo: parseFloat(row.odo),
				price: parseFloat(row.price),
				amount: parseFloat(row.amount),
				total: parseFloat(row.total)
			};
		} catch (error) {
			return null;
		}
	}

	async function importToFierebase(rows: any[]) {
		if (!get(currentUser)) return;

		const userId = get(currentUser)!.uid;
		const batchSize = 10; // Process in batches to avoid overwhelming Firestore
		let processed = 0;

		for (let i = 0; i < rows.length; i += batchSize) {
			const batch = rows.slice(i, i + batchSize);

			for (const row of batch) {
				try {
					await addDoc(collection(db, 'fills'), {
						userId,
						createdAt: serverTimestamp(),
						// Store the actual date for sorting/filtering
						actualDate: row.createdAt,
						odo: row.odo,
						price: row.price,
						amount: row.amount,
						total: row.total
					});
					processed++;
				} catch (error) {
					importStats.errors++;
				}
			}

			// Update progress
			importProgress = `Imported ${processed}/${rows.length} entries...`;
		}
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

		<!-- Data Management -->
		<div class="card bg-base-100 mb-6 shadow-sm">
			<div class="card-body">
				<h3 class="card-title text-base">Data Management</h3>
				<div class="space-y-3">
					<p class="text-sm opacity-70">
						View, edit, and manage all your fuel entries with filtering and sorting options.
					</p>
					<a href="/app/data" class="btn btn-outline btn-block"> 📊 View Fuel Data </a>

					<!-- CSV Import Section -->
					<div class="divider text-sm">OR</div>

					<div>
						<p class="mb-2 text-sm opacity-70">Import historical fuel data from a CSV file.</p>
						<p class="mb-3 text-xs opacity-60">
							Expected columns: date(dd-mm-yyyy), odo, price, amount, total
						</p>

						<input
							id="csv-file-input"
							type="file"
							accept=".csv"
							onchange={handleFileSelect}
							disabled={importing || saving}
							class="file-input file-input-sm file-input-bordered w-full"
						/>

						{#if importing}
							<div class="mt-2">
								<div class="flex items-center gap-2">
									<span class="loading loading-spinner loading-xs"></span>
									<span class="text-sm">{importProgress}</span>
								</div>
								{#if importStats.total > 0}
									<div class="mt-1 text-xs opacity-70">
										Imported: {importStats.imported} | Errors: {importStats.errors}
									</div>
								{/if}
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Actions -->
		<div class="mb-4 flex gap-2">
			<button
				onclick={saveSettings}
				class="btn btn-primary"
				disabled={!hasChanges() || saving || importing}
			>
				{#if saving}
					<span class="loading loading-spinner loading-sm"></span>
					Saving...
				{:else}
					Save Settings
				{/if}
			</button>

			<button onclick={resetToDefaults} class="btn btn-ghost" disabled={saving || importing}>
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
