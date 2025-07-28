import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Timer } from 'lucide-react';

interface QuizTimerProps {
  duration: number; // in minutes
  onTimeUp: () => void;
}

export function QuizTimer({ duration, onTimeUp }: QuizTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration * 60); // Convert to seconds
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if ((prev <= 1) && (!submitted)) {
          // Play sound when time is up
          try {
            const audio = new Audio('/sounds/time-up.mp3');
            audio.play().catch(() => {
              // Fallback beep sound
              const context = new AudioContext();
              const oscillator = context.createOscillator();
              const gainNode = context.createGain();
              oscillator.connect(gainNode);
              gainNode.connect(context.destination);
              oscillator.frequency.value = 800;
              oscillator.type = 'sine';
              gainNode.gain.setValueAtTime(0.3, context.currentTime);
              oscillator.start();
              oscillator.stop(context.currentTime + 0.5);
            });
          } catch (error) {
            console.log('Audio playback failed');
          }
          
          onTimeUp();
          setSubmitted(true);
          return 0;
        }
        return (prev - 1) >= 0 ? (prev - 1) : 0;
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
        container: 'bg-red-900/90 border-red-500/50 shadow-red-900/50 animate-pulse backdrop-blur-md',
        progress: 'bg-red-500',
        text: 'text-red-100',
        icon: 'animate-bounce text-red-200',
        glow: 'shadow-2xl shadow-red-900/60',
        label: 'text-red-200'
      };
    }
    if (percentage <= 25) {
      return {
        container: 'bg-orange-900/90 border-orange-500/50 shadow-orange-900/40 backdrop-blur-md',
        progress: 'bg-orange-500',
        text: 'text-orange-100',
        icon: 'animate-pulse text-orange-200',
        glow: 'shadow-xl shadow-orange-900/50',
        label: 'text-orange-200'
      };
    }
    return {
      container: 'bg-slate-800/90 border-purple-500/30 shadow-purple-900/30 backdrop-blur-md',
      progress: 'bg-purple-500',
      text: 'text-slate-100',
      icon: 'text-purple-300',
      glow: 'shadow-lg shadow-purple-900/40',
      label: 'text-slate-300'
    };
  };

  const isLowTime = (timeLeft / (duration * 60)) * 100 <= 25;
  const styles = getTimerStyles();

  return (
    // <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
    //   <div className={`px-6 py-4 rounded-xl border transition-all duration-500 ${styles.container} ${styles.glow}`}>
    //     <div className="flex items-center gap-3">
    //       {isLowTime && <AlertTriangle className={`h-5 w-5 ${styles.icon}`} />}
    //       <Timer className={`h-5 w-5 ${styles.icon}`} />
    //       <div className="text-center">
    //         <div className={`text-2xl font-bold font-mono tracking-wide ${styles.text}`}>
    //           {formatTime(timeLeft)}
    //         </div>
    //         <div className={`text-xs font-medium tracking-wider uppercase ${styles.label}`}>
    //           Time Remaining
    //         </div>
    //       </div>
    //     </div>
        
    //     {/* Progress bar */}
    //     <div className="mt-3 w-full bg-slate-700/50 rounded-full h-1.5 z-50">
    //       <div 
    //         className={`h-1.5 rounded-full transition-all duration-1000 ${styles.progress}`}
    //         style={{ 
    //           width: `${(timeLeft / (duration * 60)) * 100}%`
    //         }}
    //       />
    //     </div>
    //   </div>
    // </div>
    <div className={`px-6 py-4 mt-4 md:mt-0 md:mr-20 rounded-xl border transition-all duration-500 ${styles.container} ${styles.glow}`}>
        <div className="flex items-center gap-3">
          {isLowTime && <AlertTriangle className={`h-5 w-5 ${styles.icon}`} />}
          <Timer className={`h-5 w-5 ${styles.icon}`} />
          <div className="text-center">
            <div className={`text-2xl font-bold font-mono tracking-wide ${styles.text}`}>
              {formatTime(timeLeft)}
            </div>
            <div className={`text-xs font-medium tracking-wider uppercase ${styles.label}`}>
              Time Remaining
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-3 w-full bg-slate-700/50 rounded-full h-1.5 z-50">
          <div 
            className={`h-1.5 rounded-full transition-all duration-1000 ${styles.progress}`}
            style={{ 
              width: `${(timeLeft / (duration * 60)) * 100}%`
            }}
          />
        </div>
      </div>
  );
}
