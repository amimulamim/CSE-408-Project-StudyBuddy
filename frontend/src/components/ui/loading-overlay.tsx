import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = "Loading..." }: LoadingOverlayProps) {
  return (
      <div className="absolute inset-0 z-50 flex items-center justify-center">
        {/* Blur backdrop */}
        <div className="absolute inset-0 bg-study-dark/50 backdrop-blur-sm" />
        
        {/* Loading content */}
        <div className="relative z-10 flex flex-col items-center justify-center p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl">
          {/* Lucide spinner */}
          <Loader2 className="w-12 h-12 text-study-purple animate-spin mb-4" />
          
          {/* Loading text */}
          <div className="text-center">
            <h3 className="text-xl font-semibold text-white mb-2">Loading</h3>
            <p className="text-sm text-white/70">{message}</p>
          </div>
        </div>
      </div>
  );
}