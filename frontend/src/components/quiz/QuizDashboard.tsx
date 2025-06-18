
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen, Trophy, Clock } from 'lucide-react';
import { QuizList } from './QuizList';
import { QuizCreator } from './QuizCreator';
import { useNavigate } from 'react-router-dom';

export interface Quiz {
  id: string;
  title: string;
  subject: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  totalQuestions: number;
  duration: number; // in minutes
  marks: number;
  status: 'pending' | 'completed' | 'in-progress';
  createdAt: string;
  score?: number;
  timeTaken?: number;
}

export function QuizDashboard() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'dashboard' | 'create'>('dashboard');
  const [quizzes, setQuizzes] = useState<Quiz[]>([
    {
      id: '1',
      title: 'Mathematics Basics',
      subject: 'Mathematics',
      topic: 'Algebra',
      difficulty: 'Medium',
      totalQuestions: 20,
      duration: 1,
      marks: 100,
      status: 'completed',
      createdAt: '2024-01-15',
      score: 85,
      timeTaken: 25
    },
    {
      id: '2',
      title: 'Physics Mechanics',
      subject: 'Physics',
      topic: 'Motion',
      difficulty: 'Hard',
      totalQuestions: 15,
      duration: 1,
      marks: 75,
      status: 'pending',
      createdAt: '2024-01-16'
    }
  ]);

  const handleCreateQuiz = (newQuiz: Omit<Quiz, 'id' | 'status' | 'createdAt'>) => {
    const quiz: Quiz = {
      ...newQuiz,
      id: Date.now().toString(),
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0]
    };
    setQuizzes(prev => [...prev, quiz]);
    setActiveView('dashboard');
  };

  const handleTakeQuiz = (quiz: Quiz) => {
    navigate(`/quiz/take/${quiz.id}`);
  };

  const handleViewResults = (quiz: Quiz) => {
    navigate(`/quiz/results/${quiz.id}`);
  };

  if (activeView === 'create') {
    return (
      <QuizCreator 
        onQuizCreated={handleCreateQuiz}
        onCancel={() => setActiveView('dashboard')}
      />
    );
  }

  const completedQuizzes = quizzes.filter(q => q.status === 'completed');
  const pendingQuizzes = quizzes.filter(q => q.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold gradient-text">Quiz Center</h2>
          <p className="text-muted-foreground">Test your knowledge and track your progress</p>
        </div>
        <Button onClick={() => setActiveView('create')} className="flex items-center gap-2 button-gradient transition-all duration-300">
          <Plus className="h-4 w-4" />
          Create Quiz
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quizzes.length}</div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedQuizzes.length}</div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedQuizzes.length > 0 
                ? Math.round(completedQuizzes.reduce((acc, q) => acc + (q.score || 0), 0) / completedQuizzes.length)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quiz Lists */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Available Quizzes ({pendingQuizzes.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed Quizzes ({completedQuizzes.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending">
          <QuizList 
            quizzes={pendingQuizzes}
            onTakeQuiz={handleTakeQuiz}
            showActions={true}
          />
        </TabsContent>
        
        <TabsContent value="completed">
          <QuizList 
            quizzes={completedQuizzes}
            onViewResults={handleViewResults}
            showActions={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
