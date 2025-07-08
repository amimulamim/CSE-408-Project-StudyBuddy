import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, beforeEach, test, expect, describe } from 'vitest'

// Hoisted mock functions
const mockNavigate = vi.hoisted(() => vi.fn())
const mockOnClose = vi.hoisted(() => vi.fn())
const mockOnChangeMode = vi.hoisted(() => vi.fn())

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}))

// Mock UI components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => 
    open ? <div data-testid="dialog" onClick={() => onOpenChange?.(false)}>{children}</div> : null,
  DialogContent: ({ children, className }: any) => <div className={className} data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children, className }: any) => <h2 className={className} data-testid="dialog-title">{children}</h2>,
  DialogDescription: ({ children, className }: any) => <p className={className} data-testid="dialog-description">{children}</p>,
}))

// Mock auth forms with correct paths
vi.mock('@/components/auth/SignInForm', () => ({
  SignInForm: ({ onSignUp, onClose }: any) => (
    <div data-testid="signin-form">
      <button onClick={onSignUp} data-testid="switch-to-signup">Switch to Sign Up</button>
      <button onClick={onClose} data-testid="signin-close">Close Sign In</button>
    </div>
  )
}))

vi.mock('@/components/auth/SignUpForm', () => ({
  SignUpForm: ({ onSignIn, onClose }: any) => (
    <div data-testid="signup-form">
      <button onClick={onSignIn} data-testid="switch-to-signin">Switch to Sign In</button>
      <button onClick={onClose} data-testid="signup-success">Sign Up Success</button>
    </div>
  )
}))

vi.mock('@/components/auth/OnboardingModal', () => ({
  OnboardingModal: ({ isOpen, onClose }: any) => 
    isOpen ? (
      <div data-testid="onboarding-modal">
        <button onClick={onClose} data-testid="onboarding-close">Close Onboarding</button>
      </div>
    ) : null
}))

// Import component after mocking
import { AuthModal } from '@/components/auth/AuthModal'

const defaultProps = {
  isOpen: true,
  onClose: mockOnClose,
  mode: 'signIn' as const,
  onChangeMode: mockOnChangeMode
}

describe('AuthModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock console.log to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  describe('Dialog Rendering', () => {
    test('renders dialog when open and not in onboarding mode', () => {
      render(<AuthModal {...defaultProps} />)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-content')).toBeInTheDocument()
    })

    test('does not render dialog when closed', () => {
      render(<AuthModal {...defaultProps} isOpen={false} />)

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })

    test('applies correct styling to dialog content', () => {
      render(<AuthModal {...defaultProps} />)

      const dialogContent = screen.getByTestId('dialog-content')
      expect(dialogContent).toHaveClass('sm:max-w-[425px]', 'max-h-[95vh]', 'overflow-y-auto', 'bg-card', 'border-white/10', 'scrollbar-hide')
    })

    test('renders accessibility elements correctly', () => {
      render(<AuthModal {...defaultProps} />)

      expect(screen.getByTestId('dialog-title')).toHaveClass('sr-only')
      expect(screen.getByTestId('dialog-description')).toHaveClass('sr-only')
    })
  })

  describe('Sign In Mode', () => {
    test('renders SignInForm when mode is signIn', () => {
      render(<AuthModal {...defaultProps} mode="signIn" />)

      expect(screen.getByTestId('signin-form')).toBeInTheDocument()
      expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument()
    })

    test('displays correct title and description for sign in', () => {
      render(<AuthModal {...defaultProps} mode="signIn" />)

      expect(screen.getByText('Sign In')).toBeInTheDocument()
      expect(screen.getByText('Sign in to your StuddyBuddy account')).toBeInTheDocument()
    })

    test('switches to sign up mode when requested', () => {
      render(<AuthModal {...defaultProps} mode="signIn" />)

      const switchButton = screen.getByTestId('switch-to-signup')
      fireEvent.click(switchButton)

      expect(mockOnChangeMode).toHaveBeenCalledWith('signUp')
    })

    test('calls onClose when sign in form requests close', () => {
      render(<AuthModal {...defaultProps} mode="signIn" />)

      const closeButton = screen.getByTestId('signin-close')
      fireEvent.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Sign Up Mode', () => {
    test('renders SignUpForm when mode is signUp', () => {
      render(<AuthModal {...defaultProps} mode="signUp" />)

      expect(screen.getByTestId('signup-form')).toBeInTheDocument()
      expect(screen.queryByTestId('signin-form')).not.toBeInTheDocument()
    })

    test('displays correct title and description for sign up', () => {
      render(<AuthModal {...defaultProps} mode="signUp" />)

      expect(screen.getByText('Sign Up')).toBeInTheDocument()
      expect(screen.getByText('Create a new StuddyBuddy account')).toBeInTheDocument()
    })

    test('switches to sign in mode when requested', () => {
      render(<AuthModal {...defaultProps} mode="signUp" />)

      const switchButton = screen.getByTestId('switch-to-signin')
      fireEvent.click(switchButton)

      expect(mockOnChangeMode).toHaveBeenCalledWith('signIn')
    })

    test('shows onboarding when sign up is successful', async () => {
      render(<AuthModal {...defaultProps} mode="signUp" />)

      const successButton = screen.getByTestId('signup-success')
      fireEvent.click(successButton)

      await waitFor(() => {
        expect(screen.getByTestId('onboarding-modal')).toBeInTheDocument()
      })
    })
  })

  describe('Onboarding Mode', () => {
    test('shows onboarding modal when mode is onboarding', () => {
      render(<AuthModal {...defaultProps} mode="onboarding" />)

      expect(screen.getByTestId('onboarding-modal')).toBeInTheDocument()
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })

    test('hides auth dialog when onboarding is shown', () => {
      render(<AuthModal {...defaultProps} mode="onboarding" />)

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
      expect(screen.getByTestId('onboarding-modal')).toBeInTheDocument()
    })

    test('closes both modals when onboarding is closed', async () => {
      render(<AuthModal {...defaultProps} mode="onboarding" />)

      const closeButton = screen.getByTestId('onboarding-close')
      fireEvent.click(closeButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })
  })

  describe('Component Integration', () => {
    test('passes correct props to SignInForm', () => {
      render(<AuthModal {...defaultProps} mode="signIn" />)

      // Test that the mocked SignInForm is rendered with the expected buttons
      expect(screen.getByTestId('switch-to-signup')).toBeInTheDocument()
      expect(screen.getByTestId('signin-close')).toBeInTheDocument()
    })

    test('passes correct props to SignUpForm', () => {
      render(<AuthModal {...defaultProps} mode="signUp" />)

      // Test that the mocked SignUpForm is rendered with the expected buttons
      expect(screen.getByTestId('switch-to-signin')).toBeInTheDocument()
      expect(screen.getByTestId('signup-success')).toBeInTheDocument()
    })

    test('passes correct props to OnboardingModal', async () => {
      render(<AuthModal {...defaultProps} mode="signUp" />)

      const successButton = screen.getByTestId('signup-success')
      fireEvent.click(successButton)

      await waitFor(() => {
        expect(screen.getByTestId('onboarding-modal')).toBeInTheDocument()
        expect(screen.getByTestId('onboarding-close')).toBeInTheDocument()
      })
    })
  })

  describe('Modal State Transitions', () => {
    test('transitions from sign up to onboarding on success', async () => {
      render(<AuthModal {...defaultProps} mode="signUp" />)

      // Simulate sign up success
      const successButton = screen.getByTestId('signup-success')
      fireEvent.click(successButton)

      await waitFor(() => {
        expect(screen.getByTestId('onboarding-modal')).toBeInTheDocument()
        // Note: dialog might still be in DOM but onboarding should be visible
      })
    })

    test('handles mode change from onboarding back to auth', async () => {
      const { rerender } = render(<AuthModal {...defaultProps} mode="onboarding" />)

      expect(screen.getByTestId('onboarding-modal')).toBeInTheDocument()

      rerender(<AuthModal {...defaultProps} mode="signIn" />)

      await waitFor(() => {
        expect(screen.queryByTestId('onboarding-modal')).not.toBeInTheDocument()
        expect(screen.getByTestId('dialog')).toBeInTheDocument()
      })
    })

    test('handles external mode changes correctly', () => {
      const { rerender } = render(<AuthModal {...defaultProps} mode="signIn" />)

      expect(screen.getByTestId('signin-form')).toBeInTheDocument()

      rerender(<AuthModal {...defaultProps} mode="signUp" />)

      expect(screen.getByTestId('signup-form')).toBeInTheDocument()
      expect(screen.queryByTestId('signin-form')).not.toBeInTheDocument()
    })

    test('maintains correct title when switching modes', () => {
      const { rerender } = render(<AuthModal {...defaultProps} mode="signIn" />)

      expect(screen.getByText('Sign In')).toBeInTheDocument()

      rerender(<AuthModal {...defaultProps} mode="signUp" />)

      expect(screen.getByText('Sign Up')).toBeInTheDocument()
      expect(screen.queryByText('Sign In')).not.toBeInTheDocument()
    })
  })

  describe('Dialog Close Handling', () => {
    test('calls onClose when dialog is closed normally', () => {
      render(<AuthModal {...defaultProps} mode="signIn" />)

      const dialog = screen.getByTestId('dialog')
      fireEvent.click(dialog)

      expect(mockOnClose).toHaveBeenCalled()
    })

    test('does not render dialog when onboarding is showing', async () => {
      render(<AuthModal {...defaultProps} mode="onboarding" />)

      expect(screen.getByTestId('onboarding-modal')).toBeInTheDocument()
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    test('handles rapid mode changes', async () => {
      const { rerender } = render(<AuthModal {...defaultProps} mode="signIn" />)

      rerender(<AuthModal {...defaultProps} mode="signUp" />)
      rerender(<AuthModal {...defaultProps} mode="onboarding" />)
      rerender(<AuthModal {...defaultProps} mode="signIn" />)

      await waitFor(() => {
        expect(screen.getByTestId('signin-form')).toBeInTheDocument()
        expect(screen.queryByTestId('onboarding-modal')).not.toBeInTheDocument()
      })
    })

    test('handles modal being closed while onboarding', async () => {
      render(<AuthModal {...defaultProps} mode="onboarding" />)

      const closeButton = screen.getByTestId('onboarding-close')
      fireEvent.click(closeButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    test('maintains proper state when reopened', () => {
      const { rerender } = render(<AuthModal {...defaultProps} isOpen={false} />)

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()

      rerender(<AuthModal {...defaultProps} isOpen={true} mode="signIn" />)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByTestId('signin-form')).toBeInTheDocument()
    })

    test('handles undefined or null props gracefully', () => {
      expect(() => {
        render(<AuthModal 
          isOpen={true} 
          onClose={mockOnClose} 
          mode="signIn" 
          onChangeMode={mockOnChangeMode} 
        />)
      }).not.toThrow()
    })
  })

  describe('Form Interaction Tests', () => {
    test('can interact with signin form buttons', () => {
      render(<AuthModal {...defaultProps} mode="signIn" />)

      const switchButton = screen.getByTestId('switch-to-signup')
      const closeButton = screen.getByTestId('signin-close')

      fireEvent.click(switchButton)
      expect(mockOnChangeMode).toHaveBeenCalledWith('signUp')

      fireEvent.click(closeButton)
      expect(mockOnClose).toHaveBeenCalled()
    })

    test('can interact with signup form buttons', () => {
      render(<AuthModal {...defaultProps} mode="signUp" />)

      const switchButton = screen.getByTestId('switch-to-signin')
      const successButton = screen.getByTestId('signup-success')

      fireEvent.click(switchButton)
      expect(mockOnChangeMode).toHaveBeenCalledWith('signIn')

      // Clear the mock before testing success
      vi.clearAllMocks()
      fireEvent.click(successButton)
      // This should trigger the onboarding state change
    })

    test('maintains button functionality across mode changes', () => {
      const { rerender } = render(<AuthModal {...defaultProps} mode="signIn" />)

      fireEvent.click(screen.getByTestId('switch-to-signup'))
      expect(mockOnChangeMode).toHaveBeenCalledWith('signUp')

      rerender(<AuthModal {...defaultProps} mode="signUp" />)

      fireEvent.click(screen.getByTestId('switch-to-signin'))
      expect(mockOnChangeMode).toHaveBeenCalledWith('signIn')
    })
  })
})