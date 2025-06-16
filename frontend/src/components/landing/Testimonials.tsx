import { User } from 'lucide-react';
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import testimonials from './testimonials.json'
import institutions from './institutions.json'
import Autoplay from "embla-carousel-autoplay";

export function Testimonials() {
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
          
          <div className="overflow-hidden relative py-4 before:absolute before:left-0 before:top-0 before:z-5 before:w-20 before:h-full before:bg-gradient-to-r before:from-background before:to-transparent after:absolute after:right-0 after:top-0 after:z-5 after:w-20 after:h-full after:bg-gradient-to-l after:from-background after:to-transparent">
            <div className="flex animate-marquee">
              {/* First set of institutions */}
              {institutions.map((institution, index) => (
                <div key={`set1-${index}`} className="flex flex-col items-center gap-2 p-2 group min-w-[200px] flex-shrink-0">
                  <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-transparent group-hover:border-study-purple transition-all duration-300">
                    <img 
                      src={institution.logo} 
                      alt={`${institution.name} logo`} 
                      className="object-contain object-center w-full h-full filter grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                    />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground group-hover:text-white transition-colors">{institution.name}</p>
                </div>
              ))}
              </div>
              <div className="absolute top-4 flex animate-marquee2">
              {/* Duplicate set for seamless loop */}
              {institutions.map((institution, index) => (
                <div key={`set2-${index}`} className="flex flex-col items-center gap-2 p-2 group min-w-[200px] flex-shrink-0">
                  <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-transparent group-hover:border-study-purple transition-all duration-300">
                    <img 
                      src={institution.logo} 
                      alt={`${institution.name} logo`} 
                      className="object-contain object-center w-full h-full filter grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                    />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground group-hover:text-white transition-colors">{institution.name}</p>
                </div>
              ))}
              </div>
          </div>
        </div>
      </div>
    </section>
  );
}
