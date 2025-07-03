import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, beforeEach, test, expect, describe } from 'vitest'
import { ChatbotFAB } from '@/components/chatbot/ChatbotFAB'

// Hoisted mock functions
const mockNavigate = vi.hoisted(() => vi.fn())

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

// Mock framer-motion - create unique test IDs for different motion elements
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, animate, transition, ...props }: any) => {
      // Check if this is the outer wrapper or inner icon wrapper
      const isOuterWrapper = className?.includes('fixed')
      return (
        <div 
          className={className} 
          data-testid={isOuterWrapper ? "motion-wrapper" : "motion-icon"} 
          {...props}
        >
          {children}
        </div>
      )
    },
  },
}))

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, style, size, ...props }: any) => (
    <button 
      onClick={onClick} 
      className={className}
      style={style}
      data-size={size}
      data-testid="fab-button"
      {...props}
    >
      {children}
    </button>
  ),
}))

// Mock icons
vi.mock('lucide-react', () => ({
  MessageCircle: ({ className }: any) => (
    <span className={className} data-testid="message-circle-icon">💬</span>
  ),
}))

describe('ChatbotFAB', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders chatbot FAB button', () => {
    render(<ChatbotFAB />)

    expect(screen.getByTestId('fab-button')).toBeInTheDocument()
    expect(screen.getByTestId('message-circle-icon')).toBeInTheDocument()
    expect(screen.getByLabelText('Open chatbot')).toBeInTheDocument()
  })

  test('has correct styling and classes', () => {
    render(<ChatbotFAB />)

    const button = screen.getByTestId('fab-button')
    
    // Test classes
    expect(button).toHaveClass('h-14', 'w-14', 'rounded-full')
    
    // Test inline styles - check if they exist as a string in the style attribute
    expect(button).toHaveAttribute('style')
    const styleAttr = button.getAttribute('style')
    expect(styleAttr).toContain('linear-gradient(135deg, #667eea 0%, #764ba2 100%)')
    expect(styleAttr).toContain('rgba(102, 126, 234, 0.3)')
  })

  test('navigates to chatbot page when clicked', () => {
    render(<ChatbotFAB />)

    const button = screen.getByTestId('fab-button')
    fireEvent.click(button)

    expect(mockNavigate).toHaveBeenCalledWith('/chatbot')
  })

  test('has correct accessibility attributes', () => {
    render(<ChatbotFAB />)

    const button = screen.getByTestId('fab-button')
    
    expect(button).toHaveAttribute('aria-label', 'Open chatbot')
    expect(button).toHaveAttribute('data-size', 'icon')
  })

  test('renders with motion wrapper', () => {
    render(<ChatbotFAB />)

    const motionWrapper = screen.getByTestId('motion-wrapper')
    expect(motionWrapper).toBeInTheDocument()
    expect(motionWrapper).toHaveClass('fixed', 'bottom-8', 'right-8', 'z-50')
  })

  test('contains message circle icon', () => {
    render(<ChatbotFAB />)

    const icon = screen.getByTestId('message-circle-icon')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveClass('h-7', 'w-7', 'text-white')
  })

  test('button has correct transition classes', () => {
    render(<ChatbotFAB />)

    const button = screen.getByTestId('fab-button')
    expect(button).toHaveClass(
      'transition-all',
      'duration-300',
      'hover:scale-110',
      'active:scale-95'
    )
  })

  test('renders with fixed positioning', () => {
    render(<ChatbotFAB />)

    const motionWrapper = screen.getByTestId('motion-wrapper')
    expect(motionWrapper).toHaveClass('fixed', 'bottom-8', 'right-8', 'z-50')
  })

  test('has correct button structure', () => {
    render(<ChatbotFAB />)

    // Check that the button contains the icon
    const button = screen.getByTestId('fab-button')
    const icon = screen.getByTestId('message-circle-icon')
    
    expect(button).toContainElement(icon)
  })
})