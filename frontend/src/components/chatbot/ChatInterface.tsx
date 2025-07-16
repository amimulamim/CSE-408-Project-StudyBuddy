import React, { useState, useRef, useEffect } from 'react';
import { Menu, Send, Paperclip, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useChat } from './ChatContext';
import { ChatMessage } from './ChatMessage';
import { FileUpload } from './FileUpload';
import { ThinkingAnimation } from './ThinkingAnimation';
import type { FileAttachment } from './chat';

interface ChatInterfaceProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function ChatInterface({ sidebarOpen, onToggleSidebar }: ChatInterfaceProps) {
  const { currentChat, isLoading, sendMessage, 
    createNewChat, loadMoreMessages, isNewChatLoading, setIsNewChatLoading } = useChat();
  const [message, setMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [isLoadingOldMessages, setIsLoadingOldMessages] = useState(false);
  const [noMoreOldMessages, setNoMoreOldMessages] = useState(false);
  
  // Refs for DOM elements
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Refs to track message state changes
  const previousMessageCountRef = useRef<number>(0);
  const shouldScrollToBottomRef = useRef<boolean>(true);
  
  // Refs to track scroll direction
  const lastScrollTopRef = useRef<number>(0);
  const isScrollingUpRef = useRef<boolean>(false);
  const prevScrollHeightRef = useRef<number>(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (!container || isLoadingOldMessages || noMoreOldMessages) return;
    
    const currentScrollTop = container.scrollTop;
    const previousScrollTop = lastScrollTopRef.current;
    
    // Determine scroll direction
    if (currentScrollTop < previousScrollTop) {
      isScrollingUpRef.current = true; // Scrolling up
    } else if (currentScrollTop > previousScrollTop) {
      isScrollingUpRef.current = false; // Scrolling down
    }
    // If currentScrollTop === previousScrollTop, keep the previous direction
    
    // Update the last scroll position
    lastScrollTopRef.current = currentScrollTop;
    
    // Only load more messages if:
    // 1. User is at the very top (scrollTop < 5)
    // 2. User is scrolling upwards
    // 3. Not already loading
    // 4. Chat has a valid ID (not a new chat)
    if (currentScrollTop < 3 && isScrollingUpRef.current && currentChat?.id) {
      shouldScrollToBottomRef.current = false;
      
      prevScrollHeightRef.current = container.scrollHeight;
      setIsLoadingOldMessages(true);
      
      loadMoreMessages(currentChat.id, 5);
    }
  };

  // Smart scroll logic - only scroll for new messages
  useEffect(() => {
    if (isNewChatLoading) setIsNewChatLoading(false);
    const currentMessageCount = currentChat?.messages.length || 0;
    const previousMessageCount = previousMessageCountRef.current;
    
    // If we're loading old messages, don't scroll
    if (currentMessageCount == previousMessageCount && currentMessageCount > 0) {
      setIsLoadingOldMessages(false);
      setNoMoreOldMessages(true);
      return;
    }
    
    // If messages were added to the end (new messages), scroll to bottom
    if (currentMessageCount > previousMessageCount) {
      if( shouldScrollToBottomRef.current ) {
        scrollToBottom();
      }else {
        const container = chatContainerRef.current;
        requestAnimationFrame(() => {
          const newHeight = container.scrollHeight;
          const heightDifference = newHeight - prevScrollHeightRef.current;
          container.scrollTop = heightDifference - 50;
          prevScrollHeightRef.current = newHeight;

          setIsLoadingOldMessages(false);
          
          // Re-enable auto-scroll to bottom for future new messages
          setTimeout(() => {
            shouldScrollToBottomRef.current = true;
          }, 200);
        });
      }
    }
    
    // Update the previous count
    previousMessageCountRef.current = currentMessageCount;
  }, [currentChat?.messages]);

  // Reset refs when chat changes
  useEffect(() => {
    shouldScrollToBottomRef.current = true;
    lastScrollTopRef.current = 0; // Reset scroll tracking
    isScrollingUpRef.current = false; // Reset scroll direction
    setNoMoreOldMessages(false); // Reset no more old messages flag
    scrollToBottom(); // Scroll to bottom on new chat
  }, [currentChat?.id]);

  // Initialize scroll position tracking when component mounts
  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      lastScrollTopRef.current = container.scrollTop;
    }
  }, []);

  const handleSend = async () => {
    if (!message.trim() && attachedFiles.length === 0) return;

    // Ensure auto-scroll is enabled for new messages
    shouldScrollToBottomRef.current = true;

    // Create new chat if none exists
    if (!currentChat) {
      createNewChat();
      // Wait a bit for the chat to be created
      setTimeout(async () => {
        await sendMessage(message, attachedFiles);
        setMessage('');
        setAttachedFiles([]);
      }, 100);
    } else {
      await sendMessage(message, attachedFiles);
      setMessage('');
      setAttachedFiles([]);
      // scrollToBottom will be called automatically by useEffect
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const removeFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const handleFilesSelected = (newFiles: FileAttachment[]) => {
    setAttachedFiles(prev => [...prev, ...newFiles]);
  };

  const renderFilePreview = (file: FileAttachment) => {
    if (file.type.startsWith('image/')) {
      return (
        <div className="relative w-20 h-20 rounded-lg overflow-hidden">
          <img
            src={file.url}
            alt={file.name}
            className="w-full h-full object-cover"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-5 w-5 bg-black/50 hover:bg-black/70 text-white"
            onClick={() => removeFile(file.id)}
          >
            <span className="text-xs">×</span>
          </Button>
        </div>
      );
    }

    if (file.type === 'application/pdf') {
      return (
        <div className="relative w-20 h-20 rounded-lg bg-red-500/20 border border-red-500/30 flex flex-col items-center justify-center">
          <span className="text-red-400 text-xs font-semibold">PDF</span>
          <span className="text-xs text-white/70 truncate max-w-16 px-1">{file.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-1 -right-1 h-5 w-5 bg-black/50 hover:bg-black/70 text-white rounded-full"
            onClick={() => removeFile(file.id)}
          >
            <span className="text-xs">×</span>
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2 text-sm">
        <span className="text-white truncate max-w-32">{file.name}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 text-muted-foreground hover:text-red-400"
          onClick={() => removeFile(file.id)}
        >
          <span className="text-xs">×</span>
        </Button>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-white/10 p-4 flex items-center gap-3 bg-study-dark">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="text-white hover:bg-white/10"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-white">
          {currentChat?.title || 'StudyBuddy AI'}
        </h1>
      </div>

      {/* Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
        onScroll={handleScroll}
      >
        {/* Loading indicator for old messages */}
        {isLoadingOldMessages && (
          <div className="text-center text-sm text-gray-500 mb-2 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
            Loading previous messages...
          </div>
        )}
        
        {!currentChat || currentChat.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to StudyBuddy AI</h2>
              <p className="text-muted-foreground mb-4">Start typing a message to begin a new conversation</p>
            </div>
          </div>
        ) : (
          <>
            {currentChat.messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isLoading && <ThinkingAnimation />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-white/10 p-4 bg-study-dark">
        {/* File Previews */}
        {attachedFiles.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-3">
            {attachedFiles.map((file) => renderFilePreview(file))}
          </div>
        )}

        <div className="relative bg-white/5 border border-white/20 rounded-lg">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            className="resize-none bg-transparent border-0 text-white placeholder-muted-foreground pr-20 min-h-[44px] max-h-[120px]"
            rows={1}
            disabled={isLoading}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
            <FileUpload onFilesSelected={handleFilesSelected}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/10"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </FileUpload>
            <Button
              onClick={handleSend}
              disabled={(!message.trim() && attachedFiles.length === 0) || isLoading}
              className="h-8 w-8 bg-study-purple hover:bg-study-purple/90"
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* New Chat Loading Overlay */}
      {isNewChatLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center">
          {/* Blur backdrop */}
          <div className="absolute inset-0 bg-study-dark/50 backdrop-blur-sm" />
          
          {/* Loading content */}
          <div className="relative z-10 flex flex-col items-center justify-center p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl">
            {/* Lucide spinner */}
            <Loader2 className="w-12 h-12 text-study-purple animate-spin mb-4" />
            
            {/* Loading text */}
            <div className="text-center">
              <h3 className="text-xl font-semibold text-white mb-2">Loading Chat</h3>
              <p className="text-sm text-white/70">Setting up your conversation...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
