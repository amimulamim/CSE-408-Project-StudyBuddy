
import React, { useState, useEffect } from 'react';
import { Logo } from '../ui/logo';
import { Button } from '@/components/ui/button';
import { X, Menu } from 'lucide-react';

interface NavbarProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

export function Navbar({ onSignIn, onSignUp }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-background/95 backdrop-blur-sm shadow-md' : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Logo />
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <ul className="flex items-center gap-6">
              {navLinks.map((link) => (
                <li key={link.name}>
                  <a 
                    href={link.href} 
                    className="text-muted-foreground hover:text-white transition-colors py-2 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-study-purple after:scale-x-0 after:origin-bottom-right after:transition-transform hover:after:scale-x-100 hover:after:origin-bottom-left"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                onClick={onSignIn}
                className="transition-all duration-300 hover:text-white hover:bg-study-purple hover:scale-105"
              >
                Sign In
              </Button>
              <Button 
                className="button-gradient transition-all duration-300" 
                onClick={onSignUp}
              >
                Get Started
              </Button>
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
          <nav className="md:hidden mt-4 py-4 border-t border-border/40 animate-fade-in bg-background/95 backdrop-blur-sm shadow-md rounded-md">
            <ul className="flex flex-col gap-4 px-4">
              {navLinks.map((link) => (
                <li key={link.name}>
                  <a 
                    href={link.href}
                    className="block py-2 text-muted-foreground hover:text-white transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 mt-6 p-4">
              <Button 
                variant="ghost" 
                onClick={() => { onSignIn(); setIsMobileMenuOpen(false); }}
                className="transition-all duration-300 hover:text-white hover:bg-study-purple hover:scale-105"
              >
                Sign In
              </Button>
              <Button 
                className="button-gradient transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-study-purple/50 hover:from-[#9b87f5] hover:to-[#7E69AB]" 
                onClick={() => { onSignUp(); setIsMobileMenuOpen(false); }}
              >
                Get Started
              </Button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
