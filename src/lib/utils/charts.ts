import type { ChartConfiguration } from 'chart.js';

export const defaultChartOptions = {
	responsive: true,
	maintainAspectRatio: false,
	plugins: {
		legend: {
			position: 'top' as const,
			labels: {
				boxWidth: 12,
				padding: 20,
				usePointStyle: true
			}
		}
	}
};

export const mobileChartOptions = {
	...defaultChartOptions,
	plugins: {
		...defaultChartOptions.plugins,
		legend: {
			...defaultChartOptions.plugins.legend,
			display: false
		}
	}
};

export const createEfficiencyChartOptions = (isMobile: boolean): ChartConfiguration<'line'> => ({
	type: 'line',
	data: {
		labels: [],
		datasets: [
			{
				label: 'Fuel Efficiency',
				data: [],
				borderColor: '#3B82F6',
				backgroundColor: 'rgba(59, 130, 246, 0.1)',
				borderWidth: 2,
				fill: true,
				tension: 0.4
			}
		]
	},
	options: {
		...defaultChartOptions,
		scales: {
			y: {
				beginAtZero: true,
				title: {
					display: true,
					text: 'Fuel Efficiency'
				}
			},
			x: {
				title: {
					display: true,
					text: 'Date'
				}
			}
		},
		plugins: {
			...defaultChartOptions.plugins,
			legend: {
				display: !isMobile
			}
		}
	}
});

export const createCostChartOptions = (isMobile: boolean): ChartConfiguration<'bar'> => ({
	type: 'bar',
	data: {
		labels: [],
		datasets: [
			{
				label: 'Total Cost',
				data: [],
				backgroundColor: '#10B981',
				borderColor: '#10B981',
				borderWidth: 1
			},
			{
				label: 'Volume',
				data: [],
				backgroundColor: '#F59E0B',
				borderColor: '#F59E0B',
				borderWidth: 1
			}
		]
	},
	options: {
		...defaultChartOptions,
		scales: {
			y: {
				beginAtZero: true,
				title: {
					display: true,
					text: 'Amount'
				}
			}
		},
		plugins: {
			...defaultChartOptions.plugins,
			legend: {
				display: !isMobile
			}
		}
	}
});

export const createPriceChartOptions = (isMobile: boolean): ChartConfiguration<'line'> => ({
	type: 'line',
	data: {
		labels: [],
		datasets: [
			{
				label: 'Price per Unit',
				data: [],
				borderColor: '#EF4444',
				backgroundColor: 'rgba(239, 68, 68, 0.1)',
				borderWidth: 2,
				fill: true,
				tension: 0.4
			}
		]
	},
	options: {
		...defaultChartOptions,
		scales: {
			y: {
				beginAtZero: true,
				title: {
					display: true,
					text: 'Price per Unit'
				}
			},
			x: {
				title: {
					display: true,
					text: 'Date'
				}
			}
		},
		plugins: {
			...defaultChartOptions.plugins,
			legend: {
				display: !isMobile
			}
		}
	}
});

export const createPredictionChartOptions = (isMobile: boolean): ChartConfiguration<'line'> => ({
	type: 'line',
	data: {
		labels: [],
		datasets: [
			{
				label: 'Historical Efficiency',
				data: [],
				borderColor: '#6366F1',
				backgroundColor: 'rgba(99, 102, 241, 0.1)',
				borderWidth: 2,
				fill: true,
				tension: 0.4
			},
			{
				label: 'Predicted Efficiency',
				data: [],
				borderColor: '#10B981',
				backgroundColor: 'rgba(16, 185, 129, 0.1)',
				borderWidth: 2,
				borderDash: [5, 5],
				fill: true,
				tension: 0.4
			}
		]
	},
	options: {
		...defaultChartOptions,
		scales: {
			y: {
				beginAtZero: true,
				title: {
					display: true,
					text: 'Fuel Efficiency'
				}
			}
		},
		plugins: {
			...defaultChartOptions.plugins,
			legend: {
				display: !isMobile
			}
		}
	}
});
