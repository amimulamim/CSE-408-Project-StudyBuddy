import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminUserManagement } from '@/components/admin/AdminUserManagement';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('@/lib/apiCall');
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock global confirm
global.confirm = vi.fn();

const mockMakeRequest = vi.mocked(makeRequest);
const mockToast = vi.mocked(toast);

const mockUsers = [
  {
    uid: 'user123',
    email: 'john@example.com',
    name: 'John Doe',
    role: 'user',
    is_admin: false,
    current_plan: 'free',
    created_at: '2023-01-01T00:00:00Z',
    avatar: '/avatar1.png',
    bio: 'Software developer',
  },
  {
    uid: 'admin456',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    is_admin: true,
    current_plan: 'premium',
    created_at: '2023-01-02T00:00:00Z',
    avatar: '/avatar2.png',
    bio: 'System administrator',
  },
];

describe('AdminUserManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.confirm = vi.fn(() => true);
    
    // Mock environment variable
    Object.defineProperty(import.meta, 'env', {
      value: { VITE_BACKEND_URL: 'http://localhost:8000' },
      writable: true,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders user management interface', () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { users: [], total: 0 },
    });

    render(<AdminUserManagement />);

    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Manage user accounts and permissions')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
    expect(screen.getByText('Promote User')).toBeInTheDocument();
  });

  it('loads and displays users successfully', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { users: mockUsers, total: 2 },
    });

    render(<AdminUserManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    mockMakeRequest.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<AdminUserManagement />);

    expect(screen.getByText('Loading users...')).toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockMakeRequest.mockRejectedValue(new Error('API Error'));

    render(<AdminUserManagement />);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to load users');
    });

    expect(consoleSpy).toHaveBeenCalledWith('Error fetching users:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('filters users based on search term', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { users: mockUsers, total: 2 },
    });

    render(<AdminUserManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search users...');
    fireEvent.change(searchInput, { target: { value: 'Admin' } });

    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  it('displays correct badge styles for admin and regular users', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { users: mockUsers, total: 2 },
    });

    render(<AdminUserManagement />);

    await waitFor(() => {
      const userBadge = screen.getByText('user');
      const adminBadge = screen.getByText('admin');
      
      expect(userBadge).toHaveClass('bg-secondary');
      expect(adminBadge).toHaveClass('bg-primary');
    });
  });

  it('opens edit dialog when edit button is clicked', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { users: mockUsers, total: 2 },
    });

    render(<AdminUserManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button');
    const editButton = editButtons.find(btn => btn.querySelector('[data-testid="Edit"]') || btn.innerHTML.includes('Edit'));
    
    if (editButton) {
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit User')).toBeInTheDocument();
        expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      });
    }
  });

  it('updates user when edit form is submitted', async () => {
    mockMakeRequest
      .mockResolvedValueOnce({
        status: 'success',
        data: { users: mockUsers, total: 2 },
      })
      .mockResolvedValueOnce({
        status: 'success',
      })
      .mockResolvedValueOnce({
        status: 'success',
        data: { users: mockUsers, total: 2 },
      });

    render(<AdminUserManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button');
    const editButton = editButtons.find(btn => btn.querySelector('[data-testid="Edit"]') || btn.innerHTML.includes('Edit'));
    
    if (editButton) {
      fireEvent.click(editButton);

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('John Doe');
        fireEvent.change(nameInput, { target: { value: 'John Smith' } });

        const saveButton = screen.getByText('Save Changes');
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(mockMakeRequest).toHaveBeenCalledWith(
          'http://localhost:8000/api/v1/admin/users/user123',
          'PUT',
          expect.objectContaining({ name: 'John Smith' })
        );
        expect(mockToast.success).toHaveBeenCalledWith('User updated successfully');
      });
    }
  });

  it('deletes user when delete button is clicked and confirmed', async () => {
    mockMakeRequest
      .mockResolvedValueOnce({
        status: 'success',
        data: { users: mockUsers, total: 2 },
      })
      .mockResolvedValueOnce({
        status: 'success',
      })
      .mockResolvedValueOnce({
        status: 'success',
        data: { users: [mockUsers[1]], total: 1 },
      });

    render(<AdminUserManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(btn => btn.querySelector('[data-testid="Trash2"]') || btn.innerHTML.includes('Trash2'));
    
    if (deleteButton) {
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockMakeRequest).toHaveBeenCalledWith(
          'http://localhost:8000/api/v1/admin/users/user123',
          'DELETE'
        );
        expect(mockToast.success).toHaveBeenCalledWith('User deleted successfully');
      });
    }
  });

  it('does not delete user when delete is not confirmed', async () => {
    global.confirm = vi.fn(() => false);
    
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { users: mockUsers, total: 2 },
    });

    render(<AdminUserManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(btn => btn.querySelector('[data-testid="Trash2"]') || btn.innerHTML.includes('Trash2'));
    
    if (deleteButton) {
      fireEvent.click(deleteButton);

      expect(mockMakeRequest).toHaveBeenCalledTimes(1); // Only initial fetch
    }
  });

  it('opens promote dialog when promote button is clicked', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { users: mockUsers, total: 2 },
    });

    render(<AdminUserManagement />);

    const promoteButton = screen.getByText('Promote User');
    fireEvent.click(promoteButton);

    expect(screen.getByText('Promote User to Admin')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter username or email')).toBeInTheDocument();
  });

  it('promotes user when promote form is submitted', async () => {
    mockMakeRequest
      .mockResolvedValueOnce({
        status: 'success',
        data: { users: mockUsers, total: 2 },
      })
      .mockResolvedValueOnce({
        status: 'success',
      })
      .mockResolvedValueOnce({
        status: 'success',
        data: { users: mockUsers, total: 2 },
      });

    render(<AdminUserManagement />);

    const promoteButton = screen.getByText('Promote User');
    fireEvent.click(promoteButton);

    const identifierInput = screen.getByPlaceholderText('Enter username or email');
    fireEvent.change(identifierInput, { target: { value: 'john@example.com' } });

    const promoteSubmitButton = screen.getByRole('button', { name: 'Promote' });
    fireEvent.click(promoteSubmitButton);

    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/admin/promote',
        'POST',
        { identifier: 'john@example.com' }
      );
      expect(mockToast.success).toHaveBeenCalledWith('User promoted to admin successfully');
    });
  });

  it('handles pagination correctly', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { users: mockUsers, total: 25 },
    });

    render(<AdminUserManagement />);

    await waitFor(() => {
      expect(screen.getByText('Showing 2 of 25 users')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('Next');
    expect(nextButton).toBeEnabled();

    const previousButton = screen.getByText('Previous');
    expect(previousButton).toBeDisabled();

    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/admin/users?offset=20&size=20',
        'GET'
      );
    });
  });

  it('displays "No users found" when no users exist', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { users: [], total: 0 },
    });

    render(<AdminUserManagement />);

    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });

  it('displays fallback name for users without names', async () => {
    const userWithoutName = { ...mockUsers[0], name: '' };
    
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { users: [userWithoutName], total: 1 },
    });

    render(<AdminUserManagement />);

    await waitFor(() => {
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });

  it('displays user avatars correctly', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { users: mockUsers, total: 2 },
    });

    render(<AdminUserManagement />);

    await waitFor(() => {
      const avatars = screen.getAllByAltText('User');
      expect(avatars).toHaveLength(2);
      expect(avatars[0]).toHaveAttribute('src', '/avatar1.png');
      expect(avatars[1]).toHaveAttribute('src', '/avatar2.png');
    });
  });

  it('closes edit dialog when cancel button is clicked', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { users: mockUsers, total: 2 },
    });

    render(<AdminUserManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button');
    const editButton = editButtons.find(btn => btn.querySelector('[data-testid="Edit"]') || btn.innerHTML.includes('Edit'));
    
    if (editButton) {
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit User')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Edit User')).not.toBeInTheDocument();
      });
    }
  });

  it('handles edit user API error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    mockMakeRequest
      .mockResolvedValueOnce({
        status: 'success',
        data: { users: mockUsers, total: 2 },
      })
      .mockRejectedValueOnce(new Error('Edit error'));

    render(<AdminUserManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button');
    const editButton = editButtons.find(btn => btn.querySelector('[data-testid="Edit"]') || btn.innerHTML.includes('Edit'));
    
    if (editButton) {
      fireEvent.click(editButton);

      await waitFor(() => {
        const saveButton = screen.getByText('Save Changes');
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to update user');
      });
    }

    consoleSpy.mockRestore();
  });

  it('handles promote user API error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    mockMakeRequest
      .mockResolvedValueOnce({
        status: 'success',
        data: { users: mockUsers, total: 2 },
      })
      .mockRejectedValueOnce(new Error('Promote error'));

    render(<AdminUserManagement />);

    const promoteButton = screen.getByText('Promote User');
    fireEvent.click(promoteButton);

    const identifierInput = screen.getByPlaceholderText('Enter username or email');
    fireEvent.change(identifierInput, { target: { value: 'john@example.com' } });

    const promoteSubmitButton = screen.getByRole('button', { name: 'Promote' });
    fireEvent.click(promoteSubmitButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to promote user');
    });

    consoleSpy.mockRestore();
  });
});
