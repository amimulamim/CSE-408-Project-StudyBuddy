import { useParams } from 'react-router-dom';
import { QuizTaker } from '@/components/quiz/QuizTaker';

export default function QuizTakePage() {
  const { quizId } = useParams<{ quizId: string }>();
  
  if (!quizId) {
    return <div>Quiz not found</div>;
  }

  return <QuizTaker quizId={quizId} />;
}