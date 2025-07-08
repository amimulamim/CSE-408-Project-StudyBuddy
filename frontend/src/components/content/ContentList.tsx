import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, FileText, Calendar, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';
import { makeRequest } from '@/lib/apiCall';

interface ContentItem {
  contentId: string;
  topic: string;
  type: 'flashcards' | 'slides';
  createdAt: string;
}

interface ContentListProps {
  contents: ContentItem[];
  loading: boolean;
  onContentUpdate?: () => void;
  setContents?: React.Dispatch<React.SetStateAction<ContentItem[]>>; // Add this prop
}

export function ContentList({ contents, loading, onContentUpdate, setContents }: ContentListProps) {
  const navigate = useNavigate();
  const [renameDialog, setRenameDialog] = useState<{ open: boolean; item: ContentItem | null }>({
    open: false,
    item: null
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; item: ContentItem | null }>({
    open: false,
    item: null
  });
  const [newTopic, setNewTopic] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const getTypeIcon = (type: string) => {
    return type === 'flashcards' ? CreditCard : FileText;
  };

  const getTypeColor = (type: string) => {
    return type === 'flashcards' ? 'bg-purple-500' : 'bg-blue-500';
  };

  const handleViewContent = (item: ContentItem) => {
    if (item.type === 'flashcards') {
      navigate(`/content/flashcards/${item.contentId}`);
    } else {
      navigate(`/content/slides/${item.contentId}`);
    }
  };

  const handleRename = (item: ContentItem) => {
    setNewTopic(item.topic);
    setRenameDialog({ open: true, item });
  };

  const handleDelete = (item: ContentItem) => {
    setDeleteDialog({ open: true, item });
  };

  const submitRename = async () => {
    if (!renameDialog.item || !newTopic.trim()) return;

    try {
      setIsRenaming(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      
      await makeRequest(
        `${API_BASE_URL}/api/v1/content/topic/${renameDialog.item.contentId}`,
        'PATCH',
        { topic: newTopic.trim() }
      );

      // Update local state immediately
      if (setContents) {
        setContents(prevContents => 
          prevContents.map(item => 
            item.contentId === renameDialog.item!.contentId 
              ? { ...item, topic: newTopic.trim() }
              : item
          )
        );
      }

      toast.success('Content renamed successfully');
      setRenameDialog({ open: false, item: null });
      setNewTopic('');
      
      // Still call the callback for any other updates needed
      onContentUpdate?.();
    } catch (error) {
      console.error('Failed to rename content:', error);
      toast.error('Failed to rename content');
    } finally {
      setIsRenaming(false);
    }
  };

  const submitDelete = async () => {
    if (!deleteDialog.item) return;

    try {
      setIsDeleting(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      
      await makeRequest(
        `${API_BASE_URL}/api/v1/content/${deleteDialog.item.contentId}`,
        'DELETE'
      );

      // Update local state immediately
      if (setContents) {
        setContents(prevContents => 
          prevContents.filter(item => item.contentId !== deleteDialog.item!.contentId)
        );
      }

      toast.success('Content deleted successfully');
      setDeleteDialog({ open: false, item: null });
      
      // Still call the callback for any other updates needed
      onContentUpdate?.();
    } catch (error) {
      console.error('Failed to delete content:', error);
      toast.error('Failed to delete content');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="glass-card animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-300 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (contents.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No content found</h3>
          <p className="text-muted-foreground text-center">
            Generate your first piece of educational content to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contents.map((item) => {
          const Icon = getTypeIcon(item.type);
          return (
            <Card 
              key={item.contentId} 
              className="glass-card-hover-strong group cursor-pointer"
              onClick={() => handleViewContent(item)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-purple-500" />
                    <Badge className={`text-white ${getTypeColor(item.type)}`}>
                      {item.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span className="text-xs">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass-card">
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRename(item);
                          }}
                          className="cursor-pointer"
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item);
                          }}
                          className="cursor-pointer text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardTitle className="text-lg group-hover:text-purple-600 transition-colors">
                  {item.topic}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="flex-1">
                  {item.type === 'flashcards' ? 'Interactive flashcards' : 'PDF presentation'}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Rename Dialog */}
      <Dialog open={renameDialog.open} onOpenChange={(open) => {
        if (!open) {
          setRenameDialog({ open: false, item: null });
          setNewTopic('');
        }
      }}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Rename Content</DialogTitle>
            <DialogDescription>
              Change the topic name for this content.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="topic" className="text-right">
                Topic
              </Label>
              <Input
                id="topic"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                className="col-span-3"
                placeholder="Enter new topic name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    submitRename();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setRenameDialog({ open: false, item: null })}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button 
              onClick={submitRename}
              disabled={isRenaming || !newTopic.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isRenaming ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => {
        if (!open) {
          setDeleteDialog({ open: false, item: null });
        }
      }}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Delete Content</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.item?.topic}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialog({ open: false, item: null })}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={submitDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}