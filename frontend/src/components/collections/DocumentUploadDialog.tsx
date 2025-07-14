import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2 } from 'lucide-react';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';
import { ApiResponse } from '@/lib/api';

interface Collection {
  collection_name: string;
  full_collection_name: string;
  created_at: string;
}

interface DocumentUploadDialogProps {
  readonly children?: React.ReactNode;
  readonly preSelectedCollection?: string;
  readonly collections?: Collection[];
  readonly onUploadSuccess?: () => void;
  readonly onUploadError?: (error: any) => void;
  readonly buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  readonly buttonClassName?: string;
  readonly showTriggerButton?: boolean;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

export function DocumentUploadDialog({
  children,
  preSelectedCollection,
  collections = [],
  onUploadSuccess,
  onUploadError,
  buttonVariant = 'default',
  buttonClassName = 'button-light',
  showTriggerButton = true,
  open,
  onOpenChange
}: DocumentUploadDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [selectedCollection, setSelectedCollection] = useState(preSelectedCollection || '');
  const [availableCollections, setAvailableCollections] = useState<Collection[]>(collections);
  const [uploading, setUploading] = useState(false);
  const [fetchingCollections, setFetchingCollections] = useState(!collections.length && !preSelectedCollection);

  // Use controlled or internal state for dialog open/close
  const isOpen = open ?? internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  // Fetch collections if not provided and no pre-selected collection
  useEffect(() => {
    if (!collections.length && !preSelectedCollection) {
      fetchCollections();
    }
  }, [collections.length, preSelectedCollection]);

  // Update selected collection when preSelectedCollection changes
  useEffect(() => {
    if (preSelectedCollection) {
      setSelectedCollection(preSelectedCollection);
    }
  }, [preSelectedCollection]);

  // Update available collections when collections prop changes
  useEffect(() => {
    if (collections.length > 0) {
      setAvailableCollections(collections);
    }
  }, [collections]);

  const fetchCollections = async () => {
    try {
      setFetchingCollections(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response: ApiResponse = await makeRequest(`${API_BASE_URL}/api/v1/document/collections`, 'GET');
      
      if (response?.status === 'success' && Array.isArray(response.data)) {
        setAvailableCollections(response.data);
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
      toast.error('Failed to load collections');
    } finally {
      setFetchingCollections(false);
    }
  };

  const handleUploadDocument = async () => {
    if (!uploadFile || !selectedCollection) {
      toast.error('Please select a file and collection');
      return;
    }

    try {
      setUploading(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('collection_name', selectedCollection);

      await makeRequest(`${API_BASE_URL}/api/v1/document/documents`, 'POST', formData);
      
      toast.success('Document uploaded successfully');
      
      // Reset form
      setUploadFile(null);
      if (!preSelectedCollection) {
        setSelectedCollection('');
      }
      
      // Close dialog
      setIsOpen(false);
      
      // Call success callback
      onUploadSuccess?.();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
      onUploadError?.(error);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setUploadFile(null);
    if (!preSelectedCollection) {
      setSelectedCollection('');
    }
    setIsOpen(false);
  };

  const dialogContent = (
    <DialogContent className="glass-card">
      <DialogHeader>
        <DialogTitle className="glass-text-title">Upload Document</DialogTitle>
        <DialogDescription className="glass-text-description">
          {preSelectedCollection 
            ? `Upload a document to the "${preSelectedCollection}" collection`
            : 'Upload a document to an existing collection'
          }
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 mt-4">
        <div>
          <Label htmlFor="file" className="glass-text">Select File</Label>
          <Input
            id="file"
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            className="glass-input mt-1"
            disabled={uploading}
          />
        </div>
        
        {!preSelectedCollection && (
          <div>
            <Label htmlFor="collection" className="glass-text">Collection</Label>
            {fetchingCollections ? (
              <div className="flex items-center gap-2 mt-1 p-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm glass-text-description">Loading collections...</span>
              </div>
            ) : (
              <Select value={selectedCollection} onValueChange={setSelectedCollection} disabled={uploading}>
                <SelectTrigger className="glass-input mt-1">
                  <SelectValue placeholder="Select a collection" />
                </SelectTrigger>
                <SelectContent className="glass-card">
                  {availableCollections.map((collection) => (
                    <SelectItem key={collection.collection_name} value={collection.collection_name}>
                      {collection.collection_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {preSelectedCollection && (
          <div>
            <Label className="glass-text">Collection</Label>
            <div className="mt-1 p-2 bg-gray-50/10 rounded-lg border border-gray-200/20">
              <span className="glass-text-title">{preSelectedCollection}</span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleCancel} disabled={uploading}>
            Cancel
          </Button>
          <Button 
            onClick={handleUploadDocument} 
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={uploading || !uploadFile || !selectedCollection}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </div>
      </div>
    </DialogContent>
  );

  if (showTriggerButton) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {children || (
            <Button variant={buttonVariant} className={buttonClassName}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          )}
        </DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  }

  // For controlled usage without trigger button
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {dialogContent}
    </Dialog>
  );
}
