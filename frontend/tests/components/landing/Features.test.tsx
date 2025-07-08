import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, test, expect, describe } from 'vitest';
import { Features } from '@/components/landing/Features';

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  MessageSquare: ({ className }: { className?: string }) => (
    <div data-testid="message-square-icon" className={className}>MessageSquare</div>
  ),
  Search: ({ className }: { className?: string }) => (
    <div data-testid="search-icon" className={className}>Search</div>
  ),
  Book: ({ className }: { className?: string }) => (
    <div data-testid="book-icon" className={className}>Book</div>
  ),
  Plus: ({ className }: { className?: string }) => (
    <div data-testid="plus-icon" className={className}>Plus</div>
  )
}));

// Mock the image import
vi.mock('@/assets/how.png', () => ({
  default: 'mock-how-image.png'
}));

describe('Features', () => {
  test('renders main heading and description', () => {
    render(<Features />);
    
    expect(screen.getByText('AI-Powered')).toBeInTheDocument();
    expect(screen.getByText('Study Tools')).toBeInTheDocument();
    expect(screen.getByText(/StuddyBuddy combines cutting-edge AI technology/)).toBeInTheDocument();
  });

  test('renders all feature cards', () => {
    render(<Features />);
    
    expect(screen.getByText('AI Chatbot')).toBeInTheDocument();
    expect(screen.getByText('Study Material Analysis')).toBeInTheDocument();
    expect(screen.getByText('Custom Quiz Generator')).toBeInTheDocument();
    expect(screen.getByText('Study Material Generator')).toBeInTheDocument();
  });

  test('renders feature descriptions', () => {
    render(<Features />);
    
    expect(screen.getByText(/Get instant answers to your questions/)).toBeInTheDocument();
    expect(screen.getByText(/Upload study materials and our AI will explain/)).toBeInTheDocument();
    expect(screen.getByText(/Create personalized quizzes on any topic/)).toBeInTheDocument();
    expect(screen.getByText(/Generate comprehensive study guides/)).toBeInTheDocument();
  });

  test('renders feature icons', () => {
    render(<Features />);
    
    expect(screen.getByTestId('message-square-icon')).toBeInTheDocument();
    expect(screen.getByTestId('book-icon')).toBeInTheDocument();
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
  });

  test('renders "How StuddyBuddy Works" section', () => {
    render(<Features />);
    
    expect(screen.getByText('How StuddyBuddy Works')).toBeInTheDocument();
  });

  test('renders all workflow steps', () => {
    render(<Features />);
    
    const steps = [
      'Sign up for an account',
      'Upload or select study materials',
      'Generate quizzes & get explanations',
      'Track your progress',
      'Study smarter, not harder',
      'Join our community'
    ];

    steps.forEach(step => {
      expect(screen.getByText(step)).toBeInTheDocument();
    });
  });

  test('renders step numbers', () => {
    render(<Features />);
    
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('02')).toBeInTheDocument();
    expect(screen.getByText('03')).toBeInTheDocument();
    expect(screen.getByText('04')).toBeInTheDocument();
    expect(screen.getByText('05')).toBeInTheDocument();
    expect(screen.getByText('06')).toBeInTheDocument();
  });

  test('renders step descriptions', () => {
    render(<Features />);
    
    expect(screen.getByText(/Create your StuddyBuddy account/)).toBeInTheDocument();
    expect(screen.getByText(/Upload your own content or choose from our library/)).toBeInTheDocument();
    expect(screen.getByText(/Create custom quizzes or ask questions/)).toBeInTheDocument();
    expect(screen.getByText(/Monitor your learning journey/)).toBeInTheDocument();
    expect(screen.getByText(/Use AI to optimize your study sessions/)).toBeInTheDocument();
    expect(screen.getByText(/Connect with other learners/)).toBeInTheDocument();
  });

  test('renders how it works image', () => {
    render(<Features />);
    
    const image = screen.getByAltText('How it works');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'mock-how-image.png');
  });

  test('has correct section id for navigation', () => {
    const { container } = render(<Features />);
    const section = container.querySelector('section#features');
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute('id', 'features');
  });

  test('feature cards have hover effects classes', () => {
    render(<Features />);
    
    const featureCards = screen.getAllByText(/Get instant answers|Upload study materials|Create personalized quizzes|Generate comprehensive study guides/);
    
    featureCards.forEach(card => {
      const cardElement = card.closest('div');
      expect(cardElement).toHaveClass('hover:transform');
      expect(cardElement).toHaveClass('hover:-translate-y-2');
    });
  });

  test('icons have correct styling classes', () => {
    render(<Features />);
    
    const messageSquareIcon = screen.getByTestId('message-square-icon');
    const bookIcon = screen.getByTestId('book-icon');
    const searchIcon = screen.getByTestId('search-icon');
    const plusIcon = screen.getByTestId('plus-icon');

    expect(messageSquareIcon).toHaveClass('h-8', 'w-8', 'text-study-purple');
    expect(bookIcon).toHaveClass('h-8', 'w-8', 'text-study-blue');
    expect(searchIcon).toHaveClass('h-8', 'w-8', 'text-study-pink');
    expect(plusIcon).toHaveClass('h-8', 'w-8', 'text-study-purple');
  });

  test('renders gradient background for how it works section', () => {
    render(<Features />);
    
    const gradientSection = screen.getByText('How StuddyBuddy Works').closest('.bg-gradient-to-br');
    expect(gradientSection).toHaveClass('bg-gradient-to-br');
    expect(gradientSection).toHaveClass('from-secondary');
    expect(gradientSection).toHaveClass('to-study-darker/70');
  });

  test('step numbers have correct styling', () => {
    render(<Features />);
    
    const stepNumbers = ['01', '02', '03', '04', '05', '06'];
    stepNumbers.forEach(num => {
      const stepElement = screen.getByText(num);
      expect(stepElement).toHaveClass('text-study-purple');
      expect(stepElement).toHaveClass('font-bold');
    });
  });
});
