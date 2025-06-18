import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, BookOpen, Trophy, Eye, Play } from 'lucide-react';
import { Quiz } from './QuizDashboard';

interface QuizListProps {
  quizzes: Quiz[];
  onTakeQuiz?: (quiz: Quiz) => void;
  onViewResults?: (quiz: Quiz) => void;
  showActions: boolean;
}

export function QuizList({ quizzes, onTakeQuiz, onViewResults, showActions }: QuizListProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-500';
      case 'Medium': return 'bg-yellow-500';
      case 'Hard': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (quizzes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No quizzes found</h3>
          <p className="text-muted-foreground text-center">
            {showActions ? "Create your first quiz to get started!" : "Complete some quizzes to see your results here."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {quizzes.map((quiz) => (
        <Card key={quiz.id} className="glass-card hover:shadow-lg transition-shadow duration-200">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">{quiz.title}</CardTitle>
                <CardDescription>{quiz.subject} • {quiz.topic}</CardDescription>
              </div>
              <Badge className={`text-white ${getDifficultyColor(quiz.difficulty)}`}>
                {quiz.difficulty}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span>{quiz.totalQuestions} questions</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{quiz.duration} min</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-muted-foreground" />
                <span>{quiz.marks} marks</span>
              </div>
              {quiz.score !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Score:</span>
                  <span className={`font-bold ${getScoreColor(quiz.score)}`}>
                    {quiz.score}%
                  </span>
                </div>
              )}
            </div>
            
            {quiz.timeTaken && (
              <div className="text-xs text-muted-foreground">
                Completed in {quiz.timeTaken} minutes
              </div>
            )}
            
            <div className="text-xs text-muted-foreground">
              Created: {new Date(quiz.createdAt).toLocaleDateString()}
            </div>

            {showActions && onTakeQuiz && (
              <Button 
                onClick={() => onTakeQuiz(quiz)} 
                className="w-full flex items-center gap-2 button-gradient transition-all duration-300"
              >
                <Play className="h-4 w-4" />
                Start Quiz
              </Button>
            )}

            {!showActions && onViewResults && quiz.status === 'completed' && (
              <Button 
                variant="outline" 
                onClick={() => onViewResults(quiz)} 
                className="w-full flex items-center gap-2 light-button"
              >
                <Eye className="h-4 w-4" />
                View Results
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
