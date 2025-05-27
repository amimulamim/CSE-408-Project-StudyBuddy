
import React, { createContext, useContext, useState, useCallback } from 'react';

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  files?: FileAttachment[];
}

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

interface ChatContextType {
  chats: Chat[];
  currentChatId: string | null;
  currentChat: Chat | null;
  isLoading: boolean;
  createNewChat: () => void;
  selectChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  renameChat: (chatId: string, newTitle: string) => void;
  sendMessage: (content: string, files?: FileAttachment[]) => Promise<void>;
  loadMoreMessages: (chatId: string, offset: number) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const currentChat = chats.find(chat => chat.id === currentChatId) || null;

  const createNewChat = useCallback(() => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
  }, []);

  const selectChat = useCallback((chatId: string) => {
    setCurrentChatId(chatId);
  }, []);

  const deleteChat = useCallback((chatId: string) => {
    setChats(prev => prev.filter(chat => chat.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
    }
  }, [currentChatId]);

  const renameChat = useCallback((chatId: string, newTitle: string) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { ...chat, title: newTitle, updatedAt: new Date() }
        : chat
    ));
  }, []);

  const sendMessage = useCallback(async (content: string, files?: FileAttachment[]) => {
    if (!currentChatId) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
      files,
    };

    // Add user message
    setChats(prev => prev.map(chat => 
      chat.id === currentChatId 
        ? { 
            ...chat, 
            messages: [...chat.messages, userMessage],
            title: chat.title === 'New Chat' ? content.slice(0, 30) + '...' : chat.title,
            updatedAt: new Date()
          }
        : chat
    ));

    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      content: `This is a dummy response to: "${content}". In a real implementation, this would be the actual AI response.`,
      role: 'assistant',
      timestamp: new Date(),
    };

    setChats(prev => prev.map(chat => 
      chat.id === currentChatId 
        ? { 
            ...chat, 
            messages: [...chat.messages, assistantMessage],
            updatedAt: new Date()
          }
        : chat
    ));

    setIsLoading(false);
  }, [currentChatId]);

  const loadMoreMessages = useCallback(async (chatId: string, offset: number) => {
    // Simulate paginated API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In real implementation, this would load older messages
    console.log(`Loading more messages for chat ${chatId} with offset ${offset}`);
  }, []);

  return (
    <ChatContext.Provider value={{
      chats,
      currentChatId,
      currentChat,
      isLoading,
      createNewChat,
      selectChat,
      deleteChat,
      renameChat,
      sendMessage,
      loadMoreMessages,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
