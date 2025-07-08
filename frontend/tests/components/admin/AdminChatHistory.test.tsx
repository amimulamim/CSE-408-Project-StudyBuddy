import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, test, expect, describe, beforeEach } from 'vitest'
import '@testing-library/jest-dom'
import { AdminChatHistory } from '@/components/admin/AdminChatHistory'
import { makeRequest } from '@/lib/apiCall'
import { toast } from 'sonner'

// Mock dependencies
vi.mock('@/lib/apiCall')
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn()
  }
}))

const mockMakeRequest = vi.mocked(makeRequest)
const mockToast = vi.mocked(toast)

describe('AdminChatHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockChats = [
    {
      id: 'chat-1',
      user_uid: 'user-1',
      title: 'Math Questions',
      created_at: '2023-01-01T10:00:00Z',
      updated_at: '2023-01-01T11:00:00Z',
      message_count: 5
    },
    {
      id: 'chat-2',
      user_uid: 'user-2',
      title: 'Physics Help',
      created_at: '2023-01-02T10:00:00Z',
      updated_at: '2023-01-02T11:00:00Z',
      message_count: 3
    }
  ]

  const mockChatMessages = [
    {
      id: 'msg-1',
      role: 'user' as const,
      text: 'What is 2+2?',
      timestamp: '2023-01-01T10:00:00Z'
    },
    {
      id: 'msg-2',
      role: 'assistant' as const,
      text: '2+2 equals 4',
      timestamp: '2023-01-01T10:01:00Z'
    }
  ]

  test('should render loading state initially', () => {
    mockMakeRequest.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<AdminChatHistory />)

    expect(screen.getByText('Loading chats...')).toBeInTheDocument()
  })

  test('should fetch and display chat history', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { chats: mockChats, total: 2 }
    })

    render(<AdminChatHistory />)

    await waitFor(() => {
      expect(screen.getByText('Math Questions')).toBeInTheDocument()
    })

    expect(screen.getByText('Physics Help')).toBeInTheDocument()
    expect(screen.getByText('5 messages')).toBeInTheDocument()
    expect(screen.getByText('3 messages')).toBeInTheDocument()
  })

  test('should handle fetch error', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'error',
      data: { detail: 'Server error' }
    })

    render(<AdminChatHistory />)

    await waitFor(() => {
      expect(screen.getByText('No chats found')).toBeInTheDocument()
    })
  })

  test('should filter chats by search term', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { chats: mockChats, total: 2 }
    })

    render(<AdminChatHistory />)

    await waitFor(() => {
      expect(screen.getByText('Math Questions')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search chats...')
    fireEvent.change(searchInput, { target: { value: 'Math' } })

    expect(screen.getByText('Math Questions')).toBeInTheDocument()
    expect(screen.queryByText('Physics Help')).not.toBeInTheDocument()
  })

  test('should open chat details dialog when view button clicked', async () => {
    mockMakeRequest
      .mockResolvedValueOnce({
        status: 'success',
        data: { chats: mockChats, total: 2 }
      })
      .mockResolvedValueOnce({
        status: 'success',
        data: { messages: mockChatMessages }
      })

    render(<AdminChatHistory />)

    await waitFor(() => {
      expect(screen.getByText('Math Questions')).toBeInTheDocument()
    })

    // Find the button with Eye icon (the view button is icon-only)
    const viewButtons = screen.getAllByRole('button')
    const viewButton = viewButtons.find(button => 
      button.querySelector('svg') && !button.textContent?.includes('Previous') && !button.textContent?.includes('Next')
    )
    
    expect(viewButton).toBeTruthy()
    fireEvent.click(viewButton!)

    await waitFor(() => {
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument()
    })

    expect(screen.getByText('2+2 equals 4')).toBeInTheDocument()
  })

  test('should handle pagination', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { chats: mockChats, total: 25 }
    })

    render(<AdminChatHistory />)

    await waitFor(() => {
      expect(screen.getByText('Math Questions')).toBeInTheDocument()
    })

    const nextButton = screen.getByRole('button', { name: 'Next' })
    fireEvent.click(nextButton)

    expect(mockMakeRequest).toHaveBeenCalledWith(
      expect.stringContaining('offset=20'),
      'GET'
    )
  })

  test('should display chat statistics', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { chats: mockChats, total: 2 }
    })

    render(<AdminChatHistory />)

    await waitFor(() => {
      expect(screen.getByText('Showing 2 of 2 chats')).toBeInTheDocument()
    })
  })

  test('should format timestamps correctly', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { chats: mockChats, total: 2 }
    })

    render(<AdminChatHistory />)

    await waitFor(() => {
      expect(screen.getAllByText('1/1/2023')[0]).toBeInTheDocument()
    })
  })

  test('should handle empty chat list', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { chats: [], total: 0 }
    })

    render(<AdminChatHistory />)

    await waitFor(() => {
      expect(screen.getByText('No chats found')).toBeInTheDocument()
    })
  })

  test('should close chat details dialog', async () => {
    mockMakeRequest
      .mockResolvedValueOnce({
        status: 'success',
        data: { chats: mockChats, total: 2 }
      })
      .mockResolvedValueOnce({
        status: 'success',
        data: { messages: mockChatMessages }
      })

    render(<AdminChatHistory />)

    await waitFor(() => {
      expect(screen.getByText('Math Questions')).toBeInTheDocument()
    })

    // Find and click the view button (icon-only button)
    const viewButtons = screen.getAllByRole('button')
    const viewButton = viewButtons.find(button => 
      button.querySelector('svg') && !button.textContent?.includes('Previous') && !button.textContent?.includes('Next')
    )
    
    fireEvent.click(viewButton!)

    await waitFor(() => {
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument()
    })

    const closeButton = screen.getAllByRole('button', { name: 'Close' })[0]
    fireEvent.click(closeButton)

    expect(screen.queryByText('What is 2+2?')).not.toBeInTheDocument()
  })

  test('should handle message fetch error', async () => {
    mockMakeRequest
      .mockResolvedValueOnce({
        status: 'success',
        data: { chats: mockChats, total: 2 }
      })
      .mockResolvedValueOnce({
        status: 'error',
        data: { detail: 'Messages not found' }
      })

    render(<AdminChatHistory />)

    await waitFor(() => {
      expect(screen.getByText('Math Questions')).toBeInTheDocument()
    })

    // Find and click the view button (icon-only button)
    const viewButtons = screen.getAllByRole('button')
    const viewButton = viewButtons.find(button => 
      button.querySelector('svg') && !button.textContent?.includes('Previous') && !button.textContent?.includes('Next')
    )
    
    fireEvent.click(viewButton!)

    // Check that dialog opened but without messages due to error
    await waitFor(() => {
      expect(screen.getByText('Chat Details')).toBeInTheDocument()
    })
  })

  test('should display user roles in messages correctly', async () => {
    mockMakeRequest
      .mockResolvedValueOnce({
        status: 'success',
        data: { chats: mockChats, total: 2 }
      })
      .mockResolvedValueOnce({
        status: 'success',
        data: { messages: mockChatMessages }
      })

    render(<AdminChatHistory />)

    await waitFor(() => {
      expect(screen.getByText('Math Questions')).toBeInTheDocument()
    })

    // Find and click the view button (icon-only button)
    const viewButtons = screen.getAllByRole('button')
    const viewButton = viewButtons.find(button => 
      button.querySelector('svg') && !button.textContent?.includes('Previous') && !button.textContent?.includes('Next')
    )
    
    fireEvent.click(viewButton!)

    await waitFor(() => {
      expect(screen.getByText('user')).toBeInTheDocument()
    })

    expect(screen.getByText('assistant')).toBeInTheDocument()
  })
})
