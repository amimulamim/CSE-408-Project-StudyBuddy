import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, test, expect, describe, beforeEach } from 'vitest';
import { NotificationButton } from '@/components/notifications/NotificationButton';

// Mock the hooks
const mockUseNotifications = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: mockUseNotifications
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: React.forwardRef<HTMLButtonElement, {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    size?: string;
    className?: string;
  }>(({ children, onClick, variant, size, className }, ref) => (
    <button
      ref={ref}
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      className={className}
      data-testid="notification-button"
    >
      {children}
    </button>
  ))
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
  }) => (
    <span data-testid="notification-badge" data-variant={variant} className={className}>
      {children}
    </span>
  )
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Bell: () => <div data-testid="bell-icon">Bell</div>,
  BellRing: () => <div data-testid="bell-ring-icon">BellRing</div>,
  CheckCheck: () => <div data-testid="check-check-icon">CheckCheck</div>,
  Settings: () => <div data-testid="settings-icon">Settings</div>
}));

// Mock NotificationDropdown
vi.mock('@/components/notifications/NotificationDropdown', () => ({
  NotificationDropdown: ({ isOpen, onClose, triggerRef }: {
    isOpen: boolean;
    onClose: () => void;
    triggerRef: React.RefObject<HTMLButtonElement>;
  }) => (
    <div 
      data-testid="notification-dropdown" 
      data-open={isOpen}
      style={{ display: isOpen ? 'block' : 'none' }}
    >
      <button onClick={onClose} data-testid="close-dropdown">Close</button>
      Notification Dropdown
    </div>
  )
}));

// Mock Audio
global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  volume: 1
}));

describe('NotificationButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock to return default values
    mockUseNotifications.mockReturnValue({
      unreadCount: 0,
      hasNewNotification: false,
      notifications: [],
      loading: false,
      fetchNotifications: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      deleteNotification: vi.fn(),
      clearNotifications: vi.fn(),
    });
  });

  test('renders bell icon when no unread notifications', () => {
    mockUseNotifications.mockReturnValue({
      unreadCount: 0,
      hasNewNotification: false
    });

    render(<NotificationButton />);

    expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('bell-ring-icon')).not.toBeInTheDocument();
    expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
  });

  test('renders bell ring icon when there are unread notifications', () => {
    mockUseNotifications.mockReturnValue({
      unreadCount: 3,
      hasNewNotification: true
    });

    render(<NotificationButton />);

    expect(screen.getByTestId('bell-ring-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('bell-icon')).not.toBeInTheDocument();
  });

  test('displays notification count badge when there are unread notifications', () => {
    mockUseNotifications.mockReturnValue({
      unreadCount: 5,
      hasNewNotification: true
    });

    render(<NotificationButton />);

    const badge = screen.getByTestId('notification-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('5');
  });

  test('displays 99+ when unread count exceeds 99', () => {
    mockUseNotifications.mockReturnValue({
      unreadCount: 150,
      hasNewNotification: true
    });

    render(<NotificationButton />);

    const badge = screen.getByTestId('notification-badge');
    expect(badge).toHaveTextContent('99+');
  });

  test('toggles dropdown when button is clicked', () => {
    mockUseNotifications.mockReturnValue({
      unreadCount: 0,
      hasNewNotification: false
    });

    render(<NotificationButton />);

    const button = screen.getByTestId('notification-button');
    const dropdown = screen.getByTestId('notification-dropdown');

    // Initially closed
    expect(dropdown).toHaveAttribute('data-open', 'false');

    // Click to open
    fireEvent.click(button);
    expect(dropdown).toHaveAttribute('data-open', 'true');

    // Click to close
    fireEvent.click(button);
    expect(dropdown).toHaveAttribute('data-open', 'false');
  });

  test('closes dropdown when close button is clicked', () => {
    mockUseNotifications.mockReturnValue({
      unreadCount: 0,
      hasNewNotification: false
    });

    render(<NotificationButton />);

    const button = screen.getByTestId('notification-button');
    fireEvent.click(button);

    const dropdown = screen.getByTestId('notification-dropdown');
    expect(dropdown).toHaveAttribute('data-open', 'true');

    const closeButton = screen.getByTestId('close-dropdown');
    fireEvent.click(closeButton);

    expect(dropdown).toHaveAttribute('data-open', 'false');
  });

  test('applies pulse animation when there are unread notifications', () => {
    mockUseNotifications.mockReturnValue({
      unreadCount: 2,
      hasNewNotification: true
    });

    render(<NotificationButton />);

    const button = screen.getByTestId('notification-button');
    expect(button).toHaveClass('animate-pulse');
  });

  test('does not apply pulse animation when no unread notifications', () => {
    mockUseNotifications.mockReturnValue({
      unreadCount: 0,
      hasNewNotification: false
    });

    render(<NotificationButton />);

    const button = screen.getByTestId('notification-button');
    expect(button).not.toHaveClass('animate-pulse');
  });

  test('plays notification sound when unread count increases', () => {
    const mockAudio = vi.mocked(global.Audio);
    const mockPlay = vi.fn().mockResolvedValue(undefined);
    mockAudio.mockImplementation(() => ({
      play: mockPlay,
      volume: 1
    } as any));

    mockUseNotifications.mockReturnValue({
      unreadCount: 1,
      hasNewNotification: true
    });

    render(<NotificationButton />);

    expect(mockAudio).toHaveBeenCalledWith('/notification-sound.mp3');
    expect(mockPlay).toHaveBeenCalled();
  });

  test('does not play sound when unread count is 0', () => {
    const mockAudio = vi.mocked(global.Audio);
    mockAudio.mockClear();

    mockUseNotifications.mockReturnValue({
      unreadCount: 0,
      hasNewNotification: false
    });

    render(<NotificationButton />);

    expect(mockAudio).not.toHaveBeenCalled();
  });

  test('handles audio play error gracefully', async () => {
    const mockAudio = vi.mocked(global.Audio);
    const mockPlay = vi.fn().mockRejectedValue(new Error('Audio play failed'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    mockAudio.mockImplementation(() => ({
      play: mockPlay,
      volume: 1
    } as any));

    mockUseNotifications.mockReturnValue({
      unreadCount: 1,
      hasNewNotification: true
    });

    render(<NotificationButton />);

    // Wait for the async operation to complete
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(consoleSpy).toHaveBeenCalledWith(new Error('Audio play failed'));
    consoleSpy.mockRestore();
  });

  test('applies correct styling classes', () => {
    mockUseNotifications.mockReturnValue({
      unreadCount: 0,
      hasNewNotification: false
    });

    render(<NotificationButton />);

    const button = screen.getByTestId('notification-button');
    expect(button).toHaveClass('relative');
    expect(button).toHaveClass('bg-white/50');
    expect(button).toHaveClass('backdrop-blur-sm');
    expect(button).toHaveClass('hover:bg-white/70');
  });

  test('badge has correct styling for destructive variant', () => {
    mockUseNotifications.mockReturnValue({
      unreadCount: 1,
      hasNewNotification: true
    });

    render(<NotificationButton />);

    const badge = screen.getByTestId('notification-badge');
    expect(badge).toHaveAttribute('data-variant', 'destructive');
    expect(badge).toHaveClass('absolute');
    expect(badge).toHaveClass('-top-1');
    expect(badge).toHaveClass('-right-1');
  });
});
