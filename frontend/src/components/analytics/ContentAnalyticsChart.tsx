import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface ContentAnalyticsChartProps {
  data: any[];
  timeframe: string;
}

export function ContentAnalyticsChart({ data, timeframe }: ContentAnalyticsChartProps) {
  const [processedData, setProcessedData] = useState<any>({ labels: [], datasets: [] });
  
  useEffect(() => {
    const newProcessedData = processContentData(data, timeframe);
    setProcessedData(newProcessedData);
  }, [data, timeframe]);
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#e2e8f0',
          font: { size: 12 }
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
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: '#94a3b8' }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: '#94a3b8' }
      }
    },
    animation: {
      duration: 1500,
      easing: 'easeInOutQuart' as const
    }
  };

  return (
    <div className="h-96">
      <Bar data={processedData} options={options} />
    </div>
  );
}

function processContentData(data: any[], timeframe: string) {
  // Filter data based on timeframe if needed
  const now = new Date();
  const filtered = data.filter(item => {
    const itemDate = new Date(item.createdAt);
    const diffDays = Math.floor((now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));
    
    switch (timeframe) {
      case '7days': return diffDays <= 7;
      case '30days': return diffDays <= 30;
      case '90days': return diffDays <= 90;
      case '1year': return diffDays <= 365;
      default: return true;
    }
  });

  // Group by content type
  const contentTypes = filtered.reduce((acc, item) => {
    const type = item.type || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    labels: Object.keys(contentTypes),
    datasets: [
      {
        label: 'Content Generated',
        data: Object.values(contentTypes),
        backgroundColor: [
          'rgba(124, 58, 237, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgba(124, 58, 237, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };
}