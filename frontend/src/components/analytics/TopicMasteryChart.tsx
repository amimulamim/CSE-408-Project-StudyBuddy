import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

interface TopicMasteryChartProps {
  data: any[];
}

export function TopicMasteryChart({ data }: TopicMasteryChartProps) {
  const processedData = processTopicData(data);
  console.log('Printing processed data from topic mastery chart');
  console.log(processedData);

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart 
          data={processedData} 
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          outerRadius="90%"
          width={90}
          height={90}
        >
          <PolarGrid stroke="rgba(255, 255, 255, 0.2)" />
          <PolarAngleAxis 
            dataKey="topic" 
            tick={{ 
              fill: '#94a3b8', 
              fontSize: 12,
              textAnchor: 'middle' 
            }}
            tickFormatter={(value) => value}
          />
          <PolarRadiusAxis 
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#94a3b8', fontSize: 9 }}
          />
          <Radar
            name="Mastery Level"
            dataKey="masteryLevel"
            stroke="#7c3aed"
            fill="#7c3aed"
            fillOpacity={0.3}
            strokeWidth={2}
            dot={{ fill: '#7c3aed', strokeWidth: 2, r: 4 }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid #7c3aed',
              borderRadius: '8px',
              color: '#e2e8f0'
            }}
            formatter={(value: any) => [`${value.toFixed(1)}%`, 'Mastery Level']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function processTopicData(data: any[]) {
  const topicStats = data.reduce((acc, quiz) => {
    const topic = quiz.topic || 'Unknown';
    if (!acc[topic]) {
      acc[topic] = { scores: [], count: 0 };
    }
    acc[topic].scores.push(quiz.percentage);
    acc[topic].count++;
    return acc;
  }, {} as Record<string, { scores: number[]; count: number }>);

  // Get top 8 topics by quiz count
  const sortedTopics = Object.entries(topicStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8);

  return sortedTopics.map(([topic, stats]) => {
    const averageScore = stats.scores.reduce((sum, score) => sum + score, 0) / stats.scores.length;
    const consistency = 100 - (Math.sqrt(stats.scores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) / stats.scores.length));
    const masteryLevel = (averageScore * 0.7 + consistency * 0.3); // Weighted mastery score
    
    return {
      topic: topic.length > 15 ? topic.substring(0, 15) + '...' : topic,
      masteryLevel: Math.max(0, masteryLevel),
      averageScore,
      quizCount: stats.count
    };
  });
}