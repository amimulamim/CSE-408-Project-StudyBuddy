import { ApiResponse } from '@/lib/api';
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner'
import type { ChatIdentifier, FileAttachment } from './chat';
import type { ChatMessage } from './chat';
import type { Chat } from './chat';
import { getChatHistory, getChatList, getResponse, reqDeleteChat, reqRenameChat } from './api';

interface ChatContextType {
  chatList: ChatIdentifier[];
  currentChatId: string | null;
  setCurrentChatId: React.Dispatch<React.SetStateAction<string | null>>;
  currentChat: Chat | null;
  isLoading: boolean;
  isNewChatLoading: boolean;
  setIsNewChatLoading: React.Dispatch<React.SetStateAction<boolean>>;
  isChatListLoading: boolean;
  createNewChat: () => void;
  fetchChats: () => void;
  deleteChat: (chatId: string) => void;
  renameChat: (chatId: string, newTitle: string) => void;
  sendMessage: (content: string, files?: FileAttachment[]) => Promise<void>;
  loadMoreMessages: (chatId: string, limit: number, offset?: number) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chatList, setChatList] = useState<ChatIdentifier[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isNewChatLoading, setIsNewChatLoading] = useState(false);
  const [isChatListLoading, setIsChatListLoading] = useState(false);
  const prevChatId = useRef<string | null>(null);
  // Initialize currentChat with a default structure
  const newChat: Chat = {
    id: null,
    title: 'New Chat',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  const [currentChat, setCurrentChat] = useState<Chat | null>(newChat);
  const [isLoading, setIsLoading] = useState(false);

  const fetchChats = useCallback(() => {
    getChatList().then((response: ApiResponse) => {
      if (response.status === 'success') {
        const existingChats = response.data.chats.map(chat => ({
          id: chat.id,
          title: chat.name,
        }));

        // Only add 'New Chat' if currentChatId is null
        if (currentChatId === null) {
          const newChatId: ChatIdentifier = {
            id: null,
            title: 'New Chat',
          };
          setChatList([newChatId, ...existingChats]);
        } else {
          setChatList(existingChats);
        }
        
        setIsChatListLoading(false);
      } else {
        console.error('Error fetching chat list:', response.msg);
      }
    });
  }, [currentChatId]); // Add currentChatId as dependency

  useEffect(() => {
    if (currentChatId) {
      setIsNewChatLoading(true);
      loadMoreMessages(currentChatId, 5, 0);
    } else {
      console.log('No current chat selected, setting to new chat');
      setCurrentChat(newChat);
    }
  }, [currentChatId]);

  // Update fetchChats call when currentChatId changes
  useEffect(() => {
    setIsChatListLoading(true);
    fetchChats();
  }, []);

  const createNewChat = useCallback(() => {
    // If there is no chat with id null in the chatlist append one
    const hasNewChat = chatList.some(chat => chat.id === null);
    if (!hasNewChat){
      const newChatId: ChatIdentifier = {
        id: null,
        title: 'New Chat',
      };
      setChatList(prev => [newChatId, ...prev]);
    }
    if( currentChatId === null ){
      setCurrentChat(newChat);
      return;
    }
    setCurrentChatId(null);
  }, [chatList, setCurrentChatId, setChatList, currentChatId, setCurrentChat]);

  const deleteChat = useCallback((chatId: string) => {
    const responsePromise = reqDeleteChat(chatId);
    toast.promise(responsePromise, {
      loading: 'Chat is being deleted...',
      success: () => {
        return 'Chat deleted successfully!';
      },
      error: 'Error deleting chat',
    });
    responsePromise.then((response: ApiResponse) => {
      if (response.status === 'success') {
        console.log('currentChatId:');
        console.log(currentChat.id);
        console.log('chatId:');
        console.log(chatId);
        if (currentChat.id === chatId) {
          createNewChat(); // Reset current chat if it was deleted
        }
        // remove the chat from the chat list
        setChatList((prev) => prev.filter(chat => chat.id !== chatId));
      } else {
        console.error('Error deleting chat:', response.msg);
      }
    }
    );
  }, [createNewChat, setChatList, currentChat]);

  const renameChat = useCallback((chatId: string, newTitle: string) => {
    const responsePromise = reqRenameChat(chatId, newTitle);
    toast.promise(responsePromise, {
      loading: 'Chat is being renamed...',
      success: () => {
        return `Chat renamed to "${newTitle}" successfully!`;
      },
      error: 'Error renaming chat',
    });
    responsePromise.then((response: ApiResponse) => {
      if ( response.status === 'success' ){
        setChatList((prev) => {
          return prev.map(chat => 
            chat.id === chatId ? { ...chat, title: newTitle } : chat
          );
        });
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
      } else {
        toast.error(`Error renaming chat: ${response.msg}`);
      }
    })
  }, []);

  const sendMessage = useCallback(async (content: string, files?: FileAttachment[]) => {
    const userMessage: ChatMessage = {
      id: 'random' + Date.now().toString(),
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
        });
        // Update the first entry of the chat list if currentChatId is null and the id of that entry is also null
        if (!currentChatId) {
          setChatList((prev) => {
            return prev.map(chat =>
              chat.id === null
                ? { id: response.data?.id || currentChat.id, title: response.data?.name || 'New Chat' }
                : chat
            );
          });
        }
      }else {
        toast.error(`Error sending message:, ${response.msg}`);
      }
      setIsLoading(false);
    }).catch((error) => {
      toast.error(`Error sending message: ${error}`);
    });
  }, [currentChatId]);

  const loadMoreMessages = useCallback( (chatId: string, limit: number, offset: number = -1) => {

    if( offset === -1 ){
      offset = currentChat?.messages.length || 0;
    }

    getChatHistory(chatId, offset, limit).then((response: ApiResponse) => {
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
          if (id !== prevChat?.id) {
            return {
              id: id,
              title: chatTitle,
              messages: newMessages,
              createdAt: new Date(response.data.created_at),
              updatedAt: new Date(response.data.updated_at),
            };
          }
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
    }
    ).catch((error) => {
      // Handle error appropriately, e.g., show a toast notification
      toast.error(`Error loading messages: ${error.message || 'An unexpected error occurred.'}`);
    });
      
  }, [getChatHistory, setCurrentChat, currentChat]);
  

  return (
    <ChatContext.Provider value={{
      chatList,
      currentChatId,
      setCurrentChatId,
      currentChat,
      isLoading,
      isNewChatLoading,
      setIsNewChatLoading,
      isChatListLoading,
      createNewChat,
      fetchChats,
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
