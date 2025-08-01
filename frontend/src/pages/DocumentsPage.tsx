import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, ArrowLeft, FolderOpen, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { ApiResponse } from '@/lib/api';
import { DocumentUploadDialog } from '@/components/collections/DocumentUploadDialog';

interface Document {
  document_id: string;
  document_name: string;
  chunks_count: number;
  first_chunk: string;
  storage_path: string;
}

export default function DocumentsPage() {
  const { collectionName } = useParams<{ collectionName: string }>();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (collectionName) {
      fetchDocuments(collectionName);
    }
  }, [collectionName]);
  const handleDocumentClick = (documentId: string) => {
    navigate(`/content/document/${collectionName}/${documentId}`);
  };

  const handleDeleteDocument = async (documentId: string, event: React.MouseEvent) => {
    // Stop event propagation to prevent card click
    event.stopPropagation();
    
    // Find the document to get its name for the dialog
    const document = documents.find(doc => doc.document_id === documentId);
    if (!document) return;
    
    // Set up dialog state
    setDocumentToDelete({ id: documentId, name: document.document_name });
    setShowDeleteDialog(true);
  };

  const confirmDeleteDocument = async () => {
    if (!documentToDelete) return;
    
    try {
      setDeleting(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response: ApiResponse = await makeRequest(
        `${API_BASE_URL}/api/v1/document/collections/${collectionName}/documents/${documentToDelete.id}`, 
        'DELETE'
      );

      if (response?.status === 'success') {
        toast.success('Document deleted successfully');
        setDocuments(documents.filter(doc => doc.document_id !== documentToDelete.id));
      } else {
        throw new Error('Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
      setDocumentToDelete(null);
    }
  };

  const cancelDeleteDocument = () => {
    setShowDeleteDialog(false);
    setDocumentToDelete(null);
  };



  const fetchDocuments = async (collection: string) => {
    try {
      setLoading(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response: ApiResponse = await makeRequest(
        `${API_BASE_URL}/api/v1/document/collections/${collection}/documents`, 
        'GET'
      );

      if (response?.status === 'success' && Array.isArray(response.data)) {
        setDocuments(response.data);
      } else if (Array.isArray(response)) {
        // Handle case where response.data is directly an array
        setDocuments(response);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingOverlay message="Loading documents..." />;
  }

  return (
    <div className="min-h-screen ">
      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="glass-card p-6 mb-6 rounded-md">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
            <div className="flex items-center gap-3 flex-1">
              <FolderOpen className="h-8 w-8 text-blue-400" />
              <div>
                <h1 className="text-3xl font-bold gradient-text">
                  {decodeURIComponent(collectionName || '')}
                </h1>
                <p className="glass-text-description mt-1">
                  {documents.length} document{documents.length !== 1 ? 's' : ''} found
                </p>
              </div>
            </div>
            <DocumentUploadDialog 
              preSelectedCollection={collectionName || ''}
              onUploadSuccess={() => fetchDocuments(collectionName || '')}
              buttonClassName="button-gradient text-white"
            />
          </div>
        </div>

        {/* Documents List */}
        {documents.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold glass-text-title mb-2">
                No documents found
              </h3>
              <p className="glass-text-description text-center">
                This collection doesn't have any documents yet.
              </p>
              <Button 
                onClick={() => navigate('/collections')}
                className="button-gradient mt-4 text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back to Collections
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {documents.map((document) => (
              <Card 
                key={document.document_id} 
                className="glass-card-hover-strong cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                onClick={() => handleDocumentClick(document.document_id)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <FileText className="h-8 w-8 text-blue-400 mt-1" />
                      <div className="flex-1 min-w-0">
                        <CardTitle className="glass-text-title text-xl mb-2">
                          {document.document_name}
                        </CardTitle>
                        {/* Document Metadata */}
                        <div className="flex flex-wrap items-center gap-4 mb-3">

                          <Badge variant="outline" className="text-xs">
                            {document.chunks_count} chunks
                          </Badge>

                        </div>
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={(e) => handleDeleteDocument(document.document_id, e)}
                        className="button-light"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>

                        {/* Document Preview */}
                        {document.first_chunk && (
                          <div className="mt-4 p-4 bg-gray-50/10 rounded-lg border border-gray-200/20">
                            <h4 className="text-sm font-semibold glass-text-title mb-2">
                              Document Preview:
                            </h4>
                            <p className="text-sm glass-text-description leading-relaxed">
                              {document.first_chunk.length > 300 
                                ? `${document.first_chunk.substring(0, 300)}...` 
                                : document.first_chunk
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Document
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{documentToDelete?.name}"? This action cannot be undone.
              All content and associated data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={cancelDeleteDocument}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteDocument}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Document
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
