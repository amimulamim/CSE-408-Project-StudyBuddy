import { useState } from 'react';
import { Plus, MessageSquare, Pencil, Trash2, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChat } from './ChatContext';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function ChatSidebar({ isOpen, onToggle }: ChatSidebarProps) {
  const { chatList, currentChat, createNewChat, setCurrentChatId, deleteChat, renameChat, isChatListLoading } = useChat();
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
    <div>
      {/* Sidebar */}
      <div className={cn(
        "fixed h-screen top-20 left-0 bg-study-dark border-r border-white/10 transition-all duration-300 overflow-y-auto pb-20 scrollbar-hide z-50",
        isOpen ? "w-80 translate-x-0" : "w-16 translate-x-0"
      )}>
        <div className={`p-4 px-3 border-b border-white/10 items-center min-w-0 ${isOpen ? 'flex' : 'flex-column'} transition-all duration-300`}>
          {/* New Chat Button */}
          <Button
            onClick={createNewChat}
            className={`relative flex items-center bg-study-purple hover:bg-study-purple/90 text-white min-w-0 transition-all duration-300
              ${isOpen ? 'pl-4 pr-4 w-full' : 'w-10 justify-center'}
            `}
            size="default"
          >
            <Plus className="h-4 w-4 flex-shrink-0 transition-all duration-300 ml-2" />
            
            {/* Always render span, animate opacity/scale */}
            <span
              className={`transition-all duration-300 whitespace-nowrap overflow-hidden
                ${isOpen ? 'opacity-100 w-auto scale-100' : 'opacity-0 w-0 scale-95'}
              `}
            >
              New Chat
            </span>
          </Button>

          {/* Toggle Button */}
          <Button
            size="icon"
            onClick={onToggle}
            className={`transition-all duration-300 text-white flex-shrink-0
              ${isOpen ? 'ml-2' : 'mt-2'}
            `}
          >
            { isOpen? (<ArrowLeft className="h-4 w-4" />) : (<ArrowRight className="h-4 w-4" />) }
          </Button>
        </div>


        <div className="flex-1 overflow-y-auto p-2 min-w-0">
          {isChatListLoading && isOpen && (
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-study-purple/30 border-t-study-purple rounded-full animate-spin"></div>
                <span className="text-muted-foreground text-sm">Loading chats...</span>
              </div>
            </div>
          )}

          {!isChatListLoading && chatList.length === 0 && (
            <div className="text-muted-foreground text-sm text-center py-4">
              No chats available. Start a new chat!
            </div>
          )}
          { isOpen && chatList.map((chat,index) => (
            <div
              key={index}
              className={cn(
                "group relative p-3 rounded-lg mb-2 cursor-pointer transition-colors min-w-0",
                (currentChat?.id === chat.id) || (currentChat?.id === null && chat.id === null)
                  ? "bg-study-purple/20 border border-study-purple/30" 
                  : "hover:bg-white/5"
              )}
              onClick={() => setCurrentChatId(chat.id)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                {editingChatId && editingChatId === chat.id ? (
                  <Input
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    onBlur={handleSaveEdit}
                    className="flex-1 h-6 text-sm bg-transparent min-w-0"
                    autoFocus
                  />
                ) : (
                  <span className="flex-1 text-sm text-white truncate min-w-0 max-w-48">
                    {chat.title}
                  </span>
                )}
              </div>
              
              <div className="opacity-0 group-hover:opacity-100 absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                {chat.id && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-white hover:bg-white/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(chat.id!, chat.title);
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
                        deleteChat(chat.id!);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
