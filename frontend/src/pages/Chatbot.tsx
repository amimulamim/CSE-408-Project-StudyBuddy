import { useState } from 'react';
import { ChatSidebar } from '@/components/chatbot/ChatSidebar';
import { ChatInterface } from '@/components/chatbot/ChatInterface';
import { ChatProvider } from '@/components/chatbot/ChatContext';

export default function Chatbot() {
  // const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768; // true if screen is md (768px) or larger
    }
    return true; // default fallback for SSR or non-browser environments
  });
  

  return (
    <ChatProvider>
      <div className="h-screen">
        <ChatSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <ChatInterface sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      </div>
    </ChatProvider>
  );
}
