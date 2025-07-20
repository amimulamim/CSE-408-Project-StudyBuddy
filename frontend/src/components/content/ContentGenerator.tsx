import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Sparkles, Loader2, Plus, Crown } from 'lucide-react';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';
import { ApiResponse } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    contentType: '',
    contentTopic: '',
    difficulty: 'medium',
    length: 'medium',
    tone: 'instructive',
    collection_name: 'default',
    special_instructions: ''
  });
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [usageStatus, setUsageStatus] = useState<any>(null);
  const [usageLoading, setUsageLoading] = useState(true);

  // Fetch user collections and usage status on component mount
  useEffect(() => {
    fetchCollections();
    fetchUsageStatus();
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

  const fetchUsageStatus = async () => {
    try {
      setUsageLoading(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response: ApiResponse = await makeRequest(
        `${API_BASE_URL}/api/v1/content/usage/status`,
        'GET'
      );

      console.log('Usage status response:', response); // Debug log

      if (response?.status === 'success' && response.data) {
        setUsageStatus(response.data.data);
      } else if (response.data) {
        // Fallback in case the response structure is different
        setUsageStatus(response.data);
      }
    } catch (error) {
      console.error('Error fetching usage status:', error);
      toast.error('Failed to load usage information');
    } finally {
      setUsageLoading(false);
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
        // Check for daily limit exceeded error
        if (response?.data?.detail?.error === 'DAILY_LIMIT_EXCEEDED') {
          toast.error(
            'Daily content generation limit reached (5/day for free users)',
            {
              action: {
                label: 'Upgrade to Premium',
                onClick: () => navigate('/dashboard/billing')
              }
            }
          );
        } else {
          toast.error(response?.msg || 'Failed to generate content');
        }
      }
    } catch (error: any) {
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
            
            {/* Usage Status Indicator */}
            {!usageLoading && usageStatus && (
              <div className="mt-4 p-3 rounded-lg border">
                {usageStatus.has_premium ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <Crown className="h-4 w-4" />
                    <span className="text-sm font-medium">Premium Account - Unlimited Generation</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Daily Usage:</span>
                      <span className="text-sm font-medium">
                        {usageStatus.daily_count}/{usageStatus.daily_limit ?? '∞'} content generations
                      </span>
                    </div>
                    {usageStatus.daily_limit !== null &&
   usageStatus.daily_count >= usageStatus.daily_limit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate('/dashboard/billing')}
                        className="text-xs"
                      >
                        <Crown className="h-3 w-3 mr-1" />
                        Upgrade
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {/* Show limit reached message */}
            {!usageLoading && usageStatus && !usageStatus.can_generate && (
              <div className="mb-6 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                <div className="flex items-center gap-2 text-yellow-800 mb-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="font-medium">Daily Limit Reached</span>
                </div>
                <p className="text-sm text-yellow-700 mb-3">
                  You've reached your daily limit of 5 content generations. Upgrade to premium for unlimited access.
                </p>
                <Button
                  onClick={() => navigate('/dashboard/billing')}
                  className="w-full"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Premium
                </Button>
              </div>
            )}
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

              <div className="space-y-2">
                <Label htmlFor="special_instructions">Special Instructions</Label>
                <Textarea
                  id="special_instructions"
                  placeholder="Add specific instructions about what to focus on, what to exclude, what form of details or examples you want, subtopics to emphasize, etc. (optional)"
                  value={formData.special_instructions}
                  onChange={(e) => setFormData(prev => ({ ...prev, special_instructions: e.target.value }))}
                  className="min-h-[80px] resize-y"
                />
                <p className="text-xs text-muted-foreground">
                  Example: "Focus on practical examples, exclude theoretical proofs, include step-by-step solutions, emphasize real-world applications"
                </p>
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
                <Button type="submit" 
                  disabled={loading || (usageStatus && !usageStatus.can_generate)} 
                  className="button-gradient"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : usageStatus && !usageStatus.can_generate ? (
                    <>
                      <Crown className="h-4 w-4 mr-2" />
                      Limit Reached
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