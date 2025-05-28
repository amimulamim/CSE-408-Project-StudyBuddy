import { ApiResponse } from '@/lib/api';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

import type { ChatIdentifier, FileAttachment } from './chat';
import type { ChatMessage } from './chat';
import type { Chat } from './chat';
import { getChatHistory, getChatList, getResponse, reqDeleteChat, reqRenameChat } from './api';

interface ChatContextType {
  chatList: ChatIdentifier[];
  chats: Chat[];
  currentChatId: string | null;
  currentChat: Chat | null;
  isLoading: boolean;
  isChatLoading: boolean;
  setIsChatLoading: React.Dispatch<React.SetStateAction<boolean>>;
  createNewChat: () => void;
  fetchChats: () => void;
  selectChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  renameChat: (chatId: string, newTitle: string) => void;
  sendMessage: (content: string, files?: FileAttachment[]) => Promise<void>;
  loadMoreMessages: (chatId: string, limit: number) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chatList, setChatList] = useState<ChatIdentifier[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  // Initialize currentChat with a default structure
  const [currentChat, setCurrentChat] = useState<Chat | null>({
    id: null,
    title: 'New Chat',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchChats = useCallback(() => {
    getChatList().then((response: ApiResponse) => {
      if (response.status === 'success') {
        setChatList([
          ...response.data.chats.map(chat => ({
            id: chat.id,
            title: chat.name,
          }))
        ]);
      } else {
        console.error('Error fetching chat list:', response.msg);
      }
    });
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  useEffect(() => {
    if (currentChatId) {
      loadMoreMessages(currentChatId, 20);
    } else {
      setCurrentChat({
        id: null,
        title: 'New Chat',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }, [currentChatId]);

  const createNewChat = useCallback(() => {
    selectChat(null); // Reset current chat
    fetchChats(); // Refresh chat list
  }, []);

  const selectChat = useCallback((chatId: string) => {
    setCurrentChatId(chatId);
    setCurrentChat((prev)=>{
      return{
        ...prev,
        id: chatId,
        messages: [],
      }
    })
    fetchChats(); // Refresh chat list
  }, []);

  const deleteChat = useCallback((chatId: string) => {
    reqDeleteChat(chatId).then((response: ApiResponse) => {
      if (response.status === 'success') {
        if (currentChatId === chatId) {
          setCurrentChatId(null);
          setCurrentChat(null);
        }
        fetchChats(); // Refresh chat list after deletion
      } else {
        console.error('Error deleting chat:', response.msg);
      }
    }
    );
  }, [currentChatId]);

  const renameChat = useCallback((chatId: string, newTitle: string) => {
    reqRenameChat(chatId, newTitle).then((response: ApiResponse) => {
      if ( response.status === 'success' ){
        if (currentChatId === chatId) {
          setCurrentChat((prev) => {
            if (prev) {
              return {
                ...prev,
                title: newTitle,
                updatedAt: new Date(),
              };
            }
            return prev;
          });
        }
        fetchChats(); // Refresh chat list after renaming
      } else {
        console.error('Error renaming chat:', response.msg);
        // Handle error appropriately, e.g., show a toast notification
      }
    })
  }, []);

  const sendMessage = useCallback(async (content: string, files?: FileAttachment[]) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
      files,
    };

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
      setIsLoading(false);
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
  }, [currentChatId]);

  const loadMoreMessages = useCallback((chatId: string, limit: number) => {
    setCurrentChat((prev) => {
      if (!prev) return prev;
  
      const currentOffset = prev.messages.length;
  
      getChatHistory(chatId, currentOffset, limit).then((response: ApiResponse) => {
        if (response.status === 'success') {
          const id = response.data.id;
          const chatTitle = response.data.name || 'Chat';
  
          const newMessages = response.data.messages.map((msg: any) => ({
            id: msg.id || (Date.now() + Math.random()).toString(),
            content: msg.text,
            role: msg.role,
            timestamp: new Date(msg.timestamp),
            files: msg.files.map((file: any) => ({
              id: file?.id || Date.now().toString(),
              name: file?.name || 'file',
              size: file?.size || 0,
              type: file?.type || 'unknown',
              url: file?.file_url || '',
              bytes: file?.bytes ? new Uint8Array(file.bytes) : undefined,
            })),
          })).reverse();
  
          setCurrentChat((prevChat) => {
            if (!prevChat) return prevChat;
  
            return {
              ...prevChat,
              id: id || prevChat.id,
              title: chatTitle || prevChat.title,
              messages: [...newMessages, ...prevChat.messages],
              updatedAt: new Date(),
            };
          });
        } else {
          console.error('Error loading more messages:', response.msg);
        }
  
        setIsChatLoading(false);
      }).catch((error) => {
        console.error('Error loading more messages:', error);
        setIsChatLoading(false);
      });
  
      // Return current chat immediately, actual update will happen in nested setCurrentChat
      return prev;
    });
  }, [getChatHistory, setCurrentChat, setIsChatLoading]);
  

  return (
    <ChatContext.Provider value={{
      chats,
      chatList,
      currentChatId,
      currentChat,
      isLoading,
      isChatLoading,
      setIsChatLoading,
      createNewChat,
      fetchChats,
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
