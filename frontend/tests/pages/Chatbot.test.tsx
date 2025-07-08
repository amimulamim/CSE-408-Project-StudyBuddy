import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, beforeEach, test, expect, describe } from 'vitest'

// Mock the ChatProvider context
vi.mock('@/components/chatbot/ChatContext', () => ({
  ChatProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chat-provider">{children}</div>
  )
}))

// Mock ChatSidebar component
vi.mock('@/components/chatbot/ChatSidebar', () => ({
  ChatSidebar: vi.fn(({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) => (
    <div data-testid="chat-sidebar" data-open={isOpen}>
      <button onClick={onToggle} data-testid="sidebar-toggle-btn">
        Toggle Sidebar
      </button>
      <span>Sidebar {isOpen ? 'Open' : 'Closed'}</span>
    </div>
  ))
}))

// Mock ChatInterface component  
vi.mock('@/components/chatbot/ChatInterface', () => ({
  ChatInterface: vi.fn(({ sidebarOpen, onToggleSidebar }: { 
    sidebarOpen: boolean; 
    onToggleSidebar: () => void 
  }) => (
    <div data-testid="chat-interface" data-sidebar-open={sidebarOpen}>
      <button onClick={onToggleSidebar} data-testid="interface-toggle-btn">
        Toggle from Interface
      </button>
      <span>Interface - Sidebar {sidebarOpen ? 'Open' : 'Closed'}</span>
    </div>
  ))
}))

// Import after mocking
import Chatbot from '@/pages/Chatbot'
import { ChatSidebar } from '@/components/chatbot/ChatSidebar'
import { ChatInterface } from '@/components/chatbot/ChatInterface'

// Cast mocked components for type safety
const mockChatSidebar = ChatSidebar as ReturnType<typeof vi.fn>
const mockChatInterface = ChatInterface as ReturnType<typeof vi.fn>

describe('Chatbot Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders with correct initial state', () => {
    render(<Chatbot />)

    // Check that all main components are rendered
    expect(screen.getByTestId('chat-provider')).toBeInTheDocument()
    expect(screen.getByTestId('chat-sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('chat-interface')).toBeInTheDocument()

    // Check initial sidebar state (should be open by default)
    expect(screen.getByTestId('chat-sidebar')).toHaveAttribute('data-open', 'true')
    expect(screen.getByTestId('chat-interface')).toHaveAttribute('data-sidebar-open', 'true')
    
    // Verify text content reflects initial state
    expect(screen.getByText('Sidebar Open')).toBeInTheDocument()
    expect(screen.getByText('Interface - Sidebar Open')).toBeInTheDocument()
  })

  test('has correct layout structure and CSS classes', () => {
    const { container } = render(<Chatbot />)

    // Check main container has correct classes
    const mainContainer = container.querySelector('.h-screen.flex.dashboard-bg-animated.overflow-hidden')
    expect(mainContainer).toBeInTheDocument()

    // Verify the container structure
    const chatProvider = screen.getByTestId('chat-provider')
    expect(chatProvider.children).toHaveLength(1) // Should contain the main div

    const mainDiv = chatProvider.firstChild as HTMLElement
    expect(mainDiv).toHaveClass('h-screen', 'flex', 'dashboard-bg-animated', 'overflow-hidden')
  })

  test('passes correct props to ChatSidebar', () => {
    render(<Chatbot />)

    // Verify ChatSidebar was called with correct props
    expect(mockChatSidebar).toHaveBeenCalledWith(
      expect.objectContaining({
        isOpen: true,
        onToggle: expect.any(Function)
      }),
      expect.anything()
    )
  })

  test('passes correct props to ChatInterface', () => {
    render(<Chatbot />)

    // Verify ChatInterface was called with correct props
    expect(mockChatInterface).toHaveBeenCalledWith(
      expect.objectContaining({
        sidebarOpen: true,
        onToggleSidebar: expect.any(Function)
      }),
      expect.anything()
    )
  })

  test('toggles sidebar state when ChatSidebar toggle is clicked', () => {
    render(<Chatbot />)

    // Initial state should be open
    expect(screen.getByText('Sidebar Open')).toBeInTheDocument()
    expect(screen.getByText('Interface - Sidebar Open')).toBeInTheDocument()

    // Click toggle button from sidebar
    fireEvent.click(screen.getByTestId('sidebar-toggle-btn'))

    // State should now be closed
    expect(screen.getByText('Sidebar Closed')).toBeInTheDocument()
    expect(screen.getByText('Interface - Sidebar Closed')).toBeInTheDocument()
    expect(screen.getByTestId('chat-sidebar')).toHaveAttribute('data-open', 'false')
    expect(screen.getByTestId('chat-interface')).toHaveAttribute('data-sidebar-open', 'false')
  })

  test('toggles sidebar state when ChatInterface toggle is clicked', () => {
    render(<Chatbot />)

    // Initial state should be open
    expect(screen.getByText('Sidebar Open')).toBeInTheDocument()
    expect(screen.getByText('Interface - Sidebar Open')).toBeInTheDocument()

    // Click toggle button from interface
    fireEvent.click(screen.getByTestId('interface-toggle-btn'))

    // State should now be closed
    expect(screen.getByText('Sidebar Closed')).toBeInTheDocument()
    expect(screen.getByText('Interface - Sidebar Closed')).toBeInTheDocument()
  })

  test('can toggle sidebar multiple times', () => {
    render(<Chatbot />)

    const sidebarToggle = screen.getByTestId('sidebar-toggle-btn')

    // Initial state: open
    expect(screen.getByText('Sidebar Open')).toBeInTheDocument()

    // Toggle to closed
    fireEvent.click(sidebarToggle)
    expect(screen.getByText('Sidebar Closed')).toBeInTheDocument()

    // Toggle back to open
    fireEvent.click(sidebarToggle)
    expect(screen.getByText('Sidebar Open')).toBeInTheDocument()

    // Toggle to closed again
    fireEvent.click(sidebarToggle)
    expect(screen.getByText('Sidebar Closed')).toBeInTheDocument()
  })

  test('both toggle functions work independently', () => {
    render(<Chatbot />)

    const sidebarToggle = screen.getByTestId('sidebar-toggle-btn')
    const interfaceToggle = screen.getByTestId('interface-toggle-btn')

    // Initial state: open
    expect(screen.getByText('Sidebar Open')).toBeInTheDocument()

    // Toggle from sidebar
    fireEvent.click(sidebarToggle)
    expect(screen.getByText('Sidebar Closed')).toBeInTheDocument()

    // Toggle from interface (should open again)
    fireEvent.click(interfaceToggle)
    expect(screen.getByText('Sidebar Open')).toBeInTheDocument()

    // Alternate between both toggle sources
    fireEvent.click(interfaceToggle)
    expect(screen.getByText('Sidebar Closed')).toBeInTheDocument()

    fireEvent.click(sidebarToggle)
    expect(screen.getByText('Sidebar Open')).toBeInTheDocument()
  })

  test('wraps components in ChatProvider', () => {
    render(<Chatbot />)

    // Verify ChatProvider is the root wrapper
    const chatProvider = screen.getByTestId('chat-provider')
    expect(chatProvider).toBeInTheDocument()

    // Verify sidebar and interface are children of the provider
    const sidebar = screen.getByTestId('chat-sidebar')
    const interface_ = screen.getByTestId('chat-interface')
    
    expect(chatProvider).toContainElement(sidebar)
    expect(chatProvider).toContainElement(interface_)
  })

  test('maintains state consistency across re-renders', () => {
    const { rerender } = render(<Chatbot />)

    // Change state
    fireEvent.click(screen.getByTestId('sidebar-toggle-btn'))
    expect(screen.getByText('Sidebar Closed')).toBeInTheDocument()

    // Re-render component - state should persist during re-render
    rerender(<Chatbot />)

    // State should persist (closed) since React maintains component state during re-renders
    expect(screen.getByText('Sidebar Closed')).toBeInTheDocument()
  })

  test('component renders without crashing', () => {
    expect(() => render(<Chatbot />)).not.toThrow()
  })

  test('handles rapid toggle clicks', () => {
    render(<Chatbot />)

    const toggleBtn = screen.getByTestId('sidebar-toggle-btn')

    // Rapid clicking should work without issues
    for (let i = 0; i < 10; i++) {
      fireEvent.click(toggleBtn)
    }

    // Should end up open (started open, clicked 10 times = even number of clicks = back to original state)
    expect(screen.getByText('Sidebar Open')).toBeInTheDocument()
  })

  test('component structure is accessible', () => {
    const { container } = render(<Chatbot />)

    // Main container should be accessible
    const mainContainer = container.querySelector('.h-screen')
    expect(mainContainer).toBeInTheDocument()
    expect(mainContainer).toBeVisible()

    // Child components should be accessible
    expect(screen.getByTestId('chat-sidebar')).toBeVisible()
    expect(screen.getByTestId('chat-interface')).toBeVisible()
  })

  test('component has correct display layout', () => {
    const { container } = render(<Chatbot />)

    const mainContainer = container.querySelector('.h-screen.flex')
    expect(mainContainer).toHaveClass('flex') // Should use flexbox layout
    expect(mainContainer).toHaveClass('h-screen') // Should take full screen height
    expect(mainContainer).toHaveClass('overflow-hidden') // Should hide overflow
  })

  test('mock components receive updated props on state change', () => {
    render(<Chatbot />)

    // Clear previous calls to get clean slate
    vi.clearAllMocks()

    // Trigger state change
    fireEvent.click(screen.getByTestId('sidebar-toggle-btn'))

    // Verify components were re-rendered with new props
    expect(mockChatSidebar).toHaveBeenCalledWith(
      expect.objectContaining({
        isOpen: false,
        onToggle: expect.any(Function)
      }),
      expect.anything()
    )

    expect(mockChatInterface).toHaveBeenCalledWith(
      expect.objectContaining({
        sidebarOpen: false,
        onToggleSidebar: expect.any(Function)
      }),
      expect.anything()
    )
  })
})