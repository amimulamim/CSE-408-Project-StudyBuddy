import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Edit, Trash2, ExternalLink, ArrowRight, Loader2 } from 'lucide-react';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ContentVersion {
  id: string;
  version_number: number;
  content_url: string;
  topic: string | null;
  content_type: string | null;
  modification_instructions: string | null;
  created_at: string | null;
  is_latest_version: boolean;
}

interface ModificationHistory {
  id: string;
  modification_instructions: string;
  source_version: number;
  target_version: number;
  status: string;
  created_at: string | null;
  completed_at: string | null;
  new_content_id: string;
}

interface ContentVersionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  contentTitle: string;
  onContentModified?: () => void;
}

export function ContentVersionsDialog({ 
  isOpen, 
  onClose, 
  contentId, 
  contentTitle,
  onContentModified 
}: ContentVersionsDialogProps) {
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [modifications, setModifications] = useState<ModificationHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [modifyLoading, setModifyLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('versions');
  
  // Modification form state
  const [showModifyForm, setShowModifyForm] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [modificationInstructions, setModificationInstructions] = useState('');

  useEffect(() => {
    if (isOpen && contentId) {
      fetchVersionsAndHistory();
    }
  }, [isOpen, contentId]);

  const fetchVersionsAndHistory = async () => {
    setLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      
      // Fetch versions and modification history in parallel
      const [versionsResponse, modificationsResponse] = await Promise.all([
        makeRequest(`${API_BASE_URL}/api/v1/content/${contentId}/versions`, 'GET'),
        makeRequest(`${API_BASE_URL}/api/v1/content/${contentId}/modifications`, 'GET')
      ]);

      if (versionsResponse?.status === 'success') {
        const versionsData = versionsResponse.data?.versions || [];
        // Sort versions by version_number in descending order (latest first)
        const sortedVersions = versionsData.sort((a, b) => b.version_number - a.version_number);
        setVersions(sortedVersions);
      }

      if (modificationsResponse?.status === 'success') {
        const modificationsData = modificationsResponse.data?.modifications || [];
        
        // Remove duplicates based on modification ID and sort by created_at in descending order (latest first)
        const uniqueModifications = modificationsData.filter((mod, index, self) => 
          index === self.findIndex(m => m.id === mod.id)
        );
        
        const sortedModifications = uniqueModifications.sort((a, b) => {
          const dateA = new Date(a.created_at || 0);
          const dateB = new Date(b.created_at || 0);
          return dateB.getTime() - dateA.getTime();
        });
        setModifications(sortedModifications);
      }
    } catch (error) {
      console.error('Error fetching content versions:', error);
      toast.error('Failed to load content versions');
    } finally {
      setLoading(false);
    }
  };

  const handleModifyContent = async () => {
    if (!modificationInstructions.trim()) {
      toast.error('Please provide modification instructions');
      return;
    }

    setModifyLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response = await makeRequest(
        `${API_BASE_URL}/api/v1/content/${contentId}/modify`,
        'POST',
        {
          modification_instructions: modificationInstructions,
          source_version: selectedVersion
        }
      );

      if (response?.status === 'success') {
        toast.success('Content modification started successfully!');
        setShowModifyForm(false);
        setModificationInstructions('');
        setSelectedVersion(null);
        
        // Refresh data
        await fetchVersionsAndHistory();
        
        // Notify parent component
        onContentModified?.();
        
        // Close the dialog after successful modification
        onClose();
      } else {
        toast.error(response?.message || 'Failed to modify content');
      }
    } catch (error) {
      console.error('Error modifying content:', error);
      toast.error('Failed to modify content');
    } finally {
      setModifyLoading(false);
    }
  };

  const handleDeleteVersion = async (versionNumber: number) => {
    if (!confirm(`Are you sure you want to delete version ${versionNumber}?`)) {
      return;
    }

    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response = await makeRequest(
        `${API_BASE_URL}/api/v1/content/${contentId}/versions/${versionNumber}`,
        'DELETE'
      );

      if (response?.status === 'success') {
        toast.success(`Version ${versionNumber} deleted successfully`);
        await fetchVersionsAndHistory();
      } else {
        toast.error('Failed to delete version');
      }
    } catch (error) {
      console.error('Error deleting version:', error);
      toast.error('Failed to delete version');
    }
  };

  const openContent = (contentUrl: string) => {
    window.open(contentUrl, '_blank');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Content Versions & Modifications</DialogTitle>
          <DialogDescription>
            Manage versions and modifications for "{contentTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Modify Content Button */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Content Management</h3>
            <Button
              onClick={() => setShowModifyForm(!showModifyForm)}
              className="button-gradient"
              disabled={loading}
            >
              <Edit className="h-4 w-4 mr-2" />
              Request Modification
            </Button>
          </div>

          {/* Modification Form */}
          {showModifyForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Request Content Modification</CardTitle>
                <CardDescription>
                  Describe how you want the content to be modified
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="sourceVersion">Modify from version (optional)</Label>
                  <select
                    id="sourceVersion"
                    value={selectedVersion || ''}
                    onChange={(e) => setSelectedVersion(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full mt-1 p-3 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    {versions
                      .filter((version, index, self) => 
                        index === self.findIndex(v => v.version_number === version.version_number)
                      )
                      .map((version, index) => (
                        <option key={version.id} value={version.version_number}>
                          Version {version.version_number} {version.is_latest_version ? '(Latest)' : ''} ({formatDate(version.created_at)})
                        </option>
                      ))}
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="modificationInstructions">Modification Instructions</Label>
                  <Textarea
                    id="modificationInstructions"
                    placeholder="Example: Remove the theoretical proofs and add more practical examples. Focus on real-world applications. Include step-by-step solutions for each problem type."
                    value={modificationInstructions}
                    onChange={(e) => setModificationInstructions(e.target.value)}
                    className="min-h-[100px] mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Be specific about what to change, add, remove, or emphasize
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleModifyContent}
                    disabled={modifyLoading || !modificationInstructions.trim()}
                    className="button-gradient"
                  >
                    {modifyLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Modified Version'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowModifyForm(false);
                      setModificationInstructions('');
                      setSelectedVersion(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="versions">Versions ({versions.length})</TabsTrigger>
              {/* <TabsTrigger value="history">Modification History ({modifications.length})</TabsTrigger> */}
            </TabsList>

            <TabsContent value="versions" className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p>Loading versions...</p>
                </div>
              ) : versions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No versions found</p>
              ) : (
                <div className="space-y-3">
                  {versions.map((version) => (
                    <Card key={version.id} className={version.is_latest_version ? 'border-green-500' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant={version.is_latest_version ? 'default' : 'secondary'}>
                              Version {version.version_number}
                              {version.is_latest_version && ' (Latest)'}
                            </Badge>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDate(version.created_at)}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openContent(version.content_url)}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Open
                            </Button>
                            {version.version_number > 1 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteVersion(version.version_number)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {version.modification_instructions && (
                          <div className="mt-3 p-3 bg-muted rounded-md">
                            <p className="text-sm font-medium mb-1">Modification Instructions:</p>
                            <p className="text-sm text-muted-foreground">
                              {version.modification_instructions}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p>Loading modification history...</p>
                </div>
              ) : modifications.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No modifications yet</p>
              ) : (
                <div className="space-y-3">
                  {modifications.map((mod) => (
                    <Card key={mod.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge variant={mod.status === 'completed' ? 'default' : 'secondary'}>
                              {mod.status}
                            </Badge>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>Version {mod.source_version}</span>
                              <ArrowRight className="h-3 w-3" />
                              <span>Version {mod.target_version}</span>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(mod.created_at)}
                          </div>
                        </div>
                        
                        <div className="p-3 bg-muted rounded-md">
                          <p className="text-sm font-medium mb-1">Instructions:</p>
                          <p className="text-sm text-muted-foreground">
                            {mod.modification_instructions}
                          </p>
                        </div>
                        
                        {mod.status === 'completed' && (
                          <div className="mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const version = versions.find(v => v.version_number === mod.target_version);
                                if (version) openContent(version.content_url);
                              }}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View Result
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
