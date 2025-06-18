
import { QuizResults as QuizResultsComponent } from '@/components/quiz/QuizResults';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Quiz } from '@/components/quiz/QuizDashboard';

export default function QuizResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    // Dummy API call to fetch quiz results by ID
    const fetchQuizResults = async () => {
      const { score, timeTaken } = location.state || { score: 85, timeTaken: 12 };
      
      // Simulate API call
      const dummyQuiz: Quiz = {
        id: id || '1',
        title: 'Mathematics Basics',
        subject: 'Mathematics',
        topic: 'Algebra',
        difficulty: 'Medium',
        totalQuestions: 10,
        duration: 15,
        marks: 100,
        status: 'completed',
        createdAt: '2024-01-15',
        score,
        timeTaken
      };
      setQuiz(dummyQuiz);
    };

    fetchQuizResults();
  }, [id, location.state]);

  const handleBack = () => {
    navigate('/dashboard');
  };

  if (!quiz) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Loading Results...</h2>
          <p className="text-muted-foreground">Please wait while we fetch your quiz results.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <QuizResultsComponent
        quiz={quiz}
        onBack={handleBack}
      />
    </div>
  );
}
