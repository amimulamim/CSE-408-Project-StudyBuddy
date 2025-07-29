import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';
import { makeRequest } from '@/lib/apiCall';

export function ModerateContentDialog({ content, onClose, onModerated }: any) {
  const [rawContent, setRawContent] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch raw content on open
  useState(() => {
    if (content.raw_source_url) {
      makeRequest(content.raw_source_url, 'GET', null)
        .then(res => res.data)
        .then(setRawContent);
    }
  });

  const handleApprove = async () => {
    setLoading(true);
    const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
    await makeRequest(`${API_BASE_URL}/api/v1/content-moderator/${content.contentId}/moderate`, 'PUT', JSON.stringify({ approve: true }));
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
        <textarea
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