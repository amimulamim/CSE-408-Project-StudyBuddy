import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, CheckCircle, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { Quiz } from './QuizDashboard';
import { QuizTimer } from './QuizTimer';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizTakerProps {
  quiz: Quiz;
  onComplete: (quizId: string, score: number, timeTaken: number) => void;
  onCancel: () => void;
}

export function QuizTaker({ quiz, onComplete, onCancel }: QuizTakerProps) {
  const [questions] = useState<Question[]>([
    {
      id: '1',
      question: 'What is the derivative of x²?',
      options: ['x', '2x', 'x²', '2x²'],
      correctAnswer: 1,
      explanation: 'The derivative of x² is 2x using the power rule.'
    },
    {
      id: '2',
      question: 'What is the integral of 2x?',
      options: ['x²', 'x² + C', '2x²', '2x² + C'],
      correctAnswer: 1,
      explanation: 'The integral of 2x is x² + C, where C is the constant of integration.'
    },
    {
      id: '3',
      question: 'What is the limit of (sin x)/x as x approaches 0?',
      options: ['0', '1', '∞', 'undefined'],
      correctAnswer: 1,
      explanation: 'This is a standard limit that equals 1.'
    },
    {
      id: '4',
      question: 'What is the area under the curve y = x from x = 0 to x = 2?',
      options: ['2', '4', '1', '8'],
      correctAnswer: 0,
      explanation: 'The area is ∫₀² x dx = [x²/2]₀² = 2² / 2 - 0 = 2.'
    },
    {
      id: '5',
      question: 'What is the value of e^(ln 3)?',
      options: ['1', '3', 'e', 'ln 3'],
      correctAnswer: 1,
      explanation: 'e^(ln x) = x for any positive x, so e^(ln 3) = 3.'
    }
  ]);
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const startTime = useState(() => Date.now())[0];

  const handleTimeUp = () => {
    toast.error('Time\'s up! Quiz has been auto-submitted.');
    handleSubmit();
  };

  const handleAnswerSelect = (optionIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [questions[currentQuestion].id]: optionIndex
    }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    const timeTaken = Math.round((Date.now() - startTime) / 1000 / 60); // Convert to minutes
    
    // Calculate score
    const correctAnswers = questions.filter(q => answers[q.id] === q.correctAnswer).length;
    const score = Math.round((correctAnswers / questions.length) * 100);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      toast.success(`Quiz completed! Score: ${score}%`);
      onComplete(quiz.id, score, timeTaken);
    } catch (error) {
      toast.error('Failed to submit quiz');
      setIsSubmitting(false);
    }
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const answeredQuestions = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredQuestions;

  return (
    <div className="min-h-screen dashboard-bg-animated relative">
      <QuizTimer duration={quiz.duration} onTimeUp={handleTimeUp} />
      
      <div className="container mx-auto py-8 pt-32 space-y-6">
        {/* Header */}
        <Card className="shadow-lg border-0 glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold gradient-text">{quiz.title}</h1>
                  <p className="text-muted-foreground text-lg">{quiz.subject} • {quiz.topic} • {quiz.difficulty}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-base px-4 py-2">
                  {answeredQuestions}/{questions.length} answered
                </Badge>
                <Badge variant={unansweredCount > 0 ? "destructive" : "default"} className="text-base px-4 py-2">
                  {unansweredCount} remaining
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={onCancel} 
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Exit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex justify-between text-base font-medium">
                <span>Question {currentQuestion + 1} of {questions.length}</span>
                <span>{Math.round(progress)}% complete</span>
              </div>
              <Progress value={progress} className="h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Question Card */}
        <Card className="border-2 shadow-xl quiz-question-card">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-black flex items-center gap-3">
              <span className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center text-lg font-bold">
                {currentQuestion + 1}
              </span>
              {questions[currentQuestion].question}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid gap-4">
              {questions[currentQuestion].options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  className={`p-6 text-left border-2 rounded-xl transition-all hover:bg-muted/50 text-lg ${
                    answers[questions[currentQuestion].id] === index
                      ? 'border-primary bg-primary/10 shadow-lg scale-[1.02]'
                      : 'border-border hover:border-primary/50 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-lg ${
                      answers[questions[currentQuestion].id] === index
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground text-muted-foreground'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="text-lg">{option}</span>
                    {answers[questions[currentQuestion].id] === index && (
                      <CheckCircle className="h-6 w-6 text-primary ml-auto" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <Card className='quiz-navigation-card'>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                disabled={currentQuestion === 0}
                className="flex items-center gap-2 text-base px-6 py-3"
              >
                <ArrowLeft className="h-5 w-5" />
                Previous
              </Button>

              <div className="flex gap-2">
                {questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestion(index)}
                    className={`w-12 h-12 rounded-lg text-base font-bold transition-all ${
                      index === currentQuestion
                        ? 'bg-primary text-primary-foreground shadow-lg scale-110'
                        : answers[questions[index].id] !== undefined
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              {currentQuestion === questions.length - 1 ? (
                <div className="flex items-center gap-3">
                  {unansweredCount > 0 && (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="h-5 w-5" />
                      <span className="text-base font-medium">{unansweredCount} unanswered</span>
                    </div>
                  )}
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-base px-6 py-3"
                  >
                    <CheckCircle className="h-5 w-5" />
                    {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
                  className="flex items-center gap-2 text-base px-6 py-3"
                >
                  Next
                  <ArrowRight className="h-5 w-5" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
