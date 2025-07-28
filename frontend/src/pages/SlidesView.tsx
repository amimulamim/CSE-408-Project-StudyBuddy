import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';

interface PDFViewProps {
  contentType: 'slide' | 'document';
}

export default function PDFView({ contentType = 'slide' }: PDFViewProps) {
  const { contentId, collectionName, documentId } = useParams();
  const navigate = useNavigate();
  
  const [contentUrl, setContentUrl] = useState<string>('');
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [urlNotAvailable, setUrlNotAvailable] = useState(false);

  useEffect(() => {
    if (contentType === 'slide' && contentId) {
      fetchSlides();
    } else if (contentType === 'document' && collectionName && documentId) {
      fetchDocument();
    }
  }, [contentId, collectionName, documentId, contentType]);

  const fetchSlides = async () => {
    try {
      setLoading(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response = await makeRequest(
        `${API_BASE_URL}/api/v1/content/${contentId}`,
        'GET'
      );

      if (response?.status === 'success') {
        if (response.data.content) {
          setContentUrl(response.data.content);
        } else {
          setUrlNotAvailable(true);
        }
        setMetadata(response.data.metadata);
      } else {
        throw new Error('Failed to load content');
      }
    } catch (error) {
      console.error('Error fetching slides:', error);
      toast.error('Failed to load slides');
      setUrlNotAvailable(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      
      // Get document content from the collection
      const response = await makeRequest(
        `${API_BASE_URL}/api/v1/document/collections/${collectionName}/documents/${documentId}/content`,
        'GET'
      );

      let documents = { download_url: '' };
      if (response?.status === 'success' ) {
        documents = response.data;
      } 
      console.log('Documents fetched:', documents);

      // Check if document_url is available
      if (documents?.download_url) {
        setContentUrl(documents.download_url);
      } else {
        setUrlNotAvailable(true);
      }

      // For documents, we don't set metadata as it's not available from this endpoint
      // We'll create a basic metadata object with just the document ID for display purposes
      setMetadata({ 
        topic: `Document ${documentId}`,
        isDocument: true 
      });

    } catch (error) {
      console.error('Error fetching document:', error);
      toast.error('Failed to load document');
      setUrlNotAvailable(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (contentUrl) {
      const link = document.createElement('a');
      link.href = contentUrl;
      link.download = `${metadata?.topic || contentType}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleViewInBrowser = () => {
    if (contentUrl) {
      window.open(contentUrl, '_blank');
    }
  };

  const getBackNavigation = () => {
    if (contentType === 'slide') {
      return () => navigate('/dashboard/content');
    } else {
      return () => navigate(`/collections/${collectionName}`);
    }
  };

  const getBackButtonText = () => {
    return contentType === 'slide' ? 'Back to Library' : 'Back to Collection';
  };

  const getContentTypeLabel = () => {
    return contentType === 'slide' ? 'PDF Presentation' : 'Document Viewer';
  };

  const getContentTitle = () => {
    return contentType === 'slide' ? 'Presentation Slides' : 'Document Content';
  };

  const getContentDescription = () => {
    if (contentType === 'slide') {
      return metadata?.createdAt 
        ? `Created on ${new Date(metadata.createdAt).toLocaleDateString()}` 
        : 'Creation date unknown';
    }
    return `Document from collection: ${collectionName}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <p className="text-muted-foreground">
            Loading {contentType === 'slide' ? 'slides' : 'document'}...
          </p>
        </div>
      </div>
    );
  }

  if (!metadata && !loading) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <Card className="glass-card max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <AlertCircle className="h-16 w-16 text-red-400" />
            <h3 className="text-lg font-semibold glass-text-title">
              {contentType === 'slide' ? 'Slides' : 'Document'} Not Found
            </h3>
            <p className="glass-text-description text-center">
              The requested {contentType} could not be found.
            </p>
            {/* <Button onClick={getBackNavigation()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {getBackButtonText()}
            </Button> */}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      <div className="container mx-auto py-6">
        {/* <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold gradient-text">{metadata?.topic}</h1>
            <p className="text-muted-foreground">{getContentTypeLabel()}</p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={getBackNavigation()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {getBackButtonText()}
          </Button>
        </div> */}

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{metadata?.topic}</CardTitle>
            <CardDescription>
              {getContentDescription()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Content Viewer or Not Available Message */}
            {urlNotAvailable ? (
              <div className="border rounded-lg p-8 bg-gray-50/10 text-center">
                <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold glass-text-title mb-2">
                  {contentType === 'slide' ? 'Slides' : 'Document'} View Not Available
                </h3>
                <p className="glass-text-description mb-4">
                  {contentType === 'slide' 
                    ? 'The slides content is currently not available for viewing.'
                    : 'This document was uploaded before the viewing feature was implemented. The document content is not available for direct viewing.'
                  }
                </p>
                {contentType === 'document' && metadata?.first_chunk && (
                  <div className="mt-6 p-4 bg-white/5 rounded-lg text-left">
                    <h4 className="font-semibold glass-text-title mb-2">Content Preview:</h4>
                    <p className="glass-text-description text-sm leading-relaxed">
                      {metadata.first_chunk.length > 500 
                        ? `${metadata.first_chunk.substring(0, 500)}...` 
                        : metadata.first_chunk
                      }
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden bg-white" style={{ height: '600px' }}>
                <iframe
                  src={`${contentUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                  className="w-full h-full"
                  title={`${contentType === 'slide' ? 'PDF' : 'Document'} Viewer`}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 justify-center">
              {!urlNotAvailable && (
                <>
                  <Button onClick={handleViewInBrowser} className="button-gradient">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in New Tab
                  </Button>
                  <Button variant="outline" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download {contentType === 'slide' ? 'PDF' : 'Document'}
                  </Button>
                </>
              )}
              {urlNotAvailable && (
                <Button 
                  variant="outline" 
                  onClick={getBackNavigation()}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {getBackButtonText()}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
