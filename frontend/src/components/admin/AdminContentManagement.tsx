
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
  user_id: string;
  title: string;
  content_type: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function AdminContentManagement() {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
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

  const filteredContent = content.filter(item =>
    item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.content_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                  <TableHead>User ID</TableHead>
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
                ) : filteredContent.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No content found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContent.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.title || 'Untitled'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-white ${getContentTypeColor(item.content_type)}`}>
                          {item.content_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.user_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        {new Date(item.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedContent(item);
                              setIsViewDialogOpen(true);
                            }}
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
              Showing {filteredContent.length} of {totalContent} items
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedContent.title || 'Untitled'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedContent.content_type}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">User ID</label>
                    <p className="text-sm text-muted-foreground font-mono">
                      {selectedContent.user_id}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Created</label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedContent.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Content</label>
                  <div className="mt-2 p-4 bg-muted rounded-lg max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm">
                      {selectedContent.content}
                    </pre>
                  </div>
                </div>
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
