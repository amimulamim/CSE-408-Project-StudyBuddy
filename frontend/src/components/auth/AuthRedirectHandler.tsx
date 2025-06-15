import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import logo from '@/assets/1024.png';
import DID_YOU_KNOW_MESSAGES from './messages.json';

interface AuthRedirectHandlerProps {
  onRedirectComplete?: () => void;
}

export const AuthRedirectHandler = ({ onRedirectComplete }: AuthRedirectHandlerProps) => {
  const navigate = useNavigate();
  const auth = getAuth();
  const { userProfile, loading, error } = useUserRole();
  const [currentMessage, setCurrentMessage] = useState('');

  // Set random message on component mount
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * DID_YOU_KNOW_MESSAGES.length);
    setCurrentMessage(DID_YOU_KNOW_MESSAGES[randomIndex]);
  }, []);

  useEffect(() => {
    if (loading) return;

    if (error) {
      toast.error('Failed to load user profile');
      navigate('/');
      return;
    }

    if (!auth.currentUser) {
      navigate('/');
      return;
    }

    if (userProfile) {
      if (userProfile.is_admin) {
        toast.success(`Welcome back, Admin ${userProfile.name}!`);
        navigate('/admin/dashboard');
      } else {
        toast.success(`Welcome back, ${userProfile.name}!`);
        navigate('/dashboard');
      }
      
      if (onRedirectComplete) {
        onRedirectComplete();
      }
    }
  }, [userProfile, loading, error, navigate, auth.currentUser, onRedirectComplete]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen dashboard-bg-animated">
        <div className="text-center max-w-lg mx-auto px-4">
          {/* Animated Logo */}
          <div className="relative mb-8">
            <div className="w-24 h-24 mx-auto mb-6 relative">
              <img 
                src={logo} 
                alt="StudyBuddy Logo" 
                className="w-full h-full object-contain animate-pulse"
              />
              {/* Spinning ring around logo */}
              <div className="absolute inset-0 border-2 border-transparent border-t-study-purple rounded-full animate-spin"></div>
              {/* Secondary spinning ring */}
              <div className="absolute inset-1 border-2 border-transparent border-b-study-purple/50 rounded-full animate-spin animation-reverse"></div>
            </div>
          </div>

          {/* Loading dots */}
          <div className="flex space-x-1 justify-center mb-6">
            <div className="w-2 h-2 bg-study-purple rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-study-purple/70 rounded-full animate-bounce animation-delay-100"></div>
            <div className="w-2 h-2 bg-study-purple/50 rounded-full animate-bounce animation-delay-200"></div>
          </div>

          {/* Random "Did you know" message */}
          <p className="text-lg text-muted-foreground leading-relaxed font-medium">
            {currentMessage}
          </p>
        </div>
      </div>
    );
  }

  return null;
};