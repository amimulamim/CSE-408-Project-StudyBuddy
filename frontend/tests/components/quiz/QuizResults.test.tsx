import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, test, expect, describe, beforeEach } from 'vitest';
import { QuizResults } from '@/components/quiz/QuizResults';

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
  Button: ({ children, onClick, variant, className }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      data-variant={variant}
      className={className}
      data-testid={`button-${children?.toString().toLowerCase().replace(/\s+/g, '-')}`}
    >
      {children}
    </button>
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

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: { value?: number; className?: string }) => (
    <div data-testid="progress" data-value={value} className={className}>
      Progress: {value}%
    </div>
  )
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon">ArrowLeft</div>,
  Trophy: () => <div data-testid="trophy-icon">Trophy</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  CheckCircle: () => <div data-testid="check-circle-icon">CheckCircle</div>,
  XCircle: () => <div data-testid="x-circle-icon">XCircle</div>,
  Info: () => <div data-testid="info-icon">Info</div>,
  Star: () => <div data-testid="star-icon">Star</div>
}));

describe('QuizResults', () => {
  const mockQuiz = {
    id: 'quiz-1',
    title: 'Mathematics Quiz',
    subject: 'Mathematics',
    topic: 'Calculus',
    difficulty: 'Medium' as const,
    totalQuestions: 10,
    duration: 30,
    marks: 50,
    status: 'completed' as const,
    createdAt: '2023-01-01',
    score: 70,
    timeTaken: 12
  };

  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders quiz results header correctly', () => {
    render(<QuizResults quiz={mockQuiz} onBack={mockOnBack} />);

    expect(screen.getByText('Quiz Complete!')).toBeInTheDocument();
    expect(screen.getByText('Mathematics Quiz')).toBeInTheDocument();
    // Use accessible role for back button
    expect(screen.getByRole('button', { name: /Back to Dashboard/ })).toBeInTheDocument();
    expect(screen.getByTestId('arrow-left-icon')).toBeInTheDocument();
  });

  test('displays quiz score correctly', () => {
    render(<QuizResults quiz={mockQuiz} onBack={mockOnBack} />);

    expect(screen.getByText('70%')).toBeInTheDocument();
  });

  test('displays grade based on score', () => {
    render(<QuizResults quiz={mockQuiz} onBack={mockOnBack} />);

    // Default score 70 uses this message
    expect(screen.getByText('Good work! Keep it up!')).toBeInTheDocument();
  });

  test('displays different grades for different scores', () => {
    const highScoreQuiz = { ...mockQuiz, score: 90 };
    const { rerender } = render(<QuizResults quiz={highScoreQuiz} onBack={mockOnBack} />);

    // High score displays full combined message
    expect(screen.getByText('Excellent! Outstanding performance!')).toBeInTheDocument();

    const lowScoreQuiz = { ...mockQuiz, score: 45 };
    rerender(<QuizResults quiz={lowScoreQuiz} onBack={mockOnBack} />);

    // Low score uses default encouragement
    expect(screen.getByText('Keep practicing! You can do better!')).toBeInTheDocument();
  });

  test('displays quiz statistics', () => {
    render(<QuizResults quiz={mockQuiz} onBack={mockOnBack} />);

    // Progress summary
    expect(screen.getByText(/7\s*\/\s*10\s*questions correct/)).toBeInTheDocument();
    // Statistics grid
    // Use getAllByText to avoid ambiguity when multiple 'Correct' elements exist
    expect(screen.getAllByText('Correct').length).toBeGreaterThan(0);
    expect(screen.getByText('12')).toBeInTheDocument(); // Minutes value
    expect(screen.getByText('Minutes')).toBeInTheDocument();
    expect(screen.getByText('Total Marks')).toBeInTheDocument();
  });

  test('displays progress bar with correct value', () => {
    render(<QuizResults quiz={mockQuiz} onBack={mockOnBack} />);

    const progress = screen.getByTestId('progress');
    expect(progress).toHaveAttribute('data-value', '70');
  });

  test('shows question review section', () => {
    render(<QuizResults quiz={mockQuiz} onBack={mockOnBack} />);

    expect(screen.getByText('Question Review')).toBeInTheDocument();
  });

  test('displays individual questions with answers', () => {
    render(<QuizResults quiz={mockQuiz} onBack={mockOnBack} />);

    expect(screen.getByText('What is the derivative of x²?')).toBeInTheDocument();
    expect(screen.getByText('What is the integral of 2x?')).toBeInTheDocument();
    expect(screen.getByText('2x')).toBeInTheDocument(); // Correct answer
  });

  test('shows correct and incorrect answer indicators', () => {
    render(<QuizResults quiz={mockQuiz} onBack={mockOnBack} />);

    // Ensure at least one indicator for correct and incorrect
    expect(screen.getAllByTestId('check-circle-icon').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('x-circle-icon').length).toBeGreaterThan(0);
  });

  test('displays explanations for questions', () => {
    render(<QuizResults quiz={mockQuiz} onBack={mockOnBack} />);

    expect(screen.getByText(/The integral of 2x is x² \+ C/)).toBeInTheDocument();
  });

  test('calls onBack when back button is clicked', () => {
    render(<QuizResults quiz={mockQuiz} onBack={mockOnBack} />);

    const backButton = screen.getByRole('button', { name: /Back to Dashboard/ });
    fireEvent.click(backButton);

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  test('shows correct badge styling for correct answers', () => {
    render(<QuizResults quiz={mockQuiz} onBack={mockOnBack} />);

    const badges = screen.getAllByTestId('badge');
    const correctBadge = badges.find(badge => badge.textContent === 'Correct');
    const incorrectBadge = badges.find(badge => badge.textContent === 'Incorrect');

    expect(correctBadge).toHaveAttribute('data-variant', 'default');
    expect(incorrectBadge).toHaveAttribute('data-variant', 'destructive');
  });

  test('applies correct score color classes', () => {
    const highScoreQuiz = { ...mockQuiz, score: 85 };
    const { rerender } = render(<QuizResults quiz={highScoreQuiz} onBack={mockOnBack} />);

    let scoreElement = screen.getByText('85%');
    expect(scoreElement).toHaveClass('text-green-600');

    const mediumScoreQuiz = { ...mockQuiz, score: 65 };
    rerender(<QuizResults quiz={mediumScoreQuiz} onBack={mockOnBack} />);

    scoreElement = screen.getByText('65%');
    expect(scoreElement).toHaveClass('text-yellow-600');

    const lowScoreQuiz = { ...mockQuiz, score: 45 };
    rerender(<QuizResults quiz={lowScoreQuiz} onBack={mockOnBack} />);

    scoreElement = screen.getByText('45%');
    expect(scoreElement).toHaveClass('text-red-600');
  });

  test('renders all required icons', () => {
    render(<QuizResults quiz={mockQuiz} onBack={mockOnBack} />);

    expect(screen.getByTestId('trophy-icon')).toBeInTheDocument();
    expect(screen.getAllByTestId('star-icon').length).toBeGreaterThan(0);
    // Multiple info icons may appear, ensure at least one
    expect(screen.getAllByTestId('info-icon').length).toBeGreaterThan(0);
  });

  test('handles quiz without custom score', () => {
    const quizWithoutScore = { ...mockQuiz, score: undefined };
    render(<QuizResults quiz={quizWithoutScore} onBack={mockOnBack} />);

    // Should default to 70% as per component logic
    expect(screen.getByText('70%')).toBeInTheDocument();
  });

  test('handles quiz without custom time taken', () => {
    const quizWithoutTime = { ...mockQuiz, timeTaken: undefined };
    render(<QuizResults quiz={quizWithoutTime} onBack={mockOnBack} />);

    // Should display default timeTaken and label as per component logic
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Minutes')).toBeInTheDocument();
  });
});
