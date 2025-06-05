
import React from 'react';
import { Book } from 'lucide-react';

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
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <Book className={`w-8 h-8 text-study-purple ${iconClassName}`} />
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-study-blue animate-pulse-glow"></div>
      </div>
      {showText && (
        <div className={`font-bold text-xl ${textClassName}`}>
          <span className="text-white">Studdy</span>
          <span className="gradient-text">Buddy</span>
        </div>
      )}
    </div>
  );
}
