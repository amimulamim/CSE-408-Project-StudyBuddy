import { describe, test, expect, vi, beforeEach } from 'vitest'

// Hoisted mock functions
const mockMakeRequest = vi.hoisted(() => vi.fn())

// Mock the makeRequest function
vi.mock('@/lib/apiCall', () => ({
  makeRequest: mockMakeRequest
}))

// Import after mocking
import { uploadAvatar, updateProfileData } from '@/components/profile/api'

describe('Profile API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('uploadAvatar', () => {
    test('should upload avatar file successfully', async () => {
      const mockFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })
      const mockResponse = { status: 'success', data: { avatar_url: 'https://example.com/avatar.jpg' } }
      
      mockMakeRequest.mockResolvedValue(mockResponse)

      const result = await uploadAvatar(mockFile)

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/user/profile/avatar',
        'POST',
        expect.any(FormData)
      )
      expect(result).toEqual(mockResponse)
    })

    test('should handle upload failure', async () => {
      const mockFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })
      const mockError = new Error('Upload failed')
      
      mockMakeRequest.mockRejectedValue(mockError)

      await expect(uploadAvatar(mockFile)).rejects.toThrow('Upload failed')
    })

    test('should create FormData with correct field name', async () => {
      const mockFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })
      mockMakeRequest.mockResolvedValue({ status: 'success' })

      await uploadAvatar(mockFile)

      const formDataCall = mockMakeRequest.mock.calls[0][2] as FormData
      expect(formDataCall.get('avatar')).toBe(mockFile)
    })

    test('should use correct API endpoint', async () => {
      const mockFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })
      mockMakeRequest.mockResolvedValue({ status: 'success' })

      await uploadAvatar(mockFile)

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/user/profile/avatar',
        'POST',
        expect.any(FormData)
      )
    })
  })

  describe('updateProfileData', () => {
    test('should update profile data successfully', async () => {
      const profileData = {
        name: 'John Doe',
        bio: 'Software Developer',
        institution: 'Tech University'
      }
      const mockResponse = { status: 'success', data: profileData }
      
      mockMakeRequest.mockResolvedValue(mockResponse)

      const result = await updateProfileData(profileData)

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/user/profile',
        'PUT',
        profileData
      )
      expect(result).toEqual(mockResponse)
    })

    test('should handle update failure', async () => {
      const profileData = { name: 'John Doe' }
      const mockError = new Error('Update failed')
      
      mockMakeRequest.mockRejectedValue(mockError)

      await expect(updateProfileData(profileData)).rejects.toThrow('Update failed')
    })

    test('should pass data object directly to makeRequest', async () => {
      const profileData = {
        name: 'Jane Smith',
        role: 'student',
        interests: '+programming,-gaming'
      }
      mockMakeRequest.mockResolvedValue({ status: 'success' })

      await updateProfileData(profileData)

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/user/profile',
        'PUT',
        profileData
      )
    })

    test('should handle empty profile data', async () => {
      const profileData = {}
      mockMakeRequest.mockResolvedValue({ status: 'success' })

      await updateProfileData(profileData)

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/user/profile',
        'PUT',
        {}
      )
    })

    test('should use correct HTTP method', async () => {
      const profileData = { name: 'Test User' }
      mockMakeRequest.mockResolvedValue({ status: 'success' })

      await updateProfileData(profileData)

      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.any(String),
        'PUT',
        expect.any(Object)
      )
    })
  })

  describe('API URL construction', () => {
    test('should construct correct API URLs', async () => {
      mockMakeRequest.mockResolvedValue({ status: 'success' })

      await updateProfileData({ name: 'Test' })

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/user/profile',
        'PUT',
        { name: 'Test' }
      )
    })

    test('should construct correct avatar upload URL', async () => {
      const mockFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })
      mockMakeRequest.mockResolvedValue({ status: 'success' })

      await uploadAvatar(mockFile)

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/user/profile/avatar',
        'POST',
        expect.any(FormData)
      )
    })
  })

  describe('FormData handling', () => {
    test('should properly set file in FormData', async () => {
      const mockFile = new File(['test content'], 'test-avatar.png', { type: 'image/png' })
      mockMakeRequest.mockResolvedValue({ status: 'success' })

      await uploadAvatar(mockFile)

      const [[, , formData]] = mockMakeRequest.mock.calls
      expect(formData).toBeInstanceOf(FormData)
      expect(formData.get('avatar')).toBe(mockFile)
    })

    test('should handle different file types', async () => {
      const fileTypes = [
        { name: 'test.jpg', type: 'image/jpeg' },
        { name: 'test.png', type: 'image/png' },
        { name: 'test.gif', type: 'image/gif' },
        { name: 'test.webp', type: 'image/webp' }
      ]

      for (const fileType of fileTypes) {
        const mockFile = new File(['test'], fileType.name, { type: fileType.type })
        mockMakeRequest.mockResolvedValue({ status: 'success' })

        await uploadAvatar(mockFile)

        const formData = mockMakeRequest.mock.calls[mockMakeRequest.mock.calls.length - 1][2] as FormData
        expect(formData.get('avatar')).toBe(mockFile)
      }
    })
  })

  describe('Error handling', () => {
    test('should propagate network errors from uploadAvatar', async () => {
      const mockFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })
      const networkError = new Error('Network timeout')
      
      mockMakeRequest.mockRejectedValue(networkError)

      await expect(uploadAvatar(mockFile)).rejects.toThrow('Network timeout')
    })

    test('should propagate network errors from updateProfileData', async () => {
      const profileData = { name: 'John Doe' }
      const networkError = new Error('Connection refused')
      
      mockMakeRequest.mockRejectedValue(networkError)

      await expect(updateProfileData(profileData)).rejects.toThrow('Connection refused')
    })

    test('should handle API error responses', async () => {
      const profileData = { name: 'John Doe' }
      const errorResponse = { status: 'error', msg: 'Validation failed' }
      
      mockMakeRequest.mockResolvedValue(errorResponse)

      const result = await updateProfileData(profileData)

      expect(result).toEqual(errorResponse)
    })
  })
})