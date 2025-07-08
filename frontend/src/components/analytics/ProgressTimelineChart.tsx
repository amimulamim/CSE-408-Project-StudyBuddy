import { useEffect, useState } from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ProgressTimelineChartProps {
  quizData: any[];
  contentData: any[];
  timeframe: string;
}

export function ProgressTimelineChart({ quizData, contentData, timeframe }: ProgressTimelineChartProps) {
  const [processedData, setProcessedData] = useState<any[]>([]);

  useEffect(() => {
    const newProcessedData = processTimelineData(quizData, contentData, timeframe);
    setProcessedData(newProcessedData);
  }, [quizData, contentData, timeframe]);

  return (
    <div className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
          <XAxis 
            dataKey="date" 
            stroke="#94a3b8"
            fontSize={11}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            yAxisId="left"
            stroke="#94a3b8"
            fontSize={12}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right"
            stroke="#94a3b8"
            fontSize={12}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid #7c3aed',
              borderRadius: '8px',
              color: '#e2e8f0'
            }}
            formatter={(value: any, name: string) => [
              name === 'averageScore' ? `${value.toFixed(1)}%` : value,
              name === 'averageScore' ? 'Average Score' : 
              name === 'quizCount' ? 'Quizzes' :
              name === 'contentCount' ? 'Content Created' : name
            ]}
          />
          <Legend 
            wrapperStyle={{ color: '#e2e8f0' }}
          />
          <Bar 
            yAxisId="right"
            dataKey="quizCount" 
            fill="#7c3aed" 
            name="Quiz Count"
            opacity={0.7}
          />
          <Bar 
            yAxisId="right"
            dataKey="contentCount" 
            fill="#06b6d4" 
            name="Content Count"
            opacity={0.7}
          />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="averageScore" 
            stroke="#22c55e" 
            strokeWidth={3}
            dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
            name="Average Score"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function processTimelineData(quizData: any[], contentData: any[], timeframe: string) {
  // Filter data based on timeframe
  const now = new Date();
  const filterByTimeframe = (item: any) => {
    const itemDate = new Date(item.createdAt);
    const diffDays = Math.floor((now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));
    
    switch (timeframe) {
      case '7days': return diffDays <= 7;
      case '30days': return diffDays <= 30;
      case '90days': return diffDays <= 90;
      case '1year': return diffDays <= 365;
      default: return true;
    }
  };

  const filteredQuizData = quizData.filter(filterByTimeframe);
  const filteredContentData = contentData.filter(filterByTimeframe);

  // Group by date
  const dateMap = new Map<string, {
    quizzes: any[];
    content: any[];
  }>();

  // Process quiz data
  filteredQuizData.forEach(quiz => {
    const date = new Date(quiz.createdAt).toLocaleDateString();
    if (!dateMap.has(date)) {
      dateMap.set(date, { quizzes: [], content: [] });
    }
    dateMap.get(date)!.quizzes.push(quiz);
  });

  // Process content data
  filteredContentData.forEach(content => {
    const date = new Date(content.createdAt).toLocaleDateString();
    if (!dateMap.has(date)) {
      dateMap.set(date, { quizzes: [], content: [] });
    }
    dateMap.get(date)!.content.push(content);
  });

  // Convert to array and sort by date
  const result = Array.from(dateMap.entries())
    .map(([date, data]) => {
      const averageScore = data.quizzes.length > 0
        ? data.quizzes.reduce((sum, quiz) => sum + quiz.percentage, 0) / data.quizzes.length
        : 0;

      return {
        date: formatDateForDisplay(date, timeframe),
        quizCount: data.quizzes.length,
        contentCount: data.content.length,
        averageScore,
        totalActivities: data.quizzes.length + data.content.length
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return result;
}

function formatDateForDisplay(dateString: string, timeframe: string): string {
  const date = new Date(dateString);
  
  if (timeframe === '7days') {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } else if (timeframe === '30days') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
}