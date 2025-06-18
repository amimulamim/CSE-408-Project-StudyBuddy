import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Timer } from 'lucide-react';

interface QuizTimerProps {
  duration: number; // in minutes
  onTimeUp: () => void;
}

export function QuizTimer({ duration, onTimeUp }: QuizTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration * 60); // Convert to seconds

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Play alert sound when time is up
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhCjaF0O/CbCEFKMbhv2k=');
          audio.play().catch(() => {
            // Fallback for browsers that don't allow auto-play
            console.log('Audio play failed - browser restrictions');
          });
          
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onTimeUp]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerStyles = () => {
    const totalSeconds = duration * 60;
    const percentage = (timeLeft / totalSeconds) * 100;
    
    if (percentage <= 10) {
      return {
        container: 'bg-red-600 border-red-700 text-white shadow-2xl animate-pulse scale-110',
        progress: 'bg-red-800',
        icon: 'animate-bounce'
      };
    }
    if (percentage <= 25) {
      return {
        container: 'bg-orange-500 border-orange-600 text-white shadow-xl scale-105',
        progress: 'bg-orange-700',
        icon: 'animate-pulse'
      };
    }
    return {
      container: 'bg-blue-600 border-blue-700 text-white shadow-lg',
      progress: 'bg-blue-800',
      icon: ''
    };
  };

  const isLowTime = (timeLeft / (duration * 60)) * 100 <= 25;
  const styles = getTimerStyles();

  return (
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className={`px-8 py-4 rounded-2xl border-2 transition-all duration-500 ${styles.container}`}>
        <div className="flex items-center gap-4">
          {isLowTime && <AlertTriangle className={`h-8 w-8 ${styles.icon}`} />}
          <Timer className={`h-8 w-8 ${styles.icon}`} />
          <div className="text-center">
            <div className="text-4xl font-black font-mono tracking-wider">
              {formatTime(timeLeft)}
            </div>
            <div className="text-sm font-semibold opacity-90 tracking-wide">
              TIME REMAINING
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-4 w-full bg-white/20 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-1000 ${styles.progress}`}
            style={{ 
              width: `${(timeLeft / (duration * 60)) * 100}%`
            }}
          />
        </div>
      </div>
    </div>
  );
}
