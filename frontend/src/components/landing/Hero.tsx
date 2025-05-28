
import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface HeroProps {
  onSignUp: () => void;
}

export function Hero({ onSignUp }: HeroProps) {
  // Since we're not using framer-motion package, let's use CSS animations instead
  
  return (
    <section className="pt-32 pb-20 md:pt-40 md:pb-28">
      <div className="container px-4 mx-auto">
        <div className="flex flex-col items-center text-center">
          <div className="inline-block mb-4 px-3 py-1.5 rounded-full bg-study-purple/20 border border-study-purple/30">
            <p className="text-sm font-medium">
              <span className="gradient-text">AI-Powered</span> Study Assistant
            </p>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 max-w-4xl leading-tight md:leading-tight lg:leading-tight">
            Study Smarter with Your Personal
            <span className="gradient-text block"> AI Study Buddy</span>
          </h1>
          
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mb-8">
            Generate custom quizzes, get instant answers to your questions, 
            and understand complex study materials with our AI-powered study companion.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              className="button-gradient text-lg py-6 px-8" 
              size="lg"
              onClick={onSignUp}
            >
              Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              className="text-lg py-6 px-8 border-white/20 hover:bg-white/5"
            >
              Learn How It Works
            </Button>
          </div>
          
          <div className="mt-16 md:mt-20 relative">
            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-full h-40 bg-study-purple/30 filter blur-3xl opacity-30 rounded-full"></div>
            
            <div className="relative bg-gradient-to-b from-white/10 to-white/5 border border-white/20 rounded-lg backdrop-blur-sm overflow-hidden">
              <img 
                src="https://img.freepik.com/free-vector/gradient-ui-ux-background_23-2149024129.jpg?w=1380&t=st=1684941221~exp=1684941821~hmac=605a211a08d457f0a45630d1f99792fe76c80a0a70228f3e2f51f193814b9ba5" 
                alt="StuddyBuddy Dashboard Preview" 
                className="w-full rounded-lg shadow-2xl opacity-90"
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-study-dark to-transparent"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
