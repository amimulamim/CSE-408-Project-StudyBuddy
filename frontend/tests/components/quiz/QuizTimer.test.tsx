import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, test, expect, describe, beforeEach, afterEach } from 'vitest';
import { QuizTimer } from '../../../src/components/quiz/QuizTimer';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Clock: () => <div data-testid="clock-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Timer: () => <div data-testid="timer-icon" />
}));

// Mock audio for time up sound
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    createOscillator: vi.fn().mockReturnValue({
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: { value: 0 },
      type: 'sine'
    }),
    createGain: vi.fn().mockReturnValue({
      connect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn()
      }
    }),
    destination: {},
    currentTime: 0
  }))
});

Object.defineProperty(window, 'Audio', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    currentTime: 0,
    duration: 0
  }))
});

describe('QuizTimer', () => {
  let mockOnTimeUp: any;

  beforeEach(() => {
    vi.useFakeTimers();
    mockOnTimeUp = vi.fn();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  test('renders timer with correct initial time', () => {
    render(<QuizTimer duration={30} onTimeUp={mockOnTimeUp} />);

    expect(screen.getByText('30:00')).toBeInTheDocument();
    expect(screen.getByTestId('timer-icon')).toBeInTheDocument();
  });

  test('displays time in correct format', () => {
    render(<QuizTimer duration={5} onTimeUp={mockOnTimeUp} />);

    expect(screen.getByText('05:00')).toBeInTheDocument();
  });

  test('counts down correctly', async () => {
    render(<QuizTimer duration={2} onTimeUp={mockOnTimeUp} />);

    expect(screen.getByText('02:00')).toBeInTheDocument();

    // Advance time by 30 seconds
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    // Check the time updated
    expect(screen.getByText('01:30')).toBeInTheDocument();
  }, 10000);

  test('shows warning state when time is low', async () => {
    render(<QuizTimer duration={1} onTimeUp={mockOnTimeUp} />);

    // Advance to warning time (last 25% of time)
    act(() => {
      vi.advanceTimersByTime(46000); // 46 seconds, leaving 14 seconds
    });

    // Should show low time
    expect(screen.getByText('00:14')).toBeInTheDocument();
    // Should show alert triangle icon for low time
    expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
  }, 10000);

  test('calls onTimeUp when timer reaches zero', async () => {
    render(<QuizTimer duration={1} onTimeUp={mockOnTimeUp} />);

    // Advance time to completion
    act(() => {
      vi.advanceTimersByTime(60000); // Full minute
    });

    expect(mockOnTimeUp).toHaveBeenCalled();
    expect(screen.getByText('00:00')).toBeInTheDocument();
  }, 10000);

  test('does not go below zero', async () => {
    render(<QuizTimer duration={1} onTimeUp={mockOnTimeUp} />);

    // Advance time beyond the duration
    act(() => {
      vi.advanceTimersByTime(70000);
    });

    expect(screen.getByText('00:00')).toBeInTheDocument();
    // Should call onTimeUp at least once when time is up
    expect(mockOnTimeUp).toHaveBeenCalled();
  }, 10000);

  test('handles zero duration correctly', () => {
    render(<QuizTimer duration={0} onTimeUp={mockOnTimeUp} />);

    expect(screen.getByText('00:00')).toBeInTheDocument();
    
    // Should call onTimeUp immediately for zero duration
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockOnTimeUp).toHaveBeenCalled();
  });

  test('shows correct icon based on remaining time', () => {
    render(<QuizTimer duration={10} onTimeUp={mockOnTimeUp} />);

    // Should show timer icon initially
    expect(screen.getByTestId('timer-icon')).toBeInTheDocument();
  });

  test('updates display every second', async () => {
    render(<QuizTimer duration={3} onTimeUp={mockOnTimeUp} />);

    expect(screen.getByText('03:00')).toBeInTheDocument();

    // Advance by 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('02:59')).toBeInTheDocument();
  }, 10000);

  test('handles large duration values correctly', () => {
    render(<QuizTimer duration={120} onTimeUp={mockOnTimeUp} />);

    expect(screen.getByText('120:00')).toBeInTheDocument();

    // Advance by 1 hour (3600 seconds)
    act(() => {
      vi.advanceTimersByTime(3600000);
    });

    expect(screen.getByText('60:00')).toBeInTheDocument();
  });

  test('shows time remaining in minutes and seconds format', () => {
    render(<QuizTimer duration={5} onTimeUp={mockOnTimeUp} />);

    expect(screen.getByText('05:00')).toBeInTheDocument();

    // Test 4 minutes 30 seconds
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(screen.getByText('04:30')).toBeInTheDocument();
  });

  test('maintains timer state correctly after multiple updates', async () => {
    render(<QuizTimer duration={2} onTimeUp={mockOnTimeUp} />);

    // Start with 2 minutes (120 seconds)
    expect(screen.getByText('02:00')).toBeInTheDocument();

    // Advance by 60 seconds
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(screen.getByText('01:00')).toBeInTheDocument();

    // Advance to completion
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(mockOnTimeUp).toHaveBeenCalled();
  }, 10000);

  test('cleanup timer on unmount', () => {
    const { unmount } = render(<QuizTimer duration={10} onTimeUp={mockOnTimeUp} />);

    // Advance some time
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Unmount component
    unmount();

    // Continue advancing time - onTimeUp should not be called after unmount
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(mockOnTimeUp).not.toHaveBeenCalled();
  });
});
