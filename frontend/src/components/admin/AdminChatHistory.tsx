
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageSquare, Search, Eye } from 'lucide-react';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface Chat {
  id: string;
  user_uid: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export function AdminChatHistory() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalChats, setTotalChats] = useState(0);
  const pageSize = 20;

  const fetchChats = async (page = 0) => {
    try {
      setLoading(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response = await makeRequest(
        `${API_BASE_URL}/api/v1/admin/chats?offset=${page * pageSize}&size=${pageSize}`,
        'GET'
      );

      if (response && typeof response === 'object' && 'status' in response) {
        if (response.status === 'success' && response.data) {
          setChats(response.data.chats || []);
          setTotalChats(response.data.total || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
      toast.error('Failed to load chat history');
    } finally {
      setLoading(false);
    }
  };

  const fetchChatMessages = async (chatId: string) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response = await makeRequest(
        `${API_BASE_URL}/api/v1/ai/chat/${chatId}`,
        'GET'
      );

      if (response && typeof response === 'object' && 'status' in response) {
        if (response.status === 'success' && response.data) {
          setChatMessages(response.data.messages || []);
        }
      }
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      toast.error('Failed to load chat messages');
    }
  };

  useEffect(() => {
    fetchChats(currentPage);
  }, [currentPage]);

  const handleViewChat = async (chat: Chat) => {
    setSelectedChat(chat);
    setIsViewDialogOpen(true);
    await fetchChatMessages(chat.id);
  };

  const filteredChats = chats.filter(chat =>
    chat.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.user_uid?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Chat History Management
        </CardTitle>
        <CardDescription>View all chat conversations across users</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table className="enhanced-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading chats...
                    </TableCell>
                  </TableRow>
                ) : filteredChats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No chats found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredChats.map((chat) => (
                    <TableRow key={chat.id}>
                      <TableCell className="font-medium">
                        {chat.title || 'Untitled Chat'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {chat.user_uid.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {chat.message_count} messages
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(chat.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(chat.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewChat(chat)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredChats.length} of {totalChats} chats
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(currentPage + 1) * pageSize >= totalChats}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* View Chat Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Chat Details</DialogTitle>
              <DialogDescription>
                View the full chat conversation
              </DialogDescription>
            </DialogHeader>
            {selectedChat && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedChat.title || 'Untitled Chat'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">User ID</label>
                    <p className="text-sm text-muted-foreground font-mono">
                      {selectedChat.user_uid}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Created</label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedChat.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Messages</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedChat.message_count} messages
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Messages</label>
                  <div className="mt-2 space-y-3 max-h-96 overflow-y-auto border rounded-lg p-4">
                    {chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.role === 'user'
                              ? 'bg-study-purple text-white'
                              : 'bg-muted'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={message.role === 'user' ? 'secondary' : 'default'}>
                              {message.role}
                            </Badge>
                            <span className="text-xs opacity-70">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
