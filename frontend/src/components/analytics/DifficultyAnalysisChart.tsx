import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DifficultyAnalysisChartProps {
  data: any[];
}

const COLORS = {
  Easy: '#22c55e',
  Medium: '#f59e0b', 
  Hard: '#ef4444'
};

export function DifficultyAnalysisChart({ data }: DifficultyAnalysisChartProps) {
  const processedData = processDifficultyData(data);

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
          <XAxis 
            dataKey="difficulty" 
            stroke="#94a3b8"
            fontSize={12}
          />
          <YAxis 
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
              name === 'averageScore' ? 'Average Score' : name === 'count' ? 'Quiz Count' : name
            ]}
          />
          <Bar dataKey="averageScore" name="Average Score">
            {processedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.difficulty as keyof typeof COLORS]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function processDifficultyData(data: any[]) {
  const difficulties = ['Easy', 'Medium', 'Hard'];
  
  return difficulties.map(difficulty => {
    const quizzesForDifficulty = data.filter(quiz => 
      quiz.difficulty?.toLowerCase() === difficulty.toLowerCase()
    );
    
    const averageScore = quizzesForDifficulty.length > 0
      ? quizzesForDifficulty.reduce((sum, quiz) => sum + quiz.percentage, 0) / quizzesForDifficulty.length
      : 0;
    
    return {
      difficulty,
      averageScore,
      count: quizzesForDifficulty.length
    };
  });
}