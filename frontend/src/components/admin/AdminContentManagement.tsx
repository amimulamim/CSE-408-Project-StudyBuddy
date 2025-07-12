import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Search, Eye, Trash2 } from 'lucide-react';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';

interface Content {
  id: string;
  title: string;
  user_id: string;
  user_name: string;
  user_email: string;
  content_url: string;
  image_preview?: string;
  topic?: string;
  content_type: string;
  raw_source?: string;
  created_at: string;
}

export function AdminContentManagement() {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [selectedContentDetails, setSelectedContentDetails] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalContent, setTotalContent] = useState(0);
  const pageSize = 20;

  const fetchContent = async (page = 0) => {
    try {
      setLoading(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response = await makeRequest(
        `${API_BASE_URL}/api/v1/admin/content?offset=${page * pageSize}&size=${pageSize}`,
        'GET'
      );

      if (response && typeof response === 'object' && 'status' in response) {
        if (response.status === 'success' && response.data) {
          setContent(response.data.content || []);
          setTotalContent(response.data.total || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent(currentPage);
  }, [currentPage]);

  const fetchContentDetails = async (contentId: string) => {
    try {
      setLoadingDetails(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response = await makeRequest(
        `${API_BASE_URL}/api/v1/admin/content/${contentId}`,
        'GET'
      );

      if (response && typeof response === 'object' && 'status' in response) {
        if (response.status === 'success' && response.data) {
          setSelectedContentDetails(response.data);
        }
      }
    } catch (error) {
      console.error('Error fetching content details:', error);
      toast.error('Failed to load content details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewContent = async (item: Content) => {
    setSelectedContent(item);
    setIsViewDialogOpen(true);
    await fetchContentDetails(item.id);
  };

  const handleDeleteContent = async (contentId: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;

    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response = await makeRequest(
        `${API_BASE_URL}/api/v1/admin/content/${contentId}`,
        'DELETE'
      );

      if (response && typeof response === 'object' && 'status' in response) {
        if (response.status === 'success') {
          toast.success('Content deleted successfully');
          fetchContent(currentPage);
        } else {
          toast.error('Failed to delete content');
        }
      }
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Failed to delete content');
    }
  };

  const searchContent = async () => {
    if (!searchTerm.trim()) {
      await fetchContent(0);
      return;
    }

    try {
      setLoading(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response = await makeRequest(
        `${API_BASE_URL}/api/v1/admin/content/search?query=${encodeURIComponent(searchTerm)}&offset=0&size=${pageSize}`,
        'GET'
      );

      if (response && typeof response === 'object' && 'status' in response) {
        if (response.status === 'success' && response.data) {
          setContent(response.data.content || []);
          setTotalContent(response.data.total || 0);
          setCurrentPage(0);
        }
      }
    } catch (error) {
      console.error('Error searching content:', error);
      toast.error('Failed to search content');
    } finally {
      setLoading(false);
    }
  };

  // Trigger search when searchTerm changes (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        searchContent();
      } else {
        fetchContent(0);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const getContentTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'notes': return 'bg-blue-500';
      case 'summary': return 'bg-green-500';
      case 'flashcards': return 'bg-purple-500';
      case 'quiz': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Content Management
        </CardTitle>
        <CardDescription>View and manage all generated content</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table className="enhanced-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Loading content...
                    </TableCell>
                  </TableRow>
                ) : content.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No content found
                    </TableCell>
                  </TableRow>
                ) : (
                  content.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.title || 'Untitled'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-white ${getContentTypeColor(item.content_type)}`}>
                          {item.content_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{item.user_name}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {item.user_id.substring(0, 8)}...
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(item.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewContent(item)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteContent(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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
              Showing {content.length} of {totalContent} items
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
                disabled={(currentPage + 1) * pageSize >= totalContent}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* View Content Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Content Details</DialogTitle>
              <DialogDescription>
                View the full content details
              </DialogDescription>
            </DialogHeader>
            {selectedContent && (
              <div className="space-y-4 py-4">
                {loadingDetails ? (
                  <div className="text-center py-8">Loading content details...</div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium">Title</div>
                        <p className="text-sm text-muted-foreground">
                          {selectedContent.title || 'Untitled'}
                        </p>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Type</div>
                        <p className="text-sm text-muted-foreground">
                          {selectedContent.content_type}
                        </p>
                      </div>
                      <div>
                        <div className="text-sm font-medium">User</div>
                        <div className="text-sm text-muted-foreground">
                          <div className="font-medium">{selectedContent.user_name}</div>
                          <div className="text-xs">{selectedContent.user_email}</div>
                          <div className="text-xs font-mono">{selectedContent.user_id}</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Created</div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(selectedContent.created_at).toLocaleString()}
                        </p>
                      </div>
                      {selectedContent.topic && (
                        <div className="col-span-2">
                          <div className="text-sm font-medium">Topic</div>
                          <p className="text-sm text-muted-foreground">
                            {selectedContent.topic}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Content Preview */}
                    <div>
                      <div className="text-sm font-medium mb-2">Content Preview</div>
                      {selectedContent.image_preview && (
                        <div className="mb-4">
                          <img 
                            src={selectedContent.image_preview} 
                            alt="Content preview" 
                            className="max-w-full h-auto rounded-lg border"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium">Content URL: </span>
                          <a 
                            href={selectedContent.content_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700 underline text-sm break-all"
                          >
                            {selectedContent.content_url}
                          </a>
                        </div>
                        {selectedContent.raw_source && (
                          <div>
                            <span className="text-sm font-medium">Raw Source: </span>
                            <a 
                              href={selectedContent.raw_source} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-700 underline text-sm break-all"
                            >
                              {selectedContent.raw_source}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* User Profile Info (if available from detailed fetch) */}
                    {selectedContentDetails?.user_profile && (
                      <div>
                        <div className="text-sm font-medium mb-2">User Profile</div>
                        <div className="bg-muted rounded-lg p-4 space-y-2">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Institution: </span>
                              {selectedContentDetails.user_profile.institution || 'Not specified'}
                            </div>
                            <div>
                              <span className="font-medium">Role: </span>
                              {selectedContentDetails.user_profile.role || 'Not specified'}
                            </div>
                            <div>
                              <span className="font-medium">Study Domain: </span>
                              {selectedContentDetails.user_profile.study_domain || 'Not specified'}
                            </div>
                            <div>
                              <span className="font-medium">Plan: </span>
                              {selectedContentDetails.user_profile.current_plan || 'Not specified'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
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
