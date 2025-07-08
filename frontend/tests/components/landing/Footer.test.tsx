import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, test, expect, describe } from 'vitest';
import { Footer } from '@/components/landing/Footer';

// Mock the UI components
vi.mock('@/components/ui/logo', () => ({
  Logo: ({ className }: { className?: string }) => (
    <div data-testid="logo" className={className}>StuddyBuddy Logo</div>
  )
}));

describe('Footer', () => {
  test('renders footer with logo and description', () => {
    render(<Footer />);
    
    expect(screen.getByTestId('logo')).toBeInTheDocument();
    expect(screen.getByText(/StuddyBuddy is your AI-powered study assistant/)).toBeInTheDocument();
  });

  test('renders social media links', () => {
    render(<Footer />);
    
    expect(screen.getByText('Twitter')).toBeInTheDocument();
    expect(screen.getByText('Instagram')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
    expect(screen.getByText('Discord')).toBeInTheDocument();
  });

  test('renders product column with correct links', () => {
    render(<Footer />);
    
    expect(screen.getByText('Product')).toBeInTheDocument();
    expect(screen.getByText('Features')).toBeInTheDocument();
    expect(screen.getByText('How it Works')).toBeInTheDocument();
    expect(screen.getByText('Pricing')).toBeInTheDocument();
    expect(screen.getByText('FAQ')).toBeInTheDocument();
  });

  test('renders resources column with correct links', () => {
    render(<Footer />);
    
    expect(screen.getByText('Resources')).toBeInTheDocument();
    expect(screen.getByText('Blog')).toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
    expect(screen.getByText('Documentation')).toBeInTheDocument();
    expect(screen.getByText('API')).toBeInTheDocument();
  });

  test('renders company column with correct links', () => {
    render(<Footer />);
    const companyHeader = screen.getByText('Company');
    const companySection = companyHeader.closest('div');
    expect(companySection).toBeInTheDocument();
    const companyWithin = within(companySection!);
    expect(companyWithin.getByText('About Us')).toBeInTheDocument();
    expect(companyWithin.getByText('Careers')).toBeInTheDocument();
    expect(companyWithin.getByText('Privacy Policy')).toBeInTheDocument();
    expect(companyWithin.getByText('Terms of Service')).toBeInTheDocument();
  });

  test('renders copyright with current year', () => {
    render(<Footer />);
    
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(`© ${currentYear} StuddyBuddy. All rights reserved.`)).toBeInTheDocument();
  });

  test('renders bottom legal links', () => {
    render(<Footer />);
    
    const privacyLinks = screen.getAllByText('Privacy Policy');
    const termsLinks = screen.getAllByText('Terms of Service');
    const cookiePolicy = screen.getByText('Cookie Policy');
    
    // Should have Privacy Policy in both company section and bottom
    expect(privacyLinks).toHaveLength(2);
    // Should have Terms of Service in both company section and bottom
    expect(termsLinks).toHaveLength(2);
    expect(cookiePolicy).toBeInTheDocument();
  });

  test('all links have href attributes', () => {
    render(<Footer />);
    
    const links = screen.getAllByRole('link');
    links.forEach(link => {
      expect(link).toHaveAttribute('href');
    });
  });

  test('social media links have correct structure', () => {
    render(<Footer />);
    
    const socialLinks = ['Twitter', 'Instagram', 'LinkedIn', 'Discord'];
    socialLinks.forEach(social => {
      const link = screen.getByText(social);
      expect(link.closest('a')).toHaveAttribute('href', '#');
      expect(link.closest('a')).toHaveClass('text-muted-foreground');
    });
  });

  test('footer has correct styling classes', () => {
    render(<Footer />);
    
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveClass('bg-study-darker');
    expect(footer).toHaveClass('py-12');
    expect(footer).toHaveClass('border-t');
  });

  test('grid layout is properly structured', () => {
    render(<Footer />);
    
    // Check for grid container
    const gridContainer = screen.getByRole('contentinfo').querySelector('.grid');
    expect(gridContainer).toHaveClass('grid-cols-1');
    expect(gridContainer).toHaveClass('md:grid-cols-4');
  });
});
