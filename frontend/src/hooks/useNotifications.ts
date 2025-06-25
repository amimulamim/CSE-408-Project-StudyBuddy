import { useState, useEffect, useCallback } from 'react';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      
      const response = await makeRequest(
        `${API_BASE_URL}/api/v1/user/notifications?size=20`,
        'GET'
      );

      if (response && response.data.notifications) {
        setNotifications(response.data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      
      const response = await makeRequest(
        `${API_BASE_URL}/api/v1/user/notifications/unread-count`,
        'GET'
      );

      if (response && typeof response.data.unread_count === 'number') {
        const newCount = response.data.unread_count;
        
        // Check if there are new notifications
        if (newCount > unreadCount && unreadCount !== 0) {
          setHasNewNotification(true);
          // Reset the flag after a short delay
          setTimeout(() => setHasNewNotification(false), 1000);
        }
        
        setUnreadCount(newCount);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [unreadCount]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      
      await makeRequest(
        `${API_BASE_URL}/api/v1/user/notifications/${notificationId}/read`,
        'PUT'
      );

      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      
      const response = await makeRequest(
        `${API_BASE_URL}/api/v1/user/notifications/mark-all-read`,
        'PUT'
      );

      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      
      setUnreadCount(0);
      
      if (response?.data.notifications_updated > 0) {
        toast.success(`Marked ${response.data.notifications_updated} notifications as read`);
      }
      
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  }, []);

  const refetch = useCallback(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  // Poll for new notifications every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 8000);

    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    hasNewNotification,
    markAsRead,
    markAllAsRead,
    refetch
  };
};