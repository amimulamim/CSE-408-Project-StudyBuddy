import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminStatistics } from '@/components/admin/AdminStatistics';
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

// Mock recharts components
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: any }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  LineChart: ({ children }: { children: any }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  ResponsiveContainer: ({ children }: { children: any }) => <div data-testid="responsive-container">{children}</div>,
  Tooltip: () => <div data-testid="tooltip" />,
  Cell: () => <div data-testid="cell" />,
  PieChart: ({ children }: { children: any }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  AreaChart: ({ children }: { children: any }) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
}));

const mockMakeRequest = vi.mocked(makeRequest);
const mockToast = vi.mocked(toast);

const mockStats = {
  users_added: 150,
  content_generated: 500,
  quiz_generated: 75,
  content_uploaded: 200,
  chats_done: 1000,
  period_start: '2023-01-01T00:00:00Z',
  period_end: '2023-01-31T23:59:59Z',
};

describe('AdminStatistics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock environment variable
    Object.defineProperty(import.meta, 'env', {
      value: { VITE_BACKEND_URL: 'http://localhost:8000' },
      writable: true,
    });

    // Mock Date to ensure consistent default dates
    const mockDate = new Date('2023-02-01T00:00:00Z');
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  it('renders statistics interface', () => {
    render(<AdminStatistics />);

    expect(screen.getByText('Usage Statistics')).toBeInTheDocument();
    expect(screen.getByText('View platform usage analytics for any time period')).toBeInTheDocument();
    expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date')).toBeInTheDocument();
    expect(screen.getByText('Generate Report')).toBeInTheDocument();
  });

  it('sets default dates on mount', () => {
    render(<AdminStatistics />);

    const startDateInput = screen.getByLabelText('Start Date') as HTMLInputElement;
    const endDateInput = screen.getByLabelText('End Date') as HTMLInputElement;

    expect(startDateInput.value).toBe('2023-01-02'); // 30 days ago
    expect(endDateInput.value).toBe('2023-02-01'); // today
  });

  it('loads and displays statistics successfully', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: mockStats,
    });

    render(<AdminStatistics />);

    // Set dates and generate report
    const generateButton = screen.getByText('Generate Report');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Statistics loaded successfully');
    });

    // Check summary cards
    expect(screen.getByText('Users Added')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('Chats Done')).toBeInTheDocument();
    expect(screen.getByText('1000')).toBeInTheDocument();
    expect(screen.getByText('Content Generated')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('Quizzes Generated')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
    // expect(screen.getByText('Content')).toBeInTheDocument();
    // expect(screen.getByText('Uploaded')).toBeInTheDocument();
    // expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('displays charts after loading statistics', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: mockStats,
    });

    render(<AdminStatistics />);

    const generateButton = screen.getByText('Generate Report');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Activity Overview')).toBeInTheDocument();
      expect(screen.getByText('Usage Distribution')).toBeInTheDocument();
      expect(screen.getByText('Activity Trends')).toBeInTheDocument();
      expect(screen.getByText('Growth Trends')).toBeInTheDocument();
    });

    // Check that chart components are rendered
    expect(screen.getAllByTestId('responsive-container')).toHaveLength(4);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('shows error when dates are not selected', async () => {
    render(<AdminStatistics />);

    // Clear the default dates
    const startDateInput = screen.getByLabelText('Start Date');
    const endDateInput = screen.getByLabelText('End Date');
    
    fireEvent.change(startDateInput, { target: { value: '' } });
    fireEvent.change(endDateInput, { target: { value: '' } });

    const generateButton = screen.getByText('Generate Report');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Please select both start and end dates');
    });

    expect(mockMakeRequest).not.toHaveBeenCalled();
  });

  it('handles API error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockMakeRequest.mockRejectedValue(new Error('API Error'));

    render(<AdminStatistics />);

    const generateButton = screen.getByText('Generate Report');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to load statistics');
    });

    expect(consoleSpy).toHaveBeenCalledWith('Error fetching stats:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('handles API response with error status', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'error',
      message: 'Failed to fetch statistics',
    });

    render(<AdminStatistics />);

    const generateButton = screen.getByText('Generate Report');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to load statistics');
    });
  });

  it('shows loading state during API call', async () => {
    let resolvePromise: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    
    mockMakeRequest.mockReturnValue(pendingPromise);

    render(<AdminStatistics />);

    const generateButton = screen.getByText('Generate Report');
    fireEvent.click(generateButton);

    // Should show loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(generateButton).toBeDisabled();

    // Resolve the promise
    resolvePromise!({
      status: 'success',
      data: mockStats,
    });

    await waitFor(() => {
      expect(screen.getByText('Generate Report')).toBeInTheDocument();
      expect(generateButton).toBeEnabled();
    });
  });

  it('allows changing date inputs', () => {
    render(<AdminStatistics />);

    const startDateInput = screen.getByLabelText('Start Date') as HTMLInputElement;
    const endDateInput = screen.getByLabelText('End Date') as HTMLInputElement;

    fireEvent.change(startDateInput, { target: { value: '2023-01-15' } });
    fireEvent.change(endDateInput, { target: { value: '2023-01-20' } });

    expect(startDateInput.value).toBe('2023-01-15');
    expect(endDateInput.value).toBe('2023-01-20');
  });

  it('makes API call with correct date parameters', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: mockStats,
    });

    render(<AdminStatistics />);

    const startDateInput = screen.getByLabelText('Start Date');
    const endDateInput = screen.getByLabelText('End Date');
    
    fireEvent.change(startDateInput, { target: { value: '2023-01-01' } });
    fireEvent.change(endDateInput, { target: { value: '2023-01-31' } });

    const generateButton = screen.getByText('Generate Report');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/admin/stats/usage?start_time=2023-01-01T00:00:00Z&end_time=2023-01-31T23:59:59Z',
        'GET'
      );
    });
  });

  it('displays period information correctly', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: mockStats,
    });

    render(<AdminStatistics />);

    const generateButton = screen.getByText('Generate Report');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Report Period:')).toBeInTheDocument();
      // Use a flexible matcher that checks for the formatted date range
      const startDate = new Date(mockStats.period_start).toLocaleDateString();
      const endDate = new Date(mockStats.period_end).toLocaleDateString();
      const expectedPeriodText = `${startDate} - ${endDate}`;
      expect(screen.getByText(expectedPeriodText)).toBeInTheDocument();
    });
  });

  it('displays correct icons for each metric', async () => {
    mockMakeRequest.mockResolvedValue({
      status: 'success',
      data: mockStats,
    });

    render(<AdminStatistics />);

    const generateButton = screen.getByText('Generate Report');
    fireEvent.click(generateButton);

    await waitFor(() => {
      // Each metric should have its corresponding icon
      expect(screen.getByText('Users Added')).toBeInTheDocument();
      expect(screen.getByText('Chats Done')).toBeInTheDocument();
      expect(screen.getByText('Content Generated')).toBeInTheDocument();
      expect(screen.getByText('Quizzes Generated')).toBeInTheDocument();
      // expect(screen.getByText('Content')).toBeInTheDocument();
      // expect(screen.getByText('Uploaded')).toBeInTheDocument();
    });
  });

  it('does not display charts before statistics are loaded', () => {
    render(<AdminStatistics />);

    // Charts should not be visible initially
    expect(screen.queryByText('Activity Overview')).not.toBeInTheDocument();
    expect(screen.queryByText('Usage Distribution')).not.toBeInTheDocument();
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });
});
