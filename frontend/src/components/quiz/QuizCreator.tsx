import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, BookOpen } from 'lucide-react';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';
import { ApiResponse } from '@/lib/api';

interface QuizCreatorProps {
  onQuizCreated: () => void;
  onCancel: () => void;
}

interface Collection {
  collection_name: string;
  created_at: string;
  num_documents: number;
}

export function QuizCreator({ onQuizCreated, onCancel }: QuizCreatorProps) {
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(true);
  
  const [formData, setFormData] = useState({
    query: '',
    num_questions: 10,
    question_type: 'MultipleChoice',
    collection_name: '',
    difficulty: 'Medium',
    duration: 30,
    topic: '',
    domain: ''
  });

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response:ApiResponse = await makeRequest(`${API_BASE_URL}/api/v1/document/collections`, 'GET');
      
      if (response?.status === 'success') {
        setCollections(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
      toast.error('Failed to fetch document collections');
    } finally {
      setLoadingCollections(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.collection_name) {
      toast.error('Please select a document collection');
      return;
    }

    setLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response = await makeRequest(`${API_BASE_URL}/api/v1/quiz/quiz`, 'POST', formData);
      
      if (response?.status === 'success') {
        toast.success('Quiz created successfully!');
        onQuizCreated();
      } else {
        throw new Error('Failed to create quiz');
      }
    } catch (error) {
      console.error('Error creating quiz:', error);
      toast.error('Failed to create quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold glass-text-title">Create New Quiz</h2>
          <p className="glass-text-description">Generate a custom quiz from your uploaded documents</p>
        </div>
        
        <Button 
          variant="ghost" 
          onClick={onCancel}
          className="glass-card hover:bg-white/20 backdrop-blur-sm border border-white/30 hover:border-white/50 transition-all duration-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Quizzes
        </Button>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="glass-text-title">Quiz Configuration</CardTitle>
          <CardDescription className="glass-text-description">
            Set up your quiz parameters and content preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="topic" className="glass-text font-medium">Topic</Label>
                  <Input
                    id="topic"
                    value={formData.topic}
                    onChange={(e) => handleInputChange('topic', e.target.value)}
                    placeholder="e.g., Calculus, Quantum Physics"
                    className="glass-input"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="domain" className="glass-text font-medium">Domain</Label>
                  <Input
                    id="domain"
                    value={formData.domain}
                    onChange={(e) => handleInputChange('domain', e.target.value)}
                    placeholder="e.g., Mathematics, Physics"
                    className="glass-input"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="collection" className="glass-text font-medium">Document Collection</Label>
                  {loadingCollections ? (
                    <div className="flex items-center gap-2 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm glass-text-description">Loading collections...</span>
                    </div>
                  ) : (
                    <Select 
                      value={formData.collection_name} 
                      onValueChange={(value) => handleInputChange('collection_name', value)}
                    >
                      <SelectTrigger className="glass-input">
                        <SelectValue placeholder="Select a document collection" />
                      </SelectTrigger>
                      <SelectContent className="glass-card">
                        {collections.map((collection) => (
                          <SelectItem key={collection.collection_name} value={collection.collection_name}>
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4" />
                              <span>{collection.collection_name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({collection.num_documents} docs)
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Quiz Settings */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="difficulty" className="glass-text font-medium">Difficulty</Label>
                  <Select 
                    value={formData.difficulty} 
                    onValueChange={(value) => handleInputChange('difficulty', value)}
                  >
                    <SelectTrigger className="glass-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card">
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="question_type" className="glass-text font-medium">Question Type</Label>
                  <Select 
                    value={formData.question_type} 
                    onValueChange={(value) => handleInputChange('question_type', value)}
                  >
                    <SelectTrigger className="glass-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card">
                      <SelectItem value="MultipleChoice">Multiple Choice</SelectItem>
                      <SelectItem value="ShortAnswer">Short Answer</SelectItem>
                      <SelectItem value="TrueFalse">True/False</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="num_questions" className="glass-text font-medium">Number of Questions</Label>
                  <Input
                    id="num_questions"
                    type="number"
                    min="1"
                    max="50"
                    value={formData.num_questions}
                    onChange={(e) => handleInputChange('num_questions', parseInt(e.target.value))}
                    className="glass-input"
                  />
                </div>

                <div>
                  <Label htmlFor="duration" className="glass-text font-medium">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    max="180"
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                    className="glass-input"
                  />
                </div>
              </div>
            </div>

            {/* Query */}
            <div>
              <Label htmlFor="query" className="glass-text font-medium">Quiz Description</Label>
              <Textarea
                id="query"
                value={formData.query}
                onChange={(e) => handleInputChange('query', e.target.value)}
                placeholder="Describe what you want to be tested on..."
                className="glass-input min-h-[100px]"
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-4 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={loading}
                className="glass-card hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Quiz...
                  </>
                ) : (
                  'Create Quiz'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
