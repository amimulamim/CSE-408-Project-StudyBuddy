
import React from 'react';
import { Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function ChatbotFAB() {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/chatbot');
  };

  return (
    <Button
      onClick={handleClick}
      className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl bg-gradient-to-r from-study-purple to-study-blue hover:from-study-purple/90 hover:to-study-blue/90 border-0 z-50 transition-all duration-300 hover:scale-110 active:scale-95 group"
      size="icon"
    >
      <div className="relative">
        <Bot className="h-10 w-10 text-white transition-transform duration-300 group-hover:scale-105" />
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 animate-pulse shadow-lg"></div>
        <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
      </div>
    </Button>
  );
}
