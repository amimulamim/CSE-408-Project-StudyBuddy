import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, beforeEach, test, expect, describe } from 'vitest'

// Hoisted mock functions
const mockNavigate = vi.hoisted(() => vi.fn())
const mockToastError = vi.hoisted(() => vi.fn())
const mockRefetchUserProfile = vi.hoisted(() => vi.fn())
const mockUseUserRole = vi.hoisted(() => vi.fn())

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: mockToastError
  }
}))

// Mock useUserRole hook
vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: mockUseUserRole
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ArrowLeft: ({ className }: any) => <div className={className} data-testid="arrow-left-icon">←</div>,
  Loader2: ({ className }: any) => <div className={className} data-testid="loader-icon">⟳</div>
}))

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, className }: any) => (
    <button 
      onClick={onClick} 
      data-variant={variant}
      className={className}
      data-testid="button"
    >
      {children}
    </button>
  )
}))

// Mock ProfileCard component
vi.mock('@/components/profile/ProfileCard', () => ({
  ProfileCard: ({ userProfile, onProfileUpdate }: any) => (
    <div data-testid="profile-card">
      <div data-testid="profile-name">{userProfile.name}</div>
      <div data-testid="profile-email">{userProfile.email}</div>
      <button 
        data-testid="update-profile-button" 
        onClick={() => onProfileUpdate({ name: 'Updated Name' })}
      >
        Update Profile
      </button>
    </div>
  )
}))

// Import component after mocking
import Profile from '@/pages/Profile'

const mockUserProfile = {
  uid: 'user123',
  email: 'john.doe@example.com',
  name: 'John Doe',
  bio: 'Software developer',
  institution: 'Tech University',
  role: 'student',
  is_admin: false,
  avatar: 'https://example.com/avatar.jpg',
  current_plan: 'free',
  location: 'New York, USA',
  study_domain: 'Computer Science',
  interests: ['Programming', 'AI']
}

describe('Profile Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseUserRole.mockReturnValue({
      userProfile: mockUserProfile,
      loading: false,
      refetchUserProfile: mockRefetchUserProfile
    })
  })

  describe('Loading State', () => {
    test('displays loading spinner when loading', () => {
      mockUseUserRole.mockReturnValue({
        userProfile: null,
        loading: true,
        refetchUserProfile: mockRefetchUserProfile
      })

      render(<Profile />)

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
      expect(screen.getByText('Loading Your Profile...')).toBeInTheDocument()
    })

    test('applies correct styling to loading container', () => {
      mockUseUserRole.mockReturnValue({
        userProfile: null,
        loading: true,
        refetchUserProfile: mockRefetchUserProfile
      })

      render(<Profile />)

      const loadingContainer = screen.getByText('Loading Your Profile...').closest('div')
      expect(loadingContainer).toHaveClass('flex', 'flex-col', 'items-center', 'gap-4')
    })

    test('does not render main content when loading', () => {
      mockUseUserRole.mockReturnValue({
        userProfile: null,
        loading: true,
        refetchUserProfile: mockRefetchUserProfile
      })

      render(<Profile />)

      expect(screen.queryByText('Profile')).not.toBeInTheDocument()
      expect(screen.queryByText('Back to Dashboard')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    test('shows error toast and navigates when no user profile found', async () => {
      mockUseUserRole.mockReturnValue({
        userProfile: null,
        loading: false,
        refetchUserProfile: mockRefetchUserProfile
      })

      render(<Profile />)

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('User Profile not found.')
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
      })
    })

    test('does not show error when still loading', () => {
      mockUseUserRole.mockReturnValue({
        userProfile: null,
        loading: true,
        refetchUserProfile: mockRefetchUserProfile
      })

      render(<Profile />)

      expect(mockToastError).not.toHaveBeenCalled()
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    test('does not show error when user profile exists', () => {
      render(<Profile />)

      expect(mockToastError).not.toHaveBeenCalled()
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('Page Layout and Content', () => {
    test('renders page header correctly', () => {
      render(<Profile />)

      expect(screen.getByText('Profile')).toBeInTheDocument()
      expect(screen.getByText('Manage your account information and preferences')).toBeInTheDocument()
    })

    test('renders back button with correct text and icon', () => {
      render(<Profile />)

      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
      expect(screen.getByTestId('arrow-left-icon')).toBeInTheDocument()
    })

    test('renders main container with correct structure', () => {
      render(<Profile />)

      // Find the main container by looking for the outermost div with the expected classes
      const container = document.querySelector('.min-h-screen.dashboard-bg-animated')
      expect(container).toBeInTheDocument()
    })

    test('renders header section correctly', () => {
      render(<Profile />)

      const headerContainer = screen.getByText('Profile').closest('div')
      expect(headerContainer).toHaveClass('space-y-1')
    })

    test('profile card is rendered when user exists', () => {
      render(<Profile />)

      const profileCard = screen.getByTestId('profile-card')
      expect(profileCard).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    test('navigates to dashboard when back button clicked', () => {
      render(<Profile />)

      const backButton = screen.getByText('Back to Dashboard')
      fireEvent.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })

    test('back button has correct styling', () => {
      render(<Profile />)

      const backButton = screen.getByText('Back to Dashboard')
      expect(backButton).toHaveAttribute('data-variant', 'ghost')
      expect(backButton).toHaveClass('text-muted-foreground', 'hover:text-foreground', '-ml-2')
    })
  })

  describe('ProfileCard Integration', () => {
    test('renders ProfileCard when user profile exists', () => {
      render(<Profile />)

      expect(screen.getByTestId('profile-card')).toBeInTheDocument()
      expect(screen.getByTestId('profile-name')).toHaveTextContent('John Doe')
      expect(screen.getByTestId('profile-email')).toHaveTextContent('john.doe@example.com')
    })

    test('does not render ProfileCard when no user profile', () => {
      mockUseUserRole.mockReturnValue({
        userProfile: null,
        loading: false,
        refetchUserProfile: mockRefetchUserProfile
      })

      render(<Profile />)

      expect(screen.queryByTestId('profile-card')).not.toBeInTheDocument()
    })

    test('passes correct props to ProfileCard', () => {
      render(<Profile />)

      expect(screen.getByTestId('profile-card')).toBeInTheDocument()
      // Profile data is passed correctly (verified by the mocked component displaying the data)
      expect(screen.getByTestId('profile-name')).toHaveTextContent('John Doe')
      expect(screen.getByTestId('profile-email')).toHaveTextContent('john.doe@example.com')
    })

    test('handles profile update callback correctly', () => {
      render(<Profile />)

      const updateButton = screen.getByTestId('update-profile-button')
      fireEvent.click(updateButton)

      expect(mockRefetchUserProfile).toHaveBeenCalled()
    })

    test('profile update callback works when refetchUserProfile is undefined', () => {
      mockUseUserRole.mockReturnValue({
        userProfile: mockUserProfile,
        loading: false,
        refetchUserProfile: undefined
      })

      render(<Profile />)

      const updateButton = screen.getByTestId('update-profile-button')
      
      // Should not throw error when refetchUserProfile is undefined
      expect(() => fireEvent.click(updateButton)).not.toThrow()
    })
  })

  describe('Different User Profiles', () => {
    test('handles user profile with different data', () => {
      const differentProfile = {
        ...mockUserProfile,
        name: 'Jane Smith',
        email: 'jane.smith@example.com'
      }

      mockUseUserRole.mockReturnValue({
        userProfile: differentProfile,
        loading: false,
        refetchUserProfile: mockRefetchUserProfile
      })

      render(<Profile />)

      expect(screen.getByTestId('profile-name')).toHaveTextContent('Jane Smith')
      expect(screen.getByTestId('profile-email')).toHaveTextContent('jane.smith@example.com')
    })

    test('handles minimal user profile data', () => {
      const minimalProfile = {
        uid: 'user456',
        name: 'Test User',
        email: 'test@example.com'
      }

      mockUseUserRole.mockReturnValue({
        userProfile: minimalProfile,
        loading: false,
        refetchUserProfile: mockRefetchUserProfile
      })

      render(<Profile />)

      expect(screen.getByTestId('profile-card')).toBeInTheDocument()
      expect(screen.getByTestId('profile-name')).toHaveTextContent('Test User')
      expect(screen.getByTestId('profile-email')).toHaveTextContent('test@example.com')
    })
  })

  describe('Hook Dependencies', () => {
    test('useEffect triggers correctly on loading change', async () => {
      const { rerender } = render(<Profile />)
      
      // Clear previous calls
      vi.clearAllMocks()

      // Change loading state
      mockUseUserRole.mockReturnValue({
        userProfile: null,
        loading: false,
        refetchUserProfile: mockRefetchUserProfile
      })

      rerender(<Profile />)

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('User Profile not found.')
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
      })
    })

    test('useEffect triggers correctly on userProfile change', async () => {
      // Start with no profile
      mockUseUserRole.mockReturnValue({
        userProfile: null,
        loading: false,
        refetchUserProfile: mockRefetchUserProfile
      })

      const { rerender } = render(<Profile />)

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled()
      })

      // Clear previous calls
      vi.clearAllMocks()

      // Add profile
      mockUseUserRole.mockReturnValue({
        userProfile: mockUserProfile,
        loading: false,
        refetchUserProfile: mockRefetchUserProfile
      })

      rerender(<Profile />)

      // Should not call toast error when profile exists
      expect(mockToastError).not.toHaveBeenCalled()
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('Responsive Design', () => {
    test('renders with proper layout structure', () => {
      render(<Profile />)

      // Check that the main container exists by finding it directly
      const mainContainer = document.querySelector('.min-h-screen.dashboard-bg-animated')
      expect(mainContainer).toBeInTheDocument()

      // Check that profile card is rendered
      const profileContainer = screen.getByTestId('profile-card')
      expect(profileContainer).toBeInTheDocument()
    })

    test('header section has correct spacing', () => {
      render(<Profile />)

      const headerSection = screen.getByText('Profile').closest('div')
      expect(headerSection).toHaveClass('space-y-1')
    })
  })

  describe('Accessibility', () => {
    test('has proper heading hierarchy', () => {
      render(<Profile />)

      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toHaveTextContent('Profile')
    })

    test('back button is accessible', () => {
      render(<Profile />)

      const backButton = screen.getByRole('button', { name: /back to dashboard/i })
      expect(backButton).toBeInTheDocument()
    })

    test('loading state has appropriate text', () => {
      mockUseUserRole.mockReturnValue({
        userProfile: null,
        loading: true,
        refetchUserProfile: mockRefetchUserProfile
      })

      render(<Profile />)

      expect(screen.getByText('Loading Your Profile...')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    test('handles undefined refetchUserProfile gracefully', () => {
      mockUseUserRole.mockReturnValue({
        userProfile: mockUserProfile,
        loading: false,
        refetchUserProfile: undefined
      })

      expect(() => render(<Profile />)).not.toThrow()
    })

    test('handles profile update with various data types', () => {
      render(<Profile />)

      const updateButton = screen.getByTestId('update-profile-button')
      
      // Test different update data scenarios
      fireEvent.click(updateButton)
      expect(mockRefetchUserProfile).toHaveBeenCalled()
    })

    test('renders correctly when switching from loading to loaded state', () => {
      mockUseUserRole.mockReturnValue({
        userProfile: null,
        loading: true,
        refetchUserProfile: mockRefetchUserProfile
      })

      const { rerender } = render(<Profile />)

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument()

      mockUseUserRole.mockReturnValue({
        userProfile: mockUserProfile,
        loading: false,
        refetchUserProfile: mockRefetchUserProfile
      })

      rerender(<Profile />)

      expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument()
      expect(screen.getByTestId('profile-card')).toBeInTheDocument()
    })
  })
})