import { describe, test, expect, vi, beforeEach } from 'vitest'

// Hoisted mock functions
const mockMakeRequest = vi.hoisted(() => vi.fn())

// Mock the makeRequest function
vi.mock('@/lib/apiCall', () => ({
  makeRequest: mockMakeRequest
}))

// Import after mocking
import { signIn, updateUserProfile } from '@/components/auth/api'

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('signIn', () => {
    test('should call makeRequest with correct parameters', async () => {
      const mockResponse = { status: 'success', data: { token: 'abc123' } }
      mockMakeRequest.mockResolvedValue(mockResponse)

      const result = await signIn()

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/auth/login',
        'POST',
        null
      )
      expect(result).toEqual(mockResponse)
    })

    test('should handle network errors', async () => {
      const networkError = new Error('Network timeout')
      mockMakeRequest.mockRejectedValue(networkError)

      await expect(signIn()).rejects.toThrow('Network timeout')
    })

    test('should handle API error responses', async () => {
      const errorResponse = { status: 'error', msg: 'Invalid credentials' }
      mockMakeRequest.mockResolvedValue(errorResponse)

      const result = await signIn()

      expect(result).toEqual(errorResponse)
    })
  })

  describe('updateUserProfile', () => {
    test('should update profile with valid data', async () => {
      const profileData = {
        name: 'John Doe',
        bio: 'Software Developer',
        institution: 'Tech University'
      }
      const mockResponse = { status: 'success', data: profileData }
      mockMakeRequest.mockResolvedValue(mockResponse)

      const result = await updateUserProfile(profileData)

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/user/profile',
        'PUT',
        profileData
      )
      expect(result).toEqual(mockResponse)
    })

    test('should handle empty profile data', async () => {
      const profileData = {}
      const mockResponse = { status: 'success' }
      mockMakeRequest.mockResolvedValue(mockResponse)

      const result = await updateUserProfile(profileData)

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/user/profile',
        'PUT',
        {}
      )
      expect(result).toEqual(mockResponse)
    })

    test('should handle complex profile data', async () => {
      const profileData = {
        name: 'Jane Smith',
        bio: 'Full-stack developer with 5+ years experience',
        institution: 'Stanford University',
        role: 'student',
        interests: ['Programming', 'AI', 'Machine Learning'],
        location: 'San Francisco, CA',
        social_links: {
          github: 'https://github.com/janesmith',
          linkedin: 'https://linkedin.com/in/janesmith'
        }
      }
      mockMakeRequest.mockResolvedValue({ status: 'success' })

      await updateUserProfile(profileData)

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/user/profile',
        'PUT',
        profileData
      )
    })

    test('should handle API validation errors', async () => {
      const profileData = { name: '' }
      const errorResponse = { 
        status: 'error', 
        msg: 'Validation failed',
        errors: { name: 'Name is required' }
      }
      mockMakeRequest.mockResolvedValue(errorResponse)

      const result = await updateUserProfile(profileData)

      expect(result).toEqual(errorResponse)
    })

    test('should handle network errors during profile update', async () => {
      const profileData = { name: 'John Doe' }
      const networkError = new Error('Connection refused')
      mockMakeRequest.mockRejectedValue(networkError)

      await expect(updateUserProfile(profileData)).rejects.toThrow('Connection refused')
    })

    test('should preserve data types in profile data', async () => {
      const profileData = {
        name: 'Test User',
        age: 25,
        isActive: true,
        skills: ['JavaScript', 'TypeScript'],
        metadata: {
          lastLogin: new Date().toISOString(),
          preferences: { theme: 'dark' }
        }
      }
      mockMakeRequest.mockResolvedValue({ status: 'success' })

      await updateUserProfile(profileData)

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/user/profile',
        'PUT',
        profileData
      )
    })
  })

  describe('API URL construction', () => {
    test('should use localhost URL by default', async () => {
      // Since the API uses the default fallback, test the actual behavior
      mockMakeRequest.mockResolvedValue({ status: 'success' })

      await signIn()

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/auth/login',
        'POST',
        null
      )
    })

    test('should construct correct profile endpoint URL', async () => {
      mockMakeRequest.mockResolvedValue({ status: 'success' })

      await updateUserProfile({ name: 'Test' })

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/user/profile',
        'PUT',
        { name: 'Test' }
      )
    })

    test('should use consistent base URL across functions', async () => {
      mockMakeRequest.mockResolvedValue({ status: 'success' })

      await signIn()
      await updateUserProfile({ name: 'Test' })

      const calls = mockMakeRequest.mock.calls
      const signInURL = calls[0][0]
      const profileURL = calls[1][0]

      // Both should use the same base URL
      expect(signInURL).toContain('http://localhost:8000')
      expect(profileURL).toContain('http://localhost:8000')
    })
  })

  describe('HTTP Methods', () => {
    test('should use POST method for signIn', async () => {
      mockMakeRequest.mockResolvedValue({ status: 'success' })

      await signIn()

      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.any(String),
        'POST',
        null
      )
    })

    test('should use PUT method for updateUserProfile', async () => {
      mockMakeRequest.mockResolvedValue({ status: 'success' })

      await updateUserProfile({ name: 'Test' })

      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.any(String),
        'PUT',
        { name: 'Test' }
      )
    })
  })

  describe('Request Payloads', () => {
    test('should send null payload for signIn', async () => {
      mockMakeRequest.mockResolvedValue({ status: 'success' })

      await signIn()

      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.any(String),
        'POST',
        null
      )
    })

    test('should send profile data as payload for updateUserProfile', async () => {
      const profileData = { name: 'John Doe', bio: 'Developer' }
      mockMakeRequest.mockResolvedValue({ status: 'success' })

      await updateUserProfile(profileData)

      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.any(String),
        'PUT',
        profileData
      )
    })
  })

  describe('Error Propagation', () => {
    test('should propagate makeRequest errors from signIn', async () => {
      const error = new Error('Request failed')
      mockMakeRequest.mockRejectedValue(error)

      await expect(signIn()).rejects.toThrow('Request failed')
    })

    test('should propagate makeRequest errors from updateUserProfile', async () => {
      const error = new Error('Update failed')
      mockMakeRequest.mockRejectedValue(error)

      await expect(updateUserProfile({ name: 'Test' })).rejects.toThrow('Update failed')
    })

    test('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout')
      mockMakeRequest.mockRejectedValue(timeoutError)

      await expect(signIn()).rejects.toThrow('Request timeout')
      await expect(updateUserProfile({})).rejects.toThrow('Request timeout')
    })
  })

  describe('Response Handling', () => {
    test('should return successful responses from signIn', async () => {
      const response = { status: 'success', data: { user: 'data' } }
      mockMakeRequest.mockResolvedValue(response)

      const result = await signIn()

      expect(result).toEqual(response)
    })

    test('should return successful responses from updateUserProfile', async () => {
      const response = { status: 'success', data: { updated: true } }
      mockMakeRequest.mockResolvedValue(response)

      const result = await updateUserProfile({ name: 'Test' })

      expect(result).toEqual(response)
    })

    test('should return error responses without throwing', async () => {
      const errorResponse = { status: 'error', msg: 'Server error' }
      mockMakeRequest.mockResolvedValue(errorResponse)

      const signInResult = await signIn()
      const profileResult = await updateUserProfile({ name: 'Test' })

      expect(signInResult).toEqual(errorResponse)
      expect(profileResult).toEqual(errorResponse)
    })
  })
})