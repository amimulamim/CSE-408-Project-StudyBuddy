import React, { useState, useRef, useEffect } from 'react';
import { ChatSidebar } from '@/components/chatbot/ChatSidebar';
import { ChatInterface } from '@/components/chatbot/ChatInterface';
import { ChatProvider } from '@/components/chatbot/ChatContext';
import { Header } from '@/components/header/Header';
import { Footer } from '@/components/footer/Footer';
import { LoadedHeader } from './Dashboard';

export default function Chatbot() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <>
    {LoadedHeader}
    <div className="fixed top-20 bottom-0 w-screen overflow-y-auto scrollbar-hide">
      <ChatProvider>
        <div className="h-screen flex dashboard-bg-animated overflow-hidden">
          <ChatSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
          <ChatInterface sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        </div>
      </ChatProvider>
      <Footer />
    </div>
    </>
  );
}
