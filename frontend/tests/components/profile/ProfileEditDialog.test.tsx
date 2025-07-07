import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, beforeEach, test, expect, describe } from 'vitest'

// Hoisted mock functions
const mockToastSuccess = vi.hoisted(() => vi.fn())
const mockToastError = vi.hoisted(() => vi.fn())
const mockUploadAvatar = vi.hoisted(() => vi.fn())
const mockUpdateProfileData = vi.hoisted(() => vi.fn())

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError
  }
}))

// Mock profile API
vi.mock('@/components/profile/api', () => ({
  uploadAvatar: mockUploadAvatar,
  updateProfileData: mockUpdateProfileData
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: ({ className }: any) => <div className={className} data-testid="x-icon">✕</div>,
  Plus: ({ className }: any) => <div className={className} data-testid="plus-icon">+</div>,
  Loader2: ({ className }: any) => <div className={className} data-testid="loader">⟳</div>,
  Upload: ({ className }: any) => <div className={className} data-testid="upload-icon">⬆</div>,
  Camera: ({ className }: any) => <div className={className} data-testid="camera-icon">📷</div>,
}))

// Mock UI components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => 
    open ? <div data-testid="dialog" onClick={() => onOpenChange?.(false)}>{children}</div> : null,
  DialogContent: ({ children, className }: any) => <div className={className} data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: any) => <div data-testid="dialog-description">{children}</div>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, type }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      type={type}
      data-testid="button"
    >
      {children}
    </button>
  )
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, disabled, id, onKeyDown, className }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      id={id}
      onKeyDown={onKeyDown}
      className={className}
      data-testid="input"
    />
  )
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor, className }: any) => (
    <label htmlFor={htmlFor} className={className} data-testid="label">{children}</label>
  )
}))

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder, rows, id }: any) => (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      id={id}
      data-testid="textarea"
    />
  )
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      <button onClick={() => onValueChange('student')} data-testid="select-student">Student</button>
      <button onClick={() => onValueChange('teacher')} data-testid="select-teacher">Teacher</button>
      <button onClick={() => onValueChange('researcher')} data-testid="select-researcher">Researcher</button>
      <button onClick={() => onValueChange('professional')} data-testid="select-professional">Professional</button>
      <button onClick={() => onValueChange('other')} data-testid="select-other">Other</button>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-testid="select-item" data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: any) => <div data-testid="select-value">{placeholder}</div>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
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

// Import component after mocking
import { ProfileEditDialog } from '@/components/profile/ProfileEditDialog'

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

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  userProfile: mockUserProfile,
  onSave: vi.fn()
}

describe('ProfileEditDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUploadAvatar.mockResolvedValue({ 
      status: 'success', 
      data: { avatar_url: 'https://example.com/new-avatar.jpg' } 
    })
    mockUpdateProfileData.mockResolvedValue({ status: 'success' })
  })

  describe('Dialog Rendering', () => {
    test('renders dialog when open', () => {
      render(<ProfileEditDialog {...defaultProps} />)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByText('Edit Profile')).toBeInTheDocument()
      expect(screen.getByText('Update your profile information. Changes will be saved to your account.')).toBeInTheDocument()
    })

    test('does not render when closed', () => {
      render(<ProfileEditDialog {...defaultProps} isOpen={false} />)

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })

    test('populates form fields with user profile data', () => {
      render(<ProfileEditDialog {...defaultProps} />)

      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Software developer')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Tech University')).toBeInTheDocument()
      expect(screen.getByDisplayValue('New York, USA')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Computer Science')).toBeInTheDocument()
    })

    test('displays avatar correctly', () => {
      render(<ProfileEditDialog {...defaultProps} />)

      const avatarImage = screen.getByTestId('avatar-image')
      expect(avatarImage).toHaveAttribute('src', 'https://example.com/avatar.jpg')
      expect(avatarImage).toHaveAttribute('alt', 'John Doe')
    })

    test('displays existing interests', () => {
      render(<ProfileEditDialog {...defaultProps} />)

      expect(screen.getByText('Programming')).toBeInTheDocument()
      expect(screen.getByText('AI')).toBeInTheDocument()
    })
  })

  describe('Form Input Changes', () => {
    test('updates name field', () => {
      render(<ProfileEditDialog {...defaultProps} />)

      const nameInput = screen.getByDisplayValue('John Doe')
      fireEvent.change(nameInput, { target: { value: 'Jane Smith' } })

      expect(nameInput).toHaveValue('Jane Smith')
    })

    test('updates bio field', () => {
      render(<ProfileEditDialog {...defaultProps} />)

      const bioTextarea = screen.getByDisplayValue('Software developer')
      fireEvent.change(bioTextarea, { target: { value: 'Updated bio' } })

      expect(bioTextarea).toHaveValue('Updated bio')
    })

    test('updates role selection', () => {
      render(<ProfileEditDialog {...defaultProps} />)

      const teacherButton = screen.getByTestId('select-teacher')
      fireEvent.click(teacherButton)

      const select = screen.getByTestId('select')
      expect(select).toHaveAttribute('data-value', 'teacher')
    })
  })

//   describe('Avatar Handling', () => {
//     test('validates file type', () => {
//       render(<ProfileEditDialog {...defaultProps} />)

//       const invalidFile = new File(['content'], 'document.pdf', { type: 'application/pdf' })
//       const fileInput = document.getElementById('avatar-upload') as HTMLInputElement

//       Object.defineProperty(fileInput, 'files', {
//         value: [invalidFile],
//         configurable: true,
//       })

//       fireEvent.change(fileInput)

//       expect(mockToastError).toHaveBeenCalledWith('Please select a valid image file')
//     })

//     test('validates file size', () => {
//       render(<ProfileEditDialog {...defaultProps} />)

//       const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
//       const fileInput = document.getElementById('avatar-upload') as HTMLInputElement

//       Object.defineProperty(fileInput, 'files', {
//         value: [largeFile],
//         configurable: true,
//       })

//       fireEvent.change(fileInput)

//       expect(mockToastError).toHaveBeenCalledWith('Image size should be less than 5MB')
//     })

//     test('accepts valid image files', () => {
//       // Mock FileReader
//       const mockFileReader = {
//         readAsDataURL: vi.fn(),
//         onloadend: null as any,
//         result: 'data:image/jpeg;base64,fake-data'
//       }
//       global.FileReader = vi.fn(() => mockFileReader) as any

//       render(<ProfileEditDialog {...defaultProps} />)

//       const validFile = new File(['image content'], 'avatar.jpg', { type: 'image/jpeg' })
//       const fileInput = document.getElementById('avatar-upload') as HTMLInputElement

//       Object.defineProperty(fileInput, 'files', {
//         value: [validFile],
//         configurable: true,
//       })

//       fireEvent.change(fileInput)

//       expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(validFile)
//     })
//   })

  describe('Interests Management', () => {
    test('adds new interest via button click', () => {
      render(<ProfileEditDialog {...defaultProps} />)

      const interestInput = screen.getByPlaceholderText('Add an interest')
      const addButton = screen.getByTestId('plus-icon').closest('button')

      fireEvent.change(interestInput, { target: { value: 'Machine Learning' } })
      fireEvent.click(addButton!)

      expect(screen.getByText('Machine Learning')).toBeInTheDocument()
    })

    test('adds interest on Enter key press', () => {
      render(<ProfileEditDialog {...defaultProps} />)

      const interestInput = screen.getByPlaceholderText('Add an interest')

      fireEvent.change(interestInput, { target: { value: 'Data Science' } })
      fireEvent.keyDown(interestInput, { key: 'Enter' })

      expect(screen.getByText('Data Science')).toBeInTheDocument()
    })

    test('prevents duplicate interests', () => {
      render(<ProfileEditDialog {...defaultProps} />)

      const interestInput = screen.getByPlaceholderText('Add an interest')
      const addButton = screen.getByTestId('plus-icon').closest('button')

      fireEvent.change(interestInput, { target: { value: 'Programming' } })
      fireEvent.click(addButton!)

      const programmingTexts = screen.getAllByText('Programming')
      expect(programmingTexts).toHaveLength(1)
    })

    test('removes interest when X button clicked', () => {
      render(<ProfileEditDialog {...defaultProps} />)

      const programmingBadge = screen.getByText('Programming').closest('[data-testid="badge"]')
      const removeButton = programmingBadge?.querySelector('button')

      fireEvent.click(removeButton!)

      expect(screen.queryByText('Programming')).not.toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    test('shows error when name is empty', () => {
      render(<ProfileEditDialog {...defaultProps} />)

      const nameInput = screen.getByDisplayValue('John Doe')
      fireEvent.change(nameInput, { target: { value: '' } })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      fireEvent.click(saveButton)

      expect(mockToastError).toHaveBeenCalledWith('Name is required')
    })

    test('shows error when name is only whitespace', () => {
      render(<ProfileEditDialog {...defaultProps} />)

      const nameInput = screen.getByDisplayValue('John Doe')
      fireEvent.change(nameInput, { target: { value: '   ' } })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      fireEvent.click(saveButton)

      expect(mockToastError).toHaveBeenCalledWith('Name is required')
    })
  })

  describe('Save Functionality', () => {
    test('saves profile successfully', async () => {
      render(<ProfileEditDialog {...defaultProps} />)

      const nameInput = screen.getByDisplayValue('John Doe')
      fireEvent.change(nameInput, { target: { value: 'Jane Smith' } })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockUpdateProfileData).toHaveBeenCalledWith({
          name: 'Jane Smith',
          bio: 'Software developer',
          institution: 'Tech University',
          role: 'student',
          location: 'New York, USA',
          study_domain: 'Computer Science'
        })
      })

      expect(mockToastSuccess).toHaveBeenCalledWith('Profile updated successfully')
      expect(defaultProps.onSave).toHaveBeenCalled()
      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    test('handles avatar file upload during save', async () => {
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        onloadend: null as any,
        result: 'data:image/jpeg;base64,fake-data'
      }
      global.FileReader = vi.fn(() => mockFileReader) as any

      render(<ProfileEditDialog {...defaultProps} />)

      const validFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })
      const fileInput = document.getElementById('avatar-upload') as HTMLInputElement

      Object.defineProperty(fileInput, 'files', {
        value: [validFile],
        configurable: true,
      })

      fireEvent.change(fileInput)

      // Simulate FileReader completion
      if (mockFileReader.onloadend) {
        mockFileReader.onloadend()
      }

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockUploadAvatar).toHaveBeenCalledWith(validFile)
      })

      await waitFor(() => {
        expect(mockUpdateProfileData).toHaveBeenCalledWith(
          expect.objectContaining({
            avatar: 'https://example.com/new-avatar.jpg'
          })
        )
      })
    })

    test('includes interests changes in API call', async () => {
      render(<ProfileEditDialog {...defaultProps} />)

      // Remove AI interest
      const aiBadge = screen.getByText('AI').closest('[data-testid="badge"]')
      const removeButton = aiBadge?.querySelector('button')
      fireEvent.click(removeButton!)

      // Add new interest
      const interestInput = screen.getByPlaceholderText('Add an interest')
      const addButton = screen.getByTestId('plus-icon').closest('button')
      fireEvent.change(interestInput, { target: { value: 'Machine Learning' } })
      fireEvent.click(addButton!)

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockUpdateProfileData).toHaveBeenCalledWith(
          expect.objectContaining({
            interests: expect.stringContaining('+Machine Learning')
          })
        )
      })
    })

    test('shows loading state during save', async () => {
      mockUpdateProfileData.mockImplementation(() => new Promise(() => {}))

      render(<ProfileEditDialog {...defaultProps} />)

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByTestId('loader')).toBeInTheDocument()
        expect(saveButton).toBeDisabled()
      })
    })
  })

  describe('Error Handling', () => {
    test('handles avatar upload failure', async () => {
      mockUploadAvatar.mockRejectedValue(new Error('Upload failed'))

      const mockFileReader = {
        readAsDataURL: vi.fn(),
        onloadend: null as any,
        result: 'data:image/jpeg;base64,fake-data'
      }
      global.FileReader = vi.fn(() => mockFileReader) as any

      render(<ProfileEditDialog {...defaultProps} />)

      const validFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })
      const fileInput = document.getElementById('avatar-upload') as HTMLInputElement

      Object.defineProperty(fileInput, 'files', {
        value: [validFile],
        configurable: true,
      })

      fireEvent.change(fileInput)

      if (mockFileReader.onloadend) {
        mockFileReader.onloadend()
      }

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Failed to upload avatar')
      })

      expect(mockUpdateProfileData).not.toHaveBeenCalled()
    })

    test('handles profile update failure', async () => {
      mockUpdateProfileData.mockResolvedValue({ 
        status: 'error', 
        msg: 'Database connection failed' 
      })

      render(<ProfileEditDialog {...defaultProps} />)

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Database connection failed')
      })
    })

    test('handles network error during profile update', async () => {
      mockUpdateProfileData.mockRejectedValue(new Error('Network error'))

      render(<ProfileEditDialog {...defaultProps} />)

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Failed to update profile')
      })
    })
  })

  describe('Dialog Controls', () => {
    test('closes dialog when cancel button clicked', () => {
      render(<ProfileEditDialog {...defaultProps} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)

      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    test('disables buttons during loading', async () => {
      mockUpdateProfileData.mockImplementation(() => new Promise(() => {}))

      render(<ProfileEditDialog {...defaultProps} />)

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(saveButton).toBeDisabled()
        expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
      })
    })
  })

  describe('Edge Cases', () => {
    test('handles profile with undefined fields', () => {
      const minimalProfile = {
        ...mockUserProfile,
        bio: undefined as any,
        institution: undefined as any,
        location: undefined as any,
        study_domain: undefined as any,
        interests: undefined as any
      }

      render(<ProfileEditDialog {...defaultProps} userProfile={minimalProfile} />)

      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
    })

    test('handles empty interests array', () => {
      const profileWithEmptyInterests = { ...mockUserProfile, interests: [] }

      render(<ProfileEditDialog {...defaultProps} userProfile={profileWithEmptyInterests} />)

      expect(screen.queryByTestId('badge')).not.toBeInTheDocument()
    })

    test('generates correct initials for avatar fallback', () => {
      const profileWithoutAvatar = { ...mockUserProfile, avatar: '' }

      render(<ProfileEditDialog {...defaultProps} userProfile={profileWithoutAvatar} />)

      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('JD')
    })

    test('handles single name for initials', () => {
      const profileWithSingleName = { ...mockUserProfile, name: 'Madonna', avatar: '' }

      render(<ProfileEditDialog {...defaultProps} userProfile={profileWithSingleName} />)

      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('M')
    })

    test('handles empty name for initials', () => {
      const profileWithEmptyName = { ...mockUserProfile, name: '', avatar: '' }

      render(<ProfileEditDialog {...defaultProps} userProfile={profileWithEmptyName} />)

      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('U')
    })
  })
})