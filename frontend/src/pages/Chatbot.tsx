import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChatSidebar } from '@/components/chatbot/ChatSidebar';
import { ChatInterface } from '@/components/chatbot/ChatInterface';
import { ChatProvider } from '@/components/chatbot/ChatContext';

export default function Chatbot() {
  const { chatId } = useParams<{ chatId?: string }>();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768; // true if screen is md (768px) or larger
    }
    return true; // default fallback for SSR or non-browser environments
  });
  

  return (
    <ChatProvider initialChatId={chatId}>
      <div className="h-screen">
        <ChatSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <ChatInterface sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      </div>
    </ChatProvider>
  );
}
