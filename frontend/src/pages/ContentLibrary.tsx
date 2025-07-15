import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, BookOpen, CreditCard, Plus, Filter, X } from 'lucide-react';
import { ContentList } from '@/components/content/ContentList';
import { ContentGenerator } from '@/components/content/ContentGenerator';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';

interface ContentItem {
  contentId: string;
  topic: string;
  type: 'flashcards' | 'slides';
  createdAt: string;
  collection_name: string;
}

export default function ContentLibrary() {
  const navigate = useNavigate();
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerator, setShowGenerator] = useState(false);
  const [filterTopic, setFilterTopic] = useState<string>('');
  const [sortBy, setSortBy] = useState<'created_at' | 'topic'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [tempSelectedCollections, setTempSelectedCollections] = useState<string[]>([]);
  const [availableCollections, setAvailableCollections] = useState<string[]>([]);

  useEffect(() => {
    fetchUserContent();
  }, [filterTopic, sortBy, sortOrder, selectedCollections]);

  const fetchUserContent = async () => {
    try {
      setLoading(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      let url = `${API_BASE_URL}/api/v1/content/user`;
      
      const params = new URLSearchParams();
      if (filterTopic?.trim()) {
        params.append('filter_topic', filterTopic.trim());
      }
      if (selectedCollections.length > 0) {
        selectedCollections.forEach(collection => {
          params.append('filter_collection', collection);
        });
      }
      params.append('sort_by', sortBy);
      params.append('sort_order', sortOrder);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await makeRequest(url, 'GET') as any;
      
      if (response?.status === 'success') {
        const contentData = response.data?.contents || [];
        setContents(contentData);
        
        // Extract unique collection names for the filter
        const collections = [...new Set(contentData.map((item: ContentItem) => item.collection_name))].filter(Boolean);
        setAvailableCollections(collections as string[]);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handleCollectionToggle = (collection: string) => {
    setTempSelectedCollections(prev => 
      prev.includes(collection) 
        ? prev.filter(c => c !== collection)
        : [...prev, collection]
    );
  };

  const applyCollectionFilters = () => {
    setSelectedCollections(tempSelectedCollections);
  };

  const clearCollectionFilters = () => {
    setSelectedCollections([]);
    setTempSelectedCollections([]);
  };

  const openCollectionFilter = () => {
    setTempSelectedCollections(selectedCollections);
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
            {/* Collection Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={openCollectionFilter}
                >
                  <Filter className="h-4 w-4" />
                  Collections
                  {selectedCollections.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {selectedCollections.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filter by Collections</h4>
                    {(selectedCollections.length > 0 || tempSelectedCollections.length > 0) && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearCollectionFilters}
                        className="h-auto p-1"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availableCollections.map((collection) => (
                      <div key={collection} className="flex items-center space-x-2">
                        <Checkbox
                          id={collection}
                          checked={tempSelectedCollections.includes(collection)}
                          onCheckedChange={() => handleCollectionToggle(collection)}
                        />
                        <label
                          htmlFor={collection}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          {collection}
                        </label>
                      </div>
                    ))}
                    {availableCollections.length === 0 && (
                      <p className="text-sm text-muted-foreground">No collections found</p>
                    )}
                  </div>
                  {availableCollections.length > 0 && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Button 
                        size="sm" 
                        onClick={applyCollectionFilters}
                        className="flex-1"
                        disabled={
                          JSON.stringify([...tempSelectedCollections].sort((a, b) => a.localeCompare(b))) === 
                          JSON.stringify([...selectedCollections].sort((a, b) => a.localeCompare(b)))
                        }
                      >
                        Apply Filters
                      </Button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            
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

        {/* Active Filters Display */}
        {selectedCollections.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Filtered by collections:</span>
            {selectedCollections.map((collection) => (
              <Badge key={collection} variant="secondary" className="flex items-center gap-1">
                {collection}
                <X 
                  className="h-3 w-3 cursor-pointer hover:text-destructive" 
                  onClick={() => handleCollectionToggle(collection)}
                />
              </Badge>
            ))}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearCollectionFilters}
              className="h-6 px-2 text-xs"
            >
              Clear all
            </Button>
          </div>
        )}

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