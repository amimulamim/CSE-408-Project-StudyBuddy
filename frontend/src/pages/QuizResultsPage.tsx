import { useParams } from 'react-router-dom';
import { QuizResults } from '@/components/quiz/QuizResults';

export default function QuizResultsPage() {
  const { quizId } = useParams<{ quizId: string }>();
  
  if (!quizId) {
    return <div>Quiz results not found</div>;
  }

  return <QuizResults quizId={quizId} />;
}