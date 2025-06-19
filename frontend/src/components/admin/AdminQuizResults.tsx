
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart3, Search, Eye, Trophy, Clock } from 'lucide-react';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';

interface QuizResult {
  id: string;
  user_id: string;
  quiz_id: string;
  quiz_title: string;
  score: number;
  total_questions: number;
  time_taken: number;
  completed_at: string;
  answers: any[];
}

export function AdminQuizResults() {
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResult, setSelectedResult] = useState<QuizResult | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const pageSize = 20;

  const fetchQuizResults = async (page = 0) => {
    try {
      setLoading(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response = await makeRequest(
        `${API_BASE_URL}/api/v1/admin/quiz-results?offset=${page * pageSize}&size=${pageSize}`,
        'GET'
      );

      if (response && typeof response === 'object' && 'status' in response) {
        if (response.status === 'success' && response.data) {
          setQuizResults(response.data.quiz_results || []);
          setTotalResults(response.data.total || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching quiz results:', error);
      toast.error('Failed to load quiz results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizResults(currentPage);
  }, [currentPage]);

  const handleViewResult = (result: QuizResult) => {
    setSelectedResult(result);
    setIsViewDialogOpen(true);
  };

  const filteredResults = quizResults.filter(result =>
    result.quiz_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    result.user_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Quiz Results Management
        </CardTitle>
        <CardDescription>View all quiz attempts and results</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search quiz results..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quiz Title</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading quiz results...
                    </TableCell>
                  </TableRow>
                ) : filteredResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No quiz results found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredResults.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell className="font-medium">
                        {result.quiz_title || 'Untitled Quiz'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {result.user_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-white ${getScoreColor(result.score, result.total_questions)}`}>
                            {result.score}/{result.total_questions}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            ({Math.round((result.score / result.total_questions) * 100)}%)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(result.time_taken)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(result.completed_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewResult(result)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredResults.length} of {totalResults} results
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(currentPage + 1) * pageSize >= totalResults}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* View Result Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Quiz Result Details
              </DialogTitle>
              <DialogDescription>
                Detailed view of the quiz attempt
              </DialogDescription>
            </DialogHeader>
            {selectedResult && (
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Quiz Title</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedResult.quiz_title || 'Untitled Quiz'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">User ID</label>
                    <p className="text-sm text-muted-foreground font-mono">
                      {selectedResult.user_id}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Score</label>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-white ${getScoreColor(selectedResult.score, selectedResult.total_questions)}`}>
                        {selectedResult.score}/{selectedResult.total_questions}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        ({Math.round((selectedResult.score / selectedResult.total_questions) * 100)}%)
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Time Taken</label>
                    <p className="text-sm text-muted-foreground">
                      {formatTime(selectedResult.time_taken)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Completed At</label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedResult.completed_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {selectedResult.answers && selectedResult.answers.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Detailed Answers</label>
                    <div className="mt-2 space-y-3 max-h-96 overflow-y-auto border rounded-lg p-4">
                      {selectedResult.answers.map((answer, index) => (
                        <div key={index} className="border-b pb-3 last:border-b-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">Question {index + 1}</span>
                            <Badge variant={answer.is_correct ? "default" : "destructive"}>
                              {answer.is_correct ? "Correct" : "Incorrect"}
                            </Badge>
                          </div>
                          <p className="text-sm mb-2">{answer.question}</p>
                          <div className="text-sm space-y-1">
                            <p><strong>Your answer:</strong> {answer.selected_answer}</p>
                            {!answer.is_correct && (
                              <p className="text-green-600">
                                <strong>Correct answer:</strong> {answer.correct_answer}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
