import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Trophy, Clock, CheckCircle, XCircle, Info, Star } from 'lucide-react';
import { Quiz } from './QuizDashboard';

interface QuizResultsProps {
  quiz: Quiz;
  onBack: () => void;
}

export function QuizResults({ quiz, onBack }: QuizResultsProps) {
  // Mock results data
  const results = {
    correctAnswers: 7,
    totalQuestions: 10,
    score: quiz.score || 70,
    timeTaken: quiz.timeTaken || 12,
    questions: [
      {
        id: '1',
        question: 'What is the derivative of x²?',
        options: ['x', '2x', 'x²', '2x²'],
        correctAnswer: 1,
        userAnswer: 1,
        explanation: 'The derivative of x² is 2x using the power rule.',
        isCorrect: true
      },
      {
        id: '2',
        question: 'What is the integral of 2x?',
        options: ['x²', 'x² + C', '2x²', '2x² + C'],
        correctAnswer: 1,
        userAnswer: 0,
        explanation: 'The integral of 2x is x² + C, where C is the constant of integration.',
        isCorrect: false
      }
    ]
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-green-500 to-green-600';
    if (score >= 60) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  const getScoreMessage = (score: number) => {
    if (score >= 90) return 'Excellent! Outstanding performance!';
    if (score >= 80) return 'Great job! Well done!';
    if (score >= 70) return 'Good work! Keep it up!';
    if (score >= 60) return 'Not bad! Room for improvement.';
    return 'Keep practicing! You can do better!';
  };

  const getStars = (score: number) => {
    if (score >= 90) return 5;
    if (score >= 80) return 4;
    if (score >= 70) return 3;
    if (score >= 60) return 2;
    return 1;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-4">
          <Button 
            variant="outline" 
            onClick={onBack} 
            className="flex items-center gap-2 hover:bg-blue-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-gray-800">{quiz.title}</h1>
            <p className="text-gray-600">{quiz.subject} • {quiz.topic}</p>
          </div>
        </div>

        {/* Score Summary Card */}
        <Card className="border-0 shadow-xl bg-white overflow-hidden">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center items-center gap-3 mb-4">
              <div className={`p-4 rounded-full bg-gradient-to-r ${getScoreGradient(results.score)} shadow-lg`}>
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold text-gray-800">Quiz Complete!</CardTitle>
                <p className="text-gray-600 mt-1">Here's how you performed</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {/* Large Score Display */}
            <div className="relative">
              <div className={`text-8xl font-black ${getScoreColor(results.score)} mb-2`}>
                {results.score}%
              </div>
              <div className="flex justify-center gap-1 mb-4">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={`h-6 w-6 ${
                      i < getStars(results.score) 
                        ? 'text-yellow-500 fill-current' 
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xl text-gray-700 font-medium mb-6">
                {getScoreMessage(results.score)}
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <div className="text-3xl font-bold text-green-700">{results.correctAnswers}</div>
                <div className="text-sm text-green-600 font-medium">Correct</div>
              </div>
              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <div className="text-3xl font-bold text-red-700">
                  {results.totalQuestions - results.correctAnswers}
                </div>
                <div className="text-sm text-red-600 font-medium">Incorrect</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="text-3xl font-bold text-blue-700">{results.timeTaken}</div>
                <div className="text-sm text-blue-600 font-medium">Minutes</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                <div className="text-3xl font-bold text-purple-700">{quiz.marks}</div>
                <div className="text-sm text-purple-600 font-medium">Total Marks</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{results.correctAnswers}/{results.totalQuestions} questions correct</span>
              </div>
              <Progress value={(results.correctAnswers / results.totalQuestions) * 100} className="h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Question Review */}
        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Info className="h-6 w-6 text-blue-600" />
            Question Review
          </h3>
          {results.questions.map((question, index) => (
            <Card key={question.id} className={`border-l-4 ${
              question.isCorrect ? 'border-l-green-500 bg-green-50/30' : 'border-l-red-500 bg-red-50/30'
            } shadow-lg`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-black font-semibold">
                  {question.isCorrect ? (
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  ) : (
                    <div className="p-2 bg-red-100 rounded-full">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                  )}
                  Question {index + 1}
                  <Badge variant={question.isCorrect ? 'default' : 'destructive'} className="ml-auto">
                    {question.isCorrect ? 'Correct' : 'Incorrect'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="font-medium text-gray-800 text-lg">{question.question}</p>
                
                <div className="grid gap-3">
                  {question.options.map((option, optionIndex) => (
                    <div
                      key={optionIndex}
                      className={`p-4 rounded-lg border-2 ${
                        optionIndex === question.correctAnswer
                          ? 'bg-green-100 border-green-300 text-green-800'
                          : optionIndex === question.userAnswer && !question.isCorrect
                          ? 'bg-red-100 border-red-300 text-red-800'
                          : 'bg-white border-gray-200 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg">{String.fromCharCode(65 + optionIndex)}.</span>
                        <span className="text-base">{option}</span>
                        {optionIndex === question.correctAnswer && (
                          <CheckCircle className="h-5 w-5 text-green-600 ml-auto" />
                        )}
                        {optionIndex === question.userAnswer && optionIndex !== question.correctAnswer && (
                          <XCircle className="h-5 w-5 text-red-600 ml-auto" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {!question.isCorrect && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-blue-800 mb-1">Explanation</div>
                        <p className="text-blue-700">{question.explanation}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
