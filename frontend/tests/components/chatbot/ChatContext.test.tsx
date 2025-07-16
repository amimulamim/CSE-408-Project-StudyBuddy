import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, beforeEach, test, expect, describe } from 'vitest'
import { ChatProvider, useChat } from '@/components/chatbot/ChatContext'

// Hoisted mock functions
const mockGetChatList = vi.hoisted(() => vi.fn())
const mockGetChatHistory = vi.hoisted(() => vi.fn())
const mockGetResponse = vi.hoisted(() => vi.fn())
const mockReqDeleteChat = vi.hoisted(() => vi.fn())
const mockReqRenameChat = vi.hoisted(() => vi.fn())
const mockToast = vi.hoisted(() => ({
  promise: vi.fn(),
  error: vi.fn(),
}))

// Mock API functions
vi.mock('@/components/chatbot/api', () => ({
  getChatList: mockGetChatList,
  getChatHistory: mockGetChatHistory,
  getResponse: mockGetResponse,
  reqDeleteChat: mockReqDeleteChat,
  reqRenameChat: mockReqRenameChat,
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: mockToast,
}))

// Test component to access context
function TestComponent() {
  const {
    chatList,
    currentChatId,
    setCurrentChatId,
    currentChat,
    isLoading,
    isNewChatLoading,
    setIsNewChatLoading,
    isChatListLoading,
    createNewChat,
    fetchChats,
    deleteChat,
    renameChat,
    sendMessage,
    loadMoreMessages,
  } = useChat()

  return (
    <div>
      <div data-testid="chat-list-length">{chatList.length}</div>
      <div data-testid="current-chat-id">{currentChatId || 'null'}</div>
      <div data-testid="current-chat-title">{currentChat?.title || 'No title'}</div>
      <div data-testid="is-loading">{isLoading.toString()}</div>
      <div data-testid="is-new-chat-loading">{isNewChatLoading.toString()}</div>
      <div data-testid="is-chat-list-loading">{isChatListLoading.toString()}</div>
      <div data-testid="messages-count">{currentChat?.messages.length || 0}</div>
      
      <button onClick={() => setCurrentChatId('test-chat-1')} data-testid="set-chat-id">
        Set Chat ID
      </button>
      <button onClick={createNewChat} data-testid="create-new-chat">
        Create New Chat
      </button>
      <button onClick={fetchChats} data-testid="fetch-chats">
        Fetch Chats
      </button>
      <button onClick={() => deleteChat('test-chat-1')} data-testid="delete-chat">
        Delete Chat
      </button>
      <button onClick={() => renameChat('test-chat-1', 'Renamed Chat')} data-testid="rename-chat">
        Rename Chat
      </button>
      <button onClick={() => sendMessage('Hello')} data-testid="send-message">
        Send Message
      </button>
      <button onClick={() => loadMoreMessages('test-chat-1', 5)} data-testid="load-more">
        Load More Messages
      </button>
      <button onClick={() => setIsNewChatLoading(true)} data-testid="set-new-chat-loading">
        Set New Chat Loading
      </button>
    </div>
  )
}

const mockChatListResponse = {
  status: 'success',
  data: {
    chats: [
      { id: 'chat-1', name: 'Test Chat 1' },
      { id: 'chat-2', name: 'Test Chat 2' },
    ],
  },
}

const mockChatHistoryResponse = {
  status: 'success',
  data: {
    id: 'chat-1',
    name: 'Test Chat 1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    messages: [
      {
        id: 'msg-1',
        text: 'Hello',
        role: 'user',
        timestamp: '2024-01-01T00:00:00Z',
        files: [],
      },
      {
        id: 'msg-2',
        text: 'Hi there!',
        role: 'assistant',
        timestamp: '2024-01-01T00:01:00Z',
        files: [],
      },
    ],
  },
}

const mockSendMessageResponse = {
  status: 'success',
  data: {
    id: 'chat-1',
    name: 'Test Chat 1',
    messages: [
      {
        id: 'msg-3',
        text: 'Assistant response',
        role: 'assistant',
        timestamp: '2024-01-01T00:02:00Z',
        files: [],
      },
    ],
  },
}

describe('ChatContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetChatList.mockResolvedValue(mockChatListResponse)
    mockGetChatHistory.mockResolvedValue(mockChatHistoryResponse)
    mockGetResponse.mockResolvedValue(mockSendMessageResponse)
    mockReqDeleteChat.mockResolvedValue({ status: 'success' })
    mockReqRenameChat.mockResolvedValue({ status: 'success' })
  })

  test('provides initial chat context values', async () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    )

    expect(screen.getByTestId('current-chat-id')).toHaveTextContent('null')
    expect(screen.getByTestId('current-chat-title')).toHaveTextContent('New Chat')
    expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
    expect(screen.getByTestId('is-new-chat-loading')).toHaveTextContent('false')
    expect(screen.getByTestId('messages-count')).toHaveTextContent('0')

    await waitFor(() => {
      expect(screen.getByTestId('chat-list-length')).toHaveTextContent('3') // New Chat + 2 existing
    })
  })

  test('fetches chat list on mount', async () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    )

    await waitFor(() => {
      expect(mockGetChatList).toHaveBeenCalled()
      expect(screen.getByTestId('chat-list-length')).toHaveTextContent('3')
    })
  })

  test('loads chat history when currentChatId changes', async () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId('set-chat-id'))
    })

    await waitFor(() => {
      expect(mockGetChatHistory).toHaveBeenCalledWith('test-chat-1', 0, 5)
      expect(screen.getByTestId('current-chat-title')).toHaveTextContent('Test Chat 1')
      expect(screen.getByTestId('messages-count')).toHaveTextContent('2')
    })
  })

  test('creates new chat', async () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    )

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('chat-list-length')).toHaveTextContent('3')
    })

    // Set a different chat first
    await act(async () => {
      fireEvent.click(screen.getByTestId('set-chat-id'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('current-chat-id')).toHaveTextContent('test-chat-1')
    })

    // Create new chat
    await act(async () => {
      fireEvent.click(screen.getByTestId('create-new-chat'))
    })

    expect(screen.getByTestId('current-chat-id')).toHaveTextContent('null')
    expect(screen.getByTestId('current-chat-title')).toHaveTextContent('New Chat')
  })

  test('sends message successfully', async () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId('send-message'))
    })

    await waitFor(() => {
      expect(mockGetResponse).toHaveBeenCalledWith('Hello', undefined, null)
      expect(screen.getByTestId('messages-count')).toHaveTextContent('2') // User + Assistant message
    })
  })

  test('deletes chat successfully', async () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-chat'))
    })

    await waitFor(() => {
      expect(mockReqDeleteChat).toHaveBeenCalledWith('test-chat-1')
      expect(mockToast.promise).toHaveBeenCalled()
    })
  })

  test('renames chat successfully', async () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId('rename-chat'))
    })

    await waitFor(() => {
      expect(mockReqRenameChat).toHaveBeenCalledWith('test-chat-1', 'Renamed Chat')
      expect(mockToast.promise).toHaveBeenCalled()
    })
  })

  test('loads more messages', async () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId('load-more'))
    })

    await waitFor(() => {
      expect(mockGetChatHistory).toHaveBeenCalledWith('test-chat-1', 0, 5)
    })
  })

  test('handles API errors gracefully', async () => {
    mockGetResponse.mockResolvedValue({ status: 'error', msg: 'API Error' })

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId('send-message'))
    })

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Error sending message: API Error')
    })
  })

  test('throws error when useChat is used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    expect(() => {
      render(<TestComponent />)
    }).toThrow('useChat must be used within a ChatProvider')
    
    consoleSpy.mockRestore()
  })

  test('updates loading states correctly', async () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId('set-new-chat-loading'))
    })

    expect(screen.getByTestId('is-new-chat-loading')).toHaveTextContent('true')
  })
})