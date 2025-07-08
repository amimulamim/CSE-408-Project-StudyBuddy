import { useEffect, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

interface QuizPerformanceChartProps {
  data: any[];
  timeframe: string;
  metric: string;
}

export function QuizPerformanceChart({ data, timeframe, metric }: QuizPerformanceChartProps) {
  const [processedData, setProcessedData] = useState<any>({ labels: [], datasets: [] });
  
  useEffect(() => {
    const newProcessedData = processQuizData(data, timeframe, metric);
    setProcessedData(newProcessedData);
  }, [data, timeframe, metric]);
  
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
      duration: 2000,
      easing: 'easeInOutQuart' as const
    }
  };

  return (
    <div className="h-96">
      <Line data={processedData} options={options} />
    </div>
  );
}

function processQuizData(data: any[], timeframe: string, metric: string) {
  // Filter data based on timeframe
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

  // Group by date and calculate metrics
  const grouped = filtered.reduce((acc, item) => {
    const date = new Date(item.createdAt).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  const labels = Object.keys(grouped).sort();
  const scores = labels.map(date => {
    const dayQuizzes = grouped[date];
    return dayQuizzes.reduce((sum, quiz) => sum + quiz.percentage, 0) / dayQuizzes.length;
  });

  return {
    labels,
    datasets: [
      {
        label: 'Average Score (%)',
        data: scores,
        borderColor: 'rgb(124, 58, 237)',
        backgroundColor: 'rgba(124, 58, 237, 0.1)',
        fill: true,
        tension: 0.4,
      }
    ]
  };
}