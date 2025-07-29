import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ModerateQuizDialog } from './ModerateQuizDialog';
import { makeRequest } from '@/lib/apiCall';

interface QuizItem {
  quizId: string;
  topic: string;
  domain: string;
  user_id: string;
  createdAt: string;
  difficulty?: string;
}

export function ModeratorQuizList({ type }: { type: 'pending' | 'all' }) {
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<QuizItem | null>(null);

  useEffect(() => {
    setLoading(true);
    const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
    const url = type === 'pending'
      ? `${API_BASE_URL}/api/v1/content-moderator/quiz/pending`
      : `${API_BASE_URL}/api/v1/content-moderator/quiz/all`;
    makeRequest(url, 'GET', null)
      .then(res => res.data)
      .then(data => {
        setQuizzes(type === 'pending' ? data.pending_quizzes : data.all_quizzes);
      })
      .finally(() => setLoading(false));
  }, [type]);

  if (loading) return <div>Loading...</div>;
  if (!quizzes.length) return <div>No quizzes found.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {quizzes.map(item => (
        <Card key={item.quizId} className="glass-card group">
          <CardHeader>
            <CardTitle>{item.topic}</CardTitle>
            <div className="text-xs text-muted-foreground">
              {new Date(item.createdAt).toLocaleString()}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="text-sm">Domain: {item.domain}</div>
            <div className="text-sm">User: {item.user_id}</div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setSelected(item)}>
                Moderate
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {selected && (
        <ModerateQuizDialog
          quiz={selected}
          onClose={() => setSelected(null)}
          onModerated={() => {
            setSelected(null);
            setQuizzes(quizzes => quizzes.filter(q => q.quizId !== selected.quizId));
          }}
        />
      )}
    </div>
  );
} 