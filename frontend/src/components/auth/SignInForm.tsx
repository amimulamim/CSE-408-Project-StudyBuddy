import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SignInFormProps {
  onSignUp: () => void;
  onClose: () => void;
}

export function SignInForm({ onSignUp, onClose }: SignInFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Mock sign-in process
    setTimeout(() => {
      setIsLoading(false);
      onClose();
      console.log('Sign in with:', { email, password });
    }, 1000);
  };
  
  const handleGoogleSignIn = () => {
    setIsLoading(true);
    
    // Mock Google sign-in process
    setTimeout(() => {
      setIsLoading(false);
      onClose();
      console.log('Sign in with Google');
    }, 1000);
  };
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold">Welcome back</h3>
        <p className="text-muted-foreground mt-2">Sign in to your StuddyBuddy account</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-muted/50"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <a href="#" className="text-xs text-study-purple hover:underline">Forgot password?</a>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-muted/50"
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full button-gradient" 
          disabled={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-2 bg-card text-muted-foreground">or continue with</span>
        </div>
      </div>
      
      <Button 
        variant="outline"
        className="w-full border-white/20 hover:bg-white/5"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        <div className="flex items-center justify-center w-4 h-4 mr-2 text-red-500">
          <svg viewBox="0 0 24 24" className="w-full h-full">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        </div>
        Google
      </Button>
      
      <div className="text-center text-sm">
        <span className="text-muted-foreground">Don't have an account? </span>
        <button 
          onClick={onSignUp}
          className="text-study-purple hover:underline font-medium"
        >
          Sign up
        </button>
      </div>
    </div>
  );
}
