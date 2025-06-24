import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import dashboard from '@/assets/dashboard.png';

interface HeroProps {
  onSignUp: () => void;
}

export function Hero({ onSignUp }: HeroProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        duration: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 30 
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  const imageVariants = {
    hidden: { 
      opacity: 0, 
      y: 50,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut",
        delay: 0.8
      }
    }
  };

  const badgeVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8 
    },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <section className="pt-32 pb-20 md:pt-40 md:pb-28">
      <div className="container px-4 mx-auto">
        <motion.div 
          className="flex flex-col items-center text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div 
            className="inline-block mb-4 px-3 py-1.5 rounded-full bg-study-purple/20 border border-study-purple/30"
            variants={badgeVariants}
          >
            <p className="text-sm font-medium">
              <span className="gradient-text">AI-Powered</span> Study Assistant
            </p>
          </motion.div>
          
          <motion.h1 
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 max-w-4xl leading-tight md:leading-tight lg:leading-tight"
            variants={itemVariants}
          >
            Study Smarter with Your Personal
            <motion.span 
              className="gradient-text block"
              variants={itemVariants}
            >
              AI Study Buddy
            </motion.span>
          </motion.h1>
          
          <motion.p 
            className="text-muted-foreground text-lg md:text-xl max-w-2xl mb-8"
            variants={itemVariants}
          >
            Generate custom quizzes, get instant answers to your questions, 
            and understand complex study materials with our AI-powered study companion.
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row gap-4"
            variants={itemVariants}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                className="button-gradient text-lg py-6 px-8" 
                size="lg"
                onClick={onSignUp}
              >
                Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                variant="outline" 
                size="lg"
                className="text-lg py-6 px-8 border-white/20 hover:bg-white/5"
              >
                Learn How It Works
              </Button>
            </motion.div>
          </motion.div>
          
          <motion.div 
            className="mt-16 md:mt-20 relative"
            variants={imageVariants}
          >
            <motion.div 
              className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-full h-40 bg-study-purple/30 filter blur-3xl opacity-30 rounded-full"
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            <motion.div 
              className="relative bg-gradient-to-b from-white/10 to-white/5 border border-white/20 rounded-lg backdrop-blur-sm overflow-hidden"
              whileHover={{ 
                scale: 1.02,
                transition: { duration: 0.3 }
              }}
            >
              <motion.img 
                src={dashboard} 
                alt="StudyBuddy Dashboard Preview" 
                className="w-full rounded-lg shadow-2xl opacity-90"
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-study-dark to-transparent"></div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
