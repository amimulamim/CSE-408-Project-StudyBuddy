import React, { useState, useEffect } from 'react';
import { Logo } from '../ui/logo';
import { Button } from '@/components/ui/button';
import { X, Menu, LogOut, Crown } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationButton } from "@/components/notifications/NotificationButton";
import { 
  getStatusColor, 
  getStatusLabel,
} from "@/lib/billing";
import { getAuth, signOut } from "firebase/auth";
import { clearAuthCache } from "@/lib/authState";
import { SubscriptionStatus } from "@/lib/billingTypes";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  userProfile?: {
    name: string;
    avatar?: string;
  };
  subscription?: SubscriptionStatus | null;
  billingLoading?: boolean;
}

export function Header({userProfile, subscription, billingLoading}: HeaderProps) {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
  };

  const handleLogout = async () => {
    try {
        const auth = getAuth();
        await signOut(auth);
        clearAuthCache();
        navigate("/");
    } catch (error) {
        console.error("Error logging out:", error);
    }
  };

  const getPlanDisplayName = (planId: string) => {
    return planId?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Free';
  };
  
  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'Testimonials', href: '#testimonials' }
  ];
  
  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 h-20 border-b border-white/10 bg-white/10 backdrop-blur`}
    >
      <div className="container md:max-w-screen-xl mx-auto px-10 py-2">
        <div className="flex items-center justify-between w-full">
          {/* Logo */}
          <Logo />
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-3">
              <button 
                className="flex items-center gap-2 bg-white/70 backdrop-blur-sm rounded-full px-4 py-2 border border-white/50 shadow-sm hover:bg-white/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                onClick={() => navigate("/dashboard/billing")}
                aria-label="Go to billing page"
              >
                  {billingLoading ? (
                      <div className="flex items-center gap-2">
                          <div className="h-4 w-4 bg-gray-300 rounded-full animate-pulse"></div>
                          <div className="h-4 w-16 bg-gray-300 rounded animate-pulse"></div>
                      </div>
                  ) : (
                      <>
                          <Crown className={`h-4 w-4 ${
                              subscription?.plan_id && subscription.plan_id !== 'free' 
                                  ? 'text-yellow-500' 
                                  : 'text-gray-400'
                          }`} />
                          <span className="text-sm font-medium text-gray-900">
                              {subscription ? getPlanDisplayName(subscription.plan_id) : 'Free Plan'}
                          </span>
                          {subscription && (
                              <Badge 
                                  className={`${getStatusColor(subscription.status)} text-xs`}
                                  variant="secondary"
                              >
                                  {getStatusLabel(subscription.status)}
                              </Badge>
                          )}
                      </>
                  )}
              </button>
              <Button 
                variant="ghost" 
                onClick={handleLogout} 
                size='sm'
                className="relative bg-white/50 backdrop-blur-sm hover:bg-white/70 border border-white/50"
              >
                <LogOut className="h-4 w-4" />
              </Button>
              <NotificationButton />
              <Avatar 
                className="h-10 w-10 ring-2 ring-white shadow-md hover:cursor-pointer hover:ring-4 transition-all duration-300"
                onClick={() => navigate("/profile")}
              >
                <AvatarImage src={userProfile?.avatar} alt={userProfile?.name} />
                <AvatarFallback className="text-xl font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {getInitials(userProfile?.name || 'User')}
                </AvatarFallback>
              </Avatar>
            </div>
          </nav>
          
          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
        
        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 bg-white/40 backdrop-blur-sm p-4 rounded-lg shadow-lg space-y-4">
            {/* Mobile Billing Status */}
            <button 
              className="w-full flex items-center justify-center gap-2 bg-white/70 backdrop-blur-sm rounded-full px-4 py-2 border border-white/50 shadow-sm hover:bg-white/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              onClick={() => {
                navigate("/dashboard/billing");
                setIsMobileMenuOpen(false);
              }}
              aria-label="Go to billing page"
            >
              {billingLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-gray-300 rounded-full animate-pulse"></div>
                  <div className="h-4 w-16 bg-gray-300 rounded animate-pulse"></div>
                </div>
              ) : (
                <>
                  <Crown className={`h-4 w-4 ${
                    subscription?.plan_id && subscription.plan_id !== 'free' 
                      ? 'text-yellow-500' 
                      : 'text-gray-400'
                  }`} />
                  <span className="text-sm font-medium text-gray-900">
                    {subscription ? getPlanDisplayName(subscription.plan_id) : 'Free Plan'}
                  </span>
                  {subscription && (
                    <Badge 
                      className={`${getStatusColor(subscription.status)} text-xs`}
                      variant="secondary"
                    >
                      {getStatusLabel(subscription.status)}
                    </Badge>
                  )}
                </>
              )}
            </button>

            {/* Mobile Action Buttons */}
            <div className="flex flex-row items-center justify-around">
              <Button 
                variant="ghost" 
                onClick={handleLogout} 
                size='sm'
                className="relative bg-white/50 backdrop-blur-sm hover:bg-white/70 border border-white/50"
              >
                <LogOut className="h-4 w-4" />
              </Button>
              <NotificationButton />
              <Avatar 
                className="h-12 w-12 ring-2 ring-white shadow-md hover:cursor-pointer hover:ring-4 transition-all duration-300"
                onClick={() => navigate("/profile")}
              >
                <AvatarImage src={userProfile?.avatar} alt={userProfile?.name} />
                <AvatarFallback className="text-xl font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {getInitials(userProfile?.name || 'User')}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
