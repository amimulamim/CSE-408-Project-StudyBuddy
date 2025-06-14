import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
import { AuthRedirectHandler } from '@/components/auth/AuthRedirectHandler';

const Index = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp' | 'onboarding'>('signIn');
  const [onboardingDone, setOnboardingDone] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Animation variants
  const fadeInUp = {
    hidden: { 
      opacity: 0, 
      y: 60
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
        duration: 0.5
      }
    }
  };

  const scaleIn = {
    hidden: { 
      opacity: 0, 
      scale: 0.8 
    },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  useEffect(() => {
    const setupAuthListener = async () => {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
          console.log('after current user');
          fetchUserProfileData('onboardingDone').then((onboardingDone) => {
            console.log('after fetch user profile data');
            if (onboardingDone) {
              console.log('onboarding done');
              setOnboardingDone(true);
            }else{
              console.log('onboarding not done');
              setAuthMode('onboarding');
              setAuthModalOpen(true);
            }
          });
        }
      });

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

  if (onboardingDone) {
    return <AuthRedirectHandler onRedirectComplete={()=>{}} />;
  }
  
  return (
    <div className="min-h-screen bg-study-darker">
      <div className="relative">
        <GradientBackground className="min-h-screen">
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <Navbar onSignIn={handleOpenSignIn} onSignUp={handleOpenSignUp} />
          </motion.div>
          <Hero onSignUp={handleOpenSignUp} />
        </GradientBackground>
      </div>
      
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeInUp}
      >
        <Features />
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeInUp}
      >
        <Testimonials />
      </motion.div>
      
      {/* CTA Section with Enhanced Animations */}
      <motion.section 
        className="py-16 relative overflow-hidden"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
      >
        {/* Animated Background Blur */}
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl max-h-60"
          variants={scaleIn}
        >
          <motion.div 
            className="w-full h-full bg-study-purple/30 rounded-full filter blur-3xl opacity-20"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>
        
        <div className="container px-4 mx-auto relative z-5">
          <motion.div 
            className="bg-gradient-to-r from-study-darker to-secondary/80 rounded-2xl p-10 border border-white/10"
            variants={fadeInUp}
            whileHover={{ 
              scale: 1.02,
              transition: { duration: 0.3 }
            }}
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <motion.div
                variants={fadeInUp}
              >
                <motion.h2 
                  className="text-2xl md:text-3xl font-bold mb-2"
                  variants={fadeInUp}
                >
                  Ready to Study Smarter?
                </motion.h2>
                <motion.p 
                  className="text-muted-foreground"
                  variants={fadeInUp}
                >
                  Join thousands of students achieving better results.
                </motion.p>
              </motion.div>
              
              <motion.div
                variants={fadeInUp}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  className="button-gradient px-8 py-6 text-lg transition-all duration-300 hover:text-white" 
                  onClick={handleOpenSignUp}
                >
                  Get Started Free
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.section>
      
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        variants={fadeInUp}
      >
        <Footer />
      </motion.div>
      
      {/* Animated Modal */}
      <motion.div
        initial={false}
        animate={authModalOpen ? "open" : "closed"}
      >
        <AuthModal 
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          mode={authMode}
          onChangeMode={setAuthMode}
        />
      </motion.div>
    </div>
  );
};

export default Index;
