import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle } from "lucide-react";
import { auth } from "@/lib/firebase";
import { PendingEmailVerification } from './PendingEmailVerification';
import { updateUserField } from '@/lib/userProfile';
import { useNavigate } from 'react-router-dom';
import { ApiResponse } from '@/lib/api';
import { signIn, updateUserProfile } from './api';
import { signOut, User } from "firebase/auth";
import { AuthRedirectHandler } from './AuthRedirectHandler';
import { toast } from 'sonner';
import { clearAuthCache } from '@/lib/authState';

interface OnboardingStep {
  title: string;
  description: string;
}

const steps: OnboardingStep[] = [
  {
    title: "Select your role",
    description: "Let us know how you'll be using StuddyBuddy"
  },
  {
    title: "Choose your domain",
    description: "What subject area are you focusing on?"
  },
  {
    title: "Pick your interests",
    description: "Select topics that excite you within your domain"
  }
];

const domainOptions = [
  "Physics", "Chemistry", "Biology", "Computer Science", 
  "Mathematics", "Literature", "History", "Business", 
  "Economics", "Accounting", "Psychology", "Engineering",
  "Medicine", "Law", "Philosophy", "Arts"
];

// Common interests for different domains
const interestOptions = {
  "Physics": ["Mechanics", "Quantum Physics", "Thermodynamics", "Electromagnetism", "Astrophysics", "Nuclear Physics"],
  "Chemistry": ["Organic Chemistry", "Inorganic Chemistry", "Physical Chemistry", "Analytical Chemistry", "Biochemistry"],
  "Computer Science": ["Programming", "Algorithms", "Data Structures", "Machine Learning", "Web Development", "Cybersecurity"],
  "Mathematics": ["Algebra", "Calculus", "Statistics", "Geometry", "Number Theory", "Discrete Mathematics"],
  // Default interests for other domains
  "default": ["Theory", "Applications", "Research", "Problem Solving", "Current Trends", "Historical Context"]
};

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [role, setRole] = useState<"student" | "content_moderator" | null>(null);
  const [domain, setDomain] = useState("");
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [customDomain, setCustomDomain] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [goToRedirectHandler, setGoToRedirectHandler] = useState(false);
  const [validationModalOpen, setValidationModalOpen] = useState(true);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          clearInterval(interval);
          setUser(auth.currentUser);
          signIn()
          .then((response:ApiResponse) => {
            if (response.status === 'success') {
              onValidationModalClose();
            } else {
              toast.error('Sign up error');
              onClose();
            }
          });
        }
        else if(!validationModalOpen) {
          setValidationModalOpen(true);
        }
      }
    }, 1000); // poll every 1 seconds
  
    return () => clearInterval(interval);
  }, [validationModalOpen]);
  
  const onValidationModalClose = () => {
    setValidationModalOpen(false);
    if(!auth?.currentUser?.emailVerified){
      signOut(auth).then(() => {
        onClose();
        clearAuthCache();
      })
      .catch((error) => {
        toast.error(`New user sign out error: ${error.message}`);
      });
    }
  };

  
  const effectiveDomain = domainOptions.includes(domain) ? domain : customDomain;
  
  const getInterestsForDomain = () => {
    return interestOptions[domain as keyof typeof interestOptions] || interestOptions.default;
  };

  const handleInterestToggle = (interest: string) => {
    setInterests(prev => 
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const completeOnboarding = () => {
    setIsComplete(true);
    
    // Save user preferences
    // making the interests field a string where the array items are separated by comma
    const userPreferences = {
      interests: interests.join(", "),
      study_domain: effectiveDomain,
      name: user?.displayName || "default name from onboarding",
      avatar: user?.photoURL || "https://www.gravatar.com/avatar/"
    };

    updateUserField("onboardingDone", true);
    
    updateUserProfile(userPreferences).then((response: ApiResponse) => {
      if (response.status === 'success') {
        toast.success("Onboarding completed successfully!");
        setGoToRedirectHandler(true);
      } else {
        toast.error("Failed to save preferences. Please try again.");
        setIsComplete(false);
        setCurrentStep(0);
      }
    }
    ).catch((error) => {
      toast.error(`Error saving preferences: ${error.message}`);
      setIsComplete(false);
      setCurrentStep(0);
    });
    
  };

  const isNextDisabled = () => {
    if (currentStep === 0) return !role;
    if (currentStep === 1) return !effectiveDomain;
    if (currentStep === 2) return interests.length === 0;
    return false;
  };

  if( goToRedirectHandler ) {
    return (
      <AuthRedirectHandler onRedirectComplete={onClose}/>
    );
  }

  return (
    <>
      <Dialog open={validationModalOpen && isOpen} onOpenChange={onValidationModalClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[95vh] overflow-y-auto bg-card border-white/10 p-6">
          <PendingEmailVerification />
        </DialogContent>
      </Dialog>
      <Dialog open={isOpen && !validationModalOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[95vh] overflow-y-auto bg-card border-white/10 p-6">
          {isComplete ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="rounded-full bg-study-purple/20 p-4">
                <CheckCircle className="h-12 w-12 text-study-purple animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-center">All set!</h2>
              <p className="text-center text-muted-foreground">
                Your StuddyBuddy profile has been personalized based on your preferences.
              </p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">
                    Step {currentStep + 1} of {steps.length}
                  </span>
                  <div className="flex space-x-1">
                    {steps.map((_, index) => (
                      <div
                        key={index}
                        className={`h-1 w-16 rounded-full ${
                          index <= currentStep
                            ? "bg-study-purple"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <DialogTitle className="text-2xl font-bold">{steps[currentStep].title}</DialogTitle>
                <p className="text-muted-foreground mt-2">
                  {steps[currentStep].description}
                </p>
              </DialogHeader>

              <div className="py-8">
                {currentStep === 0 && (
                  <div className="space-y-6">
                    <RadioGroup value={role || ""} onValueChange={(value) => setRole(value as "student" | "content_moderator")}>
                      <div className="flex flex-col space-y-4">
                        <div className="flex items-center space-x-4 rounded-lg border border-white/10 p-4 transition-all hover:border-study-purple/30 hover:bg-white/5 cursor-pointer">
                          <RadioGroupItem value="student" id="student" />
                          <Label htmlFor="student" className="flex-1 cursor-pointer">
                            <div className="font-medium">Student</div>
                            <div className="text-sm text-muted-foreground">I want to learn and study with assistance</div>
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-4 rounded-lg border border-white/10 p-4 transition-all hover:border-study-purple/30 hover:bg-white/5 cursor-pointer">
                          <RadioGroupItem value="content_moderator" id="content_moderator" />
                          <Label htmlFor="content_moderator" className="flex-1 cursor-pointer">
                            <div className="font-medium">Content Moderator</div>
                            <div className="text-sm text-muted-foreground">I want to create and manage learning content</div>
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                      {domainOptions.map(option => (
                        <Button
                          key={option}
                          type="button"
                          variant="outline"
                          className={`justify-start text-left h-auto py-3 px-4 border border-white/10 transition-all ${
                            domain === option ? "border-study-purple bg-study-purple/10" : "hover:bg-white/5"
                          }`}
                          onClick={() => {
                            setDomain(option);
                            setCustomDomain("");
                          }}
                        >
                          {option}
                        </Button>
                      ))}
                      
                      <div className="col-span-2 mt-2">
                        <Label htmlFor="custom-domain">Other (please specify)</Label>
                        <Input
                          id="custom-domain"
                          className="mt-1 bg-muted/50"
                          value={customDomain}
                          onChange={(e) => {
                            setCustomDomain(e.target.value);
                            if (e.target.value) {
                              setDomain("");
                            }
                          }}
                          placeholder="Enter your domain"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      {getInterestsForDomain().map(interest => (
                        <div key={interest} className="flex items-start space-x-3">
                          <Checkbox
                            id={`interest-${interest}`}
                            checked={interests.includes(interest)}
                            onCheckedChange={() => handleInterestToggle(interest)}
                            className="mt-1"
                          />
                          <Label
                            htmlFor={`interest-${interest}`}
                            className="cursor-pointer"
                          >
                            {interest}
                          </Label>
                        </div>
                      ))}
                    </div>
                    
                    <div className="pt-2">
                      <Label htmlFor="custom-interest">Add custom interest</Label>
                      <div className="flex space-x-2 mt-1">
                        <Input
                          id="custom-interest"
                          className="flex-1 bg-muted/50"
                          placeholder="Enter custom interest"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                              e.preventDefault();
                              handleInterestToggle(e.currentTarget.value.trim());
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                        <Button 
                          variant="outline" 
                          onClick={(e) => {
                            const input = document.getElementById('custom-interest') as HTMLInputElement;
                            if (input.value.trim()) {
                              handleInterestToggle(input.value.trim());
                              input.value = '';
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                    
                    {interests.length > 0 && (
                      <div className="mt-4">
                        <Label>Selected interests:</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {interests.map(interest => (
                            <div
                              key={interest}
                              className="bg-study-purple/20 text-study-purple rounded-full px-3 py-1 text-sm flex items-center"
                            >
                              {interest}
                              <button
                                onClick={() => handleInterestToggle(interest)}
                                className="ml-2 text-study-purple/70 hover:text-study-purple"
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  className="border-white/10"
                >
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={isNextDisabled()}
                  className="button-gradient"
                >
                  {currentStep === steps.length - 1 ? "Complete" : "Continue"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}