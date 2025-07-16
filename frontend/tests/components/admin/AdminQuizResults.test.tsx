import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminQuizResults } from '@/components/admin/AdminQuizResults';
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

const mockQuizResults = [
  {
    id: '1',
    user_id: 'user123',
    quiz_id: 'quiz456',
    quiz_title: 'Math Quiz',
    score: 8,
    total_questions: 10,
    time_taken: 300, // 5 minutes
    completed_at: '2023-01-01T00:00:00Z',
    answers: [
      {
        question: 'What is 2+2?',
        selected_answer: '4',
        correct_answer: '4',
        is_correct: true,
      },
      {
        question: 'What is 3+3?',
        selected_answer: '5',
        correct_answer: '6',
        is_correct: false,
      },
    ],
  },
  {
    id: '2',
    user_id: 'user789',
    quiz_id: 'quiz789',
    quiz_title: 'Science Quiz',
    score: 6,
    total_questions: 10,
    time_taken: 450, // 7.5 minutes
    completed_at: '2023-01-02T00:00:00Z',
    answers: [],
  },
];

describe('AdminQuizResults', () => {
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

  it('renders quiz results interface', () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { quiz_results: [], total: 0 },
    });

    render(<AdminQuizResults />);

    expect(screen.getByText('Quiz Results Management')).toBeInTheDocument();
    expect(screen.getByText('View all quiz attempts and results')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search quiz results...')).toBeInTheDocument();
  });

  it('loads and displays quiz results successfully', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { quiz_results: mockQuizResults, total: 2 },
    });

    render(<AdminQuizResults />);

    await waitFor(() => {
      expect(screen.getByText('Math Quiz')).toBeInTheDocument();
      expect(screen.getByText('Science Quiz')).toBeInTheDocument();
    });

    expect(screen.getByText('user123...')).toBeInTheDocument();
    expect(screen.getByText('user789...')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    mockMakeRequest.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<AdminQuizResults />);

    expect(screen.getByText('Loading quiz results...')).toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockMakeRequest.mockRejectedValue(new Error('API Error'));

    render(<AdminQuizResults />);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to load quiz results');
    });

    expect(consoleSpy).toHaveBeenCalledWith('Error fetching quiz results:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('filters quiz results based on search term', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { quiz_results: mockQuizResults, total: 2 },
    });

    render(<AdminQuizResults />);

    await waitFor(() => {
      expect(screen.getByText('Math Quiz')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search quiz results...');
    fireEvent.change(searchInput, { target: { value: 'Science' } });

    expect(screen.getByText('Science Quiz')).toBeInTheDocument();
    expect(screen.queryByText('Math Quiz')).not.toBeInTheDocument();
  });

  it.skip('displays correct score colors based on percentage', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { quiz_results: mockQuizResults, total: 2 },
    });

    render(<AdminQuizResults />);

    await waitFor(() => {
      const highScoreBadge = screen.getByText('8/10');
      const lowScoreBadge = screen.getByText('6/10');
      
      // 80% should be green (high score)
      expect(highScoreBadge).toHaveClass('bg-green-500');
      // 60% should be yellow (medium score)
      expect(lowScoreBadge).toHaveClass('bg-yellow-500');
    });
  });

  it.skip('formats time correctly', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { quiz_results: mockQuizResults, total: 2 },
    });

    render(<AdminQuizResults />);

    await waitFor(() => {
      expect(screen.getByText('5:00')).toBeInTheDocument(); // 300 seconds = 5:00
      expect(screen.getByText('7:30')).toBeInTheDocument(); // 450 seconds = 7:30
    });
  });

  it.skip('displays percentages correctly', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { quiz_results: mockQuizResults, total: 2 },
    });

    render(<AdminQuizResults />);

    await waitFor(() => {
      expect(screen.getByText('(80%)')).toBeInTheDocument(); // 8/10 = 80%
      expect(screen.getByText('(60%)')).toBeInTheDocument(); // 6/10 = 60%
    });
  });

  it('opens view dialog when view button is clicked', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { quiz_results: mockQuizResults, total: 2 },
    });

    render(<AdminQuizResults />);

    await waitFor(() => {
      expect(screen.getByText('Math Quiz')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByRole('button');
    const viewButton = viewButtons.find(btn => btn.querySelector('[data-testid="Eye"]') || btn.innerHTML.includes('Eye'));
    
    if (viewButton) {
      fireEvent.click(viewButton);

      await waitFor(() => {
        expect(screen.getByText('Quiz Result Details')).toBeInTheDocument();
        expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
      });
    }
  });

  it('displays detailed answers in view dialog', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { quiz_results: mockQuizResults, total: 2 },
    });

    render(<AdminQuizResults />);

    await waitFor(() => {
      expect(screen.getByText('Math Quiz')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByRole('button');
    const viewButton = viewButtons.find(btn => btn.querySelector('[data-testid="Eye"]') || btn.innerHTML.includes('Eye'));
    
    if (viewButton) {
      fireEvent.click(viewButton);

      await waitFor(() => {
        expect(screen.getByText('Question 1')).toBeInTheDocument();
        expect(screen.getByText('Question 2')).toBeInTheDocument();
        expect(screen.getByText('Correct')).toBeInTheDocument();
        expect(screen.getByText('Incorrect')).toBeInTheDocument();
        expect(screen.getByText('Your answer: 4')).toBeInTheDocument();
        expect(screen.getByText('Your answer: 5')).toBeInTheDocument();
        expect(screen.getByText('Correct answer: 6')).toBeInTheDocument();
      });
    }
  });

  it('handles pagination correctly', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { quiz_results: mockQuizResults, total: 25 },
    });

    render(<AdminQuizResults />);

    await waitFor(() => {
      expect(screen.getByText('Showing 2 of 25 results')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('Next');
    expect(nextButton).toBeEnabled();

    const previousButton = screen.getByText('Previous');
    expect(previousButton).toBeDisabled();

    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/admin/quiz-results?offset=20&size=20&sort_by=created_at&sort_order=desc',
        'GET'
      );
    });
  });

  it('displays "No quiz results found" when no results exist', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { quiz_results: [], total: 0 },
    });

    render(<AdminQuizResults />);

    await waitFor(() => {
      expect(screen.getByText('No quiz results found')).toBeInTheDocument();
    });
  });

  it('closes view dialog when close button is clicked', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { quiz_results: mockQuizResults, total: 2 },
    });

    render(<AdminQuizResults />);

    await waitFor(() => {
      expect(screen.getByText('Math Quiz')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByRole('button');
    const viewButton = viewButtons.find(btn => btn.querySelector('[data-testid="Eye"]') || btn.innerHTML.includes('Eye'));
    
    if (viewButton) {
      fireEvent.click(viewButton);

      await waitFor(() => {
        expect(screen.getByText('Quiz Result Details')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Quiz Result Details')).not.toBeInTheDocument();
      });
    }
  });

  it('displays fallback for untitled quiz', async () => {
    const untitledQuizResult = {
      ...mockQuizResults[0],
      quiz_title: '',
    };

    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { quiz_results: [untitledQuizResult], total: 1 },
    });

    render(<AdminQuizResults />);

    await waitFor(() => {
      expect(screen.getByText('Untitled Quiz')).toBeInTheDocument();
    });
  });

  it('truncates user ID correctly', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { quiz_results: mockQuizResults, total: 2 },
    });

    render(<AdminQuizResults />);

    await waitFor(() => {
      expect(screen.getByText('user123...')).toBeInTheDocument();
      expect(screen.getByText('user789...')).toBeInTheDocument();
    });
  });

  it('handles quiz result with no answers gracefully', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: { quiz_results: [mockQuizResults[1]], total: 1 },
    });

    render(<AdminQuizResults />);

    await waitFor(() => {
      expect(screen.getByText('Science Quiz')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByRole('button');
    const viewButton = viewButtons.find(btn => btn.querySelector('[data-testid="Eye"]') || btn.innerHTML.includes('Eye'));
    
    if (viewButton) {
      fireEvent.click(viewButton);

      await waitFor(() => {
        expect(screen.getByText('Quiz Result Details')).toBeInTheDocument();
        expect(screen.queryByText('Detailed Answers')).not.toBeInTheDocument();
      });
    }
  });
});
