import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, sendEmailVerification } from "firebase/auth";
import { signIn } from './api';
import { validateForm, getFirebaseError, clearFieldError } from './validationHelper';
import { auth, googleProvider } from '@/lib/firebase';
import { ApiResponse } from '@/lib/api';
import { errors } from "./errors";
import { useNavigate } from 'react-router-dom';
import { saveUserProfile } from '@/lib/userProfile';


interface SignUpFormProps {
  onSignIn: () => void;
  onClose: () => void;
}

export function SignUpForm({ onSignIn, onClose }: SignUpFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<errors>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const userData = { name, email, password, agreedToTerms };
    const validationErrors = validateForm({ userData });
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setIsLoading(false);
      return;
    }
    
    createUserWithEmailAndPassword(auth, email, password)
      .then(userCredential => {
        const user = userCredential.user;
        sendEmailVerification(user);
        saveUserProfile(user);
        return updateProfile(user, { displayName: name });
      })
      .then(signIn)
      .then((response:ApiResponse) => {
        if (response.status === 'success') {
          onClose();
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
  
  const handleGoogleSignUp = () => {
    setIsLoading(true);

    try{
      signInWithPopup(auth, googleProvider);
    }
    catch(error) {
      setIsLoading(false);
      const firebaseError = getFirebaseError(error);
      setErrors({ ...errors, [firebaseError.field]: firebaseError.message });
      return;
    }
    
    // signInWithPopup(auth, googleProvider)
    //   .then(signIn)
    //   .then((response:ApiResponse) => {
    //     if (response.status === 'success') {
    //       onClose();
    //     } else {
    //       setIsLoading(false);
    //       setErrors({ ...errors, general: response.msg });
    //     }
    //   })
    //   .catch(error => {
    //     setIsLoading(false);
    //     const firebaseError = getFirebaseError(error);
    //     setErrors({ ...errors, [firebaseError.field]: firebaseError.message });
    //   });
  };
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold">Create an account</h3>
        <p className="text-muted-foreground mt-2">Join StuddyBuddy to start learning smarter</p>
      </div>

      {errors.general && (
        <Alert variant="destructive" className="bg-destructive/10 text-destructive border-destructive mb-4">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>
            {errors.general}
          </AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => {
              clearFieldError(setErrors, ['name', 'general']);
              setName(e.target.value)
            }}
            className={`bg-muted/50 ${errors.name ? "border-destructive" : ""}`}
          />
          {errors.name && (
            <p className="text-destructive text-xs mt-1">{errors.name}</p>
          )}
        </div>
        
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
          <Label htmlFor="password">Password</Label>
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
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="terms" 
            checked={agreedToTerms}
            onCheckedChange={() => {
              clearFieldError(setErrors, ['terms', 'general']);
              setAgreedToTerms(prev => !prev);
            }}
          />
          <Label htmlFor="terms" className="text-sm font-normal">
            I agree to the <a href="#" className="text-study-purple hover:underline">Terms of Service</a> and <a href="#" className="text-study-purple hover:underline">Privacy Policy</a>
          </Label>
          {errors.terms && (
            <p className="text-destructive text-xs mt-0">{errors.terms}</p>
          )}
        </div>
        
        <Button 
          type="submit" 
          className="w-full button-gradient" 
          disabled={isLoading}
        >
          {isLoading ? 'Creating account...' : 'Create account'}
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
        onClick={handleGoogleSignUp}
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
        <span className="text-muted-foreground">Already have an account? </span>
        <button 
          onClick={onSignIn}
          className="text-study-purple hover:underline font-medium"
        >
          Sign in
        </button>
      </div>
    </div>
  );
}
