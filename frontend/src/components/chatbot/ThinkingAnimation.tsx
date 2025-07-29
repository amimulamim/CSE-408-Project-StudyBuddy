
import React from 'react';
import { Bot } from 'lucide-react';

export function ThinkingAnimation() {
  return (
    <div className="flex gap-4 justify-start min-w-0">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-study-purple flex items-center justify-center">
        <Bot className="h-4 w-4 text-white" />
      </div>
      
      <div className="max-w-3xl min-w-0 w-full">
        <div className="p-4 rounded-lg bg-white/5 text-white">
          <div className="flex items-center gap-1">
            <span>Thinking</span>
            <div className="flex gap-1 ml-2">
              <div className="w-2 h-2 bg-study-purple rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-study-purple rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-study-purple rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
