import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, Plus, Edit, Trash2, Search, Check, ChevronsUpDown } from 'lucide-react';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

interface User {
  uid: string;
  email: string;
  name: string;
  avatar?: string;
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

  // User search states
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Notification search states
  const [notificationUserSearchOpen, setNotificationUserSearchOpen] = useState(false);
  const [notificationUserSearchTerm, setNotificationUserSearchTerm] = useState('');
  const [notificationSearchResults, setNotificationSearchResults] = useState<User[]>([]);
  const [selectedNotificationUser, setSelectedNotificationUser] = useState<User | null>(null);
  const [notificationSearchLoading, setNotificationSearchLoading] = useState(false);

  // Debounce function
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Search users across all pages
  const searchUsers = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      
      // Search with a larger page size to get more results
      const response = await makeRequest(
        `${API_BASE_URL}/api/v1/admin/users/search?query=${encodeURIComponent(searchTerm)}&size=50`,
        'GET'
      );

      if (response && typeof response === 'object' && 'status' in response) {
        if (response.status === 'success' && response.data) {
          setSearchResults(response.data.users || []);
        }
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setSearchLoading(false);
    }
  };

  // Search users for notification target
  const searchNotificationUsers = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setNotificationSearchResults([]);
      return;
    }

    try {
      setNotificationSearchLoading(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      
      const response = await makeRequest(
        `${API_BASE_URL}/api/v1/admin/users/search?query=${encodeURIComponent(searchTerm)}&size=50`,
        'GET'
      );

      if (response && typeof response === 'object' && 'status' in response) {
        if (response.status === 'success' && response.data) {
          setNotificationSearchResults(response.data.users || []);
        }
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setNotificationSearchLoading(false);
    }
  };

  // Debounced search functions
  const debouncedUserSearch = useCallback(debounce(searchUsers, 300), [setSearchResults]);
  const debouncedNotificationUserSearch = useCallback(debounce(searchNotificationUsers, 300), []);

  // Effect for user search
  useEffect(() => {
    if (userSearchTerm) {
      debouncedUserSearch(userSearchTerm);
    } else {
      setSearchResults([]);
    }
  }, [userSearchTerm, debouncedUserSearch]);

  // Effect for notification user search
  useEffect(() => {
    if (notificationUserSearchTerm) {
      debouncedNotificationUserSearch(notificationUserSearchTerm);
    } else {
      setNotificationSearchResults([]);
    }
  }, [notificationUserSearchTerm, debouncedNotificationUserSearch]);

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
          setSelectedUser(null);
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
    <Card className="glass-card">
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
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Send New Notification</DialogTitle>
                <DialogDescription>
                  Search for a user and send them a notification.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Recipient</Label>
                  <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={userSearchOpen}
                        className="w-full justify-between"
                      >
                        {selectedUser ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={selectedUser.avatar || '/default-avatar.png'}
                              alt={selectedUser.name}
                              className="h-5 w-5 rounded-full"
                            />
                            <span>{selectedUser.name} ({selectedUser.email})</span>
                          </div>
                        ) : (
                          "Search user..."
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search users by name or email..."
                          value={userSearchTerm}
                          onValueChange={setUserSearchTerm}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {searchLoading ? "Searching..." : "No users found."}
                          </CommandEmpty>
                          <CommandGroup>
                            {searchResults.map((user) => (
                              <CommandItem
                                key={user.uid}
                                value={user.uid}
                                onSelect={() => {
                                  setSelectedUser(user);
                                  setNewNotification({
                                    ...newNotification,
                                    recipient_uid: user.uid
                                  });
                                  setUserSearchOpen(false);
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <img
                                    src={user.avatar || '/default-avatar.png'}
                                    alt={user.name}
                                    className="h-6 w-6 rounded-full"
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{user.name}</span>
                                    <span className="text-sm text-muted-foreground">{user.email}</span>
                                  </div>
                                </div>
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    selectedUser?.uid === user.uid ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
                <Button variant="outline" onClick={() => {
                  setIsCreateDialogOpen(false);
                  setSelectedUser(null);
                  setUserSearchTerm('');
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateNotification}
                  disabled={!selectedUser || !newNotification.title || !newNotification.message}
                >
                  Send
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Load notifications for user</Label>
            <div className="flex gap-2">
              <Popover open={notificationUserSearchOpen} onOpenChange={setNotificationUserSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={notificationUserSearchOpen}
                    className="flex-1 justify-between"
                  >
                    {selectedNotificationUser ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={selectedNotificationUser.avatar || '/default-avatar.png'}
                          alt={selectedNotificationUser.name}
                          className="h-5 w-5 rounded-full"
                        />
                        <span>{selectedNotificationUser.name} ({selectedNotificationUser.email})</span>
                      </div>
                    ) : (
                      "Search user to view notifications..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search users by name or email..."
                      value={notificationUserSearchTerm}
                      onValueChange={setNotificationUserSearchTerm}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {notificationSearchLoading ? "Searching..." : "No users found."}
                      </CommandEmpty>
                      <CommandGroup>
                        {notificationSearchResults.map((user) => (
                          <CommandItem
                            key={user.uid}
                            value={user.uid}
                            onSelect={() => {
                              setSelectedNotificationUser(user);
                              setSelectedUserId(user.uid);
                              setNotificationUserSearchOpen(false);
                              fetchUserNotifications(user.uid);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <img
                                src={user.avatar || '/default-avatar.png'}
                                alt={user.name}
                                className="h-6 w-6 rounded-full"
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{user.name}</span>
                                <span className="text-sm text-muted-foreground">{user.email}</span>
                              </div>
                            </div>
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                selectedNotificationUser?.uid === user.uid ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
                      {selectedNotificationUser 
                        ? `No notifications found for ${selectedNotificationUser.name}`
                        : "Search and select a user to view their notifications."
                      }
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
