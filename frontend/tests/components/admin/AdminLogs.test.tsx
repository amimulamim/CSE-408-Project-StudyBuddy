import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminLogs } from '@/components/admin/AdminLogs';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('@/lib/apiCall');
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

const mockMakeRequest = vi.mocked(makeRequest);
const mockToast = vi.mocked(toast);

const mockLogs = [
  {
    id: '1',
    admin_uid: 'admin123',
    action_type: 'user_edit',
    target_uid: 'user456',
    target_type: 'user',
    details: { field: 'name', old_value: 'John', new_value: 'John Doe' },
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0',
    created_at: '2023-01-01T00:00:00Z',
  },
  {
    id: '2',
    admin_uid: 'admin789',
    action_type: 'notification_send',
    target_uid: 'user123',
    target_type: 'notification',
    details: { message: 'Welcome message' },
    ip_address: '192.168.1.2',
    user_agent: 'Mozilla/5.0',
    created_at: '2023-01-02T00:00:00Z',
  },
];

describe('AdminLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock environment variable
    Object.defineProperty(import.meta, 'env', {
      value: { VITE_BACKEND_URL: 'http://localhost:8000' },
      writable: true,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders admin logs interface', () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { logs: [], total: 0 },
    });

    render(<AdminLogs />);

    expect(screen.getByText('Admin Activity Logs')).toBeInTheDocument();
    expect(screen.getByText('View all admin actions and system events')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search logs...')).toBeInTheDocument();
  });

  it('loads and displays logs successfully', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { logs: mockLogs, total: 2 },
    });

    render(<AdminLogs />);

    await waitFor(() => {
      expect(screen.getByText('user edit')).toBeInTheDocument();
      expect(screen.getByText('notification send')).toBeInTheDocument();
    });

    expect(screen.getByText('admin123...')).toBeInTheDocument();
    expect(screen.getByText('admin789...')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    mockMakeRequest.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<AdminLogs />);

    expect(screen.getByText('Loading logs...')).toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockMakeRequest.mockRejectedValue(new Error('API Error'));

    render(<AdminLogs />);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to load admin logs');
    });

    expect(consoleSpy).toHaveBeenCalledWith('Error fetching admin logs:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('filters logs based on search term', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { logs: mockLogs, total: 2 },
    });

    render(<AdminLogs />);

    await waitFor(() => {
      expect(screen.getByText('user edit')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search logs...');
    fireEvent.change(searchInput, { target: { value: 'notification' } });

    expect(screen.getByText('notification send')).toBeInTheDocument();
    expect(screen.queryByText('user edit')).not.toBeInTheDocument();
  });

  it('displays correct badge colors for action types', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { logs: mockLogs, total: 2 },
    });

    render(<AdminLogs />);

    await waitFor(() => {
      const userEditBadge = screen.getByText('user edit');
      const notificationSendBadge = screen.getByText('notification send');
      
      expect(userEditBadge).toHaveClass('bg-blue-500');
      expect(notificationSendBadge).toHaveClass('bg-purple-500');
    });
  });

  it('filters logs by action type', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { logs: mockLogs, total: 2 },
    });

    render(<AdminLogs />);

    await waitFor(() => {
      expect(screen.getByText('user edit')).toBeInTheDocument();
    });

    // Find and click the action type filter combobox
    const actionTypeSelect = screen.getByRole('combobox');
    fireEvent.click(actionTypeSelect);

    // This would trigger a new API call with the filter
    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/admin/logs'),
        'GET'
      );
    });
  });

  it('filters logs by admin UID', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { logs: mockLogs, total: 2 },
    });

    render(<AdminLogs />);

    await waitFor(() => {
      expect(screen.getByText('user edit')).toBeInTheDocument();
    });

    const adminUidInput = screen.getByPlaceholderText('Filter by Admin UID');
    fireEvent.change(adminUidInput, { target: { value: 'admin123' } });

    // This should trigger a new API call with the admin UID filter
    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.stringContaining('admin_uid=admin123'),
        'GET'
      );
    });
  });

  it('clears all filters when clear button is clicked', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { logs: mockLogs, total: 2 },
    });

    render(<AdminLogs />);

    await waitFor(() => {
      expect(screen.getByText('user edit')).toBeInTheDocument();
    });

    // Set some filters first
    const searchInput = screen.getByPlaceholderText('Search logs...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    const adminUidInput = screen.getByPlaceholderText('Filter by Admin UID');
    fireEvent.change(adminUidInput, { target: { value: 'admin123' } });

    // Click clear filters button
    const clearButton = screen.getByText('Clear Filters');
    fireEvent.click(clearButton);

    expect(searchInput).toHaveValue('');
    expect(adminUidInput).toHaveValue('');
  });

  it('handles pagination correctly', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { logs: mockLogs, total: 25 },
    });

    render(<AdminLogs />);

    await waitFor(() => {
      expect(screen.getByText('Showing 2 of 25 logs')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('Next');
    expect(nextButton).toBeEnabled();

    const previousButton = screen.getByText('Previous');
    expect(previousButton).toBeDisabled();

    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.stringContaining('offset=20&size=20'),
        'GET'
      );
    });
  });

  it('displays "No logs found" when no logs exist', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { logs: [], total: 0 },
    });

    render(<AdminLogs />);

    await waitFor(() => {
      expect(screen.getByText('No logs found')).toBeInTheDocument();
    });
  });

  it('truncates details correctly', async () => {
    const longDetailsLog = {
      ...mockLogs[0],
      details: { very_long_field: 'This is a very long string that should be truncated in the display' },
    };

    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { logs: [longDetailsLog], total: 1 },
    });

    render(<AdminLogs />);

    await waitFor(() => {
      const detailsText = screen.getByText(/very_long_field/);
      expect(detailsText.textContent).toContain('...');
    });
  });

  it('displays N/A for empty details', async () => {
    const noDetailsLog = {
      ...mockLogs[0],
      details: null,
    };

    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { logs: [noDetailsLog], total: 1 },
    });

    render(<AdminLogs />);

    await waitFor(() => {
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });

  it('formats timestamps correctly', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { logs: mockLogs, total: 2 },
    });

    render(<AdminLogs />);

    await waitFor(() => {
      // Check for formatted timestamps - use regex to be more flexible with timezone
      expect(screen.getByText(/1\/1\/2023/)).toBeInTheDocument();
      expect(screen.getByText(/1\/2\/2023/)).toBeInTheDocument();
    });
  });

  it('displays target information correctly', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { logs: mockLogs, total: 2 },
    });

    render(<AdminLogs />);

    await waitFor(() => {
      expect(screen.getByText('user')).toBeInTheDocument();
      expect(screen.getByText('notification')).toBeInTheDocument();
      expect(screen.getByText('user456...')).toBeInTheDocument();
      expect(screen.getByText('user123...')).toBeInTheDocument();
    });
  });
});
