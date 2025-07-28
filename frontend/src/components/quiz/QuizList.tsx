import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, BookOpen, Trophy, Play, Eye, MoreVertical, Trash2, RotateCcw } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';

interface Quiz {
  quiz_id: string;
  createdAt: string;
  difficulty: string;
  duration: number;
  collection_name: string;
  topic?: string;
  domain?: string;
  score?: number;
  total?: number;
  status: 'pending' | 'completed';
}

interface QuizListProps {
  quizzes: Quiz[];
  onTakeQuiz?: (quiz: Quiz) => void;
  onViewResults?: (quiz: Quiz) => void;
  onRetakeQuiz?: (quiz: Quiz) => void; // Added this prop
  showActions: boolean;
  onQuizDeleted?: () => void;
}

export function QuizList({ quizzes, onTakeQuiz, onViewResults, onRetakeQuiz, showActions, onQuizDeleted }: QuizListProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleDeleteQuiz = async (quizId: string) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      await makeRequest(`${API_BASE_URL}/api/v1/quiz/quizzes/${quizId}`, 'DELETE');
      
      toast.success('Quiz deleted successfully');
      onQuizDeleted?.();
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast.error('Failed to delete quiz');
    }
  };

  if (quizzes.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold glass-text-title mb-2">
            {showActions ? 'No Available Quizzes' : 'No Completed Quizzes'}
          </h3>
          <p className="glass-text-description text-center">
            {showActions 
              ? 'Create your first quiz to get started with testing your knowledge!'
              : 'Complete some quizzes to see your results here.'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {quizzes.map((quiz) => (
        <Card key={quiz.quiz_id} className="glass-card-hover-strong hover:scale-102">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="glass-text-title">
                    {quiz.topic || quiz.collection_name}
                  </CardTitle>
                  <Badge className={`text-white ${getDifficultyColor(quiz.difficulty)}`}>
                    {quiz.difficulty}
                  </Badge>
                  {quiz.status === 'completed' && quiz.score !== undefined && quiz.total !== undefined && (
                    <Badge variant="outline" className={`${getScoreColor(quiz.score, quiz.total)} border-current`}>
                      {Math.round((quiz.score / quiz.total) * 100)}%
                    </Badge>
                  )}
                </div>
                <CardDescription className="glass-text-description">
                  {quiz.domain && `${quiz.domain} • `}
                  <span className="block sm:inline">
                    Collection: {quiz.collection_name}
                  </span>
                </CardDescription>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass-card">
                  <DropdownMenuItem 
                    onClick={() => handleDeleteQuiz(quiz.quiz_id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Quiz
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="flex items-center justify-between flex-col md:flex-row gap-2">
              <div className="flex items-center gap-6 text-sm glass-text-description">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{quiz.duration} min</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(quiz.createdAt).toLocaleDateString()}</span>
                </div>
                {quiz.status === 'completed' && quiz.score !== undefined && quiz.total !== undefined && (
                  <div className="flex items-center gap-1">
                    <Trophy className="h-4 w-4" />
                    <span className={getScoreColor(quiz.score, quiz.total)}>
                      {quiz.score}/{quiz.total} points
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {showActions ? (
                  <Button 
                    onClick={() => onTakeQuiz?.(quiz)}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Take Quiz
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => onViewResults?.(quiz)}
                      className="glass-card hover:bg-white/10"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Results
                    </Button>
                    <Button 
                      onClick={() => onRetakeQuiz?.(quiz)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Retake
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
