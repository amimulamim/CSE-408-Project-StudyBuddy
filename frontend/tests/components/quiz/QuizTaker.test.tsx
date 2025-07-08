import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, test, expect, describe, beforeEach, afterEach } from 'vitest';
import { QuizTaker } from '@/components/quiz/QuizTaker';

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn()
  }
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
  Button: ({ children, onClick, variant, disabled, className }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    disabled?: boolean;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      className={className}
      data-testid={`button-${children?.toString().toLowerCase().replace(/\s+/g, '-')}`}
    >
      {children}
    </button>
  )
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: { value?: number; className?: string }) => (
    <div data-testid="progress" data-value={value} className={className}>
      Progress: {value}%
    </div>
  )
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
  }) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  )
}));

// Mock Lucide React icons
vi.mock('lucide-react', async (importOriginal) => {
  const actualModule = (await importOriginal()) as Record<string, any>;
  return {
    ...actualModule,
    ArrowLeft: () => <div data-testid="arrow-left-icon">ArrowLeft</div>,
    ArrowRight: () => <div data-testid="arrow-right-icon">ArrowRight</div>,
    CheckCircle: () => <div data-testid="check-circle-icon">CheckCircle</div>,
    AlertCircle: () => <div data-testid="alert-circle-icon">AlertCircle</div>,
    X: () => <div data-testid="x-icon">X</div>
  };
});

// Mock QuizTimer
vi.mock('@/components/quiz/QuizTimer', () => ({
  QuizTimer: ({ duration, onTimeUp }: { duration: number; onTimeUp: () => void }) => (
    <div data-testid="quiz-timer" data-duration={duration}>
      Quiz Timer: {duration} minutes
      <button onClick={onTimeUp} data-testid="trigger-time-up">Time Up</button>
    </div>
  )
}));

describe('QuizTaker', () => {
  const mockQuiz = {
    id: 'quiz-1',
    title: 'Mathematics Quiz',
    subject: 'Mathematics',
    topic: 'Calculus',
    difficulty: 'Medium' as const,
    totalQuestions: 5,
    duration: 30,
    marks: 50,
    status: 'pending' as const,
    createdAt: '2023-01-01'
  };

  const mockOnComplete = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test('renders quiz information correctly', () => {
    render(
      <QuizTaker 
        quiz={mockQuiz} 
        onComplete={mockOnComplete} 
        onCancel={mockOnCancel} 
      />
    );

    expect(screen.getByText('Mathematics Quiz')).toBeInTheDocument();
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    expect(screen.getByTestId('quiz-timer')).toBeInTheDocument();
  });

  test('displays first question correctly', () => {
    render(
      <QuizTaker 
        quiz={mockQuiz} 
        onComplete={mockOnComplete} 
        onCancel={mockOnCancel} 
      />
    );

    expect(screen.getByText('What is the derivative of x²?')).toBeInTheDocument();
    expect(screen.getByText('x')).toBeInTheDocument();
    expect(screen.getByText('2x')).toBeInTheDocument();
    expect(screen.getByText('x²')).toBeInTheDocument();
    expect(screen.getByText('2x²')).toBeInTheDocument();
  });

  test('allows selecting an answer', () => {
    render(
      <QuizTaker 
        quiz={mockQuiz} 
        onComplete={mockOnComplete} 
        onCancel={mockOnCancel} 
      />
    )

    // Find the option by its displayed text
    const span = screen.getByText('2x');
    const optionButton = span.closest('button')!;
    fireEvent.click(optionButton);
    // After selection, button should have primary border styling
    expect(optionButton).toHaveClass('border-primary');
  });

  test('navigates to next question', () => {
    render(
      <QuizTaker 
        quiz={mockQuiz} 
        onComplete={mockOnComplete} 
        onCancel={mockOnCancel} 
      />
    )

    // Use accessible button label
    const nextButton = screen.getByRole('button', { name: /Next/ })
    fireEvent.click(nextButton)

    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument()
    expect(screen.getByText('What is the integral of 2x?')).toBeInTheDocument()
  })

  test('navigates to previous question', () => {
    render(
      <QuizTaker 
        quiz={mockQuiz} 
        onComplete={mockOnComplete} 
        onCancel={mockOnCancel} 
      />
    )

    // Go to second question first
    const nextButton = screen.getByRole('button', { name: /Next/ })
    fireEvent.click(nextButton)

    // Then go back
    const prevButton = screen.getByRole('button', { name: /Previous/ })
    fireEvent.click(prevButton)

    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    expect(screen.getByText('What is the derivative of x²?')).toBeInTheDocument()
  })

  test('shows finish button on last question', () => {
    render(
      <QuizTaker quiz={mockQuiz} onComplete={mockOnComplete} onCancel={mockOnCancel} />
    )

    // Navigate to last question
    const nextButton = screen.getByRole('button', { name: /Next/ })
    fireEvent.click(nextButton)
    fireEvent.click(nextButton)
    fireEvent.click(nextButton)
    fireEvent.click(nextButton)

    expect(screen.getByRole('button', { name: /Submit Quiz/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Next/ })).not.toBeInTheDocument();
  })

  test('submits quiz and calculates score correctly', async () => {
    render(
      <QuizTaker 
        quiz={mockQuiz} 
        onComplete={mockOnComplete} 
        onCancel={mockOnCancel} 
      />
    )

    // Find the option by its visible text
    const correctSpan = screen.getByText('2x')
    const correctOption = correctSpan.closest('button')!
    fireEvent.click(correctOption)

    // Navigate to last question
    const nextButton = screen.getByRole('button', { name: /Next/ });
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    // Submit quiz
    const finishButton = screen.getByRole('button', { name: /Submit Quiz/ });
    fireEvent.click(finishButton);

    // Advance timers and flush submission
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // onComplete should be called with correct args
    expect(mockOnComplete).toHaveBeenCalledWith(
      'quiz-1',
      20,
      expect.any(Number)
    );
  });

  test('shows progress correctly', () => {
    render(
      <QuizTaker quiz={mockQuiz} onComplete={mockOnComplete} onCancel={mockOnCancel} />
    )

    const progress = screen.getByTestId('progress');
    expect(progress).toHaveAttribute('data-value', '20'); // 20% initially (1 of 5)

    // Navigate to next question
    const nextButton = screen.getByRole('button', { name: /Next/ });
    fireEvent.click(nextButton)

    expect(progress).toHaveAttribute('data-value', '40'); // 40% after 2 questions
  })

  test('calls onCancel when cancel button is clicked', () => {
    render(
      <QuizTaker 
        quiz={mockQuiz} 
        onComplete={mockOnComplete} 
        onCancel={mockOnCancel} 
      />
    )

    const cancelButton = screen.getByRole('button', { name: /Exit/ });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  })

  test('disables navigation when submitting', async () => {
    render(
      <QuizTaker 
        quiz={mockQuiz} 
        onComplete={mockOnComplete} 
        onCancel={mockOnCancel} 
      />
    )

    // Navigate to last question
    const nextButton = screen.getByRole('button', { name: /Next/ });
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    // Submit quiz
    const finishButton = screen.getByRole('button', { name: /Submit Quiz/ });
    fireEvent.click(finishButton);

    // Check that finish button is disabled
    expect(finishButton).toBeDisabled();
  })

  test('maintains selected answers when navigating', () => {
    render(
      <QuizTaker quiz={mockQuiz} onComplete={mockOnComplete} onCancel={mockOnCancel} />
    )

    // Select answer on first question
    const optSpan = screen.getByText('2x');
    const option = optSpan.closest('button')!;
    fireEvent.click(option)

    // Navigate to next question and back
    const nextButton = screen.getByRole('button', { name: /Next/ });
    fireEvent.click(nextButton)
    
    const prevButton = screen.getByRole('button', { name: /Previous/ });
    fireEvent.click(prevButton)

    // Check that the previously selected answer is still selected
    const selSpan = screen.getByText('2x');
    const selectedOption = selSpan.closest('button')!;
    expect(selectedOption).toHaveClass('border-primary');
  })
});
