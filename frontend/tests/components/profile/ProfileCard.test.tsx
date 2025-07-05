import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, beforeEach, test, expect, describe } from 'vitest'

// Hoisted mock functions
const mockNavigate = vi.hoisted(() => vi.fn())

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  User: ({ className }: any) => <div className={className} data-testid="user-icon">👤</div>,
  Edit3: ({ className }: any) => <div className={className} data-testid="edit-icon">✏️</div>,
  MapPin: ({ className }: any) => <div className={className} data-testid="map-pin-icon">📍</div>,
  GraduationCap: ({ className }: any) => <div className={className} data-testid="graduation-cap-icon">🎓</div>,
  Briefcase: ({ className }: any) => <div className={className} data-testid="briefcase-icon">💼</div>,
  Hash: ({ className }: any) => <div className={className} data-testid="hash-icon">#</div>,
}))

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <div className={className} data-testid="card-title">{children}</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, variant, size }: any) => (
    <button 
      onClick={onClick} 
      className={className} 
      data-variant={variant}
      data-size={size}
      data-testid="button"
    >
      {children}
    </button>
  )
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, variant }: any) => (
    <span className={className} data-testid="badge" data-variant={variant}>
      {children}
    </span>
  )
}))

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: any) => <div className={className} data-testid="avatar">{children}</div>,
  AvatarFallback: ({ children, className }: any) => <div className={className} data-testid="avatar-fallback">{children}</div>,
  AvatarImage: ({ src, alt }: any) => <img src={src} alt={alt} data-testid="avatar-image" />,
}))

// Mock ProfileEditDialog
vi.mock('@/components/profile/ProfileEditDialog', () => ({
  ProfileEditDialog: ({ isOpen, onClose, userProfile, onSave }: any) => (
    isOpen ? (
      <div data-testid="profile-edit-dialog">
        <div>Edit Profile Dialog</div>
        <button onClick={onClose} data-testid="close-dialog">Close</button>
        <button onClick={() => onSave({ name: 'Updated Name' })} data-testid="save-profile">Save</button>
      </div>
    ) : null
  )
}))

// Import after mocking
import { ProfileCard } from '@/components/profile/ProfileCard'

const mockUserProfile = {
  uid: 'user123',
  email: 'john.doe@example.com',
  name: 'John Doe',
  bio: 'Software developer with passion for learning',
  institution: 'Tech University',
  role: 'student',
  is_admin: false,
  avatar: 'https://example.com/avatar.jpg',
  current_plan: 'free',
  location: 'New York, USA',
  study_domain: 'Computer Science',
  interests: ['Programming', 'AI', 'Machine Learning']
}

const mockAdminProfile = {
  ...mockUserProfile,
  is_admin: true,
  current_plan: 'premium'
}

describe('ProfileCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    test('renders user profile information correctly', () => {
      render(<ProfileCard userProfile={mockUserProfile} />)

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
      expect(screen.getByText('Software developer with passion for learning')).toBeInTheDocument()
    })

    test('renders avatar with correct src and alt', () => {
      render(<ProfileCard userProfile={mockUserProfile} />)

      const avatarImage = screen.getByTestId('avatar-image')
      expect(avatarImage).toHaveAttribute('src', 'https://example.com/avatar.jpg')
      expect(avatarImage).toHaveAttribute('alt', 'John Doe')
    })

    test('renders avatar fallback when no avatar provided', () => {
      const profileWithoutAvatar = { ...mockUserProfile, avatar: '' }
      render(<ProfileCard userProfile={profileWithoutAvatar} />)

      expect(screen.getByTestId('avatar-fallback')).toBeInTheDocument()
      expect(screen.getByText('JD')).toBeInTheDocument() // Initials
    })

    test('generates correct initials for single name', () => {
      const singleNameProfile = { ...mockUserProfile, name: 'Madonna', avatar: '' }
      render(<ProfileCard userProfile={singleNameProfile} />)

      expect(screen.getByText('M')).toBeInTheDocument()
    })

    test('generates correct initials for multiple names', () => {
      const multiNameProfile = { ...mockUserProfile, name: 'John Michael Doe Smith', avatar: '' }
      render(<ProfileCard userProfile={multiNameProfile} />)

      expect(screen.getByText('JM')).toBeInTheDocument() // First two initials
    })
  })

  describe('Profile Details', () => {
    test('displays all profile details when present', () => {
      render(<ProfileCard userProfile={mockUserProfile} />)

      expect(screen.getByText('student')).toBeInTheDocument()
      expect(screen.getByText('Tech University')).toBeInTheDocument()
      expect(screen.getByText('New York, USA')).toBeInTheDocument()
      expect(screen.getByText('Computer Science')).toBeInTheDocument()
    })

    test('displays interests as badges', () => {
      render(<ProfileCard userProfile={mockUserProfile} />)

      expect(screen.getByText('Programming')).toBeInTheDocument()
      expect(screen.getByText('AI')).toBeInTheDocument()
      expect(screen.getByText('Machine Learning')).toBeInTheDocument()

      const badges = screen.getAllByTestId('badge')
      const interestBadges = badges.filter(badge => 
        badge.textContent === 'Programming' || 
        badge.textContent === 'AI' || 
        badge.textContent === 'Machine Learning'
      )
      expect(interestBadges).toHaveLength(3)
    })

    test('displays current plan badge with correct variant', () => {
      render(<ProfileCard userProfile={mockUserProfile} />)

      const planBadges = screen.getAllByTestId('badge').filter(badge => 
        badge.textContent === 'free'
      )
      expect(planBadges[0]).toHaveAttribute('data-variant', 'secondary')
    })

    test('displays premium plan badge with correct variant', () => {
      render(<ProfileCard userProfile={mockAdminProfile} />)

      const planBadges = screen.getAllByTestId('badge').filter(badge => 
        badge.textContent === 'premium'
      )
      expect(planBadges[0]).toHaveAttribute('data-variant', 'default')
    })

    test('hides sections when data is not available', () => {
      const minimalProfile = {
        ...mockUserProfile,
        bio: '',
        role: '',
        institution: '',
        location: '',
        study_domain: '',
        interests: []
      }
      render(<ProfileCard userProfile={minimalProfile} />)

      expect(screen.queryByText('Role:')).not.toBeInTheDocument()
      expect(screen.queryByText('Institution:')).not.toBeInTheDocument()
      expect(screen.queryByText('Location:')).not.toBeInTheDocument()
      expect(screen.queryByText('Study Domain:')).not.toBeInTheDocument()
      expect(screen.queryByText('Interests')).not.toBeInTheDocument()
    })
  })

  describe('Admin Features', () => {
    test('shows admin dashboard button for admin users', () => {
      render(<ProfileCard userProfile={mockAdminProfile} />)

      const adminButton = screen.getByRole('button', { name: /admin dashboard/i })
      expect(adminButton).toBeInTheDocument()
      expect(screen.getByTestId('user-icon')).toBeInTheDocument()
    })

    test('hides admin dashboard button for non-admin users', () => {
      render(<ProfileCard userProfile={mockUserProfile} />)

      expect(screen.queryByRole('button', { name: /admin dashboard/i })).not.toBeInTheDocument()
    })

    test('navigates to admin dashboard when admin button clicked', () => {
      render(<ProfileCard userProfile={mockAdminProfile} />)

      const adminButton = screen.getByRole('button', { name: /admin dashboard/i })
      fireEvent.click(adminButton)

      expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard')
    })
  })

  describe('Edit Profile Functionality', () => {
    test('shows edit profile button', () => {
      render(<ProfileCard userProfile={mockUserProfile} />)

      const editButton = screen.getByRole('button', { name: /edit profile/i })
      expect(editButton).toBeInTheDocument()
      expect(screen.getByTestId('edit-icon')).toBeInTheDocument()
    })

    test('opens edit dialog when edit button clicked', () => {
      render(<ProfileCard userProfile={mockUserProfile} />)

      const editButton = screen.getByRole('button', { name: /edit profile/i })
      fireEvent.click(editButton)

      expect(screen.getByTestId('profile-edit-dialog')).toBeInTheDocument()
      expect(screen.getByText('Edit Profile Dialog')).toBeInTheDocument()
    })

    test('closes edit dialog when close button clicked', () => {
      const onProfileUpdate = vi.fn()
      render(<ProfileCard userProfile={mockUserProfile} onProfileUpdate={onProfileUpdate} />)

      // Open dialog
      const editButton = screen.getByRole('button', { name: /edit profile/i })
      fireEvent.click(editButton)

      // Close dialog
      const closeButton = screen.getByTestId('close-dialog')
      fireEvent.click(closeButton)

      expect(screen.queryByTestId('profile-edit-dialog')).not.toBeInTheDocument()
    })

    test('calls onProfileUpdate when profile saved', () => {
      const onProfileUpdate = vi.fn()
      render(<ProfileCard userProfile={mockUserProfile} onProfileUpdate={onProfileUpdate} />)

      // Open dialog
      const editButton = screen.getByRole('button', { name: /edit profile/i })
      fireEvent.click(editButton)

      // Save profile
      const saveButton = screen.getByTestId('save-profile')
      fireEvent.click(saveButton)

      expect(onProfileUpdate).toHaveBeenCalledWith({ name: 'Updated Name' })
      expect(screen.queryByTestId('profile-edit-dialog')).not.toBeInTheDocument()
    })

    test('handles missing onProfileUpdate callback gracefully', () => {
      render(<ProfileCard userProfile={mockUserProfile} />)

      // Open dialog
      const editButton = screen.getByRole('button', { name: /edit profile/i })
      fireEvent.click(editButton)

      // Save profile - should not throw error
      const saveButton = screen.getByTestId('save-profile')
      expect(() => fireEvent.click(saveButton)).not.toThrow()

      expect(screen.queryByTestId('profile-edit-dialog')).not.toBeInTheDocument()
    })
  })

  describe('Icons Display', () => {
    test('displays correct icons for each section', () => {
      render(<ProfileCard userProfile={mockUserProfile} />)

      expect(screen.getByTestId('briefcase-icon')).toBeInTheDocument() // Role
      expect(screen.getByTestId('graduation-cap-icon')).toBeInTheDocument() // Institution
      expect(screen.getByTestId('map-pin-icon')).toBeInTheDocument() // Location
      expect(screen.getByTestId('hash-icon')).toBeInTheDocument() // Study Domain
    })
  })

  describe('Edge Cases', () => {
    test('handles empty interests array', () => {
      const profileWithNoInterests = { ...mockUserProfile, interests: [] }
      render(<ProfileCard userProfile={profileWithNoInterests} />)

      expect(screen.queryByText('Interests')).not.toBeInTheDocument()
    })

    test('handles undefined interests', () => {
      const profileWithUndefinedInterests = { ...mockUserProfile, interests: undefined as any }
      render(<ProfileCard userProfile={profileWithUndefinedInterests} />)

      expect(screen.queryByText('Interests')).not.toBeInTheDocument()
    })

    test('handles very long names for initials', () => {
      const longNameProfile = { ...mockUserProfile, name: 'A B C D E F G H', avatar: '' }
      render(<ProfileCard userProfile={longNameProfile} />)

      expect(screen.getByText('AB')).toBeInTheDocument() // Only first two
    })

    test('handles empty name for initials', () => {
      const emptyNameProfile = { ...mockUserProfile, name: '', avatar: '' }
      render(<ProfileCard userProfile={emptyNameProfile} />)

      const avatarFallback = screen.getByTestId('avatar-fallback')
      expect(avatarFallback).toBeInTheDocument()
      expect(avatarFallback).toBeEmptyDOMElement() // Empty when no name
    })
  })
})