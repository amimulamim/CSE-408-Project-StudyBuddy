import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, FileText, Eye, Download, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ContentItem {
  contentId: string;
  topic: string;
  type: 'flashcards' | 'slides';
  createdAt: string;
}

interface ContentListProps {
  contents: ContentItem[];
  loading: boolean;
}

export function ContentList({ contents, loading }: ContentListProps) {
  const navigate = useNavigate();

  const getTypeIcon = (type: string) => {
    return type === 'flashcards' ? CreditCard : FileText;
  };

  const getTypeColor = (type: string) => {
    return type === 'flashcards' ? 'bg-purple-500' : 'bg-blue-500';
  };

  const handleViewContent = (item: ContentItem) => {
    if (item.type === 'flashcards') {
      navigate(`/content/flashcards/${item.contentId}`);
    } else {
      navigate(`/content/slides/${item.contentId}`);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="glass-card animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-300 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (contents.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No content found</h3>
          <p className="text-muted-foreground text-center">
            Generate your first piece of educational content to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {contents.map((item) => {
        const Icon = getTypeIcon(item.type);
        return (
          <Card 
            key={item.contentId} 
            className="glass-card-hover-strong group cursor-pointer"
            onClick={() => handleViewContent(item)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-purple-500" />
                  <Badge className={`text-white ${getTypeColor(item.type)}`}>
                    {item.type}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span className="text-xs">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <CardTitle className="text-lg group-hover:text-purple-600 transition-colors">
                {item.topic}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <CardDescription className="flex-1">
                  {item.type === 'flashcards' ? 'Interactive flashcards' : 'PDF presentation'}
                </CardDescription>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewContent(item);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}