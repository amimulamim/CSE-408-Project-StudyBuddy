import { QuizTaker as QuizTakerComponent } from '@/components/quiz/QuizTaker';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Quiz } from '@/components/quiz/QuizDashboard';

export default function QuizTaker() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    // Dummy API call to fetch quiz by ID
    const fetchQuiz = async () => {
      // Simulate API call
      const dummyQuiz: Quiz = {
        id: id || '1',
        title: 'Mathematics Basics',
        subject: 'Mathematics',
        topic: 'Algebra',
        difficulty: 'Medium',
        totalQuestions: 10,
        duration: 5,
        marks: 100,
        status: 'pending',
        createdAt: '2024-01-15'
      };
      setQuiz(dummyQuiz);
    };

    fetchQuiz();
  }, [id]);

  const handleComplete = (quizId: string, score: number, timeTaken: number) => {
    // Navigate to results page
    navigate(`/quiz/results/${quizId}`, { 
      state: { score, timeTaken } 
    });
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  if (!quiz) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <div className="text-center glass-card p-8 max-w-md mx-auto">
          <h2 className="text-2xl font-bold mb-2 glass-text-title">Loading Quiz...</h2>
          <p className="glass-text-description">Please wait while we prepare your quiz.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      <QuizTakerComponent
        quiz={quiz}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </div>
  );
}
