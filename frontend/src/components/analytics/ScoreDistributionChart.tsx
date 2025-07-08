import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface ScoreDistributionChartProps {
  data: any[];
}

export function ScoreDistributionChart({ data }: ScoreDistributionChartProps) {
  const distribution = {
    'Excellent (90-100%)': data.filter(q => q.percentage >= 90).length,
    'Good (80-89%)': data.filter(q => q.percentage >= 80 && q.percentage < 90).length,
    'Average (70-79%)': data.filter(q => q.percentage >= 70 && q.percentage < 80).length,
    'Below Average (60-69%)': data.filter(q => q.percentage >= 60 && q.percentage < 70).length,
    'Poor (<60%)': data.filter(q => q.percentage < 60).length,
  };

  const chartData = {
    labels: Object.keys(distribution),
    datasets: [
      {
        data: Object.values(distribution),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(107, 114, 128, 0.8)',
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(107, 114, 128, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#e2e8f0',
          font: { size: 11 },
          padding: 15
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#e2e8f0',
        bodyColor: '#e2e8f0',
        borderColor: '#7c3aed',
        borderWidth: 1,
      }
    },
    animation: {
      animateRotate: true,
      duration: 2000,
    }
  };

  return (
    <div className="h-80">
      <Doughnut data={chartData} options={options} />
    </div>
  );
}