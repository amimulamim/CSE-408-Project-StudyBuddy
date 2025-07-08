import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, test, expect, describe, beforeEach, afterEach } from 'vitest';
import { Navbar } from '@/components/landing/Navbar';

// Mock the UI components
vi.mock('@/components/ui/logo', () => ({
  Logo: ({ className }: { className?: string }) => (
    <div data-testid="logo" className={className}>StuddyBuddy Logo</div>
  )
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, className }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    className?: string;
  }) => (
    <button
      data-testid={`button-${children?.toString().toLowerCase().replace(/\s+/g, '-')}`}
      onClick={onClick}
      className={className}
      data-variant={variant}
    >
      {children}
    </button>
  )
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  X: () => <div data-testid="x-icon">X</div>,
  Menu: () => <div data-testid="menu-icon">Menu</div>
}));

describe('Navbar', () => {
  const mockOnSignIn = vi.fn();
  const mockOnSignUp = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.scrollY
    Object.defineProperty(window, 'scrollY', {
      value: 0,
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('renders navbar with logo and navigation links', () => {
    render(<Navbar onSignIn={mockOnSignIn} onSignUp={mockOnSignUp} />);
    
    expect(screen.getByTestId('logo')).toBeInTheDocument();
    expect(screen.getByText('Features')).toBeInTheDocument();
    expect(screen.getByText('How It Works')).toBeInTheDocument();
    expect(screen.getByText('Testimonials')).toBeInTheDocument();
  });

  test('renders sign in and sign up buttons', () => {
    render(<Navbar onSignIn={mockOnSignIn} onSignUp={mockOnSignUp} />);
    
    expect(screen.getByTestId('button-sign-in')).toBeInTheDocument();
    expect(screen.getByTestId('button-get-started')).toBeInTheDocument();
  });

  test('calls onSignIn when sign in button is clicked', () => {
    render(<Navbar onSignIn={mockOnSignIn} onSignUp={mockOnSignUp} />);
    
    fireEvent.click(screen.getByTestId('button-sign-in'));
    expect(mockOnSignIn).toHaveBeenCalledTimes(1);
  });

  test('calls onSignUp when get started button is clicked', () => {
    render(<Navbar onSignIn={mockOnSignIn} onSignUp={mockOnSignUp} />);
    
    fireEvent.click(screen.getByTestId('button-get-started'));
    expect(mockOnSignUp).toHaveBeenCalledTimes(1);
  });

  test('changes appearance when scrolled', async () => {
    render(<Navbar onSignIn={mockOnSignIn} onSignUp={mockOnSignUp} />);
    
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('bg-transparent');
    
    // Simulate scroll
    Object.defineProperty(window, 'scrollY', { value: 20, writable: true });
    fireEvent.scroll(window);
    
    await waitFor(() => {
      expect(header).toHaveClass('bg-background/95');
      expect(header).toHaveClass('backdrop-blur-sm');
      expect(header).toHaveClass('shadow-md');
    });
  });

  test('navigation links have correct href attributes', () => {
    render(<Navbar onSignIn={mockOnSignIn} onSignUp={mockOnSignUp} />);
    
    const featuresLink = screen.getByRole('link', { name: 'Features' });
    const howItWorksLink = screen.getByRole('link', { name: 'How It Works' });
    const testimonialsLink = screen.getByRole('link', { name: 'Testimonials' });
    
    expect(featuresLink).toHaveAttribute('href', '#features');
    expect(howItWorksLink).toHaveAttribute('href', '#how-it-works');
    expect(testimonialsLink).toHaveAttribute('href', '#testimonials');
  });

  test('cleans up scroll event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<Navbar onSignIn={mockOnSignIn} onSignUp={mockOnSignUp} />);
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
  });

  test('handles scroll events correctly', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    render(<Navbar onSignIn={mockOnSignIn} onSignUp={mockOnSignUp} />);
    
    expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});
