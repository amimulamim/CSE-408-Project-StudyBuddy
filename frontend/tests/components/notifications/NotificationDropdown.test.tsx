import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, test, expect, describe, beforeEach, afterEach } from 'vitest';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';

// Mock the hooks
const mockUseNotifications = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: mockUseNotifications
}));

// Mock react-dom createPortal
vi.mock('react-dom', () => ({
  createPortal: (children: React.ReactNode) => children
}));

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-header" className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-title" className={className}>{children}</div>
  )
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, className }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    size?: string;
    className?: string;
  }) => {
    // Extract text content from children, handling React elements
    const getTextContent = (node: React.ReactNode): string => {
      if (typeof node === 'string') return node;
      if (typeof node === 'number') return node.toString();
      if (Array.isArray(node)) return node.map(getTextContent).join('');
      if (React.isValidElement(node)) {
        return getTextContent(node.props.children);
      }
      return '';
    };
    
    const textContent = getTextContent(children);
    const testId = textContent.toLowerCase().replace(/\s+/g, '-');
    
    return (
      <button
        onClick={onClick}
        data-variant={variant}
        data-size={size}
        className={className}
        data-testid={`button-${testId}`}
      >
        {children}
      </button>
    );
  }
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>{children}</div>
  )
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: ({ className }: { className?: string }) => (
    <div data-testid="separator" className={className} />
  )
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  CheckCheck: () => <div data-testid="check-check-icon">CheckCheck</div>,
  Settings: () => <div data-testid="settings-icon">Settings</div>
}));

// Mock NotificationItem
vi.mock('@/components/notifications/NotificationItem', () => ({
  NotificationItem: ({ notification, isLast }: {
    notification: any;
    isLast: boolean;
  }) => (
    <div data-testid={`notification-item-${notification.id}`} data-is-last={isLast}>
      <div>{notification.title}</div>
      <div>{notification.message}</div>
    </div>
  )
}));

describe('NotificationDropdown', () => {
  const mockOnClose = vi.fn();
  const mockTriggerRef = { current: document.createElement('button') };

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.appendChild(mockTriggerRef.current);
    
    // Mock getBoundingClientRect
    mockTriggerRef.current.getBoundingClientRect = vi.fn().mockReturnValue({
      bottom: 100,
      right: 200,
      top: 80,
      left: 150,
      width: 50,
      height: 20
    });
  });

  afterEach(() => {
    document.body.removeChild(mockTriggerRef.current);
  });

  test('renders nothing when not open', () => {
    mockUseNotifications.mockReturnValue({
      notifications: [],
      loading: false,
      markAllAsRead: vi.fn(),
      refetch: vi.fn()
    });

    render(
      <NotificationDropdown 
        isOpen={false} 
        onClose={mockOnClose} 
        triggerRef={mockTriggerRef} 
      />
    );

    expect(screen.queryByTestId('card')).not.toBeInTheDocument();
  });

  test('renders dropdown when open', () => {
    mockUseNotifications.mockReturnValue({
      notifications: [],
      loading: false,
      markAllAsRead: vi.fn(),
      refetch: vi.fn()
    });

    render(
      <NotificationDropdown 
        isOpen={true} 
        onClose={mockOnClose} 
        triggerRef={mockTriggerRef} 
      />
    );

    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  test('displays loading state', () => {
    mockUseNotifications.mockReturnValue({
      notifications: [],
      loading: true,
      markAllAsRead: vi.fn(),
      refetch: vi.fn()
    });

    render(
      <NotificationDropdown 
        isOpen={true} 
        onClose={mockOnClose} 
        triggerRef={mockTriggerRef} 
      />
    );

    expect(screen.getByText('Loading notifications...')).toBeInTheDocument();
  });

  test('displays empty state when no notifications', () => {
    mockUseNotifications.mockReturnValue({
      notifications: [],
      loading: false,
      markAllAsRead: vi.fn(),
      refetch: vi.fn()
    });

    render(
      <NotificationDropdown 
        isOpen={true} 
        onClose={mockOnClose} 
        triggerRef={mockTriggerRef} 
      />
    );

    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    expect(screen.getByText('You\'ll see updates here when they arrive')).toBeInTheDocument();
  });

  test('displays notifications when available', () => {
    const mockNotifications = [
      {
        id: 'notif-1',
        title: 'Quiz Completed',
        message: 'You scored 85% on Math Quiz',
        type: 'success',
        isRead: false,
        createdAt: '2023-01-01T10:00:00Z'
      },
      {
        id: 'notif-2',
        title: 'New Content Available',
        message: 'Check out the new Physics chapter',
        type: 'info',
        isRead: true,
        createdAt: '2023-01-01T09:00:00Z'
      }
    ];

    mockUseNotifications.mockReturnValue({
      notifications: mockNotifications,
      loading: false,
      markAllAsRead: vi.fn(),
      refetch: vi.fn()
    });

    render(
      <NotificationDropdown 
        isOpen={true} 
        onClose={mockOnClose} 
        triggerRef={mockTriggerRef} 
      />
    );

    expect(screen.getByTestId('notification-item-notif-1')).toBeInTheDocument();
    expect(screen.getByTestId('notification-item-notif-2')).toBeInTheDocument();
    expect(screen.getByText('Quiz Completed')).toBeInTheDocument();
    expect(screen.getByText('New Content Available')).toBeInTheDocument();
  });

  test('calls markAllAsRead when mark all as read button is clicked', () => {
    const mockMarkAllAsRead = vi.fn();
    const mockNotifications = [
      {
        id: 'notif-1',
        title: 'Test Notification',
        message: 'Test message',
        type: 'info',
        isRead: false,
        createdAt: '2023-01-01T10:00:00Z'
      }
    ];

    mockUseNotifications.mockReturnValue({
      notifications: mockNotifications,
      loading: false,
      markAllAsRead: mockMarkAllAsRead,
      refetch: vi.fn()
    });

    render(
      <NotificationDropdown 
        isOpen={true} 
        onClose={mockOnClose} 
        triggerRef={mockTriggerRef} 
      />
    );

    const markAllButton = screen.getByTestId('button-mark-all-read');
    fireEvent.click(markAllButton);

    expect(mockMarkAllAsRead).toHaveBeenCalledTimes(1);
  });

  test('shows settings icon in empty state', () => {
    mockUseNotifications.mockReturnValue({
      notifications: [],
      loading: false,
      markAllAsRead: vi.fn(),
      refetch: vi.fn()
    });

    render(
      <NotificationDropdown 
        isOpen={true} 
        onClose={mockOnClose} 
        triggerRef={mockTriggerRef} 
      />
    );

    expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
  });

  test('shows mark all as read button when there are unread notifications', () => {
    const mockNotifications = [
      {
        id: 'notif-1',
        title: 'Test Notification',
        message: 'Test message',
        type: 'info',
        isRead: false,
        createdAt: '2023-01-01T10:00:00Z'
      }
    ];

    mockUseNotifications.mockReturnValue({
      notifications: mockNotifications,
      loading: false,
      markAllAsRead: vi.fn(),
      refetch: vi.fn()
    });

    render(
      <NotificationDropdown 
        isOpen={true} 
        onClose={mockOnClose} 
        triggerRef={mockTriggerRef} 
      />
    );

    expect(screen.getByTestId('button-mark-all-read')).toBeInTheDocument();
    expect(screen.getByTestId('check-check-icon')).toBeInTheDocument();
  });

  test('calls refetch when dropdown opens', () => {
    const mockRefetch = vi.fn();
    
    mockUseNotifications.mockReturnValue({
      notifications: [],
      loading: false,
      markAllAsRead: vi.fn(),
      refetch: mockRefetch
    });

    render(
      <NotificationDropdown 
        isOpen={true} 
        onClose={mockOnClose} 
        triggerRef={mockTriggerRef} 
      />
    );

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  test('handles click outside to close dropdown', () => {
    mockUseNotifications.mockReturnValue({
      notifications: [],
      loading: false,
      markAllAsRead: vi.fn(),
      refetch: vi.fn()
    });

    render(
      <NotificationDropdown 
        isOpen={true} 
        onClose={mockOnClose} 
        triggerRef={mockTriggerRef} 
      />
    );

    // Simulate click outside
    const outsideElement = document.createElement('div');
    document.body.appendChild(outsideElement);
    
    fireEvent.mouseDown(outsideElement);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    
    document.body.removeChild(outsideElement);
  });

  test('does not close when clicking inside dropdown', () => {
    mockUseNotifications.mockReturnValue({
      notifications: [],
      loading: false,
      markAllAsRead: vi.fn(),
      refetch: vi.fn()
    });

    render(
      <NotificationDropdown 
        isOpen={true} 
        onClose={mockOnClose} 
        triggerRef={mockTriggerRef} 
      />
    );

    const dropdown = screen.getByTestId('card');
    fireEvent.mouseDown(dropdown);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  test('renders separator between notifications', () => {
    const mockNotifications = [
      {
        id: 'notif-1',
        title: 'First Notification',
        message: 'First message',
        type: 'info',
        isRead: false,
        createdAt: '2023-01-01T10:00:00Z'
      },
      {
        id: 'notif-2',
        title: 'Second Notification',
        message: 'Second message',
        type: 'info',
        isRead: false,
        createdAt: '2023-01-01T09:00:00Z'
      }
    ];

    mockUseNotifications.mockReturnValue({
      notifications: mockNotifications,
      loading: false,
      markAllAsRead: vi.fn(),
      refetch: vi.fn()
    });

    render(
      <NotificationDropdown 
        isOpen={true} 
        onClose={mockOnClose} 
        triggerRef={mockTriggerRef} 
      />
    );

    expect(screen.getByTestId('separator')).toBeInTheDocument();
  });
});
