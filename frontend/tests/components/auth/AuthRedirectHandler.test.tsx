import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, beforeEach, test, expect, describe } from 'vitest'

// Hoisted mock functions
const mockNavigate = vi.hoisted(() => vi.fn())
const mockUseUserRole = vi.hoisted(() => vi.fn())
const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))

// Hoisted mock messages
const mockMessages = vi.hoisted(() => {
  return [
  "Did you know? Your brain forms new neural pathways every time you learn something new?",
  "Did you know? Background noise can sometimes improve creative thinking?",
  "Did you know? Your brain uses 20% of your body's total energy while studying?",
  "Did you know? Sleep is crucial for memory formation and learning?",
  "Did you know? Your brain continues processing information even after you stop studying?"
]})

// Define the messages array for testing
const expectedMessages = [
  "Did you know? Your brain forms new neural pathways every time you learn something new?",
  "Did you know? Background noise can sometimes improve creative thinking?",
  "Did you know? Your brain uses 20% of your body's total energy while studying?",
  "Did you know? Sleep is crucial for memory formation and learning?",
  "Did you know? Your brain continues processing information even after you stop studying?"
]

// Create mutable auth state
const mockAuth = vi.hoisted(() => ({
  currentUser: {
    uid: '123',
    email: 'test@example.com',
    displayName: 'Test User',
    emailVerified: true
  }
}))

// Mock Firebase
vi.mock('@/lib/firebase', () => ({
  auth: mockAuth
}))

// Mock Firebase auth functions
vi.mock('firebase/auth', () => ({
  getAuth: () => mockAuth
}))

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}))

// Mock useUserRole hook
vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: mockUseUserRole
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: mockToast
}))

// Mock messages.json
vi.mock('@/components/auth/messages.json', () => ({
  default: mockMessages
}))

// Mock assets
vi.mock('@/assets/owl_down.png', () => ({
  default: '/src/assets/owl_down.png'
}))

// Import component after mocking
import { AuthRedirectHandler } from '@/components/auth/AuthRedirectHandler'

describe('AuthRedirectHandler', () => {
  const mockOnRedirectComplete = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset auth state
    mockAuth.currentUser = {
      uid: '123',
      email: 'test@example.com',
      displayName: 'Test User',
      emailVerified: true
    }
    
    // Default mock return values
    mockUseUserRole.mockReturnValue({
      userProfile: null,
      loading: true,
      error: null
    })
  })

  describe('Loading State', () => {
    test('displays loading content when loading', () => {
      mockUseUserRole.mockReturnValue({
        userProfile: null,
        loading: true,
        error: null
      })

      render(<AuthRedirectHandler onRedirectComplete={mockOnRedirectComplete} />)
      
      // Check for the actual content that's rendered
      expect(screen.getByAltText('StudyBuddy Logo')).toBeInTheDocument()
      expect(screen.getByText(/Did you know\?/)).toBeInTheDocument()
    })

    test('displays random did you know message', () => {
      render(<AuthRedirectHandler onRedirectComplete={mockOnRedirectComplete} />)
      
      const message = screen.getByText(/Did you know\?/)
      expect(message).toBeInTheDocument()
    })

    test('shows loading content when user profile is loading', () => {
      mockUseUserRole.mockReturnValue({
        userProfile: null,
        loading: true,
        error: null
      })

      render(<AuthRedirectHandler onRedirectComplete={mockOnRedirectComplete} />)
      
      expect(screen.getByText(/Did you know\?/)).toBeInTheDocument()
      expect(screen.getByAltText('StudyBuddy Logo')).toBeInTheDocument()
    })
  })

  describe('Navigation Logic', () => {
    test('navigates to home when no current user', async () => {
      mockAuth.currentUser = null
      mockUseUserRole.mockReturnValue({
        userProfile: null,
        loading: false,
        error: null
      })

      render(<AuthRedirectHandler onRedirectComplete={mockOnRedirectComplete} />)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/')
      })
    })

    test('navigates to dashboard when user profile exists', async () => {
      mockUseUserRole.mockReturnValue({
        userProfile: { 
          name: 'John Doe',
          is_admin: false
        },
        loading: false,
        error: null
      })

      render(<AuthRedirectHandler onRedirectComplete={mockOnRedirectComplete} />)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
        expect(mockToast.success).toHaveBeenCalledWith('Welcome back, John Doe!')
        expect(mockOnRedirectComplete).toHaveBeenCalled()
      })
    })

    test('navigates to admin dashboard when user is admin', async () => {
      mockUseUserRole.mockReturnValue({
        userProfile: { 
          name: 'Admin User',
          is_admin: true
        },
        loading: false,
        error: null
      })

      render(<AuthRedirectHandler onRedirectComplete={mockOnRedirectComplete} />)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard')
        expect(mockToast.success).toHaveBeenCalledWith('Welcome back, Admin Admin User!')
        expect(mockOnRedirectComplete).toHaveBeenCalled()
      })
    })

    test('handles loading state correctly', () => {
      mockUseUserRole.mockReturnValue({
        userProfile: null,
        loading: true,
        error: null
      })

      render(<AuthRedirectHandler onRedirectComplete={mockOnRedirectComplete} />)

      // Should show loading state and not navigate while loading
      expect(screen.getByText(/Did you know\?/)).toBeInTheDocument()
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    test('handles error state', async () => {
      mockUseUserRole.mockReturnValue({
        userProfile: null,
        loading: false,
        error: 'Database error'
      })

      render(<AuthRedirectHandler onRedirectComplete={mockOnRedirectComplete} />)

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to load user profile')
        expect(mockNavigate).toHaveBeenCalledWith('/')
      })
    })
  })

  describe('Component Rendering', () => {
    test('displays logo and loading animations', () => {
      render(<AuthRedirectHandler onRedirectComplete={mockOnRedirectComplete} />)
      
      const logo = screen.getByAltText('StudyBuddy Logo')
      expect(logo).toBeInTheDocument()
      expect(logo).toHaveClass('animate-pulse')
    })

    test('contains animated elements', () => {
      const { container } = render(<AuthRedirectHandler onRedirectComplete={mockOnRedirectComplete} />)
      
      // Look for elements with animate-pulse class
      const animatedElements = container.querySelectorAll('.animate-pulse')
      expect(animatedElements.length).toBeGreaterThanOrEqual(1)
    })

    test('has proper loading screen structure', () => {
      const { container } = render(<AuthRedirectHandler onRedirectComplete={mockOnRedirectComplete} />)
      
      // Check for main container
      const mainContainer = container.querySelector('.dashboard-bg-animated')
      expect(mainContainer).toBeInTheDocument()
      
      // Should have loading content
      expect(screen.getByText(/Did you know\?/)).toBeInTheDocument()
      expect(screen.getByAltText('StudyBuddy Logo')).toBeInTheDocument()
    })

    test('displays loading dots animation', () => {
      const { container } = render(<AuthRedirectHandler onRedirectComplete={mockOnRedirectComplete} />)
      
      const loadingDots = container.querySelectorAll('.animate-bounce')
      expect(loadingDots.length).toBe(3)
    })

    test('displays spinning rings around logo', () => {
      const { container } = render(<AuthRedirectHandler onRedirectComplete={mockOnRedirectComplete} />)
      
      const spinningRings = container.querySelectorAll('.animate-spin')
      expect(spinningRings.length).toBe(2)
    })
  })

  describe('Component Props', () => {
    test('calls onRedirectComplete when profile loads', async () => {
      const customOnRedirect = vi.fn()
      
      mockUseUserRole.mockReturnValue({
        userProfile: { 
          name: 'Test User',
          is_admin: false
        },
        loading: false,
        error: null
      })

      render(<AuthRedirectHandler onRedirectComplete={customOnRedirect} />)

      await waitFor(() => {
        expect(customOnRedirect).toHaveBeenCalled()
      })
    })

    test('handles missing onRedirectComplete gracefully', async () => {
      mockUseUserRole.mockReturnValue({
        userProfile: { 
          name: 'Test User',
          is_admin: false
        },
        loading: false,
        error: null
      })

      // Should not throw when onRedirectComplete is undefined
      expect(() => {
        render(<AuthRedirectHandler onRedirectComplete={undefined as any} />)
      }).not.toThrow()

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
      })
    })
  })

  describe('Role-based Logic', () => {
    test('handles regular user profile', async () => {
      mockUseUserRole.mockReturnValue({
        userProfile: { 
          name: 'Regular User',
          is_admin: false
        },
        loading: false,
        error: null
      })

      render(<AuthRedirectHandler onRedirectComplete={mockOnRedirectComplete} />)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
        expect(mockToast.success).toHaveBeenCalledWith('Welcome back, Regular User!')
      })
    })

    test('handles admin user profile', async () => {
      mockUseUserRole.mockReturnValue({
        userProfile: { 
          name: 'Admin User',
          is_admin: true
        },
        loading: false,
        error: null
      })

      render(<AuthRedirectHandler onRedirectComplete={mockOnRedirectComplete} />)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard')
        expect(mockToast.success).toHaveBeenCalledWith('Welcome back, Admin Admin User!')
      })
    })
  })

  describe('Auth State Handling', () => {
    test('handles authenticated user with loading state', () => {
      mockAuth.currentUser = {
        uid: '123',
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: true
      }

      render(<AuthRedirectHandler onRedirectComplete={mockOnRedirectComplete} />)

      expect(screen.getByText(/Did you know\?/)).toBeInTheDocument()
    })

    test('handles unauthenticated user', async () => {
      mockAuth.currentUser = null
      mockUseUserRole.mockReturnValue({
        userProfile: null,
        loading: false,
        error: null
      })

      render(<AuthRedirectHandler onRedirectComplete={mockOnRedirectComplete} />)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/')
      })
    })

    test('displays content when user exists and loading', () => {
      mockAuth.currentUser = {
        uid: '456',
        email: 'user@test.com',
        displayName: 'Another User',
        emailVerified: true
      }

      render(<AuthRedirectHandler onRedirectComplete={mockOnRedirectComplete} />)

      expect(screen.getByAltText('StudyBuddy Logo')).toBeInTheDocument()
      expect(screen.getByText(/Did you know\?/)).toBeInTheDocument()
    })
  })

  describe('Loading Messages', () => {
    test('displays one of the did you know messages', () => {
      render(<AuthRedirectHandler onRedirectComplete={mockOnRedirectComplete} />)
      
      const message = screen.getByText(/Did you know\?/)
      expect(message).toBeInTheDocument()
      
      // Check that it's one of our expected messages
      const messageText = message.textContent
      expect(expectedMessages.some(msg => msg === messageText)).toBe(true)
    })

    test('shows loading indicators with proper styling', () => {
      const { container } = render(<AuthRedirectHandler onRedirectComplete={mockOnRedirectComplete} />)
      
      // Should have logo with animation
      const logo = screen.getByAltText('StudyBuddy Logo')
      expect(logo).toBeInTheDocument()
      expect(logo).toHaveClass('animate-pulse')
      
      // Should have loading dots
      const loadingDots = container.querySelectorAll('.bg-study-purple')
      expect(loadingDots.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Effects and State Management', () => {
    test('sets random message on mount', () => {
      render(<AuthRedirectHandler onRedirectComplete={mockOnRedirectComplete} />)
      
      const message = screen.getByText(/Did you know\?/)
      expect(message).toBeInTheDocument()
    })

    test('does not navigate when loading', () => {
      mockUseUserRole.mockReturnValue({
        userProfile: null,
        loading: true,
        error: null
      })

      render(<AuthRedirectHandler onRedirectComplete={mockOnRedirectComplete} />)

      expect(mockNavigate).not.toHaveBeenCalled()
    })

    test('returns null when not loading', async () => {
      mockUseUserRole.mockReturnValue({
        userProfile: { 
          name: 'Test User',
          is_admin: false
        },
        loading: false,
        error: null
      })

      const { container } = render(<AuthRedirectHandler onRedirectComplete={mockOnRedirectComplete} />)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled()
      })

      // Component should return null after navigation
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Error Scenarios', () => {
    test('handles network error', async () => {
      mockUseUserRole.mockReturnValue({
        userProfile: null,
        loading: false,
        error: 'Network error'
      })

      render(<AuthRedirectHandler onRedirectComplete={mockOnRedirectComplete} />)

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to load user profile')
        expect(mockNavigate).toHaveBeenCalledWith('/')
      })
    })

    test('handles missing user data gracefully', async () => {
      mockAuth.currentUser = null

      render(<AuthRedirectHandler onRedirectComplete={mockOnRedirectComplete} />)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/')
      })
    })
  })
})