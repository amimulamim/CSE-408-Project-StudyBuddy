import React from 'react';
import { Book } from 'lucide-react';
import logo from '@/assets/icon_v1.0.png';
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';

interface LogoProps {
  className?: string;
  textClassName?: string;
  iconClassName?: string;
  showText?: boolean;
}

export function Logo({
  className = "",
  textClassName = "",
  iconClassName = "",
  showText = true
}: LogoProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="relative">
        <div className="w-16 h-16 relative">
          <img 
            src={logo} 
            alt="StudyBuddy Logo" 
            className="w-full h-full object-contain object-center"
          />
        </div>
      </div>
      {showText && (
        <div className={`font-bold text-xl ${textClassName}`}>
          <span className="text-white">Study</span>
          <span className="gradient-text">Buddy</span>
        </div>
      )}
    </div>
  );
}
