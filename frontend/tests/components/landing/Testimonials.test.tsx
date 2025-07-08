import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, test, expect, describe } from 'vitest';
import { Testimonials } from '@/components/landing/Testimonials';

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  User: ({ className }: { className?: string }) => (
    <div data-testid="user-icon" className={className}>User</div>
  )
}));

// Mock the carousel component
vi.mock('@/components/ui/carousel', () => ({
  Carousel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="carousel">{children}</div>
  ),
  CarouselContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="carousel-content">{children}</div>
  ),
  CarouselItem: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="carousel-item">{children}</div>
  )
}));

// Mock embla-carousel-autoplay
vi.mock('embla-carousel-autoplay', () => ({
  default: vi.fn()
}));

// Mock testimonials data
vi.mock('@/components/landing/testimonials.json', () => ({
  default: [
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
      imageUrl: 'https://example.com/michael.jpg'
    }
  ]
}));

// Mock institutions data
vi.mock('@/components/landing/institutions.json', () => ({
  default: [
    {
      name: 'Harvard',
      logo: 'https://example.com/harvard-logo.svg'
    },
    {
      name: 'Stanford',
      logo: 'https://example.com/stanford-logo.png'
    },
    {
      name: 'MIT',
      logo: 'https://example.com/mit-logo.svg'
    }
  ]
}));

describe('Testimonials', () => {
  test('renders main heading and description', () => {
    render(<Testimonials />);
    
    expect(screen.getByText('Loved by')).toBeInTheDocument();
    expect(screen.getByText('Students Everywhere')).toBeInTheDocument();
    expect(screen.getByText(/Join thousands of students who are already studying smarter/)).toBeInTheDocument();
  });

  test('renders all testimonial cards', () => {
    render(<Testimonials />);
    
    expect(screen.getByText('Alex Johnson')).toBeInTheDocument();
    expect(screen.getByText('Sarah Williams')).toBeInTheDocument();
    expect(screen.getByText('Michael Chen')).toBeInTheDocument();
  });

  test('renders testimonial roles', () => {
    render(<Testimonials />);
    
    expect(screen.getByText('Medical Student')).toBeInTheDocument();
    expect(screen.getByText('Computer Science Major')).toBeInTheDocument();
    expect(screen.getByText('High School Student')).toBeInTheDocument();
  });

  test('renders testimonial content', () => {
    render(<Testimonials />);
    
    expect(screen.getByText(/StuddyBuddy helped me prepare for my exams/)).toBeInTheDocument();
    expect(screen.getByText(/The AI chatbot is like having a tutor/)).toBeInTheDocument();
    expect(screen.getByText(/I love how StuddyBuddy can take my class notes/)).toBeInTheDocument();
  });

  test('renders user icons for testimonials without images', () => {
    render(<Testimonials />);
    
    // Only Alex Johnson and Sarah Williams have imageUrl: null, Michael Chen has an image
    const userIcons = screen.getAllByTestId('user-icon');
    expect(userIcons).toHaveLength(2); // Only testimonials without images show user icons
  });

  test('renders image for testimonial with imageUrl', () => {
    render(<Testimonials />);
    
    const testimonialImage = screen.getByAltText('Michael Chen');
    expect(testimonialImage).toBeInTheDocument();
    expect(testimonialImage).toHaveAttribute('src', 'https://example.com/michael.jpg');
  });

  test('renders institutions section', () => {
    render(<Testimonials />);
    
    expect(screen.getByText('Trusted by students from top institutions')).toBeInTheDocument();
  });

  test('renders institution logos and names', () => {
    render(<Testimonials />);
    
    // Institution names appear twice due to marquee duplication
    const harvardTexts = screen.getAllByText('Harvard');
    const stanfordTexts = screen.getAllByText('Stanford');
    const mitTexts = screen.getAllByText('MIT');
    
    expect(harvardTexts).toHaveLength(2);
    expect(stanfordTexts).toHaveLength(2);
    expect(mitTexts).toHaveLength(2);
    
    // Check for logos (also duplicated)
    expect(screen.getAllByAltText('Harvard logo')).toHaveLength(2);
    expect(screen.getAllByAltText('Stanford logo')).toHaveLength(2);
    expect(screen.getAllByAltText('MIT logo')).toHaveLength(2);
  });

  test('institution images have correct src attributes', () => {
    render(<Testimonials />);
    
    const harvardLogos = screen.getAllByAltText('Harvard logo');
    const stanfordLogos = screen.getAllByAltText('Stanford logo');
    const mitLogos = screen.getAllByAltText('MIT logo');
    
    expect(harvardLogos[0]).toHaveAttribute('src', 'https://example.com/harvard-logo.svg');
    expect(stanfordLogos[0]).toHaveAttribute('src', 'https://example.com/stanford-logo.png');
    expect(mitLogos[0]).toHaveAttribute('src', 'https://example.com/mit-logo.svg');
  });

  test('has correct section id for navigation', () => {
    const { container } = render(<Testimonials />);
    const section = container.querySelector('section#testimonials');
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute('id', 'testimonials');
  });

  test('testimonial cards have correct styling classes', () => {
    render(<Testimonials />);
    
    const testimonialCards = screen.getAllByText(/StuddyBuddy helped|The AI chatbot|I love how StuddyBuddy/);
    
    testimonialCards.forEach(content => {
      const card = content.closest('.bg-gradient-to-br');
      expect(card).toHaveClass('bg-gradient-to-br');
      expect(card).toHaveClass('from-secondary/70');
      expect(card).toHaveClass('to-secondary/30');
    });
  });

  test('renders marquee animation for institutions', () => {
    render(<Testimonials />);
    
    const marqueeElements = screen.getAllByText('Harvard');
    // Should have duplicate sets for seamless loop
    expect(marqueeElements.length).toBeGreaterThan(1);
  });

  test('institution logos have correct styling classes', () => {
    render(<Testimonials />);
    
    const institutionLogos = [
      screen.getAllByAltText('Harvard logo')[0],
      screen.getAllByAltText('Stanford logo')[0],
      screen.getAllByAltText('MIT logo')[0]
    ];
    
    institutionLogos.forEach(logo => {
      expect(logo).toHaveClass('object-contain');
      expect(logo).toHaveClass('w-full');
      expect(logo).toHaveClass('h-full');
    });
  });

  test('testimonial content is properly quoted', () => {
    render(<Testimonials />);
    
    const quotedContent = screen.getByText(/"StuddyBuddy helped me prepare for my exams/);
    expect(quotedContent).toBeInTheDocument();
  });

  test('user icons have correct styling', () => {
    render(<Testimonials />);
    
    const userIcons = screen.getAllByTestId('user-icon');
    userIcons.forEach(icon => {
      expect(icon).toHaveClass('w-5', 'h-5', 'text-study-purple');
    });
  });
});
