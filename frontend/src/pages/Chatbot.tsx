import React, { useState, useRef, useEffect } from 'react';
import { ChatSidebar } from '@/components/chatbot/ChatSidebar';
import { ChatInterface } from '@/components/chatbot/ChatInterface';
import { ChatProvider } from '@/components/chatbot/ChatContext';

export default function Chatbot() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <ChatProvider>
      <div className="h-screen flex dashboard-bg-animated overflow-hidden">
        <ChatSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <ChatInterface sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      </div>
    </ChatProvider>
  );
}
