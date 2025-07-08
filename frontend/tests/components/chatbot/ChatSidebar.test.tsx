import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, beforeEach, test, expect, describe } from 'vitest'
import { ChatSidebar } from '@/components/chatbot/ChatSidebar'

// Hoisted mock functions
const mockUseChat = vi.hoisted(() => vi.fn())

// Mock the useChat hook
vi.mock('@/components/chatbot/ChatContext', () => ({
  useChat: mockUseChat,
}))

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, variant, size, ...props }: any) => (
    <button 
      onClick={onClick} 
      className={className}
      data-variant={variant}
      data-size={size}
      data-testid="button"
      {...props}
    >
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, onKeyDown, onBlur, className, autoFocus, ...props }: any) => (
    <input
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      className={className}
      autoFocus={autoFocus}
      data-testid="input"
      {...props}
    />
  ),
}))

// Mock icons
vi.mock('lucide-react', () => ({
  Plus: () => <span data-testid="plus-icon">+</span>,
  MessageSquare: () => <span data-testid="message-square-icon">💬</span>,
  Pencil: () => <span data-testid="pencil-icon">✏️</span>,
  Trash2: () => <span data-testid="trash-icon">🗑️</span>,
  X: () => <span data-testid="x-icon">✕</span>,
}))

// Mock utils
vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}))

const mockChatList = [
  { id: 'start', title: 'New Chat' },
  { id: 'chat-1', title: 'First Chat' },
  { id: 'chat-2', title: 'Second Chat' },
]

const mockCurrentChat = {
  id: 'chat-1',
  title: 'First Chat',
  messages: [],
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockChatContext = {
  chatList: mockChatList,
  currentChat: mockCurrentChat,
  createNewChat: vi.fn(),
  setCurrentChatId: vi.fn(),
  deleteChat: vi.fn(),
  renameChat: vi.fn(),
  isChatListLoading: false,
}

describe('ChatSidebar', () => {
  const mockProps = {
    isOpen: true,
    onToggle: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseChat.mockReturnValue(mockChatContext)
  })

  test('renders sidebar when open', () => {
    render(<ChatSidebar {...mockProps} />)

    // Use getAllByText to handle multiple "New Chat" elements
    const newChatElements = screen.getAllByText('New Chat')
    expect(newChatElements.length).toBeGreaterThan(0)
    
    expect(screen.getByText('First Chat')).toBeInTheDocument()
    expect(screen.getByText('Second Chat')).toBeInTheDocument()
  })

  test('renders closed sidebar', () => {
    render(<ChatSidebar {...mockProps} isOpen={false} />)

    const sidebar = document.querySelector('.fixed')
    expect(sidebar).toHaveClass('-translate-x-full')
  })

  test('shows mobile overlay when open', () => {
    render(<ChatSidebar {...mockProps} />)

    const overlay = document.querySelector('.bg-black\\/50')
    expect(overlay).toBeInTheDocument()
  })

  test('closes sidebar when overlay is clicked', () => {
    const mockOnToggle = vi.fn()
    render(<ChatSidebar {...mockProps} onToggle={mockOnToggle} />)

    const overlay = document.querySelector('.bg-black\\/50')
    fireEvent.click(overlay!)

    expect(mockOnToggle).toHaveBeenCalled()
  })

  test('creates new chat when button is clicked', () => {
    const mockCreateNewChat = vi.fn()
    mockUseChat.mockReturnValue({
      ...mockChatContext,
      createNewChat: mockCreateNewChat,
    })

    render(<ChatSidebar {...mockProps} />)

    // Find the "New Chat" button (not the chat item)
    const newChatButton = screen.getAllByTestId('button').find(btn => 
      btn.querySelector('[data-testid="plus-icon"]')
    )
    fireEvent.click(newChatButton!)

    expect(mockCreateNewChat).toHaveBeenCalled()
  })

  test('selects chat when clicked', () => {
    const mockSetCurrentChatId = vi.fn()
    mockUseChat.mockReturnValue({
      ...mockChatContext,
      setCurrentChatId: mockSetCurrentChatId,
    })

    render(<ChatSidebar {...mockProps} />)

    // Find the chat item div that contains "Second Chat"
    const chatItems = document.querySelectorAll('.group.relative.p-3')
    const secondChatItem = Array.from(chatItems).find(item => 
      item.textContent?.includes('Second Chat')
    )
    
    fireEvent.click(secondChatItem!)

    expect(mockSetCurrentChatId).toHaveBeenCalledWith('chat-2')
  })

  test('highlights current chat', () => {
    render(<ChatSidebar {...mockProps} />)

    // Find the chat item div that contains "First Chat" (current chat)
    const chatItems = document.querySelectorAll('.group.relative.p-3')
    const firstChatItem = Array.from(chatItems).find(item => 
      item.textContent?.includes('First Chat')
    )
    
    expect(firstChatItem).toHaveClass('bg-study-purple/20', 'border-study-purple/30')
  })

  test('shows edit input when pencil icon is clicked', () => {
    render(<ChatSidebar {...mockProps} />)

    // Find the chat item that contains "First Chat"
    const chatItems = document.querySelectorAll('.group.relative.p-3')
    const firstChatItem = Array.from(chatItems).find(item => 
      item.textContent?.includes('First Chat')
    )
    
    // Find the edit button within that chat item
    const editButton = firstChatItem?.querySelector('[data-testid="pencil-icon"]')?.closest('button')
    
    fireEvent.click(editButton!)

    expect(screen.getByTestId('input')).toBeInTheDocument()
    expect(screen.getByDisplayValue('First Chat')).toBeInTheDocument()
  })

  test('saves chat title on Enter key', async () => {
    const mockRenameChat = vi.fn()
    mockUseChat.mockReturnValue({
      ...mockChatContext,
      renameChat: mockRenameChat,
    })

    render(<ChatSidebar {...mockProps} />)

    // Find the chat item and edit button
    const chatItems = document.querySelectorAll('.group.relative.p-3')
    const firstChatItem = Array.from(chatItems).find(item => 
      item.textContent?.includes('First Chat')
    )
    const editButton = firstChatItem?.querySelector('[data-testid="pencil-icon"]')?.closest('button')
    
    fireEvent.click(editButton!)

    const input = screen.getByTestId('input')
    fireEvent.change(input, { target: { value: 'Renamed Chat' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(mockRenameChat).toHaveBeenCalledWith('chat-1', 'Renamed Chat')
  })

  test('cancels edit on Escape key', async () => {
    const mockRenameChat = vi.fn()
    mockUseChat.mockReturnValue({
      ...mockChatContext,
      renameChat: mockRenameChat,
    })

    render(<ChatSidebar {...mockProps} />)

    // Find the chat item and edit button
    const chatItems = document.querySelectorAll('.group.relative.p-3')
    const firstChatItem = Array.from(chatItems).find(item => 
      item.textContent?.includes('First Chat')
    )
    const editButton = firstChatItem?.querySelector('[data-testid="pencil-icon"]')?.closest('button')
    
    fireEvent.click(editButton!)

    const input = screen.getByTestId('input')
    fireEvent.change(input, { target: { value: 'Renamed Chat' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(mockRenameChat).not.toHaveBeenCalled()
    expect(screen.queryByTestId('input')).not.toBeInTheDocument()
  })

  test('saves chat title on blur', async () => {
    const mockRenameChat = vi.fn()
    mockUseChat.mockReturnValue({
      ...mockChatContext,
      renameChat: mockRenameChat,
    })

    render(<ChatSidebar {...mockProps} />)

    // Find the chat item and edit button
    const chatItems = document.querySelectorAll('.group.relative.p-3')
    const firstChatItem = Array.from(chatItems).find(item => 
      item.textContent?.includes('First Chat')
    )
    const editButton = firstChatItem?.querySelector('[data-testid="pencil-icon"]')?.closest('button')
    
    fireEvent.click(editButton!)

    const input = screen.getByTestId('input')
    fireEvent.change(input, { target: { value: 'Renamed Chat' } })
    fireEvent.blur(input)

    expect(mockRenameChat).toHaveBeenCalledWith('chat-1', 'Renamed Chat')
  })

  test('deletes chat when trash icon is clicked', () => {
    const mockDeleteChat = vi.fn()
    mockUseChat.mockReturnValue({
      ...mockChatContext,
      deleteChat: mockDeleteChat,
    })

    render(<ChatSidebar {...mockProps} />)

    // Find the chat item and delete button
    const chatItems = document.querySelectorAll('.group.relative.p-3')
    const firstChatItem = Array.from(chatItems).find(item => 
      item.textContent?.includes('First Chat')
    )
    const deleteButton = firstChatItem?.querySelector('[data-testid="trash-icon"]')?.closest('button')
    
    fireEvent.click(deleteButton!)

    expect(mockDeleteChat).toHaveBeenCalledWith('chat-1')
  })

  test('shows loading state', () => {
    mockUseChat.mockReturnValue({
      ...mockChatContext,
      isChatListLoading: true,
      chatList: [],
    })

    render(<ChatSidebar {...mockProps} />)

    expect(screen.getByText('Loading chats...')).toBeInTheDocument()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  test('shows empty state when no chats', () => {
    mockUseChat.mockReturnValue({
      ...mockChatContext,
      chatList: [],
      isChatListLoading: false,
    })

    render(<ChatSidebar {...mockProps} />)

    expect(screen.getByText('No chats available. Start a new chat!')).toBeInTheDocument()
  })

  test('stops propagation on edit and delete button clicks', () => {
    const mockSetCurrentChatId = vi.fn()
    mockUseChat.mockReturnValue({
      ...mockChatContext,
      setCurrentChatId: mockSetCurrentChatId,
    })

    render(<ChatSidebar {...mockProps} />)

    // Find the chat item and edit button
    const chatItems = document.querySelectorAll('.group.relative.p-3')
    const firstChatItem = Array.from(chatItems).find(item => 
      item.textContent?.includes('First Chat')
    )
    const editButton = firstChatItem?.querySelector('[data-testid="pencil-icon"]')?.closest('button')
    
    fireEvent.click(editButton!)

    // Chat should not be selected when edit button is clicked
    expect(mockSetCurrentChatId).not.toHaveBeenCalled()
  })

  test('closes sidebar on mobile when X button is clicked', () => {
    const mockOnToggle = vi.fn()
    render(<ChatSidebar {...mockProps} onToggle={mockOnToggle} />)

    const closeButton = screen.getAllByTestId('button').find(btn => 
      btn.querySelector('[data-testid="x-icon"]')
    )
    fireEvent.click(closeButton!)

    expect(mockOnToggle).toHaveBeenCalled()
  })

  test('prevents saving empty chat title', async () => {
    const mockRenameChat = vi.fn()
    mockUseChat.mockReturnValue({
      ...mockChatContext,
      renameChat: mockRenameChat,
    })

    render(<ChatSidebar {...mockProps} />)

    // Find the chat item and edit button
    const chatItems = document.querySelectorAll('.group.relative.p-3')
    const firstChatItem = Array.from(chatItems).find(item => 
      item.textContent?.includes('First Chat')
    )
    const editButton = firstChatItem?.querySelector('[data-testid="pencil-icon"]')?.closest('button')
    
    fireEvent.click(editButton!)

    const input = screen.getByTestId('input')
    fireEvent.change(input, { target: { value: '   ' } }) // Only whitespace
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(mockRenameChat).not.toHaveBeenCalled()
  })

  test('renders correct sidebar structure', () => {
    render(<ChatSidebar {...mockProps} />)

    // Check that sidebar has correct classes when open
    const sidebar = document.querySelector('.fixed.md\\:relative')
    expect(sidebar).toHaveClass('translate-x-0')
    expect(sidebar).not.toHaveClass('-translate-x-full')
  })

  test('renders all chat items with correct structure', () => {
    render(<ChatSidebar {...mockProps} />)

    const chatItems = document.querySelectorAll('.group.relative.p-3')
    expect(chatItems).toHaveLength(3) // New Chat + First Chat + Second Chat
  })
})