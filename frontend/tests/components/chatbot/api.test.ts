import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'
import type { FileAttachment } from '@/components/chatbot/chat'

// Mock the makeRequest utility - use a factory function
vi.mock('@/lib/apiCall', () => ({
  makeRequest: vi.fn()
}))

// Import after mocking
import { makeRequest } from '@/lib/apiCall'

// Cast the mocked function for type safety
const mockMakeRequest = makeRequest as ReturnType<typeof vi.fn>

// Store original environment
const originalEnv = import.meta.env.VITE_BACKEND_URL

describe('Chatbot API Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset to default for each test
    import.meta.env.VITE_BACKEND_URL = 'http://localhost:8000'
  })

  afterEach(() => {
    // Restore original environment
    import.meta.env.VITE_BACKEND_URL = originalEnv
    // Clear module cache to ensure fresh imports
    vi.resetModules()
  })

  describe('getResponse', () => {
    test('makes POST request with text content only', async () => {
      // Import fresh module for each test
      const { getResponse } = await import('@/components/chatbot/api')
      
      const mockResponse = { success: true, data: 'AI response' }
      mockMakeRequest.mockResolvedValue(mockResponse)

      const result = await getResponse('Hello, AI!')

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/ai/chat/',
        'POST',
        expect.any(FormData)
      )

      // Verify FormData content
      const formDataCall = mockMakeRequest.mock.calls[0][2] as FormData
      expect(formDataCall.get('text')).toBe('Hello, AI!')
      expect(formDataCall.get('chatId')).toBeNull()
      expect(formDataCall.getAll('files')).toHaveLength(0)

      expect(result).toEqual(mockResponse)
    })

    test('makes POST request with text and chatId', async () => {
      const { getResponse } = await import('@/components/chatbot/api')
      
      const mockResponse = { success: true, data: 'AI response' }
      mockMakeRequest.mockResolvedValue(mockResponse)

      await getResponse('Hello, AI!', undefined, 'chat-123')

      const formDataCall = mockMakeRequest.mock.calls[0][2] as FormData
      expect(formDataCall.get('text')).toBe('Hello, AI!')
      expect(formDataCall.get('chatId')).toBe('chat-123')
      expect(formDataCall.getAll('files')).toHaveLength(0)
    })

    test('makes POST request with text and file attachments', async () => {
      const { getResponse } = await import('@/components/chatbot/api')
      
      const mockFiles: FileAttachment[] = [
        {
          id: 'file-1',
          name: 'test.pdf',
          type: 'application/pdf',
          size: 1024,
          url: 'http://example.com/test.pdf',
          bytes: new Uint8Array([1, 2, 3, 4])
        },
        {
          id: 'file-2',
          name: 'image.jpg',
          type: 'image/jpeg',
          size: 2048,
          url: 'http://example.com/image.jpg',
          bytes: new Uint8Array([5, 6, 7, 8])
        }
      ]

      const mockResponse = { success: true, data: 'AI response' }
      mockMakeRequest.mockResolvedValue(mockResponse)

      await getResponse('Analyze these files', mockFiles)

      const formDataCall = mockMakeRequest.mock.calls[0][2] as FormData
      expect(formDataCall.get('text')).toBe('Analyze these files')
      expect(formDataCall.getAll('files')).toHaveLength(2)
    })

    test('handles files without bytes', async () => {
      const { getResponse } = await import('@/components/chatbot/api')
      
      const mockFiles: FileAttachment[] = [
        {
          id: 'file-1',
          name: 'test.pdf',
          type: 'application/pdf',
          size: 1024,
          url: 'http://example.com/test.pdf'
          // No bytes property
        }
      ]

      const mockResponse = { success: true, data: 'AI response' }
      mockMakeRequest.mockResolvedValue(mockResponse)

      await getResponse('Test file', mockFiles)

      const formDataCall = mockMakeRequest.mock.calls[0][2] as FormData
      expect(formDataCall.getAll('files')).toHaveLength(1)
    })

    test('makes POST request with all parameters', async () => {
      const { getResponse } = await import('@/components/chatbot/api')
      
      const mockFiles: FileAttachment[] = [
        {
          id: 'file-1',
          name: 'document.pdf',
          type: 'application/pdf',
          size: 1024,
          url: 'http://example.com/document.pdf',
          bytes: new Uint8Array([1, 2, 3])
        }
      ]

      const mockResponse = { success: true, data: 'AI response' }
      mockMakeRequest.mockResolvedValue(mockResponse)

      await getResponse('Process this document', mockFiles, 'chat-456')

      const formDataCall = mockMakeRequest.mock.calls[0][2] as FormData
      expect(formDataCall.get('text')).toBe('Process this document')
      expect(formDataCall.get('chatId')).toBe('chat-456')
      expect(formDataCall.getAll('files')).toHaveLength(1)
    })

    test('handles empty files array', async () => {
      const { getResponse } = await import('@/components/chatbot/api')
      
      const mockResponse = { success: true, data: 'AI response' }
      mockMakeRequest.mockResolvedValue(mockResponse)

      await getResponse('Hello', [])

      const formDataCall = mockMakeRequest.mock.calls[0][2] as FormData
      expect(formDataCall.getAll('files')).toHaveLength(0)
    })

    test('uses custom backend URL from environment', async () => {
      import.meta.env.VITE_BACKEND_URL = 'https://custom-api.example.com'
      
      // Import fresh module with new environment
      const { getResponse } = await import('@/components/chatbot/api')

      const mockResponse = { success: true, data: 'AI response' }
      mockMakeRequest.mockResolvedValue(mockResponse)

      await getResponse('Test message')

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'https://custom-api.example.com/api/v1/ai/chat/',
        'POST',
        expect.any(FormData)
      )
    })

    test('handles makeRequest errors', async () => {
      const { getResponse } = await import('@/components/chatbot/api')
      
      const error = new Error('Network error')
      mockMakeRequest.mockRejectedValue(error)

      await expect(getResponse('Hello')).rejects.toThrow('Network error')
    })
  })

  describe('getChatList', () => {
    test('makes GET request to chat list endpoint', async () => {
      const { getChatList } = await import('@/components/chatbot/api')
      
      const mockResponse = { success: true, data: [] }
      mockMakeRequest.mockResolvedValue(mockResponse)

      const result = await getChatList()

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/ai/chat/list',
        'GET',
        null
      )
      expect(result).toEqual(mockResponse)
    })

    test('uses custom backend URL', async () => {
      import.meta.env.VITE_BACKEND_URL = 'https://api.studybuddy.com'

      const { getChatList } = await import('@/components/chatbot/api')
      
      mockMakeRequest.mockResolvedValue({ success: true, data: [] })

      await getChatList()

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'https://api.studybuddy.com/api/v1/ai/chat/list',
        'GET',
        null
      )
    })

    test('handles errors from makeRequest', async () => {
      const { getChatList } = await import('@/components/chatbot/api')
      
      const error = new Error('Failed to fetch chat list')
      mockMakeRequest.mockRejectedValue(error)

      await expect(getChatList()).rejects.toThrow('Failed to fetch chat list')
    })
  })

  describe('reqDeleteChat', () => {
    test('makes DELETE request with chat ID', async () => {
      const { reqDeleteChat } = await import('@/components/chatbot/api')
      
      const mockResponse = { success: true }
      mockMakeRequest.mockResolvedValue(mockResponse)

      const result = await reqDeleteChat('chat-123')

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/ai/chat/chat-123',
        'DELETE',
        null
      )
      expect(result).toEqual(mockResponse)
    })

    test('handles special characters in chat ID', async () => {
      const { reqDeleteChat } = await import('@/components/chatbot/api')
      
      const mockResponse = { success: true }
      mockMakeRequest.mockResolvedValue(mockResponse)

      await reqDeleteChat('chat-with-special-chars_123')

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/ai/chat/chat-with-special-chars_123',
        'DELETE',
        null
      )
    })

    test('uses custom backend URL', async () => {
      import.meta.env.VITE_BACKEND_URL = 'https://api.example.com'

      const { reqDeleteChat } = await import('@/components/chatbot/api')
      
      mockMakeRequest.mockResolvedValue({ success: true })

      await reqDeleteChat('chat-456')

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/ai/chat/chat-456',
        'DELETE',
        null
      )
    })

    test('handles deletion errors', async () => {
      const { reqDeleteChat } = await import('@/components/chatbot/api')
      
      const error = new Error('Chat not found')
      mockMakeRequest.mockRejectedValue(error)

      await expect(reqDeleteChat('nonexistent-chat')).rejects.toThrow('Chat not found')
    })
  })

  describe('reqRenameChat', () => {
    test('makes PATCH request with chat ID and new title', async () => {
      const { reqRenameChat } = await import('@/components/chatbot/api')
      
      const mockResponse = { success: true }
      mockMakeRequest.mockResolvedValue(mockResponse)

      const result = await reqRenameChat('chat-123', 'New Chat Title')

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/ai/chat/chat-123/rename',
        'PATCH',
        { name: 'New Chat Title' }
      )
      expect(result).toEqual(mockResponse)
    })

    test('handles empty title', async () => {
      const { reqRenameChat } = await import('@/components/chatbot/api')
      
      const mockResponse = { success: true }
      mockMakeRequest.mockResolvedValue(mockResponse)

      await reqRenameChat('chat-123', '')

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/ai/chat/chat-123/rename',
        'PATCH',
        { name: '' }
      )
    })

    test('handles special characters in title', async () => {
      const { reqRenameChat } = await import('@/components/chatbot/api')
      
      const mockResponse = { success: true }
      mockMakeRequest.mockResolvedValue(mockResponse)

      const specialTitle = 'Chat with émojis 🚀 & symbols!'
      await reqRenameChat('chat-123', specialTitle)

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/ai/chat/chat-123/rename',
        'PATCH',
        { name: specialTitle }
      )
    })

    test('uses custom backend URL', async () => {
      import.meta.env.VITE_BACKEND_URL = 'https://my-api.com'

      const { reqRenameChat } = await import('@/components/chatbot/api')
      
      mockMakeRequest.mockResolvedValue({ success: true })

      await reqRenameChat('chat-789', 'Updated Title')

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'https://my-api.com/api/v1/ai/chat/chat-789/rename',
        'PATCH',
        { name: 'Updated Title' }
      )
    })

    test('handles rename errors', async () => {
      const { reqRenameChat } = await import('@/components/chatbot/api')
      
      const error = new Error('Rename failed')
      mockMakeRequest.mockRejectedValue(error)

      await expect(reqRenameChat('chat-123', 'New Title')).rejects.toThrow('Rename failed')
    })
  })

  describe('getChatHistory', () => {
    test('makes GET request with default parameters', async () => {
      const { getChatHistory } = await import('@/components/chatbot/api')
      
      const mockResponse = { success: true, data: [] }
      mockMakeRequest.mockResolvedValue(mockResponse)

      const result = await getChatHistory('chat-123')

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/ai/chat/chat-123?offset=0&limit=20',
        'GET',
        null
      )
      expect(result).toEqual(mockResponse)
    })

    test('makes GET request with custom offset and limit', async () => {
      const { getChatHistory } = await import('@/components/chatbot/api')
      
      const mockResponse = { success: true, data: [] }
      mockMakeRequest.mockResolvedValue(mockResponse)

      await getChatHistory('chat-456', 10, 50)

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/ai/chat/chat-456?offset=10&limit=50',
        'GET',
        null
      )
    })

    test('makes GET request with only offset parameter', async () => {
      const { getChatHistory } = await import('@/components/chatbot/api')
      
      const mockResponse = { success: true, data: [] }
      mockMakeRequest.mockResolvedValue(mockResponse)

      await getChatHistory('chat-789', 5)

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/ai/chat/chat-789?offset=5&limit=20',
        'GET',
        null
      )
    })

    test('handles zero offset and limit', async () => {
      const { getChatHistory } = await import('@/components/chatbot/api')
      
      const mockResponse = { success: true, data: [] }
      mockMakeRequest.mockResolvedValue(mockResponse)

      await getChatHistory('chat-000', 0, 0)

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/ai/chat/chat-000?offset=0&limit=0',
        'GET',
        null
      )
    })

    test('uses custom backend URL', async () => {
      import.meta.env.VITE_BACKEND_URL = 'https://chat-api.example.com'

      const { getChatHistory } = await import('@/components/chatbot/api')
      
      mockMakeRequest.mockResolvedValue({ success: true, data: [] })

      await getChatHistory('chat-history-test')

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'https://chat-api.example.com/api/v1/ai/chat/chat-history-test?offset=0&limit=20',
        'GET',
        null
      )
    })

    test('handles chat history errors', async () => {
      const { getChatHistory } = await import('@/components/chatbot/api')
      
      const error = new Error('Chat history not found')
      mockMakeRequest.mockRejectedValue(error)

      await expect(getChatHistory('invalid-chat')).rejects.toThrow('Chat history not found')
    })
  })

  describe('Environment Configuration', () => {
    test('uses default localhost when no custom URL provided', async () => {
      // Don't set any custom URL, use the default behavior
      const { getChatList } = await import('@/components/chatbot/api')
      
      mockMakeRequest.mockResolvedValue({ success: true })

      await getChatList()

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/ai/chat/list',
        'GET',
        null
      )
    })

    test('falls back to localhost when VITE_BACKEND_URL is empty string', async () => {
      import.meta.env.VITE_BACKEND_URL = ''

      const { getChatList } = await import('@/components/chatbot/api')
      
      mockMakeRequest.mockResolvedValue({ success: true })

      await getChatList()

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/ai/chat/list',
        'GET',
        null
      )
    })

    test('uses provided backend URL when available', async () => {
      import.meta.env.VITE_BACKEND_URL = 'https://valid-api.com'

      const { getChatList } = await import('@/components/chatbot/api')
      
      mockMakeRequest.mockResolvedValue({ success: true })

      await getChatList()

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'https://valid-api.com/api/v1/ai/chat/list',
        'GET',
        null
      )
    })

    test('handles null environment variable', async () => {
      // Mock the environment to simulate missing env var
      vi.stubEnv('VITE_BACKEND_URL', '')
      
      const { getChatList } = await import('@/components/chatbot/api')
      
      mockMakeRequest.mockResolvedValue({ success: true })

      await getChatList()

      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/ai/chat/list',
        'GET',
        null
      )
      
      vi.unstubAllEnvs()
    })
  })

  describe('Error Handling', () => {
    test('propagates network errors', async () => {
      const { getResponse, getChatList, reqDeleteChat, reqRenameChat, getChatHistory } = await import('@/components/chatbot/api')
      
      const networkError = new Error('Network unavailable')
      mockMakeRequest.mockRejectedValue(networkError)

      await expect(getResponse('Test')).rejects.toThrow('Network unavailable')
      await expect(getChatList()).rejects.toThrow('Network unavailable')
      await expect(reqDeleteChat('test')).rejects.toThrow('Network unavailable')
      await expect(reqRenameChat('test', 'new')).rejects.toThrow('Network unavailable')
      await expect(getChatHistory('test')).rejects.toThrow('Network unavailable')
    })

    test('propagates API errors', async () => {
      const { getResponse } = await import('@/components/chatbot/api')
      
      const apiError = { error: 'Unauthorized', status: 401 }
      mockMakeRequest.mockRejectedValue(apiError)

      await expect(getResponse('Test')).rejects.toEqual(apiError)
    })
  })
})