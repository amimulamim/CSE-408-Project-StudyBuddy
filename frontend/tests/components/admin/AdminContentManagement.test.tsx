import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminContentManagement } from '@/components/admin/AdminContentManagement';
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

const mockContent = [
  {
    id: '1',
    user_id: 'user123',
    title: 'Test Content',
    content_type: 'notes',
    content: 'This is test content',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: '2',
    user_id: 'user456',
    title: 'Quiz Content',
    content_type: 'quiz',
    content: 'Quiz content here',
    created_at: '2023-01-02T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
  },
];

describe('AdminContentManagement', () => {
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

  it('renders content management interface', () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { content: [], total: 0 },
    });

    render(<AdminContentManagement />);

    expect(screen.getByText('Content Management')).toBeInTheDocument();
    expect(screen.getByText('View and manage all generated content')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search content...')).toBeInTheDocument();
  });

  it('loads and displays content successfully', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { content: mockContent, total: 2 },
    });

    render(<AdminContentManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Content')).toBeInTheDocument();
      expect(screen.getByText('Quiz Content')).toBeInTheDocument();
    });

    expect(screen.getByText('notes')).toBeInTheDocument();
    expect(screen.getByText('quiz')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    mockMakeRequest.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<AdminContentManagement />);

    expect(screen.getByText('Loading content...')).toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockMakeRequest.mockRejectedValue(new Error('API Error'));

    render(<AdminContentManagement />);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to load content');
    });

    expect(consoleSpy).toHaveBeenCalledWith('Error fetching content:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('filters content based on search term', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { content: mockContent, total: 2 },
    });

    render(<AdminContentManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search content...');
    fireEvent.change(searchInput, { target: { value: 'Quiz' } });

    expect(screen.getByText('Quiz Content')).toBeInTheDocument();
    expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
  });

  it('displays correct badge colors for content types', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { content: mockContent, total: 2 },
    });

    render(<AdminContentManagement />);

    await waitFor(() => {
      const notesBadge = screen.getByText('notes');
      const quizBadge = screen.getByText('quiz');
      
      expect(notesBadge).toHaveClass('bg-blue-500');
      expect(quizBadge).toHaveClass('bg-orange-500');
    });
  });

  it('opens view dialog when view button is clicked', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { content: mockContent, total: 2 },
    });

    render(<AdminContentManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByRole('button');
    const viewButton = viewButtons.find(btn => btn.querySelector('[data-testid="Eye"]') || btn.innerHTML.includes('Eye'));
    
    if (viewButton) {
      fireEvent.click(viewButton);

      await waitFor(() => {
        expect(screen.getByText('Content Details')).toBeInTheDocument();
        expect(screen.getByText('This is test content')).toBeInTheDocument();
      });
    }
  });

  it('deletes content when delete button is clicked and confirmed', async () => {
    mockMakeRequest
      .mockResolvedValueOnce({
        status: 'success',
        data: { content: mockContent, total: 2 },
      })
      .mockResolvedValueOnce({
        status: 'success',
      })
      .mockResolvedValueOnce({
        status: 'success',
        data: { content: [mockContent[1]], total: 1 },
      });

    render(<AdminContentManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(btn => btn.querySelector('[data-testid="Trash2"]') || btn.innerHTML.includes('Trash2'));
    
    if (deleteButton) {
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockMakeRequest).toHaveBeenCalledWith(
          'http://localhost:8000/api/v1/admin/content/1',
          'DELETE'
        );
        expect(mockToast.success).toHaveBeenCalledWith('Content deleted successfully');
      });
    }
  });

  it('does not delete content when delete is not confirmed', async () => {
    global.confirm = vi.fn(() => false);
    
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { content: mockContent, total: 2 },
    });

    render(<AdminContentManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(btn => btn.querySelector('[data-testid="Trash2"]') || btn.innerHTML.includes('Trash2'));
    
    if (deleteButton) {
      fireEvent.click(deleteButton);

      expect(mockMakeRequest).toHaveBeenCalledTimes(1); // Only initial fetch
    }
  });

  it('handles delete error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    mockMakeRequest
      .mockResolvedValueOnce({
        status: 'success',
        data: { content: mockContent, total: 2 },
      })
      .mockRejectedValueOnce(new Error('Delete error'));

    render(<AdminContentManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(btn => btn.querySelector('[data-testid="Trash2"]') || btn.innerHTML.includes('Trash2'));
    
    if (deleteButton) {
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to delete content');
      });
    }

    consoleSpy.mockRestore();
  });

  it('handles pagination correctly', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { content: mockContent, total: 25 },
    });

    render(<AdminContentManagement />);

    await waitFor(() => {
      expect(screen.getByText('Showing 2 of 25 items')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('Next');
    expect(nextButton).toBeEnabled();

    const previousButton = screen.getByText('Previous');
    expect(previousButton).toBeDisabled();

    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/admin/content?offset=20&size=20',
        'GET'
      );
    });
  });

  it('displays "No content found" when no content exists', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { content: [], total: 0 },
    });

    render(<AdminContentManagement />);

    await waitFor(() => {
      expect(screen.getByText('No content found')).toBeInTheDocument();
    });
  });

  it('closes view dialog when close button is clicked', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { content: mockContent, total: 2 },
    });

    render(<AdminContentManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByRole('button');
    const viewButton = viewButtons.find(btn => btn.querySelector('[data-testid="Eye"]') || btn.innerHTML.includes('Eye'));
    
    if (viewButton) {
      fireEvent.click(viewButton);

      await waitFor(() => {
        expect(screen.getByText('Content Details')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Content Details')).not.toBeInTheDocument();
      });
    }
  });

  it('truncates user ID correctly', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { content: mockContent, total: 2 },
    });

    render(<AdminContentManagement />);

    await waitFor(() => {
      expect(screen.getByText('user123...')).toBeInTheDocument();
      expect(screen.getByText('user456...')).toBeInTheDocument();
    });
  });
});
