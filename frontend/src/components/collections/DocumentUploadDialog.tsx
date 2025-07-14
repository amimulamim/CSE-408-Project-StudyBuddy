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
  const [uploadProgress, setUploadProgress] = useState(0);
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

    // Check file size (client-side check - 50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (uploadFile.size > maxSize) {
      toast.error('File size exceeds 50MB limit. Please select a smaller file.');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      
      // Show initial progress
      const progressToast = toast.loading('Preparing upload...', {
        description: `Uploading ${uploadFile.name} (${(uploadFile.size / 1024 / 1024).toFixed(2)} MB)`
      });

      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('collection_name', selectedCollection);

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
          toast.loading(`Uploading... ${progress}%`, {
            id: progressToast,
            description: `${uploadFile.name} (${(uploadFile.size / 1024 / 1024).toFixed(2)} MB)`
          });
        }
      });

      // Handle completion
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response);
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.ontimeout = () => reject(new Error('Upload timed out'));
      });

      // Configure and send request
      xhr.timeout = 300000; // 5 minutes timeout
      xhr.open('POST', `${API_BASE_URL}/api/v1/document/documents`);
      
      // Add auth headers if available
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      xhr.send(formData);
      
      // Wait for upload completion
      await uploadPromise;
      
      // Dismiss progress toast and show success
      toast.dismiss(progressToast);
      toast.success('Document uploaded successfully', {
        description: `${uploadFile.name} has been processed and added to the collection.`
      });
      
      // Reset form
      setUploadFile(null);
      setUploadProgress(0);
      if (!preSelectedCollection) {
        setSelectedCollection('');
      }
      
      // Close dialog
      setIsOpen(false);
      
      // Call success callback
      onUploadSuccess?.();
    } catch (error) {
      console.error('Error uploading document:', error);
      let errorMessage = 'Failed to upload document';
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Upload timed out. Please try again with a smaller file.';
        } else if (error.message.includes('413')) {
          errorMessage = 'File too large. Please select a smaller file.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        }
      }
      
      toast.error(errorMessage);
      onUploadError?.(error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
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
          {uploadFile && (
            <div className="mt-2 p-2 bg-blue-50/10 rounded-lg border border-blue-200/20">
              <div className="flex items-center justify-between text-sm">
                <span className="glass-text-title truncate">{uploadFile.name}</span>
                <span className="glass-text-description ml-2">
                  {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              {uploadFile.size > 50 * 1024 * 1024 && (
                <p className="text-red-400 text-xs mt-1">
                  ⚠️ File exceeds 50MB limit
                </p>
              )}
              {uploading && uploadProgress > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="glass-text-description">Uploading...</span>
                    <span className="glass-text-description">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200/20 rounded-full h-2">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
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
            disabled={uploading || !uploadFile || !selectedCollection || (uploadFile && uploadFile.size > 50 * 1024 * 1024)}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {uploadProgress > 0 ? `Uploading ${uploadProgress}%` : 'Preparing...'}
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
