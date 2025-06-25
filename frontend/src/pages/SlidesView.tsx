import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, ExternalLink, Loader2 } from 'lucide-react';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';

export default function SlidesView() {
  const { contentId } = useParams();
  const navigate = useNavigate();
  const [contentUrl, setContentUrl] = useState<string>('');
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (contentId) {
      fetchSlides();
    }
  }, [contentId]);

  const fetchSlides = async () => {
    try {
      setLoading(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response = await makeRequest(
        `${API_BASE_URL}/api/v1/content/${contentId}`,
        'GET'
      );

      if (response?.status === 'success') {
        setContentUrl(response.data.content);
        setMetadata(response.data.metadata);
      } else {
        throw new Error('Failed to load content');
      }
    } catch (error) {
      console.error('Error fetching slides:', error);
      toast.error('Failed to load slides');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (contentUrl) {
      const link = document.createElement('a');
      link.href = contentUrl;
      link.download = `${metadata?.topic || 'slides'}.pdf`;
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

  if (loading) {
    return (
      <div className="min-h-screen dashboard-bg-animated flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <p className="text-muted-foreground">Loading slides...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dashboard-bg-animated">
      <div className="container mx-auto py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold gradient-text">{metadata?.topic}</h1>
            <p className="text-muted-foreground">PDF Presentation</p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/dashboard/content')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Presentation Slides</CardTitle>
            <CardDescription>
              Created on {metadata?.createdAt ? new Date(metadata.createdAt).toLocaleDateString() : 'Unknown'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* PDF Viewer */}
            <div className="border rounded-lg overflow-hidden bg-white" style={{ height: '600px' }}>
              <iframe
                src={`${contentUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                className="w-full h-full"
                title="PDF Viewer"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 justify-center">
              <Button onClick={handleViewInBrowser} className="button-gradient">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}