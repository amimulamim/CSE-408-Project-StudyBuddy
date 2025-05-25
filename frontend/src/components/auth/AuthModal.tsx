import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import { OnboardingModal } from './OnboardingModal';
import { useNavigate } from 'react-router-dom';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'signIn' | 'signUp' | 'onboarding';
  onChangeMode: (mode: 'signIn' | 'signUp' | 'onboarding') => void;
}

export function AuthModal({ isOpen, onClose, mode, onChangeMode }: AuthModalProps) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (mode === 'onboarding') {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
    console.log('in useEffect of auth modal', mode, showOnboarding);
  }, [mode]);
  
  const handleSignUpSuccess = () => {
    setShowOnboarding(true);
  };
  
  const handleAuthClose = () => {
    console.log('Auth modal closing function');
    if (!showOnboarding) {
      console.log('showOnboarding is false. Closing auth modal');
      onClose();
    }
  };
  
  const handleOnboardingClose = () => {
    setShowOnboarding(false);
    onClose();
  };
  
  return (
    <>
      <Dialog open={isOpen && !showOnboarding} onOpenChange={handleAuthClose}>
        <DialogContent className="sm:max-w-[425px] max-h-[95vh] overflow-y-auto bg-card border-white/10 scrollbar-hide">
          <DialogHeader>
            <DialogTitle className="sr-only">
              {mode === 'signIn' ? 'Sign In' : 'Sign Up'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {mode === 'signIn' 
                ? 'Sign in to your StuddyBuddy account' 
                : 'Create a new StuddyBuddy account'}
            </DialogDescription>
          </DialogHeader>
          
          {mode === 'signIn' ? (
            <SignInForm 
              onSignUp={() => onChangeMode('signUp')} 
              onClose={onClose}
            />
          ) : (
            <SignUpForm 
              onSignIn={() => onChangeMode('signIn')} 
              onClose={handleSignUpSuccess}
            />
          )
          }
        </DialogContent>
      </Dialog>
      
      <OnboardingModal 
        isOpen={showOnboarding} 
        onClose={handleOnboardingClose}
      />
    </>
  );
}