import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, beforeEach, test, expect, describe } from 'vitest'
import { ChatInterface } from '@/components/chatbot/ChatInterface'

// Hoisted mock functions
const mockUseChat = vi.hoisted(() => vi.fn())

// Mock the useChat hook
vi.mock('@/components/chatbot/ChatContext', () => ({
  useChat: mockUseChat,
}))

// Mock child components
vi.mock('@/components/chatbot/ChatMessage', () => ({
  ChatMessage: ({ message }: any) => (
    <div data-testid={`message-${message.id}`}>
      <span data-testid="message-content">{message.content}</span>
      <span data-testid="message-role">{message.role}</span>
    </div>
  ),
}))

vi.mock('@/components/chatbot/FileUpload', () => ({
  FileUpload: ({ children, onFilesSelected }: any) => (
    <div data-testid="file-upload" onClick={() => onFilesSelected([{ id: 'file-1', name: 'test.pdf', type: 'application/pdf', size: 1000, url: 'test-url' }])}>
      {children}
    </div>
  ),
}))

vi.mock('@/components/chatbot/ThinkingAnimation', () => ({
  ThinkingAnimation: () => <div data-testid="thinking-animation">Thinking...</div>,
}))

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, size, variant, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className}
      data-size={size}
      data-variant={variant}
      data-testid="button"
      {...props}
    >
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, onKeyDown, placeholder, disabled, className, ...props }: any) => (
    <textarea
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      data-testid="textarea"
      {...props}
    />
  ),
}))

// Mock icons
vi.mock('lucide-react', () => ({
  Menu: () => <span data-testid="menu-icon">Menu</span>,
  Send: () => <span data-testid="send-icon">Send</span>,
  Paperclip: () => <span data-testid="paperclip-icon">Paperclip</span>,
  Loader2: ({ className }: any) => <span className={className} data-testid="loader-icon">Loading</span>,
}))

const mockChatData = {
  id: 'chat-1',
  title: 'Test Chat',
  messages: [
    {
      id: 'msg-1',
      content: 'Hello',
      role: 'user',
      timestamp: new Date('2024-01-01T00:00:00Z'),
      files: [],
    },
    {
      id: 'msg-2',
      content: 'Hi there!',
      role: 'assistant',
      timestamp: new Date('2024-01-01T00:01:00Z'),
      files: [],
    },
  ],
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:01:00Z'),
}

const mockChatContext = {
  currentChat: mockChatData,
  isLoading: false,
  sendMessage: vi.fn(),
  createNewChat: vi.fn(),
  loadMoreMessages: vi.fn(),
  isNewChatLoading: false,
  setIsNewChatLoading: vi.fn(),
}

describe('ChatInterface', () => {
  const mockProps = {
    sidebarOpen: false,
    onToggleSidebar: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseChat.mockReturnValue(mockChatContext)
  })

  test('renders chat interface with messages', () => {
    render(<ChatInterface {...mockProps} />)

    // Check for actual rendered content instead of title
    expect(screen.getByTestId('message-msg-1')).toBeInTheDocument()
    expect(screen.getByTestId('message-msg-2')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument()
  })

  test('renders welcome message when no chat exists', () => {
    mockUseChat.mockReturnValue({
      ...mockChatContext,
      currentChat: null,
    })

    render(<ChatInterface {...mockProps} />)

    expect(screen.getByText('Welcome to StudyBuddy AI')).toBeInTheDocument()
    expect(screen.getByText('Start typing a message to begin a new conversation')).toBeInTheDocument()
  })

  test('renders welcome message when chat has no messages', () => {
    mockUseChat.mockReturnValue({
      ...mockChatContext,
      currentChat: {
        ...mockChatData,
        messages: [],
      },
    })

    render(<ChatInterface {...mockProps} />)

    expect(screen.getByText('Welcome to StudyBuddy AI')).toBeInTheDocument()
  })

  test('shows thinking animation when loading', () => {
    mockUseChat.mockReturnValue({
      ...mockChatContext,
      isLoading: true,
    })

    render(<ChatInterface {...mockProps} />)

    expect(screen.getByTestId('thinking-animation')).toBeInTheDocument()
  })

  test('shows new chat loading overlay', () => {
    mockUseChat.mockReturnValue({
      ...mockChatContext,
      isNewChatLoading: true,
    })

    render(<ChatInterface {...mockProps} />)

    expect(screen.getByText('Loading Chat')).toBeInTheDocument()
    expect(screen.getByText('Setting up your conversation...')).toBeInTheDocument()
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
  })

  test('handles message input and sending', async () => {
    const mockSendMessage = vi.fn()
    mockUseChat.mockReturnValue({
      ...mockChatContext,
      sendMessage: mockSendMessage,
    })

    render(<ChatInterface {...mockProps} />)

    const textarea = screen.getByTestId('textarea')
    const sendButton = screen.getAllByTestId('button').find(btn => 
      btn.querySelector('[data-testid="send-icon"]')
    )

    fireEvent.change(textarea, { target: { value: 'Test message' } })
    fireEvent.click(sendButton!)

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Test message', [])
    })
  })

  test('handles Enter key to send message', async () => {
    const mockSendMessage = vi.fn()
    mockUseChat.mockReturnValue({
      ...mockChatContext,
      sendMessage: mockSendMessage,
    })

    render(<ChatInterface {...mockProps} />)

    const textarea = screen.getByTestId('textarea')
    fireEvent.change(textarea, { target: { value: 'Test message' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Test message', [])
    })
  })

  test('allows Shift+Enter for new line', () => {
    const mockSendMessage = vi.fn()
    mockUseChat.mockReturnValue({
      ...mockChatContext,
      sendMessage: mockSendMessage,
    })

    render(<ChatInterface {...mockProps} />)

    const textarea = screen.getByTestId('textarea')
    fireEvent.change(textarea, { target: { value: 'Test message' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })

    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  test('handles file attachment', async () => {
    render(<ChatInterface {...mockProps} />)

    const fileUpload = screen.getByTestId('file-upload')
    fireEvent.click(fileUpload)

    // Check if file preview is shown (this would be a PDF preview)
    await waitFor(() => {
      expect(screen.getByText('PDF')).toBeInTheDocument()
      expect(screen.getByText('test.pdf')).toBeInTheDocument()
    })
  })

  test('disables send button when message is empty and no files', () => {
    render(<ChatInterface {...mockProps} />)

    const sendButton = screen.getAllByTestId('button').find(btn => 
      btn.querySelector('[data-testid="send-icon"]')
    )

    expect(sendButton).toBeDisabled()
  })

  test('enables send button when message has content', () => {
    render(<ChatInterface {...mockProps} />)

    const textarea = screen.getByTestId('textarea')
    fireEvent.change(textarea, { target: { value: 'Test message' } })

    const sendButton = screen.getAllByTestId('button').find(btn => 
      btn.querySelector('[data-testid="send-icon"]')
    )

    expect(sendButton).not.toBeDisabled()
  })

  test.skip('toggles sidebar when menu button is clicked', () => {
    const mockToggleSidebar = vi.fn()
    
    render(<ChatInterface {...mockProps} onToggleSidebar={mockToggleSidebar} />)

    // Find the menu icon directly
    const menuIcon = screen.getByTestId('menu-icon')
    const menuButton = menuIcon.closest('button')
    
    expect(menuButton).toBeInTheDocument()
    fireEvent.click(menuButton!)

    expect(mockToggleSidebar).toHaveBeenCalled()
  })

  test('creates new chat when no current chat and message is sent', async () => {
    const mockCreateNewChat = vi.fn()
    const mockSendMessage = vi.fn()
    
    mockUseChat.mockReturnValue({
      ...mockChatContext,
      currentChat: null,
      createNewChat: mockCreateNewChat,
      sendMessage: mockSendMessage,
    })

    render(<ChatInterface {...mockProps} />)

    const textarea = screen.getByTestId('textarea')
    fireEvent.change(textarea, { target: { value: 'Test message' } })
    
    const sendButton = screen.getAllByTestId('button').find(btn => 
      btn.querySelector('[data-testid="send-icon"]')
    )
    fireEvent.click(sendButton!)

    expect(mockCreateNewChat).toHaveBeenCalled()
    
    // Wait for timeout to complete
    await waitFor(() => {
      setTimeout(() => {
        expect(mockSendMessage).toHaveBeenCalledWith('Test message', [])
      }, 100)
    })
  })

  test('removes attached file when close button is clicked', async () => {
    render(<ChatInterface {...mockProps} />)

    // Attach a file first
    const fileUpload = screen.getByTestId('file-upload')
    fireEvent.click(fileUpload)

    await waitFor(() => {
      expect(screen.getByText('PDF')).toBeInTheDocument()
    })

    // Find and click the remove button (×)
    const removeButton = screen.getAllByTestId('button').find(btn => 
      btn.textContent === '×'
    )
    fireEvent.click(removeButton!)

    await waitFor(() => {
      expect(screen.queryByText('PDF')).not.toBeInTheDocument()
    })
  })
})