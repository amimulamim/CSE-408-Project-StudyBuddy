import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  Target, 
  CheckCircle, 
  XCircle, 
  ArrowLeft, 
  BarChart3,
  Loader2
} from 'lucide-react';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface QuestionResult {
  question_id: string;
  score: number;
  is_correct: boolean;
  student_answer: string;
  correct_answer?: string;
  explanation?: string;
  type?: string;
  options?: string[];
}

interface QuizResultsProps {
  quizId: string;
  isAdminMode?: boolean;
  onClose?: () => void;
  userId?: string; // Add userId for admin mode to view specific user's result
}

// Transform admin quiz response to match user quiz result format
const transformAdminResponse = (adminData: any) => {
  if (!adminData?.quiz) {
    return null;
  }

  // Calculate total score from results
  const totalScore = adminData.results?.reduce((sum: number, result: any) => sum + result.score, 0) || 0;
  const totalPossible = adminData.results?.reduce((sum: number, result: any) => sum + result.total, 0) || 0;

  // If no results found, calculate from questions
  const questionsTotal = adminData.questions?.reduce((sum: number, question: any) => sum + (question.marks || 1), 0) || 0;

  return {
    quiz_id: adminData.quiz.quiz_id,
    score: totalScore,
    total: totalPossible || questionsTotal,
    topic: 'Quiz', // Default topic since admin response doesn't have it
    domain: 'General', // Default domain
    feedback: '',
    question_results: adminData.results?.map((result: any) => ({
      question_id: result.id,
      score: result.score,
      is_correct: result.percentage === 100,
      student_answer: 'Answer data not available in admin view' // Admin endpoint doesn't include detailed answers
    })) || []
  };
};

export function QuizResults({ quizId, isAdminMode = false, onClose, userId }: QuizResultsProps) {
  const navigate = useNavigate();
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [quizId]);

  const fetchResults = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      
      // For admin mode, try to use the quiz result endpoint first
      // If that fails, fall back to the regular user endpoint
      let endpoint: string;
      
      if (isAdminMode) {
        // For admin viewing specific user's result, we'll use the regular result endpoint
        // The backend should allow admins to access any user's quiz results
        endpoint = `${API_BASE_URL}/api/v1/quiz/quizzes/${quizId}/result`;
      } else {
        // Regular user viewing their own result
        endpoint = `${API_BASE_URL}/api/v1/quiz/quizzes/${quizId}?take=false`;
      }
        
      const response = await makeRequest(endpoint, 'GET');
      
      if (response && typeof response === 'object' && 'status' in response) {
        if (response.status === 'success' && 'data' in response && response.data) {
          const data = response.data as any;
          setResults(data);
        }
      }
    } catch (error) {
      console.error('Error fetching quiz results:', error);
      toast.error('Failed to load quiz results');
      if (!isAdminMode) {
        navigate('/dashboard/quiz');
      } else if (onClose) {
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={isAdminMode ? "flex items-center justify-center py-12" : "flex items-center justify-center min-h-screen"}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <p className="glass-text-description">Loading quiz results...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className={isAdminMode ? "text-center py-8" : "text-center py-12"}>
        <p className="glass-text-description">Quiz results not found.</p>
      </div>
    );
  }

  const percentage = Math.round((results.score / results.total) * 100);
  const correctAnswers = results.question_results?.filter((q: QuestionResult) => q.is_correct).length || 0;
  const totalQuestions = results.question_results?.length || 0;

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className={isAdminMode ? "p-6" : "min-h-screen dashboard-bg-animated"}>
      <div className={isAdminMode ? "max-w-6xl mx-auto" : "container mx-auto py-6 max-w-6xl"}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold glass-text-title">Quiz Results</h1>
            <p className="glass-text-description">{results.topic} • {results.domain}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              if (isAdminMode && onClose) {
                onClose();
              } else {
                navigate('/dashboard/quiz');
              }
            }}
            className="glass-card hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {isAdminMode ? 'Close' : 'Back to Quizzes'}
          </Button>
        </div>

        {/* Score Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="glass-card">
            <CardContent className="p-6 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <div className={`text-3xl font-bold ${getScoreColor(percentage)}`}>
                {percentage}%
              </div>
              <p className="text-sm glass-text-description">Overall Score</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <div className="text-3xl font-bold glass-text-title">
                {results.score}/{results.total}
              </div>
              <p className="text-sm glass-text-description">Points Earned</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <div className="text-3xl font-bold glass-text-title">
                {correctAnswers}/{totalQuestions}
              </div>
              <p className="text-sm glass-text-description">Correct Answers</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6 text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <Badge className={`text-white ${getScoreBadgeColor(percentage)}`}>
                {percentage >= 80 ? 'Excellent' : percentage >= 60 ? 'Good' : 'Needs Improvement'}
              </Badge>
              <p className="text-sm glass-text-description mt-2">Performance</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Results */}
        <Tabs defaultValue="questions" className="space-y-4">
          <TabsList className="glass-card">
            <TabsTrigger value="questions" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              Question Review
            </TabsTrigger>
            <TabsTrigger value="analysis" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              Performance Analysis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="space-y-4">
            {results.question_results?.map((result: QuestionResult, index: number) => (
              <Card key={result.question_id} className="glass-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="glass-text-title flex items-center gap-2">
                        <span>Question {index + 1}</span>
                        {result.is_correct ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </CardTitle>
                      <CardDescription className="glass-text-description">
                        {result.score} point{result.score !== 1 ? 's' : ''} • {result.type}
                      </CardDescription>
                    </div>
                    <Badge 
                      className={`text-white ${result.is_correct ? 'bg-green-500' : 'bg-red-500'}`}
                    >
                      {result.is_correct ? 'Correct' : 'Incorrect'}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium glass-text">Your Answer: </span>
                      <span className={`${result.is_correct ? 'text-green-600' : 'text-red-600'}`}>
                        {result.student_answer}
                      </span>
                    </div>
                    {!result.is_correct && result.correct_answer && (
                      <div>
                        <span className="font-medium glass-text">Correct Answer: </span>
                        <span className="text-green-600">{result.correct_answer}</span>
                      </div>
                    )}
                  </div>
                  
                  {result.explanation && (
                    <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-200/50">
                      <h4 className="font-medium glass-text mb-2">Explanation</h4>
                      <p className="white">{result.explanation}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="analysis">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="glass-text-title">Performance Analysis</CardTitle>
                <CardDescription className="glass-text-description">
                  Detailed breakdown of your quiz performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Score Distribution Table */}
                  <div className="bg-slate-800/30 rounded-lg p-6 border border-white/20">
                    <h3 className="font-bold text-lg glass-text-title mb-4 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-400" />
                      Score Distribution
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 rounded-lg bg-green-500/10 border border-green-400/20">
                        <span className="font-medium text-green-300">Correct Answers</span>
                        <span className="text-green-400 font-bold text-xl">{correctAnswers}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-red-500/10 border border-red-400/20">
                        <span className="font-medium text-red-300">Incorrect Answers</span>
                        <span className="text-red-400 font-bold text-xl">{totalQuestions - correctAnswers}</span>
                      </div>
                      <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent my-4"></div>
                      <div className="flex justify-between items-center p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-400/30">
                        <span className="font-bold text-purple-300">Total Questions</span>
                        <span className="font-bold text-2xl glass-text-title">{totalQuestions}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Performance Metrics */}
                  <div className="bg-slate-800/30 rounded-lg p-6 border border-white/20">
                    <h3 className="font-bold text-lg glass-text-title mb-4 flex items-center gap-2">
                      <Target className="h-5 w-5 text-purple-400" />
                      Performance Metrics
                    </h3>
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-400/20">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-blue-300">Success Rate</span>
                          <span className={`font-bold text-xl ${getScoreColor(percentage)}`}>
                            {percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full ${
                              percentage >= 80 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                              percentage >= 60 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                              'bg-gradient-to-r from-red-400 to-red-600'
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-400/20">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-yellow-300">Grade</span>
                          <Badge className={`text-white font-bold text-lg ${getScoreBadgeColor(percentage)}`}>
                            {percentage >= 90 ? 'A+' : 
                             percentage >= 80 ? 'A' : 
                             percentage >= 70 ? 'B+' :
                             percentage >= 60 ? 'B' :
                             percentage >= 50 ? 'C' : 'F'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Recommendations Section */}
                <div className="bg-slate-800/30 rounded-lg p-6 border border-white/20">
                  <h3 className="font-bold text-lg glass-text-title mb-4 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-400" />
                    Recommendations & Next Steps
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`p-4 rounded-lg border-l-4 ${
                      percentage >= 80 
                        ? 'bg-green-500/10 border-green-400 border-l-green-400' 
                        : percentage >= 60 
                          ? 'bg-yellow-500/10 border-yellow-400 border-l-yellow-400'
                          : 'bg-red-500/10 border-red-400 border-l-red-400'
                    }`}>
                      <h4 className={`font-semibold mb-2 ${
                        percentage >= 80 ? 'text-green-300' :
                        percentage >= 60 ? 'text-yellow-300' : 'text-red-300'
                      }`}>
                        Performance Feedback
                      </h4>
                      <p className={`text-sm leading-relaxed ${
                        percentage >= 80 ? 'text-green-200' :
                        percentage >= 60 ? 'text-yellow-200' : 'text-red-200'
                      }`}>
                        {percentage >= 80 ? (
                          "🎉 Outstanding performance! You've demonstrated excellent mastery of this topic. Your understanding is solid and you're ready for advanced concepts."
                        ) : percentage >= 60 ? (
                          "👍 Good job! You have a decent grasp of the material. Focus on reviewing the questions you missed to strengthen your understanding."
                        ) : (
                          "📚 This topic needs more attention. Consider reviewing the study material thoroughly and practicing more before attempting similar quizzes."
                        )}
                      </p>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-400/20">
                      <h4 className="font-semibold text-indigo-300 mb-3">Suggested Actions</h4>
                      <ul className="space-y-2 text-sm text-indigo-200">
                        {percentage >= 80 ? (
                          <>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-400" />
                              Try more challenging quizzes
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-400" />
                              Explore advanced topics
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-400" />
                              Help others with this subject
                            </li>
                          </>
                        ) : percentage >= 60 ? (
                          <>
                            <li className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-yellow-400" />
                              Review incorrect answers
                            </li>
                            <li className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-yellow-400" />
                              Practice similar questions
                            </li>
                            <li className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-yellow-400" />
                              Retake quiz after study
                            </li>
                          </>
                        ) : (
                          <>
                            <li className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-red-400" />
                              Review study materials
                            </li>
                            <li className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-red-400" />
                              Take practice quizzes
                            </li>
                            <li className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-red-400" />
                              Seek additional help
                            </li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
