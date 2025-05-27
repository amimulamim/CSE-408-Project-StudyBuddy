
import React, { useState } from 'react';
import { Plus, MessageSquare, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChat } from './ChatContext';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function ChatSidebar({ isOpen, onToggle }: ChatSidebarProps) {
  const { chats, currentChatId, createNewChat, selectChat, deleteChat, renameChat } = useChat();
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const handleStartEdit = (chatId: string, currentTitle: string) => {
    setEditingChatId(chatId);
    setEditingTitle(currentTitle);
  };

  const handleSaveEdit = () => {
    if (editingChatId && editingTitle.trim()) {
      renameChat(editingChatId, editingTitle.trim());
    }
    setEditingChatId(null);
    setEditingTitle('');
  };

  const handleCancelEdit = () => {
    setEditingChatId(null);
    setEditingTitle('');
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed md:relative top-0 left-0 h-full bg-study-dark border-r border-white/10 z-50 transition-all duration-300 flex flex-col overflow-hidden",
        isOpen ? "w-80 translate-x-0" : "w-0 -translate-x-full md:translate-x-0"
      )}>
        <div className="p-4 border-b border-white/10 flex items-center justify-between min-w-0">
          <Button
            onClick={createNewChat}
            className="flex-1 bg-study-purple hover:bg-study-purple/90 text-white min-w-0"
          >
            <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">New Chat</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="ml-2 md:hidden text-white hover:bg-white/10 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 min-w-0">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={cn(
                "group relative p-3 rounded-lg mb-2 cursor-pointer transition-colors min-w-0",
                currentChatId === chat.id 
                  ? "bg-study-purple/20 border border-study-purple/30" 
                  : "hover:bg-white/5"
              )}
              onClick={() => selectChat(chat.id)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                {editingChatId === chat.id ? (
                  <Input
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    onBlur={handleSaveEdit}
                    className="flex-1 h-6 text-sm bg-transparent border-study-purple min-w-0"
                    autoFocus
                  />
                ) : (
                  <span className="flex-1 text-sm text-white truncate min-w-0">
                    {chat.title}
                  </span>
                )}
              </div>
              
              <div className="opacity-0 group-hover:opacity-100 absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-white hover:bg-white/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit(chat.id, chat.title);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(chat.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
