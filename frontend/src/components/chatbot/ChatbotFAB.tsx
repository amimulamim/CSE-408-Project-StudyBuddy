import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

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
        className="h-14 w-14 rounded-full shadow-xl border-0 transition-all duration-300 hover:scale-110 active:scale-95 group p-0 flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 8px 32px 0 rgba(102, 126, 234, 0.3)',
        }}
        size="icon"
        aria-label="Open chatbot"
      >
        <motion.div
          animate={{
            rotate: [0, 5, -5, 0]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <MessageCircle className="h-7 w-7 text-white" />
        </motion.div>
      </Button>
    </motion.div>
  );
}
