import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export function ChatbotFAB() {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/chatbot');
  };

  return (
    <motion.div
      animate={{
        y: [0, -8, 0],
        scale: [1, 1.05, 1]
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className="fixed bottom-8 right-8 z-50"
    >
      <Button
        onClick={handleClick}
        className="h-16 w-16 rounded-full shadow-xl border-0 transition-all duration-300 hover:scale-110 active:scale-95 group p-0 flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 8px 32px 0 rgba(102, 126, 234, 0.3)',
        }}
        size="icon"
        aria-label="Open chatbot"
      >
        <motion.svg
          width={44}
          height={44}
          viewBox="0 0 44 44"
          fill="none"
          className="text-white"
          animate={{
            rotate: [0, 5, -5, 0]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {/* Larger custom chat bubble */}
          <path
            d="M6 16c0-5.5 4.5-10 10-10h12c5.5 0 10 4.5 10 10v8c0 5.5-4.5 10-10 10h-3l-6 6v-6h-3c-5.5 0-10-4.5-10-10v-8z"
            fill="white"
            stroke="white"
            strokeWidth="2"
          />
          {/* Three dots inside */}
          <circle cx="16" cy="20" r="2" fill="#667eea"/>
          <circle cx="22" cy="20" r="2" fill="#667eea"/>
          <circle cx="28" cy="20" r="2" fill="#667eea"/>
        </motion.svg>
      </Button>
    </motion.div>
  );
}
