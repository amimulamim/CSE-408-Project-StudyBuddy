
import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { Testimonials } from '@/components/landing/Testimonials';
import { Footer } from '@/components/landing/Footer';
import { AuthModal } from '@/components/auth/AuthModal';
import { GradientBackground } from '@/components/animations/GradientBackground';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { fetchUserProfileData } from "@/lib/userProfile";

const Index = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp' | 'onboarding'>('signIn');
  const { toast } = useToast();
  const navigate = useNavigate();
  useEffect(() => {
    const setupAuthListener = async () => {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
          fetchUserProfileData('onboardingDone').then((onboardingDone) => {
            if (onboardingDone) {
              navigate('/dashboard');
            } else {
              setAuthMode('onboarding');
              setAuthModalOpen(true);
            }
          });
        }
      });

      // Cleanup the listener when the component unmounts
      return () => unsubscribe();
    };

    setupAuthListener();
  }, [navigate]);
  
  const handleOpenSignIn = () => {
    setAuthMode('signIn');
    setAuthModalOpen(true);
  };
  
  const handleOpenSignUp = () => {
    setAuthMode('signUp');
    setAuthModalOpen(true);
  };
  
  return (
    <div className="min-h-screen bg-study-darker">
      <GradientBackground className="min-h-screen">
        <Navbar onSignIn={handleOpenSignIn} onSignUp={handleOpenSignUp} />
        <Hero onSignUp={handleOpenSignUp} />
      </GradientBackground>
      
      <Features />
      <Testimonials />
      
      {/* CTA Section */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl max-h-60">
          <div className="w-full h-full bg-study-purple/30 rounded-full filter blur-3xl opacity-20"></div>
        </div>
        
        <div className="container px-4 mx-auto relative z-10">
          <div className="bg-gradient-to-r from-study-darker to-secondary/80 rounded-2xl p-10 border border-white/10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">Ready to Study Smarter?</h2>
                <p className="text-muted-foreground">Join thousands of students achieving better results.</p>
              </div>
              <Button 
                className="button-gradient px-8 py-6 text-lg transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-study-purple/50 hover:from-[#9b87f5] hover:to-[#7E69AB] hover:text-white" 
                onClick={handleOpenSignUp}
              >
                Get Started Free
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
      
      <AuthModal 
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onChangeMode={setAuthMode}
      />
    </div>
  );
};

export default Index;
