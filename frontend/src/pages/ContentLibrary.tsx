import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, BookOpen, CreditCard, Plus } from 'lucide-react';
import { ContentList } from '@/components/content/ContentList';
import { ContentGenerator } from '@/components/content/ContentGenerator';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';

interface ContentItem {
  contentId: string;
  topic: string;
  type: 'flashcards' | 'slides';
  createdAt: string;
}

export default function ContentLibrary() {
  const navigate = useNavigate();
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerator, setShowGenerator] = useState(false);
  const [filterTopic, setFilterTopic] = useState<string>('');
  const [sortBy, setSortBy] = useState<'created_at' | 'topic'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchUserContent();
  }, [filterTopic, sortBy, sortOrder]);

  const fetchUserContent = async () => {
    try {
      setLoading(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      let url = `${API_BASE_URL}/api/v1/content/user`;
      
      const params = new URLSearchParams();
      if (filterTopic?.trim()) {
        params.append('filter_topic', filterTopic.trim());
      }
      params.append('sort_by', sortBy);
      params.append('sort_order', sortOrder);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await makeRequest(url, 'GET') as any;
      
      if (response?.status === 'success') {
        setContents(response.data?.contents || []);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const flashcards = contents.filter(item => item.type === 'flashcards');
  const slides = contents.filter(item => item.type === 'slides');

  if (showGenerator) {
    return (
      <ContentGenerator 
        onClose={() => setShowGenerator(false)}
        onSuccess={() => {
          setShowGenerator(false);
          fetchUserContent();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen dashboard-bg-animated">
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Content Library</h1>
            <p className="text-muted-foreground">Manage your generated educational content</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setShowGenerator(true)}
              className="flex items-center gap-2 button-gradient"
            >
              <Plus className="h-4 w-4" />
              Generate Content
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
        {/* Filter and Sort Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by topic…"
              value={filterTopic}
              onChange={e => setFilterTopic(e.target.value)}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring text-black placeholder-gray-500"
            />
          </div>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={(value: 'created_at' | 'topic') => setSortBy(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Created Date</SelectItem>
                <SelectItem value="topic">Topic</SelectItem>
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
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Content</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contents.length}</div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Flashcards</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{flashcards.length}</div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Slides</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{slides.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Content ({contents.length})</TabsTrigger>
            <TabsTrigger value="flashcards">Flashcards ({flashcards.length})</TabsTrigger>
            <TabsTrigger value="slides">Slides ({slides.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            <ContentList contents={contents} loading={loading} setContents={setContents} />
          </TabsContent>
          
          <TabsContent value="flashcards">
            <ContentList contents={flashcards} loading={loading} setContents={setContents} />
          </TabsContent>
          
          <TabsContent value="slides">
            <ContentList contents={slides} loading={loading} setContents={setContents} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}