
import React, { useState, useRef, useEffect } from 'react';
import { Menu, Send, Paperclip } from 'lucide-react';
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
  const { currentChat, isLoading, sendMessage, createNewChat } = useChat();
  const [message, setMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages]);

  const handleSend = async () => {
    if (!message.trim() && attachedFiles.length === 0) return;

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
        <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-white/10">
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
    </div>
  );
}
