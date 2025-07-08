import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GradientBackground } from '@/components/animations/GradientBackground';

describe('GradientBackground', () => {
  it('renders without crashing', () => {
    render(<GradientBackground />);
    
    // Check that the component renders with the correct structure
    const container = document.querySelector('.relative.overflow-hidden');
    expect(container).toBeInTheDocument();
  });

  it('applies custom className correctly', () => {
    const customClass = 'custom-test-class';
    render(<GradientBackground className={customClass} />);
    
    const container = document.querySelector(`.${customClass}`);
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('relative', 'overflow-hidden', customClass);
  });

  it('renders children correctly', () => {
    const testContent = 'Test content inside gradient background';
    render(
      <GradientBackground>
        <div data-testid="child-content">{testContent}</div>
      </GradientBackground>
    );
    
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText(testContent)).toBeInTheDocument();
  });

  it('renders all background elements', () => {
    render(<GradientBackground />);
    
    // Check main background
    const mainBackground = document.querySelector('.hero-gradient');
    expect(mainBackground).toBeInTheDocument();
    
    // Check animated gradient orbs
    const animatedOrbs = document.querySelectorAll('.animate-float');
    expect(animatedOrbs).toHaveLength(3);
    
    // Check grid pattern overlay
    const gridPattern = document.querySelector('[class*="bg-\\[url\\("]');
    expect(gridPattern).toBeInTheDocument();
  });

  it('renders gradient orbs with correct positioning and colors', () => {
    render(<GradientBackground />);
    
    const orbs = document.querySelectorAll('.animate-float');
    
    // First orb (top-left, purple)
    expect(orbs[0]).toHaveClass('top-10', 'left-10', 'bg-study-purple/30');
    
    // Second orb (bottom-right, blue)
    expect(orbs[1]).toHaveClass('bottom-10', 'right-10', 'bg-study-blue/20');
    
    // Third orb (middle-right, pink)
    expect(orbs[2]).toHaveClass('top-1/3', 'right-1/4', 'bg-study-pink/20');
  });

  it('applies blur effects to animated orbs', () => {
    render(<GradientBackground />);
    
    const orbs = document.querySelectorAll('.animate-float');
    orbs.forEach(orb => {
      expect(orb).toHaveClass('filter', 'blur-3xl');
    });
  });

  it('applies correct opacity to animated orbs', () => {
    render(<GradientBackground />);
    
    const orbs = document.querySelectorAll('.animate-float');
    
    // Check opacity classes
    expect(orbs[0]).toHaveClass('opacity-60');
    expect(orbs[1]).toHaveClass('opacity-40');
    expect(orbs[2]).toHaveClass('opacity-40');
  });

  it('applies animation delays to orbs', () => {
    render(<GradientBackground />);
    
    const orbs = document.querySelectorAll('.animate-float');
    
    // Second orb should have 2s delay
    expect(orbs[1].getAttribute('style')).toContain('animation-delay: 2s');
    
    // Third orb should have 1s delay
    expect(orbs[2].getAttribute('style')).toContain('animation-delay: 1s');
  });

  it('has correct z-index layering', () => {
    render(
      <GradientBackground>
        <div data-testid="content">Content</div>
      </GradientBackground>
    );
    
    // Content should have relative z-10 positioning
    const contentWrapper = screen.getByTestId('content').parentElement;
    expect(contentWrapper).toHaveClass('relative', 'z-10');
  });

  it('renders grid pattern with correct opacity', () => {
    render(<GradientBackground />);
    
    const gridPattern = document.querySelector('[class*="opacity-\\[0\\.1\\]"]');
    expect(gridPattern).toBeInTheDocument();
    expect(gridPattern).toHaveClass('opacity-[0.1]');
  });

  it('renders without children', () => {
    render(<GradientBackground />);
    
    // Should render without errors even without children
    const container = document.querySelector('.relative.overflow-hidden');
    expect(container).toBeInTheDocument();
  });

  it('applies background size and repeat to grid pattern', () => {
    render(<GradientBackground />);
    
    const gridPattern = document.querySelector('[class*="bg-\\[length:40px\\]"]');
    expect(gridPattern).toBeInTheDocument();
    expect(gridPattern).toHaveClass('bg-[length:40px]', 'bg-repeat');
  });

  it('maintains proper DOM structure', () => {
    render(
      <GradientBackground>
        <span>Test</span>
      </GradientBackground>
    );
    
    const container = document.querySelector('.relative.overflow-hidden');
    
    // Should have main background as first child
    const mainBg = container?.firstElementChild;
    expect(mainBg).toHaveClass('absolute', 'inset-0', 'hero-gradient');
    
    // Should have content wrapper as last child
    const contentWrapper = container?.lastElementChild;
    expect(contentWrapper).toHaveClass('relative', 'z-10');
  });

  it('handles empty className prop', () => {
    render(<GradientBackground className="" />);
    
    const container = document.querySelector('.relative.overflow-hidden');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('relative', 'overflow-hidden');
  });

  it('combines default and custom classes correctly', () => {
    const customClasses = 'min-h-screen bg-white';
    render(<GradientBackground className={customClasses} />);
    
    const container = document.querySelector('.relative.overflow-hidden.min-h-screen.bg-white');
    expect(container).toBeInTheDocument();
  });
});
