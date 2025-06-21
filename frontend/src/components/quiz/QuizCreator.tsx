import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Quiz } from './QuizDashboard';

interface QuizCreatorProps {
  onQuizCreated: (quiz: Omit<Quiz, 'id' | 'status' | 'createdAt'>) => void;
  onCancel: () => void;
}

export function QuizCreator({ onQuizCreated, onCancel }: QuizCreatorProps) {
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    topic: '',
    difficulty: 'Medium' as 'Easy' | 'Medium' | 'Hard',
    totalQuestions: 10,
    duration: 15,
    marks: 50,
    description: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.subject || !formData.topic) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsGenerating(true);
    
    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onQuizCreated({
        title: formData.title,
        subject: formData.subject,
        topic: formData.topic,
        difficulty: formData.difficulty,
        totalQuestions: formData.totalQuestions,
        duration: formData.duration,
        marks: formData.marks
      });
      
      toast.success('Quiz created successfully!');
    } catch (error) {
      toast.error('Failed to create quiz');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onCancel} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h2 className="text-3xl font-bold gradient-text">Create Custom Quiz</h2>
          <p className="text-muted-foreground">Design a personalized quiz tailored to your needs</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Quiz Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Quiz Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Mathematics Fundamentals"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="e.g., Mathematics"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="topic">Topic *</Label>
                <Input
                  id="topic"
                  value={formData.topic}
                  onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                  placeholder="e.g., Algebra, Calculus"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select 
                  value={formData.difficulty} 
                  onValueChange={(value: 'Easy' | 'Medium' | 'Hard') => 
                    setFormData(prev => ({ ...prev, difficulty: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="questions">Number of Questions</Label>
                <Input
                  id="questions"
                  type="number"
                  min="5"
                  max="50"
                  value={formData.totalQuestions}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    totalQuestions: parseInt(e.target.value) || 10 
                  }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="5"
                  max="180"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    duration: parseInt(e.target.value) || 15 
                  }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="marks">Total Marks</Label>
                <Input
                  id="marks"
                  type="number"
                  min="10"
                  max="500"
                  value={formData.marks}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    marks: parseInt(e.target.value) || 50 
                  }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Additional Requirements (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Any specific topics or requirements for the quiz..."
                rows={3}
              />
            </div>

            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isGenerating}
                className="flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {isGenerating ? 'Generating Quiz...' : 'Generate Quiz'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
