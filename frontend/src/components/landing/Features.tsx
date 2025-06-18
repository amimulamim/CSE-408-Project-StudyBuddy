
import React from 'react';
import { MessageSquare, Search, Book, Plus } from 'lucide-react';
import workingMethod from '@/assets/how.png';

export function Features() {
  const features = [
    {
      icon: <MessageSquare className="h-8 w-8 text-study-purple" />,
      title: 'AI Chatbot',
      description: 'Get instant answers to your questions and solve doubts with our specialized AI assistant.'
    },
    {
      icon: <Book className="h-8 w-8 text-study-blue" />,
      title: 'Study Material Analysis',
      description: 'Upload study materials and our AI will explain complex concepts in simple terms.'
    },
    {
      icon: <Search className="h-8 w-8 text-study-pink" />,
      title: 'Custom Quiz Generator',
      description: 'Create personalized quizzes on any topic to test your knowledge and retention.'
    },
    {
      icon: <Plus className="h-8 w-8 text-study-purple" />,
      title: 'Study Material Generator',
      description: 'Generate comprehensive study guides, flashcards, and summaries on any subject.'
    }
  ];
  
  return (
    <section id="features" className="py-20 md:py-28 relative z-0">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            AI-Powered <span className="gradient-text">Study Tools</span>
          </h2>
          <p className="text-muted-foreground md:text-lg max-w-2xl mx-auto">
            StuddyBuddy combines cutting-edge AI technology with educational expertise to help you study more effectively.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-secondary/50 border border-white/10 rounded-xl p-6 transition-all duration-300
                       hover:transform hover:-translate-y-2 hover:shadow-lg hover:shadow-study-purple/20 hover:bg-secondary/70"
            >
              <div className="bg-study-darker/70 w-16 h-16 rounded-lg flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
        
        <div className="mt-20 bg-gradient-to-br from-secondary to-study-darker/70 rounded-xl p-8 border border-white/10">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold mb-4">How StuddyBuddy Works</h3>
              <div className="space-y-6">
                {[
                  {
                    number: '01',
                    title: 'Sign up for an account',
                    description: 'Create your StuddyBuddy account and get instant access to all features.'
                  },
                  {
                    number: '02',
                    title: 'Upload or select study materials',
                    description: 'Upload your own content or choose from our library of educational materials.'
                  },
                  {
                    number: '03',
                    title: 'Generate quizzes & get explanations',
                    description: 'Create custom quizzes or ask questions about the content to deepen your understanding.'
                  },
                  {
                    number: '04',
                    title: 'Track your progress',
                    description: 'Monitor your learning journey with detailed analytics and insights.'
                  },
                  {
                    number: '05',
                    title: 'Study smarter, not harder',
                    description: 'Use AI to optimize your study sessions and achieve better results.'
                  },
                  {
                    number: '06',
                    title: 'Join our community',
                    description: 'Connect with other learners, share resources, and get support from the StuddyBuddy community.'
                  }
                ].map((step, index) => (
                  <div key={index} className="flex">
                    <div className="mr-4 text-study-purple font-bold text-xl">{step.number}</div>
                    <div>
                      <h4 className="font-medium text-white">{step.title}</h4>
                      <p className="text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative z-0">
              <div className="absolute inset-0 bg-study-purple/20 rounded-full filter blur-3xl opacity-30"></div>
              <img 
                src={workingMethod} 
                alt="How it works" 
                className="relative rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
