import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FlashcardsViewer } from '@/components/content/FlashcardsViewer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';
import { ApiResponse } from '@/lib/api';

interface Flashcard {
  front: string;
  back: string;
}

interface ContentMetadata {
  topic: string;
  contentType: string;
  createdAt: string;
}

export default function FlashcardsView() {
  const { contentId } = useParams();
  const navigate = useNavigate();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [metadata, setMetadata] = useState<ContentMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (contentId) {
      fetchFlashcards();
    }
  }, [contentId]);

  const fetchFlashcards = async () => {
    try {
      setLoading(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      
      // Use the raw endpoint instead of fetching JSON directly
      const response:ApiResponse = await makeRequest(
        `${API_BASE_URL}/api/v1/content/raw/${contentId}`,
        'GET'
      );

      if (response?.status === 'success') {
        setMetadata(response.data.data.metadata);
        setFlashcards(response.data.data.content); // Content is already parsed JSON
      } else {
        throw new Error('Failed to load content');
      }
    } catch (error) {
      console.error('Error fetching flashcards:', error);
      setError('Failed to load flashcards');
      toast.error('Failed to load flashcards');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen dashboard-bg-animated flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <p className="text-muted-foreground">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  if (error || !metadata) {
    return (
      <div className="min-h-screen dashboard-bg-animated flex items-center justify-center">
        <Card className="glass-card max-w-md">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Error Loading Content</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={fetchFlashcards}>Try Again</Button>
              <Button variant="outline" onClick={() => navigate('/dashboard/content')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Library
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <FlashcardsViewer 
      flashcards={flashcards}
      topic={metadata.topic}
      onClose={() => navigate('/dashboard/content')}
    />
  );
}