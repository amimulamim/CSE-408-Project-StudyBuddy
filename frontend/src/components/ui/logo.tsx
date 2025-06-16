import React from 'react';
import { Book } from 'lucide-react';
import logo from '@/assets/logo.png';
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
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <Avatar className='w-5 h-5 rounded-full'>
          <AvatarImage src={logo} alt="Studdy Buddy Logo" />
          <AvatarFallback className="bg-study-purple text-white flex items-center justify-center" >
            Logo
            <Book className="w-6 h-6" />
          </AvatarFallback>
        </Avatar>
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
