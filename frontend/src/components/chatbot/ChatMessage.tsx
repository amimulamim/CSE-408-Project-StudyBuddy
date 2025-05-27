
import React from 'react';
import { User, Bot, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChatMessage as ChatMessageType } from './ChatContext';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  const renderFileAttachment = (file: any) => {
    if (file.type.startsWith('image/')) {
      return (
        <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
          <img
            src={file.url}
            alt={file.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1">
            <span className="text-xs text-white truncate block">{file.name}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6 bg-black/50 hover:bg-black/70 text-white"
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    if (file.type === 'application/pdf') {
      return (
        <div className="w-32 h-32 rounded-lg bg-red-500/20 border border-red-500/30 flex flex-col items-center justify-center p-2">
          <div className="text-red-400 text-lg font-bold mb-1">PDF</div>
          <span className="text-xs text-center text-white/70 truncate w-full px-1">{file.name}</span>
          <span className="text-xs text-muted-foreground mt-1">
            {(file.size / 1024).toFixed(1)} KB
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="mt-1 h-6 w-6 text-muted-foreground hover:text-white"
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 p-2 bg-black/20 rounded border">
        <span className="flex-1 text-sm truncate">{file.name}</span>
        <span className="text-xs text-muted-foreground">
          {(file.size / 1024).toFixed(1)} KB
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-white"
        >
          <Download className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  return (
    <div className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-study-purple flex items-center justify-center">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}
      
      <div className={`max-w-3xl ${isUser ? 'order-first' : ''}`}>
        <div
          className={`p-4 rounded-lg ${
            isUser
              ? 'bg-study-purple text-white ml-12'
              : 'bg-white/5 text-white'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
          
          {/* File attachments */}
          {message.files && message.files.length > 0 && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {message.files.map((file) => (
                <div key={file.id}>
                  {renderFileAttachment(file)}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground mt-1 px-1">
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-study-blue flex items-center justify-center">
          <User className="h-4 w-4 text-white" />
        </div>
      )}
    </div>
  );
}
