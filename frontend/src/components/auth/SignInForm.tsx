import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth, googleProvider } from '@/lib/firebase'; 
import { signInWithPopup, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { signIn } from './api';
import { ApiResponse } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { errors } from './errors';
import { getFirebaseError, clearFieldError, validateEmail } from './validationHelper';
import { Loader2 } from "lucide-react"
import { useToast } from '@/hooks/use-toast';

interface SignInFormProps {
  onSignUp: () => void;
  onClose: () => void;
}

export function SignInForm({ onSignUp, onClose }: SignInFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<errors>({});
  const [resettingPass, setResettingPass] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    signInWithEmailAndPassword(auth, email, password)
      .then(signIn)
      .then((response:ApiResponse) => {
        if (response.status === 'success') {
          onClose();
          navigate('/dashboard');
        } else {
          setIsLoading(false);
          setErrors({ ...errors, general: response.msg });
        }
      })
      .catch(error => {
        setIsLoading(false);
        const firebaseError = getFirebaseError(error);
        setErrors({ ...errors, [firebaseError.field]: firebaseError.message });
      });
  };
  
  const handleGoogleSignIn = () => {
    signInWithPopup(auth, googleProvider)
      .then(signIn)
      .then((response:ApiResponse) => {
        if (response.status === 'success') {
          onClose();
          navigate('/dashboard');
        } else {
          setIsLoading(false);
          setErrors({ ...errors, general: response.msg });
        }
      })
      .catch(error => {
        setIsLoading(false);
        const firebaseError = getFirebaseError(error);
        setErrors({ ...errors, [firebaseError.field]: firebaseError.message });
      });
  };

  const handleForgetPassword = () => {
    if(!validateEmail(email)){
      setErrors({ ...errors, email: "Enter a valid email address to reset password" });
    }
    else{
      try {
        setResettingPass(true);
        sendPasswordResetEmail(auth, email).then(()=>{
          setResettingPass(false);
          toast({
            title: "Password recovery",
            description: "Password recovery email sent to your email address",
          });
        });
      } catch (err) {
        setResettingPass(false);
        const firebaseError = getFirebaseError(err);
        setErrors({ ...errors, [firebaseError.field]: firebaseError.message });
      }
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold">Welcome back</h3>
        <p className="text-muted-foreground mt-2">Sign in to your StuddyBuddy account</p>
      </div>

      {errors.general && (
        <Alert variant="destructive" className="bg-destructive/10 text-destructive border-destructive mb-4">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>
            {errors.general}
          </AlertDescription>
        </Alert>
      )}

      { resettingPass && (
        <div className="flex items-center bg-muted px-4 py-2 rounded-md text-muted-foreground text-sm mb-4">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Sending password recovery email...
        </div>
        )
      }
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="text"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              clearFieldError(setErrors, ['email', 'general']);
              setEmail(e.target.value)
            }}
            className={`bg-muted/50 ${errors.email ? "border-destructive" : ""}`}
          />
           {errors.email && (
            <p className="text-destructive text-xs mt-1">{errors.email}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <a onClick={handleForgetPassword} className="text-xs text-study-purple hover:underline">Forgot password?</a>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              clearFieldError(setErrors, ['password', 'general']);
              setPassword(e.target.value)
            }}
            className={`bg-muted/50 ${errors.password ? "border-destructive" : ""}`}
          />
          {errors.password && (
            <p className="text-destructive text-xs mt-1">{errors.password}</p>
          )}
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