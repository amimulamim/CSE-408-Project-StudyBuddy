
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'signIn' | 'signUp';
  onChangeMode: (mode: 'signIn' | 'signUp') => void;
}

export function AuthModal({ isOpen, onClose, mode, onChangeMode }: AuthModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-card border-white/10">
        <DialogHeader>
          {/* We don't need title here as it's in the forms */}
        </DialogHeader>
        
        {mode === 'signIn' ? (
          <SignInForm 
            onSignUp={() => onChangeMode('signUp')} 
            onClose={onClose}
          />
        ) : (
          <SignUpForm 
            onSignIn={() => onChangeMode('signIn')} 
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
