import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { Check, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
}

interface NotificationItemProps {
  notification: Notification;
  isLast?: boolean;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'success':
      return 'border-l-green-500';
    case 'warning':
      return 'border-l-yellow-500';
    case 'error':
      return 'border-l-red-500';
    default:
      return 'border-l-blue-500';
  }
};

export function NotificationItem({ notification, isLast }: NotificationItemProps) {
  const { markAsRead } = useNotifications();

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAsRead(notification.id);
  };

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });

  return (
    <div 
      className={`p-4 hover:bg-muted/50 transition-colors border-l-2 ${getNotificationColor(notification.type)} ${
        !notification.is_read ? 'bg-blue-50/30' : ''
      } ${isLast ? '' : 'border-b border-border/50'}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getNotificationIcon(notification.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className={`text-sm font-medium ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'} glass-text-title`}>
                {notification.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 glass-text-description">
                {notification.message}
              </p>
              <p className="text-xs text-muted-foreground mt-2 glass-text-description">
                {timeAgo}
              </p>
            </div>
            
            <div className="flex items-center gap-1 flex-shrink-0">
              {!notification.is_read && (
                <>
                  <Badge variant="secondary" className="h-5 px-1 text-xs">
                    New
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAsRead}
                    className="h-6 w-6 p-0 hover:bg-muted"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}