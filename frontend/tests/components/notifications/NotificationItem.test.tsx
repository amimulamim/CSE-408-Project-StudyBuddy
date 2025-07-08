import { render, screen, fireEvent } from '@testing-library/react'
import { vi, test, expect, describe, beforeEach } from 'vitest'
import '@testing-library/jest-dom'
import { NotificationItem } from '@/components/notifications/NotificationItem'

// Mock the useNotifications hook
const mockUseNotifications = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: mockUseNotifications
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 hours ago')
}))

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Check: () => <div data-testid="check-icon">Check</div>,
  Info: () => <div data-testid="info-icon">Info</div>,
  AlertTriangle: () => <div data-testid="alert-triangle-icon">AlertTriangle</div>,
  CheckCircle: () => <div data-testid="check-circle-icon">CheckCircle</div>,
  XCircle: () => <div data-testid="x-circle-icon">XCircle</div>
}))

// Mock UI components
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  )
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, className }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      className={className}
      data-testid="mark-as-read-button"
    >
      {children}
    </button>
  )
}))

describe('NotificationItem', () => {
  const mockNotification = {
    id: 'notif-1',
    title: 'New Quiz Available',
    message: 'A new quiz on Mathematics has been created',
    type: 'info' as const,
    created_at: '2023-01-01T10:00:00Z',
    is_read: false
  }

  const mockMarkAsRead = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseNotifications.mockReturnValue({
      markAsRead: mockMarkAsRead
    })
  })

  test('should render notification item with title and message', () => {
    render(<NotificationItem notification={mockNotification} />)

    expect(screen.getByText('New Quiz Available')).toBeInTheDocument()
    expect(screen.getByText(/A new quiz on Mathematics/)).toBeInTheDocument()
  })

  test('should display unread notification with special styling', () => {
    const { container } = render(<NotificationItem notification={mockNotification} />)

    const mainContainer = container.firstChild as HTMLElement
    expect(mainContainer).toHaveClass('bg-blue-50/30')
  })

  test('should display read notification with normal styling', () => {
    const readNotification = { ...mockNotification, is_read: true }
    
    const { container } = render(<NotificationItem notification={readNotification} />)

    const mainContainer = container.firstChild as HTMLElement
    expect(mainContainer).not.toHaveClass('bg-blue-50/30')
  })

  test('should show new badge and mark as read button for unread notifications', () => {
    render(<NotificationItem notification={mockNotification} />)

    expect(screen.getByText('New')).toBeInTheDocument()
    expect(screen.getByTestId('mark-as-read-button')).toBeInTheDocument()
  })

  test('should not show new badge and mark as read button for read notifications', () => {
    const readNotification = { ...mockNotification, is_read: true }
    
    render(<NotificationItem notification={readNotification} />)

    expect(screen.queryByText('New')).not.toBeInTheDocument()
    expect(screen.queryByTestId('mark-as-read-button')).not.toBeInTheDocument()
  })

  test('should call markAsRead when mark as read button is clicked', () => {
    render(<NotificationItem notification={mockNotification} />)

    const markReadButton = screen.getByTestId('mark-as-read-button')
    fireEvent.click(markReadButton)

    expect(mockMarkAsRead).toHaveBeenCalledWith('notif-1')
  })

  test('should display formatted timestamp', () => {
    render(<NotificationItem notification={mockNotification} />)

    expect(screen.getByText('2 hours ago')).toBeInTheDocument()
  })

  test('should display notification type with appropriate styling and icon', () => {
    const { container } = render(<NotificationItem notification={mockNotification} />)

    expect(screen.getByTestId('info-icon')).toBeInTheDocument()
    
    const mainContainer = container.firstChild as HTMLElement
    expect(mainContainer).toHaveClass('border-l-blue-500')
  })

  test('should handle different notification types - success', () => {
    const successNotification = { ...mockNotification, type: 'success' as const }
    
    const { container } = render(<NotificationItem notification={successNotification} />)

    expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument()
    
    const mainContainer = container.firstChild as HTMLElement
    expect(mainContainer).toHaveClass('border-l-green-500')
  })

  test('should handle different notification types - warning', () => {
    const warningNotification = { ...mockNotification, type: 'warning' as const }
    
    const { container } = render(<NotificationItem notification={warningNotification} />)

    expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument()
    
    const mainContainer = container.firstChild as HTMLElement
    expect(mainContainer).toHaveClass('border-l-yellow-500')
  })

  test('should handle different notification types - error', () => {
    const errorNotification = { ...mockNotification, type: 'error' as const }
    
    const { container } = render(<NotificationItem notification={errorNotification} />)

    expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument()
    
    const mainContainer = container.firstChild as HTMLElement
    expect(mainContainer).toHaveClass('border-l-red-500')
  })

  test('should handle long message text gracefully', () => {
    const longMessageNotification = {
      ...mockNotification,
      message: 'This is a very long notification message that might wrap to multiple lines and should be handled gracefully by the component'
    }
    
    render(<NotificationItem notification={longMessageNotification} />)

    expect(screen.getByText(/This is a very long notification/)).toBeInTheDocument()
  })

  test('should support hover effects', () => {
    const { container } = render(<NotificationItem notification={mockNotification} />)

    const mainContainer = container.firstChild as HTMLElement
    expect(mainContainer).toHaveClass('hover:bg-muted/50')
  })

  test('should render without isLast prop', () => {
    render(<NotificationItem notification={mockNotification} />)

    expect(screen.getByText('New Quiz Available')).toBeInTheDocument()
  })

  test('should render with isLast prop', () => {
    render(<NotificationItem notification={mockNotification} isLast={true} />)

    expect(screen.getByText('New Quiz Available')).toBeInTheDocument()
  })
})
