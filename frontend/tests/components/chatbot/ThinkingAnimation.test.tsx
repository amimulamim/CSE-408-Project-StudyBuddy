import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, beforeEach, test, expect, describe } from 'vitest'
import { ThinkingAnimation } from '@/components/chatbot/ThinkingAnimation'

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Bot: ({ className }: any) => <span className={className} data-testid="bot-icon">🤖</span>,
}))

describe('ThinkingAnimation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders thinking animation with correct structure', () => {
    const { container } = render(<ThinkingAnimation />)

    // Check bot icon is present
    expect(screen.getByTestId('bot-icon')).toBeInTheDocument()
    
    // Check "Thinking" text is present
    expect(screen.getByText('Thinking')).toBeInTheDocument()
    
    // Check overall structure - find the outermost flex container
    const outerContainer = container.querySelector('.flex.gap-4.justify-start')
    expect(outerContainer).toBeInTheDocument()
    expect(outerContainer).toHaveClass('flex', 'gap-4', 'justify-start')
  })

  test('renders bot avatar with correct styling', () => {
    render(<ThinkingAnimation />)

    const botAvatar = screen.getByTestId('bot-icon').closest('div')
    expect(botAvatar).toHaveClass(
      'flex-shrink-0',
      'w-8',
      'h-8', 
      'rounded-full',
      'bg-study-purple',
      'flex',
      'items-center',
      'justify-center'
    )
    
    const botIcon = screen.getByTestId('bot-icon')
    expect(botIcon).toHaveClass('h-4', 'w-4', 'text-white')
  })

  test('renders message container with correct styling', () => {
    render(<ThinkingAnimation />)

    const messageContainer = screen.getByText('Thinking').closest('.p-4')
    expect(messageContainer).toHaveClass(
      'p-4',
      'rounded-lg',
      'bg-white/5',
      'text-white'
    )
    
    const maxWidthContainer = messageContainer?.closest('.max-w-3xl')
    expect(maxWidthContainer).toHaveClass('max-w-3xl')
  })

  test('renders animated dots with correct styling', () => {
    const { container } = render(<ThinkingAnimation />)

    // Find all animated dots
    const dots = container.querySelectorAll('.w-2.h-2.bg-study-purple.rounded-full.animate-bounce')
    
    expect(dots).toHaveLength(3)
    
    // Check each dot has correct classes
    dots.forEach(dot => {
      expect(dot).toHaveClass(
        'w-2',
        'h-2',
        'bg-study-purple',
        'rounded-full',
        'animate-bounce'
      )
    })
  })

  test('animated dots have staggered animation delays', () => {
    const { container } = render(<ThinkingAnimation />)

    // Find dots by their specific structure
    const dotsContainer = container.querySelector('.flex.gap-1.ml-2')
    expect(dotsContainer).toBeInTheDocument()
    
    const dots = dotsContainer?.querySelectorAll('.animate-bounce')
    expect(dots).toHaveLength(3)
    
    // Check animation delays are set as inline styles
    expect(dots?.[0]).toHaveAttribute('style', expect.stringContaining('animation-delay: 0ms'))
    expect(dots?.[1]).toHaveAttribute('style', expect.stringContaining('animation-delay: 150ms'))
    expect(dots?.[2]).toHaveAttribute('style', expect.stringContaining('animation-delay: 300ms'))
  })

  test('has consistent layout with chat messages', () => {
    const { container } = render(<ThinkingAnimation />)

    // Check it follows the same structure as assistant messages
    const outerContainer = container.querySelector('.flex.gap-4.justify-start')
    expect(outerContainer).toBeInTheDocument()
    
    // Avatar comes first, then content
    const avatar = screen.getByTestId('bot-icon').closest('.flex-shrink-0')
    const content = screen.getByText('Thinking').closest('.max-w-3xl')
    
    expect(avatar).toBeInTheDocument()
    expect(content).toBeInTheDocument()
  })

  test('renders thinking text with dots container', () => {
    const { container } = render(<ThinkingAnimation />)

    // Check the inner flex container with "Thinking" and dots
    const thinkingContainer = container.querySelector('.flex.items-center.gap-1')
    expect(thinkingContainer).toBeInTheDocument()
    
    // Check "Thinking" text is inside this container
    expect(thinkingContainer).toHaveTextContent('Thinking')
    
    // Check dots container exists
    const dotsContainer = container.querySelector('.flex.gap-1.ml-2')
    expect(dotsContainer).toBeInTheDocument()
  })

  test('maintains accessibility', () => {
    render(<ThinkingAnimation />)

    // Text should be readable
    const thinkingText = screen.getByText('Thinking')
    expect(thinkingText).toBeVisible()
    
    // Bot icon should be accessible
    const botIcon = screen.getByTestId('bot-icon')
    expect(botIcon).toBeVisible()
  })

  test('renders without any props', () => {
    // Component should work without any configuration
    expect(() => render(<ThinkingAnimation />)).not.toThrow()
  })

  test('has correct DOM structure', () => {
    const { container } = render(<ThinkingAnimation />)

    // Verify the complete DOM structure
    const outerDiv = container.firstChild
    expect(outerDiv).toHaveClass('flex', 'gap-4', 'justify-start')
    
    // Should have two children: avatar and content
    expect(outerDiv?.childNodes).toHaveLength(2)
  })

  test('dots have proper spacing and layout', () => {
    const { container } = render(<ThinkingAnimation />)

    // Check dots container spacing
    const dotsContainer = container.querySelector('.flex.gap-1.ml-2')
    expect(dotsContainer).toHaveClass('flex', 'gap-1', 'ml-2')
    
    // Verify all dots are in this container
    const dotsInContainer = dotsContainer?.querySelectorAll('.w-2.h-2')
    expect(dotsInContainer).toHaveLength(3)
  })
})