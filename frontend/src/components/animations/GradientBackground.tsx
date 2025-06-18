
import React from 'react';

interface GradientBackgroundProps {
  className?: string;
  children?: React.ReactNode;
}

export function GradientBackground({ className = "", children }: GradientBackgroundProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Main background */}
      <div className="absolute inset-0 hero-gradient"></div>
      
      {/* Animated gradient orbs */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-study-purple/30 rounded-full filter blur-3xl animate-float opacity-60"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-study-blue/20 rounded-full filter blur-3xl animate-float opacity-40" style={{ animationDelay: "2s" }}></div>
      <div className="absolute top-1/3 right-1/4 w-60 h-60 bg-study-pink/20 rounded-full filter blur-3xl animate-float opacity-40" style={{ animationDelay: "1s" }}></div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY4Ni02LTYtNi02IDIuNjg2LTYgNiAyLjY4NiA2IDYgNnptMCA2MGM2LjYyNyAwIDEyLTUuMzczIDEyLTEycy01LjM3My0xMi0xMi0xMi0xMiA1LjM3My0xMiAxMiA1LjM3MyAxMiAxMiAxMnptMjQtNDJjMy4zMTQgMCA2LTIuNjg2IDYtNnMtMi42ODYtNi02LTYtNiAyLjY4Ni02IDYgMi42ODYgNiA2IDZ6IiBzdHJva2Utb3BhY2l0eT0iLjUiIHN0cm9rZT0iI2ZmZiIgZmlsbD0ibm9uZSIvPjwvZz48L3N2Zz4=')] bg-[length:40px] bg-repeat opacity-[0.1]"></div>
      
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
