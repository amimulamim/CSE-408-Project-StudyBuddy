import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  FolderPlus, 
  Upload, 
  MoreVertical, 
  Edit, 
  Trash2, 
  FileText, 
  Calendar,
  Folder,
  Search
} from 'lucide-react';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { ApiResponse } from '@/lib/api';
import { DocumentUploadDialog } from '@/components/collections/DocumentUploadDialog';

interface Collection {
  collection_name: string;
  full_collection_name: string;
  created_at: string;
}

export default function CollectionsPage() {
  const navigate = useNavigate();

  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  
  // Form states
  const [newCollectionName, setNewCollectionName] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response:ApiResponse = await makeRequest(`${API_BASE_URL}/api/v1/document/collections`, 'GET');
      if (response?.status !== 'success') {
        throw new Error('Failed to load collections');
      }
      if (response && Array.isArray(response.data)) {
        setCollections(response.data);
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
      toast.error('Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      toast.error('Please enter a collection name');
      return;
    }

    try {
      setActionLoading(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      await makeRequest(`${API_BASE_URL}/api/v1/document/collections`, 'POST', {
        collection_name: newCollectionName.trim()
      });
      
      toast.success('Collection created successfully');
      setCreateDialogOpen(false);
      setNewCollectionName('');
      await fetchCollections();
    } catch (error) {
      console.error('Error creating collection:', error);
      toast.error('Failed to create collection');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCollection = async (collectionName: string) => {
    try {
      setActionLoading(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      await makeRequest(`${API_BASE_URL}/api/v1/document/collections/${collectionName}`, 'DELETE');
      
      toast.success('Collection deleted successfully');
      await fetchCollections();
    } catch (error) {
      console.error('Error deleting collection:', error);
      toast.error('Failed to delete collection');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDocuments = (collectionName: string) => {
    navigate(`/collections/${encodeURIComponent(collectionName)}`);
  };

  const openRenameDialog = (collection: Collection) => {
    setSelectedCollection(collection);
    setNewName(collection.collection_name);
    setRenameDialogOpen(true);
  };

  const handleRenameCollection = async () => {
    if (!selectedCollection || !newName.trim()) {
      toast.error('Please enter a new name');
      return;
    }

    try {
      setActionLoading(true);
      setRenameDialogOpen(false);
      // Note: You'll need to implement the rename endpoint in the backend
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      await makeRequest(
        `${API_BASE_URL}/api/v1/document/collections/${selectedCollection.collection_name}/rename`, 
        'PUT', 
        { new_name: newName.trim() }
      );
      
      toast.success('Collection renamed successfully');
      setSelectedCollection(null);
      setNewName('');
      await fetchCollections();
    } catch (error) {
      console.error('Error renaming collection:', error);
      toast.error('Failed to rename collection');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredCollections = collections.filter(collection =>
    collection.collection_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <LoadingOverlay message="Loading collections..." />;
  }

  return (
    <>
      {actionLoading && <LoadingOverlay message="Updating your collection" />}
      
      <div className="min-h-screen dashboard-bg-animated">
        <div className="container mx-auto py-8 max-w-6xl">
          {/* Header */}
          <div className="glass-card p-6 mb-6 rounded-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold gradient-text">Document Collections</h1>
                <p className="glass-text-description mt-1">
                  Organize and manage your document collections
                </p>
              </div>
              <div className="flex items-center gap-3">
                <DocumentUploadDialog 
                  collections={collections}
                  onUploadSuccess={fetchCollections}
                  buttonClassName="button-light"
                />

                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="button-gradient text-white">
                      <FolderPlus className="h-4 w-4 mr-2" />
                      Create Collection
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass-card">
                    <DialogHeader>
                      <DialogTitle className="glass-text-title">Create New Collection</DialogTitle>
                      <DialogDescription className="glass-text-description">
                        Create a new collection to organize your documents
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="name" className="glass-text">Collection Name</Label>
                        <Input
                          id="name"
                          value={newCollectionName}
                          onChange={(e) => setNewCollectionName(e.target.value)}
                          placeholder="Enter collection name"
                          className="glass-input mt-1"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateCollection} className="button-gradient">
                          Create Collection
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 glass-text-description" />
              <Input
                placeholder="Search collections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input pl-10"
              />
            </div>
          </div>

          {/* Collections Grid */}
          {filteredCollections.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Folder className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold glass-text-title mb-2">
                  {searchTerm ? 'No collections found' : 'No collections yet'}
                </h3>
                <p className="glass-text-description text-center">
                  {searchTerm 
                    ? 'Try adjusting your search terms'
                    : 'Create your first collection to organize your documents'
                  }
                </p>
                {!searchTerm && (
                  <Button 
                    onClick={() => setCreateDialogOpen(true)}
                    className="button-gradient mt-4 text-white"
                  >
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Create Collection
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCollections.map((collection) => (
                <Card key={collection.collection_name} className="glass-card-hover-strong">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Folder className="h-5 w-5 text-purple-400" />
                          <CardTitle className="glass-text-title text-lg truncate max-w-64">
                            {collection.collection_name}
                          </CardTitle>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-white/10">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-card">
                          <DropdownMenuItem onClick={() => openRenameDialog(collection)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteCollection(collection.collection_name)}
                            className="text-red-400 focus:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm glass-text-description">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(collection.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDocuments(collection.collection_name)}

                        className="button-light"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        View
                      </Button>

                      <DocumentUploadDialog 
                        preSelectedCollection={collection.collection_name}
                        onUploadSuccess={fetchCollections}
                        buttonVariant="outline"
                        buttonClassName="button-light"
                      >
                        <Button 
                          size="sm"
                          variant="outline"
                          className="button-light"
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Upload
                        </Button>
                      </DocumentUploadDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Rename Dialog */}
          <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
            <DialogContent className="glass-card">
              <DialogHeader>
                <DialogTitle className="glass-text-title">Rename Collection</DialogTitle>
                <DialogDescription className="glass-text-description">
                  Enter a new name for "{selectedCollection?.collection_name}"
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="newName" className="glass-text">New Name</Label>
                  <Input
                    id="newName"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Enter new collection name"
                    className="glass-input mt-1"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleRenameCollection} className="bg-purple-600 hover:bg-purple-700">
                    Rename
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
}