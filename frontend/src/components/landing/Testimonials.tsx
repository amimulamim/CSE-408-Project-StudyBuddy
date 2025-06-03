
import React from 'react';
import { User } from 'lucide-react';
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

export function Testimonials() {
  const testimonials = [
    {
      name: 'Alex Johnson',
      role: 'Medical Student',
      content: 'StuddyBuddy helped me prepare for my exams more efficiently. The custom quizzes and explanations made complex medical concepts easier to understand.',
      imageUrl: null
    },
    {
      name: 'Sarah Williams',
      role: 'Computer Science Major',
      content: 'The AI chatbot is like having a tutor available 24/7. Whenever I get stuck on a programming concept, I get clear explanations immediately.',
      imageUrl: null
    },
    {
      name: 'Michael Chen',
      role: 'High School Student',
      content: 'I love how StuddyBuddy can take my class notes and generate practice questions from them. It is made studying for tests so much more effective.',
      imageUrl: null
    }
  ];

  const institutions = [
    {
      name: 'Harvard',
      logo: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=150&h=150&q=80'
    },
    {
      name: 'Stanford',
      logo: 'https://images.unsplash.com/photo-1486718448742-163732cd1544?auto=format&fit=crop&w=150&h=150&q=80'
    },
    {
      name: 'MIT',
      logo: 'https://images.unsplash.com/photo-1494891848038-7bd202a2afeb?auto=format&fit=crop&w=150&h=150&q=80'
    },
    {
      name: 'Berkeley',
      logo: 'https://images.unsplash.com/photo-1551038247-3d9af20df552?auto=format&fit=crop&w=150&h=150&q=80'
    },
    {
      name: 'Oxford',
      logo: 'https://images.unsplash.com/photo-1433832597046-4f10e10ac764?auto=format&fit=crop&w=150&h=150&q=80'
    },
    {
      name: 'Cambridge',
      logo: 'https://images.unsplash.com/photo-1513676324742-90a9b869dead?auto=format&fit=crop&w=150&h=150&q=80'
    },
    {
      name: 'Yale',
      logo: 'https://images.unsplash.com/photo-1546565476-e337c44e0a76?auto=format&fit=crop&w=150&h=150&q=80'
    },
    {
      name: 'Princeton',
      logo: 'https://images.unsplash.com/photo-1593698054469-2bb6fdf4b512?auto=format&fit=crop&w=150&h=150&q=80'
    },
    {
      name: 'Columbia',
      logo: 'https://images.unsplash.com/photo-1565362397651-25d31e688f85?auto=format&fit=crop&w=150&h=150&q=80'
    },
    {
      name: 'Caltech',
      logo: 'https://images.unsplash.com/photo-1494439377649-2b4e1355607a?auto=format&fit=crop&w=150&h=150&q=80'
    }
  ];
  
  return (
    <section id="testimonials" className="py-20 md:py-28">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Loved by <span className="gradient-text">Students Everywhere</span>
          </h2>
          <p className="text-muted-foreground md:text-lg max-w-2xl mx-auto">
            Join thousands of students who are already studying smarter with StuddyBuddy.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="bg-gradient-to-br from-secondary/70 to-secondary/30 backdrop-blur-sm rounded-xl p-6 border border-white/10
                       hover:border-study-purple/40 transition-all duration-300"
            >
              <div className="flex flex-col h-full">
                <div className="mb-6 text-lg text-muted-foreground">
                  "{testimonial.content}"
                </div>
                
                <div className="mt-auto flex items-center">
                  {testimonial.imageUrl ? (
                    <img 
                      src={testimonial.imageUrl} 
                      alt={testimonial.name} 
                      className="w-10 h-10 rounded-full mr-3"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full mr-3 bg-study-purple/30 flex items-center justify-center">
                      <User className="w-5 h-5 text-study-purple" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-16 text-center">
          <h3 className="text-xl font-semibold mb-6">Trusted by students from top institutions</h3>
          
          <div className="overflow-hidden relative py-4 before:absolute before:left-0 before:top-0 before:z-10 before:w-20 before:h-full before:bg-gradient-to-r before:from-background before:to-transparent after:absolute after:right-0 after:top-0 after:z-10 after:w-20 after:h-full after:bg-gradient-to-l after:from-background after:to-transparent">
            <Carousel 
              opts={{ 
                align: 'start',
                loop: true,
                dragFree: true
              }}
              className="w-full"
            >
              <CarouselContent className="animate-carousel">
                {institutions.map((institution, index) => (
                  <CarouselItem key={index} className="pl-4 md:basis-1/5 lg:basis-1/6 flex-shrink-0">
                    <div className="flex flex-col items-center gap-2 p-2 group">
                      <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-transparent group-hover:border-study-purple transition-all duration-300">
                        <img 
                          src={institution.logo} 
                          alt={`${institution.name} logo`} 
                          className="object-cover w-full h-full filter grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                        />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground group-hover:text-white transition-colors">{institution.name}</p>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        </div>
      </div>
    </section>
  );
}
