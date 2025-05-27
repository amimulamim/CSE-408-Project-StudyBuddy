import { ApiResponse } from '@/lib/api';
import React, { createContext, useContext, useState, useCallback } from 'react';

import type { FileAttachment } from './chat';
import type { ChatMessage } from './chat';
import type { Chat } from './chat';
import { getResponse } from './api';

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
  const [currentChat, setCurrentChat] = useState<Chat | null>({
    id: null,
    title: 'New Chat',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const [isLoading, setIsLoading] = useState(false);

  // const currentChat = chats.find(chat => chat.id === currentChatId) || null;

  const createNewChat = useCallback(() => {
    const newChat: Chat = {
      id: null,
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChat(newChat);
    console.log('New chat created:');
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
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
      files,
    };

    // Add user message
    // setChats(prev => prev.map(chat => 
    //   chat.id === currentChatId 
    //     ? { 
    //         ...chat, 
    //         messages: [...chat.messages, userMessage],
    //         title: chat.title === 'New Chat' ? content.slice(0, 30) + '...' : chat.title,
    //         updatedAt: new Date()
    //       }
    //     : chat
    // ));

    setCurrentChat((prev)=>{
      return {
        ...prev,
        title: prev?.title === 'New Chat' ? content.slice(0, 30) + '...' : prev?.title,
        messages: [...prev?.messages, userMessage],
        updatedAt: new Date(),
      };
    })

    setIsLoading(true);

    getResponse(content,files,currentChatId).then((response: ApiResponse) => {
      if (response.status === 'success') {
        const lastMessage = response.data.messages[response.data.messages.length - 1];
        const assistantMessage = {
          id: lastMessage?.id || (Date.now() + 1).toString(),
          content: lastMessage.text,
          role: lastMessage.role,
          timestamp: lastMessage.timestamp,
          files: lastMessage.files.map((file: any) => ({
            id: file?.id || Date.now().toString(),
            name: file?.name || 'file',
            size: file?.size || 0,
            type: file?.type || 'unknown',
            url: file?.url || '',
            bytes: file?.bytes ? new Uint8Array(file.bytes) : undefined,
          })),
        };
        setCurrentChat((prev)=>{
          return {
            ...prev,
            title: response.data?.name || currentChat.title,
            id: response.data?.id || currentChat.id,
            messages: [...prev.messages, assistantMessage],
            updatedAt: new Date(),
          };
        })
        if (!currentChatId) {
          setCurrentChatId(response.data?.id || currentChat.id);
        }
      }else {
        console.error('Error sending message:', response.msg);
        // Handle error appropriately, e.g., show a toast notification
      }
    }).catch((error) => {
      console.error('Error sending message:', error);
      // Handle error appropriately, e.g., show a toast notification
      // toast({
      //   title: "Error sending message",
      //   description: error.message || "An unexpected error occurred.",
      //   variant: "destructive",
      // });
    });


    // const assistantMessage: ChatMessage = {
    //   id: (Date.now() + 1).toString(),
    //   content: `This is a dummy response to: "${content}". In a real implementation, this would be the actual AI response.`,
    //   role: 'assistant',
    //   timestamp: new Date(),
    // };

    // setChats(prev => prev.map(chat => 
    //   chat.id === currentChatId 
    //     ? { 
    //         ...chat, 
    //         messages: [...chat.messages, assistantMessage],
    //         updatedAt: new Date()
    //       }
    //     : chat
    // ));

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
