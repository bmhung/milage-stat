export interface FuelEntry {
	id: string;
	userId: string;
	odo: number;
	createdAt: Date | any;
	price: number;
	amount: number;
	total: number;
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
