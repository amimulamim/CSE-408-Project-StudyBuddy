import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, CheckCircle, BookOpen, Target, Award } from 'lucide-react';
import { QuizTimer } from './QuizTimer';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import Markdown from 'react-markdown';
import MarkdownRenderer from '../chatbot/MarkdownRenderer';

interface Question {
  question_id: string;
  question: string;
  type: string;
  options?: string[];
  difficulty: string;
  marks: number;
  hints?: string[];
}

interface QuizTakerProps {
  quizId: string;
}

export function QuizTaker({ quizId }: QuizTakerProps) {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [duration, setDuration] = useState(30); // in minutes
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quizInfo, setQuizInfo] = useState<any>(null);

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  const fetchQuiz = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response = await makeRequest(
        `${API_BASE_URL}/api/v1/quiz/quizzes/${quizId}?take=true`, 
        'GET'
      );
      
      if (response?.status === 'success') {
        setQuestions(response.data.questions || []);
        setQuizInfo(response.data);
        setDuration(response.data.duration || 30);
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
      toast.error('Failed to load quiz');
      navigate('/dashboard/quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleTimeUp = () => {
    toast.error('Time is up! Submitting your answers automatically.');
    handleSubmitQuiz();
  };

  const handleSubmitQuiz = async () => {
    if (submitting) return;
    
    setSubmitting(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      
      const answersArray = Object.entries(answers).map(([question_id, student_answer]) => ({
        question_id,
        student_answer
      }));

      const response = await makeRequest(
        `${API_BASE_URL}/api/v1/quiz/quizzes/${quizId}/evaluate_all`,
        'POST',
        {
          quiz_id: quizId,
          answers: answersArray
        }
      );

      if (response?.status === 'success') {
        toast.success('Quiz submitted successfully!');
        navigate(`/quiz/results/${quizId}`);
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error('Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30';
      case 'medium': return 'bg-amber-600/20 text-amber-300 border-amber-500/30';
      case 'hard': return 'bg-red-600/20 text-red-300 border-red-500/30';
      default: return 'bg-slate-600/20 text-slate-300 border-slate-500/30';
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const answeredQuestions = Object.keys(answers).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen dashboard-bg-animated">
        <div className="text-center glass-card p-8 max-w-md mx-auto rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-2 glass-text-title">Preparing Your Quiz</h2>
          <p className="glass-text-description">Loading questions and setting up the environment...</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="text-center py-12">
        <p className="glass-text-description">No questions found for this quiz.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen dashboard-bg-animated">
      {/* Quiz Timer */}
      <QuizTimer duration={duration} onTimeUp={handleTimeUp} />
      
      <div className="container mx-auto py-20 max-w-4xl">
        {/* Header */}
        <div className="glass-card p-6 mb-6 rounded-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold glass-text-title">
                {quizInfo?.topic || 'Quiz in Progress'}
              </h1>
              <p className="glass-text-description flex items-center gap-2 mt-1">
                <BookOpen className="h-4 w-4" />
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            <div className="glass-card-inner p-4 rounded-lg">
              <Target className="h-5 w-5 mx-auto mb-1 text-purple-400" />
              <div className="text-sm font-medium glass-text-description">Total Points</div>
              <div className="text-lg font-bold glass-text-title">{questions.reduce((sum, q) => sum + q.marks, 0)}</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm glass-text-description">
              <span>Progress</span>
              <span className="font-medium">
                {answeredQuestions}/{questions.length} answered
              </span>
            </div>
            <div className="relative">
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </div>

        {/* Question Card */}
        <Card className="glass-card mb-6 overflow-hidden">
          <CardHeader className="glass-card-inner border-b border-white/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="glass-card-inner p-2 rounded-lg">
                <BookOpen className="h-5 w-5 text-purple-400" />
              </div>
              <span className="text-lg font-medium glass-text">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
            </div>
            
            <CardTitle className="text-xl font-bold glass-text-title mb-4 leading-relaxed">
              <MarkdownRenderer content={currentQuestion.question} textSize='text-xl' font='font-bold' />
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyColor(currentQuestion.difficulty)}`}>
                {currentQuestion.difficulty}
              </span>
              <div className="flex items-center gap-2 glass-card-inner px-1 py-1 rounded-full">
                <Award className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium glass-text">
                  {currentQuestion.marks} point{currentQuestion.marks !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            {/* Multiple Choice Options */}
            {currentQuestion.type === 'MultipleChoice' && currentQuestion.options && (
              <RadioGroup
                value={answers[currentQuestion.question_id] || ''}
                onValueChange={(value) => handleAnswerChange(currentQuestion.question_id, value)}
                className="space-y-3"
              >
                {currentQuestion.options.map((option, index) => {
                  const isSelected = answers[currentQuestion.question_id] === option;
                  const optionLabels = ['A', 'B', 'C', 'D', 'E'];
                  
                  return (
                    <div 
                      key={index} 
                      className={`group relative flex items-center p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                        isSelected 
                          ? 'bg-purple-500/20 border-purple-400/50 shadow-lg shadow-purple-500/10' 
                          : 'glass-card-inner border-white/10 hover:border-purple-400/30 hover:bg-purple-500/10'
                      }`}
                    >
                      {/* Option Label */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm mr-3 transition-all duration-200 ${
                        isSelected 
                          ? 'bg-purple-500 text-white' 
                          : 'bg-slate-600/50 text-slate-300 group-hover:bg-purple-500/30 group-hover:text-purple-200'
                      }`}>
                        {optionLabels[index]}
                      </div>
                      
                      <RadioGroupItem 
                        value={option} 
                        id={`option-${index}`}
                        className="sr-only"
                      />
                      
                      <Label 
                        htmlFor={`option-${index}`} 
                        className={`flex-1 cursor-pointer font-medium leading-relaxed transition-colors ${
                          isSelected ? 'glass-text-title' : 'glass-text group-hover:text-purple-200'
                        }`}
                      >
                        <MarkdownRenderer content={option}/>
                      </Label>
                      
                      {/* Selected indicator */}
                      {isSelected && (
                        <CheckCircle className="h-5 w-5 text-purple-400 ml-3" />
                      )}
                    </div>
                  );
                })}
              </RadioGroup>
            )}

            {/* True/False Options */}
            {currentQuestion.type === 'TrueFalse' && (
              <RadioGroup
                value={answers[currentQuestion.question_id] || ''}
                onValueChange={(value) => handleAnswerChange(currentQuestion.question_id, value)}
                className="space-y-3"
              >
                {['True', 'False'].map((option) => {
                  const isSelected = answers[currentQuestion.question_id] === option;
                  const isTrue = option === 'True';
                  
                  return (
                    <div 
                      key={option}
                      className={`group relative flex items-center p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                        isSelected 
                          ? isTrue 
                            ? 'bg-emerald-500/20 border-emerald-400/50 shadow-lg shadow-emerald-500/10'
                            : 'bg-red-500/20 border-red-400/50 shadow-lg shadow-red-500/10'
                          : 'glass-card-inner border-white/10 hover:border-slate-400/30 hover:bg-slate-500/10'
                      }`}
                    >
                      {/* True/False Icon */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg mr-3 transition-all duration-200 ${
                        isSelected 
                          ? isTrue ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                          : isTrue 
                            ? 'bg-slate-600/50 text-emerald-300 group-hover:bg-emerald-500/30'
                            : 'bg-slate-600/50 text-red-300 group-hover:bg-red-500/30'
                      }`}>
                        {isTrue ? '✓' : '✗'}
                      </div>
                      
                      <RadioGroupItem value={option} id={option.toLowerCase()} className="sr-only" />
                      
                      <Label 
                        htmlFor={option.toLowerCase()} 
                        className={`flex-1 cursor-pointer font-bold text-xl transition-colors ${
                          isSelected ? 'glass-text-title' : 'glass-text group-hover:text-slate-200'
                        }`}
                      >
                        {option}
                      </Label>
                      
                      {isSelected && (
                        <CheckCircle className={`h-5 w-5 ml-3 ${isTrue ? 'text-emerald-400' : 'text-red-400'}`} />
                      )}
                    </div>
                  );
                })}
              </RadioGroup>
            )}

            {/* Short Answer Input */}
            {currentQuestion.type === 'ShortAnswer' && (
              <div className="space-y-3">
                <Label className="text-lg font-medium glass-text flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-600/50 flex items-center justify-center">
                    <span className="text-slate-300 font-semibold text-sm">A</span>
                  </div>
                  Your Answer:
                </Label>
                <Input
                  value={answers[currentQuestion.question_id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.question_id, e.target.value)}
                  placeholder="Type your detailed answer here..."
                  className="glass-input text-lg p-4 border-white/20 focus:border-purple-400/50 bg-slate-800/30 focus:bg-slate-800/50 transition-all duration-200"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
            className="glass-card hover:bg-white/10 border-white/20 hover:border-white/30 font-medium px-6 py-3 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex items-center gap-2 flex-wrap justify-center">
            {questions.map((_, index) => (
              <Button
                key={index}
                variant={index === currentQuestionIndex ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-10 h-10 p-0 font-semibold transition-all duration-200 ${
                  index === currentQuestionIndex 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20' 
                    : answers[questions[index].question_id] 
                      ? 'bg-emerald-600/80 hover:bg-emerald-600 text-white border-emerald-500/50' 
                      : 'glass-card hover:bg-white/10 border-white/20 hover:border-white/30'
                }`}
              >
                {answers[questions[index].question_id] && index !== currentQuestionIndex ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </Button>
            ))}
          </div>

          {currentQuestionIndex === questions.length - 1 ? (
            <Button
              onClick={handleSubmitQuiz}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
