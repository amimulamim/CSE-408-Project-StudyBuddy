
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Plus, Edit, Trash2 } from 'lucide-react';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';

interface Notification {
  id: string;
  recipient_uid: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  created_at: string;
}

interface NotificationCreate {
  recipient_uid: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
}

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newNotification, setNewNotification] = useState<NotificationCreate>({
    recipient_uid: '',
    title: '',
    message: '',
    type: 'info'
  });

  const fetchUserNotifications = async (userId: string) => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response = await makeRequest(
        `${API_BASE_URL}/api/v1/admin/users/${userId}/notifications?page=1&size=20`,
        'GET'
      );

      if (response && typeof response === 'object' && 'status' in response) {
        if (response.status === 'success' && response.data) {
          setNotifications(response.data.notifications || []);
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNotification = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response = await makeRequest(
        `${API_BASE_URL}/api/v1/admin/notifications`,
        'POST',
        newNotification
      );

      if (response && typeof response === 'object' && 'status' in response) {
        if (response.status === 'success') {
          toast.success('Notification sent successfully');
          setIsCreateDialogOpen(false);
          setNewNotification({
            recipient_uid: '',
            title: '',
            message: '',
            type: 'info'
          });
          if (selectedUserId) {
            fetchUserNotifications(selectedUserId);
          }
        } else {
          toast.error('Failed to send notification');
        }
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      toast.error('Failed to send notification');
    }
  };

  const handleEditNotification = async () => {
    if (!selectedNotification) return;

    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response = await makeRequest(
        `${API_BASE_URL}/api/v1/admin/notifications/${selectedNotification.id}`,
        'PUT',
        {
          title: selectedNotification.title,
          message: selectedNotification.message,
          type: selectedNotification.type
        }
      );

      if (response && typeof response === 'object' && 'status' in response) {
        if (response.status === 'success') {
          toast.success('Notification updated successfully');
          setIsEditDialogOpen(false);
          setSelectedNotification(null);
          if (selectedUserId) {
            fetchUserNotifications(selectedUserId);
          }
        } else {
          toast.error('Failed to update notification');
        }
      }
    } catch (error) {
      console.error('Error updating notification:', error);
      toast.error('Failed to update notification');
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;

    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response = await makeRequest(
        `${API_BASE_URL}/api/v1/admin/notifications/${notificationId}`,
        'DELETE'
      );

      if (response && typeof response === 'object' && 'status' in response) {
        if (response.status === 'success') {
          toast.success('Notification deleted successfully');
          if (selectedUserId) {
            fetchUserNotifications(selectedUserId);
          }
        } else {
          toast.error('Failed to delete notification');
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Management
            </CardTitle>
            <CardDescription>Send and manage user notifications</CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Send Notification
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send New Notification</DialogTitle>
                <DialogDescription>
                  Send a notification to a specific user.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient User ID</Label>
                  <Input
                    id="recipient"
                    value={newNotification.recipient_uid}
                    onChange={(e) => setNewNotification({
                      ...newNotification,
                      recipient_uid: e.target.value
                    })}
                    placeholder="Enter user ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newNotification.title}
                    onChange={(e) => setNewNotification({
                      ...newNotification,
                      title: e.target.value
                    })}
                    placeholder="Notification title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={newNotification.message}
                    onChange={(e) => setNewNotification({
                      ...newNotification,
                      message: e.target.value
                    })}
                    placeholder="Notification message"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={newNotification.type}
                    onValueChange={(value: 'info' | 'warning' | 'success' | 'error') =>
                      setNewNotification({ ...newNotification, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateNotification}>Send</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-search">Load notifications for user</Label>
            <div className="flex gap-2">
              <Input
                id="user-search"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                placeholder="Enter user ID to load notifications"
              />
              <Button onClick={() => fetchUserNotifications(selectedUserId)}>
                Load
              </Button>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading notifications...
                    </TableCell>
                  </TableRow>
                ) : notifications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No notifications found. Enter a user ID to load notifications.
                    </TableCell>
                  </TableRow>
                ) : (
                  notifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell>
                        <Badge className={`text-white ${getTypeColor(notification.type)}`}>
                          {notification.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{notification.title}</TableCell>
                      <TableCell className="max-w-xs truncate">{notification.message}</TableCell>
                      <TableCell>
                        <Badge variant={notification.is_read ? "default" : "secondary"}>
                          {notification.is_read ? "Read" : "Unread"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(notification.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedNotification(notification);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteNotification(notification.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Edit Notification Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Notification</DialogTitle>
              <DialogDescription>
                Update notification content and settings.
              </DialogDescription>
            </DialogHeader>
            {selectedNotification && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={selectedNotification.title}
                    onChange={(e) =>
                      setSelectedNotification({
                        ...selectedNotification,
                        title: e.target.value
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-message">Message</Label>
                  <Textarea
                    id="edit-message"
                    value={selectedNotification.message}
                    onChange={(e) =>
                      setSelectedNotification({
                        ...selectedNotification,
                        message: e.target.value
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Type</Label>
                  <Select
                    value={selectedNotification.type}
                    onValueChange={(value: 'info' | 'warning' | 'success' | 'error') =>
                      setSelectedNotification({
                        ...selectedNotification,
                        type: value
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditNotification}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
