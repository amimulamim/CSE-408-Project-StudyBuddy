import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ModerateContentDialog } from './ModerateContentDialog';
import { makeRequest } from '@/lib/apiCall';

interface ContentItem {
  contentId: string;
  topic: string;
  user_id: string;
  createdAt: string;
  type?: string;
  raw_source_url?: string;
  content_url?: string;
}

export function ModeratorContentList({ type }: { type: 'slides_pending' | 'all' }) {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ContentItem | null>(null);

  useEffect(() => {
    setLoading(true);
    const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
    const url = type === 'slides_pending'
      ? `${API_BASE_URL}/api/v1/content-moderator/pending`
      : `${API_BASE_URL}/api/v1/content-moderator/all`;
    makeRequest(url, 'GET', null)
      .then(res => res.data)
      .then(data => {
        setContents(type === 'slides_pending' ? data.pending_contents : data.all_contents);
      })
      .finally(() => setLoading(false));
  }, [type]);

  if (loading) return <div>Loading...</div>;
  if (!contents.length) return <div>No content found.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {contents.map(item => (
        <Card key={item.contentId} className="glass-card group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>{item.topic}</span>
              {item.type && <Badge>{item.type}</Badge>}
            </CardTitle>
            <div className="text-xs text-muted-foreground">
              {new Date(item.createdAt).toLocaleString()}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="text-sm">User: {item.user_id}</div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setSelected(item)}>
                Moderate
              </Button>
              {item.raw_source_url && (
                <a href={item.raw_source_url} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline">View Raw</Button>
                </a>
              )}
              {item.content_url && (
                <a href={item.content_url} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline">View PDF</Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      {selected && (
        <ModerateContentDialog
          content={selected}
          onClose={() => setSelected(null)}
          onModerated={() => {
            setSelected(null);
            setContents(contents => contents.filter(c => c.contentId !== selected.contentId));
          }}
        />
      )}
    </div>
  );
} 