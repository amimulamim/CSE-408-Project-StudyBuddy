import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, BookOpen, Trophy, Clock, ArrowLeft, Loader2, X } from 'lucide-react';
import { QuizList } from './QuizList';
import { QuizCreator } from './QuizCreator';
import { useNavigate } from 'react-router-dom';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { format } from 'date-fns';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface Quiz {
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

export function QuizDashboard() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'dashboard' | 'create'>('dashboard');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizMarks, setQuizMarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });

  useEffect(() => {
    fetchQuizzes();
    fetchQuizMarks();
  }, [dateRange]);

  const fetchQuizzes = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      
      const params = new URLSearchParams();
      if (dateRange.from) {
        params.append('start_date', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange.to) {
        params.append('end_date', format(dateRange.to, 'yyyy-MM-dd'));
      }
      
      let url = `${API_BASE_URL}/api/v1/quiz/quizzes`;
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await makeRequest(url, 'GET') as any;
      
      if (response?.status === 'success') {
        setQuizzes(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      toast.error('Failed to fetch quizzes');
    }
  };

  const fetchQuizMarks = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      
      const params = new URLSearchParams();
      if (dateRange.from) {
        params.append('start_date', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange.to) {
        params.append('end_date', format(dateRange.to, 'yyyy-MM-dd'));
      }
      
      let url = `${API_BASE_URL}/api/v1/quiz/quiz-marks`;
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await makeRequest(url, 'GET') as any;
      
      if (response?.status === 'success') {
        const filteredData = (response.data || []).filter((quiz: any) => Number(quiz.total) > 0);
        setQuizMarks(filteredData);
      }
    } catch (error) {
      console.error('Error fetching quiz marks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuiz = () => {
    setActiveView('create');
  };

  const handleQuizCreated = () => {
    setActiveView('dashboard');
    fetchQuizzes();
    fetchQuizMarks();
  };

  const handleTakeQuiz = (quiz: Quiz) => {
    navigate(`/quiz/take/${quiz.quiz_id}`);
  };

  const handleViewResults = (quiz: Quiz) => {
    navigate(`/quiz/results/${quiz.quiz_id}`);
  };

  const handleRetakeQuiz = (quiz: Quiz) => {
    navigate(`/quiz/take/${quiz.quiz_id}`);
    toast.info('Starting quiz retake. Your previous results will be overwritten.');
  };

  const clearAllFilters = () => {
    setDateRange({ from: undefined, to: undefined });
  };

  const hasActiveFilters = dateRange.from || dateRange.to;

  if (activeView === 'create') {
    return (
      <QuizCreator 
        onQuizCreated={handleQuizCreated}
        onCancel={() => setActiveView('dashboard')}
      />
    );
  }

  // Combine quizzes with their results to determine status
  const quizzesWithStatus = quizzes.map(quiz => {
    const result = quizMarks.find(mark => mark.quiz_id === quiz.quiz_id);
    return {
      ...quiz,
      status: result ? 'completed' as const : 'pending' as const,
      score: result?.score,
      total: result?.total,
      topic: result?.topic || quiz.topic,
      domain: result?.domain || quiz.domain
    };
  });

  const completedQuizzes = quizzesWithStatus.filter(q => q.status === 'completed');
  const pendingQuizzes = quizzesWithStatus.filter(q => q.status === 'pending');

  const averageScore = completedQuizzes.length > 0 
    ? Math.round(completedQuizzes.reduce((acc, q) => acc + ((q.score! / q.total!) * 100), 0) / completedQuizzes.length)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <p className="text-muted-foreground">Loading your quizzes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold gradient-text">Quiz Center</h2>
          <p className="glass-text-description">Test your knowledge and track your progress</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleCreateQuiz} 
            className="button-gradient"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Quiz
          </Button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="glass-card p-4 rounded-md">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              placeholder="Filter by date range"
              className="w-[280px]"
            />
            
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="px-3"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {hasActiveFilters && (
            <div className="flex items-center gap-2">
              <span className="text-sm glass-text-description">Filtering by:</span>
              {(dateRange.from || dateRange.to) && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Date: {dateRange.from ? format(dateRange.from, 'MMM dd, yyyy') : 'Start'} - {dateRange.to ? format(dateRange.to, 'MMM dd, yyyy') : 'End'}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => setDateRange({ from: undefined, to: undefined })}
                  />
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium glass-text">Total Quizzes</CardTitle>
            <BookOpen className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold glass-text-title">{quizzes.length}</div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium glass-text">Completed</CardTitle>
            <Trophy className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold glass-text-title">{completedQuizzes.length}</div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium glass-text">Average Score</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold glass-text-title">{averageScore}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Quiz Lists */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="glass-card">
          <TabsTrigger value="pending" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            Available Quizzes ({pendingQuizzes.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            Completed Quizzes ({completedQuizzes.length})
          </TabsTrigger>
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
            onRetakeQuiz={handleRetakeQuiz}
            showActions={false}
            onQuizDeleted={() => {
              fetchQuizzes();
              fetchQuizMarks();
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
