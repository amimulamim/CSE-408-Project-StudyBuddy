
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
import { QuizResults } from '@/components/quiz/QuizResults';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


interface QuizResult {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  user_display?: string;
  quiz_id: string;
  quiz_title: string;
  quiz_type?: string;
  score: number;
  total: number;
  total_questions: number;
  time_taken: number;
  time_taken_formatted?: string;
  completed_at: string;
  answers: any[];
  percentage?: number;
  topic?: string;
  domain?: string;
  difficulty?: string;
}

export function AdminQuizResults() {
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResult, setSelectedResult] = useState<QuizResult | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isViewQuizResultsOpen, setIsViewQuizResultsOpen] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  // at the top of your component
  type FilterType = 'all' | 'MultipleChoice' | 'ShortAnswer' | 'TrueFalse';
  const [filterType, setFilterType] = useState<FilterType>('all');

  // const [filterType, setFilterType] = useState<string | null>(null); // For future filtering by quiz type
  const [sortBy, setSortBy] = useState('created_at'); // Default sort by completed date
  const [sortOrder, setSortOrder] = useState('desc'); // Default sort order descending

  const pageSize = 20;

  const fetchQuizResults = async (page = 0) => {
    try {
      setLoading(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

      const params = new URLSearchParams({
        offset: String(page * pageSize),
        size: String(pageSize),
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (filterType && filterType !== 'all') {
        params.append('filter_type', filterType);
      }
      const response = await makeRequest(
        `${API_BASE_URL}/api/v1/admin/quiz-results?${params.toString()}`,
        'GET'
      );

      if (response && typeof response === 'object' && 'status' in response) {
        if (response.status === 'success' && 'data' in response && response.data) {
          const data = response.data as any;
          setQuizResults(data.quiz_results || []);
          setTotalResults(data.total || 0);
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
  }, [currentPage, sortBy, sortOrder, filterType]);

  const handleViewResult = (result: QuizResult) => {
    setSelectedResult(result);
    setIsViewDialogOpen(true);
  };

  const handleViewQuizResults = (result: QuizResult) => {
    setSelectedQuizId(result.quiz_id);
    setSelectedResult(result); // Store the full result for user context
    setIsViewQuizResultsOpen(true);
  };

  const filteredResults = quizResults.filter(result =>
    result.quiz_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    result.quiz_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    result.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    result.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
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
    <Card className="glass-card">
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

          <div className="flex gap-2">
            <Select value={filterType} onValueChange={(value: 'all' | 'MultipleChoice' | 'ShortAnswer' | 'TrueFalse') => setFilterType(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Types</SelectItem>
                <SelectItem value="MultipleChoice">Multiple Choice</SelectItem>
                <SelectItem value="ShortAnswer">Short Answer</SelectItem>
                <SelectItem value="TrueFalse">True/False</SelectItem>
                {/* Add more quiz types as needed */}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: 'created_at' | 'percentage') => setSortBy(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Created Date</SelectItem>
                <SelectItem value="percentage">Score Percentage</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table className="enhanced-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Quiz Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Score</TableHead>
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
                      <TableCell>
                        <Badge variant="outline">
                          {result.quiz_type || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium">{result.user_name || 'Unknown User'}</span>
                          <span className="text-xs text-muted-foreground">
                            {result.user_email || result.user_id.substring(0, 8) + '...'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-white ${getScoreColor(result.score, result.total)}`}>
                            {result.score}/{result.total}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            ({Math.round((result.score / result.total) * 100)}%)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(result.completed_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewResult(result)}
                            title="View metadata"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewQuizResults(result)}
                            title="View full quiz results"
                          >
                            <Trophy className="h-4 w-4" />
                          </Button>
                        </div>
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
                    <label className="text-sm font-medium">Quiz Type</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedResult.quiz_type || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">User</label>
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium">{selectedResult.user_name || 'Unknown User'}</p>
                      <p className="text-xs">{selectedResult.user_email || selectedResult.user_id}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Score</label>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-white ${getScoreColor(selectedResult.score, selectedResult.total)}`}>
                        {selectedResult.score}/{selectedResult.total}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        ({Math.round((selectedResult.score / selectedResult.total) * 100)}%)
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Time Taken</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedResult.time_taken_formatted || formatTime(selectedResult.time_taken)}
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

        {/* Full Quiz Results Dialog */}
        <Dialog open={isViewQuizResultsOpen} onOpenChange={setIsViewQuizResultsOpen}>
          <DialogContent className="max-w-7xl max-h-[95vh] flex flex-col p-0">
            <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
              <DialogTitle>Full Quiz Results</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto min-h-0">
              {selectedQuizId && selectedResult && (
                <QuizResults 
                  quizId={selectedQuizId} 
                  isAdminMode={true}
                  userId={selectedResult.user_id}
                  onClose={() => setIsViewQuizResultsOpen(false)}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
