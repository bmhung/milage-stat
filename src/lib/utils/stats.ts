import { get } from 'svelte/store';
import { units } from '$lib/settings';
import type { FuelEntry } from '$lib/types/fuel';

export interface EfficiencyData {
	date: Date;
	actual: number;
	predicted?: number;
}

export interface CostData {
	month: string;
	cost: number;
	volume: number;
	pricePerUnit: number;
}

export interface PriceData {
	date: Date;
	price: number;
}

export interface PredictionData {
	month: string;
	predictedEfficiency: number;
	confidence: number;
	trendDirection: 'up' | 'down' | 'stable';
	recommendation: string;
}

export interface TrendAnalysis {
	overallTrend: 'up' | 'down' | 'stable';
	averageEfficiency: number;
	totalCost: number;
	totalDistance: number;
	fillUpCount: number;
	seasonalVariation: number;
}

export function calculateEfficiency(entry1: FuelEntry, entry2: FuelEntry): number {
	const distance = entry2.odo - entry1.odo;
	if (!distance || !entry2.amount) return 0;

	const currentUnits = get(units);
	if (currentUnits === 'metric') {
		// L/100km = (liters / distance) * 100
		return (entry2.amount / distance) * 100;
	} else {
		// MPG = distance / gallons
		return distance / entry2.amount;
	}
}

export function calculateCostPerDistance(entry1: FuelEntry, entry2: FuelEntry): number {
	const distance = entry2.odo - entry1.odo;
	if (!distance || !entry2.total) return 0;
	return entry2.total / distance;
}

export function groupByMonth(entries: FuelEntry[]): CostData[] {
	const monthlyData: { [key: string]: FuelEntry[] } = {};

	entries.forEach((entry) => {
		const entryDate = entry.createdAt instanceof Date ? entry.createdAt : entry.createdAt.toDate();
		const month = entryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
		if (!monthlyData[month]) monthlyData[month] = [];
		monthlyData[month].push(entry);
	});

	return Object.entries(monthlyData).map(([month, monthEntries]) => ({
		month,
		cost: monthEntries.reduce((sum, e) => sum + e.total, 0),
		volume: monthEntries.reduce((sum, e) => sum + e.amount, 0),
		pricePerUnit: monthEntries.reduce((sum, e) => sum + e.price, 0) / monthEntries.length
	}));
}

// A fill-up counts as a "full tank" when its amount is at least this fraction of
// the typical (median) fill. Anything below is treated as a partial top-up.
const FULL_TANK_RATIO = 0.6;

// Detect partial fill-ups automatically. Partial fills can't produce a valid
// efficiency on their own (the fuel added doesn't match the distance driven), so
// they get rolled into the next full tank instead of creating a misleading
// dip-then-spike in the trend.
function detectFullThreshold(entries: FuelEntry[]): number {
	const amounts = entries
		.map((e) => e.amount)
		.filter((a) => a > 0)
		.sort((a, b) => a - b);
	if (!amounts.length) return 0;
	const median = amounts[Math.floor(amounts.length / 2)];
	return median * FULL_TANK_RATIO;
}

export function generateEfficiencyTrend(entries: FuelEntry[]): EfficiencyData[] {
	const trendData: EfficiencyData[] = [];
	if (entries.length < 2) return trendData;

	const currentUnits = get(units);
	const fullThreshold = detectFullThreshold(entries);
	const isFull = (entry: FuelEntry) => entry.amount >= fullThreshold;

	// Tank-to-tank method: only measure efficiency between two full tanks, summing
	// every (partial or full) fill added in between. The starting full tank's own
	// amount isn't counted — it just establishes a known-full baseline.
	let segStartOdo: number | null = null;
	let accumulatedFuel = 0;

	for (const entry of entries) {
		if (segStartOdo === null) {
			// Wait for a full tank before we can start measuring a segment.
			if (isFull(entry)) segStartOdo = entry.odo;
			continue;
		}

		accumulatedFuel += entry.amount;

		if (isFull(entry)) {
			const distance = entry.odo - segStartOdo;
			if (distance > 0 && accumulatedFuel > 0) {
				const efficiency =
					currentUnits === 'metric'
						? (accumulatedFuel / distance) * 100
						: distance / accumulatedFuel;
				trendData.push({ date: getEntryDate(entry), actual: efficiency });
			}
			// Close this segment and start the next one at the current full tank.
			segStartOdo = entry.odo;
			accumulatedFuel = 0;
		}
	}

	return trendData;
}

export function generatePriceHistory(entries: FuelEntry[]): PriceData[] {
	return entries.map((entry) => {
		const entryDate = entry.createdAt instanceof Date ? entry.createdAt : entry.createdAt.toDate();
		return {
			date: entryDate,
			price: entry.price
		};
	});
}

export function generatePredictions(entries: FuelEntry[], months: number = 3): PredictionData[] {
	const efficiencyData = generateEfficiencyTrend(entries);
	if (efficiencyData.length < 3) return [];

	// Simple linear regression for trend prediction
	const n = Math.min(efficiencyData.length, 10); // Use last 10 data points
	const recentData = efficiencyData.slice(-n);

	const sumX = recentData.reduce((sum, _, i) => sum + i, 0);
	const sumY = recentData.reduce((sum, d) => sum + d.actual, 0);
	const sumXY = recentData.reduce((sum, d, i) => sum + i * d.actual, 0);
	const sumX2 = recentData.reduce((sum, _, i) => sum + i * i, 0);

	const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
	const intercept = (sumY - slope * sumX) / n;

	const predictions: PredictionData[] = [];
	const lastEfficiency = recentData[recentData.length - 1].actual;
	const trendDirection = slope > 0.1 ? 'up' : slope < -0.1 ? 'down' : 'stable';

	for (let i = 1; i <= months; i++) {
		const futureDate = new Date();
		futureDate.setMonth(futureDate.getMonth() + i);

		const predictedEfficiency = lastEfficiency + slope * (n + i - 1);
		const confidence = Math.max(20, 90 - i * 15); // Decreasing confidence

		let recommendation = '';
		if (trendDirection === 'down') {
			recommendation = 'Consider vehicle maintenance check';
		} else if (trendDirection === 'up') {
			recommendation = 'Great! Your efficiency is improving';
		} else {
			recommendation = 'Your efficiency is stable';
		}

		predictions.push({
			month: futureDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
			predictedEfficiency: Math.max(0, predictedEfficiency),
			confidence,
			trendDirection,
			recommendation
		});
	}

	return predictions;
}

export function analyzeTrends(entries: FuelEntry[]): TrendAnalysis {
	if (entries.length < 2) {
		return {
			overallTrend: 'stable',
			averageEfficiency: 0,
			totalCost: 0,
			totalDistance: 0,
			fillUpCount: entries.length,
			seasonalVariation: 0
		};
	}

	const efficiencyData = generateEfficiencyTrend(entries);
	const averageEfficiency =
		efficiencyData.reduce((sum, d) => sum + d.actual, 0) / efficiencyData.length;

	const firstEntry = entries[0];
	const lastEntry = entries[entries.length - 1];
	const totalCost = entries.reduce((sum, e) => sum + e.total, 0);
	const totalDistance = lastEntry.odo - firstEntry.odo;

	// Simple trend analysis
	const recentHalf = efficiencyData.slice(-Math.floor(efficiencyData.length / 2));
	const earlyHalf = efficiencyData.slice(0, Math.floor(efficiencyData.length / 2));

	const recentAvg = recentHalf.reduce((sum, d) => sum + d.actual, 0) / recentHalf.length;
	const earlyAvg = earlyHalf.reduce((sum, d) => sum + d.actual, 0) / earlyHalf.length;

	let overallTrend: 'up' | 'down' | 'stable';
	if (recentAvg > earlyAvg * 1.05) {
		overallTrend = 'up';
	} else if (recentAvg < earlyAvg * 0.95) {
		overallTrend = 'down';
	} else {
		overallTrend = 'stable';
	}

	// Calculate seasonal variation (simplified)
	const monthlyEfficiency: { [key: string]: number[] } = {};
	entries.forEach((entry, i) => {
		if (i === 0) return;
		const entryDate = entry.createdAt instanceof Date ? entry.createdAt : entry.createdAt.toDate();
		const month = entryDate.getMonth();
		const efficiency = calculateEfficiency(entries[i - 1], entry);
		if (!monthlyEfficiency[month]) monthlyEfficiency[month] = [];
		monthlyEfficiency[month].push(efficiency);
	});

	const monthlyAverages = Object.values(monthlyEfficiency).map(
		(monthEff) => monthEff.reduce((sum, e) => sum + e, 0) / monthEff.length
	);
	const seasonalVariation = Math.max(...monthlyAverages) - Math.min(...monthlyAverages);

	return {
		overallTrend,
		averageEfficiency,
		totalCost,
		totalDistance,
		fillUpCount: entries.length,
		seasonalVariation
	};
}

export function filterEntriesByDateRange(
	entries: FuelEntry[],
	startDate: Date,
	endDate: Date
): FuelEntry[] {
	return entries.filter((entry) => {
		const entryDate = entry.createdAt instanceof Date ? entry.createdAt : entry.createdAt.toDate();
		return entryDate >= startDate && entryDate <= endDate;
	});
}

export function getEntryDate(entry: FuelEntry): Date {
	return entry.createdAt instanceof Date ? entry.createdAt : entry.createdAt.toDate();
}
