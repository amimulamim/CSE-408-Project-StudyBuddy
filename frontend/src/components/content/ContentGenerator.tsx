import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Sparkles, Loader2, Plus } from 'lucide-react';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';
import { ApiResponse } from '@/lib/api';

interface ContentGeneratorProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Collection {
  collection_name: string;
  full_collection_name: string;
  created_at: string;
}

export function ContentGenerator({ onClose, onSuccess }: ContentGeneratorProps) {
  const [formData, setFormData] = useState({
    contentType: '',
    contentTopic: '',
    difficulty: 'medium',
    length: 'medium',
    tone: 'instructive',
    collection_name: 'default'
  });
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);

  // Fetch user collections on component mount
  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      setCollectionsLoading(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response: ApiResponse = await makeRequest(
        `${API_BASE_URL}/api/v1/document/collections`,
        'GET'
      );

      if (response.data && Array.isArray(response.data)) {
        setCollections(response.data);
        // If user has collections, set the first one as default
        if (response.data.length > 0) {
          setFormData(prev => ({ 
            ...prev, 
            collection_name: response.data[0].collection_name 
          }));
        }
      } else {
        // Fallback to default if no collections
        setCollections([]);
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
      toast.error('Failed to load collections');
      setCollections([]);
    } finally {
      setCollectionsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.contentType || !formData.contentTopic.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response: ApiResponse = await makeRequest(
        `${API_BASE_URL}/api/v1/content/generate`,
        'POST',
        formData
      );

      if (response?.status === 'success') {
        toast.success('Content generated successfully!');
        onSuccess();
      } else {
        toast.error(response?.msg || 'Failed to generate content');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error('Failed to generate content');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen dashboard-bg-animated">
      <div className="container mx-auto py-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold gradient-text">Generate Content</h1>
            <p className="text-muted-foreground">Create flashcards or slides</p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Content Generator
            </CardTitle>
            <CardDescription>
              Fill in the details to generate educational content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contentType">Content Type *</Label>
                  <Select 
                    value={formData.contentType} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, contentType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select content type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flashcards">Flashcards</SelectItem>
                      <SelectItem value="slides">Slides</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="collection">Collection</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={formData.collection_name} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, collection_name: value }))}
                      disabled={collectionsLoading}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={collectionsLoading ? "Loading..." : "Select collection"} />
                      </SelectTrigger>
                      <SelectContent>
                        {collectionsLoading ? (
                          <SelectItem value="loading" disabled>
                            Loading collections...
                          </SelectItem>
                        ) : collections.length > 0 ? (
                          <>
                            <SelectItem value="default">Default Collection</SelectItem>
                            {collections.map((collection) => (
                              <SelectItem 
                                key={collection.collection_name} 
                                value={collection.collection_name}
                              >
                                {collection.collection_name}
                              </SelectItem>
                            ))}
                          </>
                        ) : (
                          <>
                            <SelectItem value="default">Default Collection</SelectItem>
                            <SelectItem value="no-collections" disabled>
                              No collections found
                            </SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={fetchCollections}
                      disabled={collectionsLoading}
                      title="Refresh collections"
                    >
                      {collectionsLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {collections.length === 0 && !collectionsLoading && (
                    <p className="text-xs text-muted-foreground">
                      No document collections found. Upload documents to create collections.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contentTopic">Topic *</Label>
                <Input
                  id="contentTopic"
                  placeholder="Enter the topic you want to learn about"
                  value={formData.contentTopic}
                  onChange={(e) => setFormData(prev => ({ ...prev, contentTopic: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select 
                    value={formData.difficulty} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="length">Length</Label>
                  <Select 
                    value={formData.length} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, length: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="long">Long</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tone">Tone</Label>
                  <Select 
                    value={formData.tone} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, tone: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instructive">Instructive</SelectItem>
                      <SelectItem value="engaging">Engaging</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="button-gradient">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Content
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}