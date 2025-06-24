import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellRing } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';
import { useNotifications } from '@/hooks/useNotifications';

export function NotificationButton() {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { unreadCount, hasNewNotification } = useNotifications();

  // Play alarm sound for new notifications
  useEffect(() => {
    if (hasNewNotification && unreadCount > 0) {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.3;
      audio.play().catch(console.error);
    }
  }, [hasNewNotification, unreadCount]);

  return (
    <>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative bg-white/50 backdrop-blur-sm hover:bg-white/70 border border-white/50 ${
          unreadCount > 0 ? 'animate-pulse' : ''
        }`}
      >
        {unreadCount > 0 ? (
          <BellRing className="h-4 w-4" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        {unreadCount > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-red-500 text-center hover:bg-red-600 flex items-center justify-center"
            variant="destructive"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      <NotificationDropdown 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        triggerRef={buttonRef}
      />
    </>
  );
}