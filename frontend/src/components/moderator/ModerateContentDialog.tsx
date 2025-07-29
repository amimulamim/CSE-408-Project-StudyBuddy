import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';
import { makeRequest } from '@/lib/apiCall';
import { Textarea } from '../ui/textarea';

export function ModerateContentDialog({ content, onClose, onModerated }: any) {
  const [rawContent, setRawContent] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch raw content on open
  useState(() => {
    const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
    if (content.raw_source_url) {
      makeRequest(`${API_BASE_URL}/api/v1/content-moderator/${content.contentId}/raw_content`, 'GET', null)
        .then(res => res.data.raw_content)
        .then(setRawContent);
    }
  });

  const handleApprove = async () => {
    setLoading(true);
    const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
    console.log('printing raw url');
    console.log(content.content_url);
    await makeRequest(`${API_BASE_URL}/api/v1/content-moderator/${content.contentId}/moderate`,
      "PUT",
      {
        "content_url": content.content_url,
        "raw_content": rawContent,
        "approve": true,
        "topic": content.topic
      }
    );
    toast.success('Content approved');
    setLoading(false);
    onModerated();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="glass-card max-w-2xl">
        <DialogHeader>
          <DialogTitle>Moderate Content: {content.topic}</DialogTitle>
        </DialogHeader>
        <Textarea
          className="w-full border rounded p-2 min-h-[200px] font-mono"
          value={rawContent}
          onChange={e => setRawContent(e.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleApprove} disabled={loading}>Approve</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 