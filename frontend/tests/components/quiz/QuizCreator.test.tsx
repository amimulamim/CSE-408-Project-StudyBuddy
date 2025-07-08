import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, test, expect, describe, beforeEach } from 'vitest';
import { QuizCreator } from '@/components/quiz/QuizCreator';
import { toast } from 'sonner';

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
  Button: ({ children, onClick, variant, disabled, type, className }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    disabled?: boolean;
    type?: 'submit' | 'reset' | 'button';
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
        disabled={disabled}
        type={type}
        data-variant={variant}
        className={className}
        data-testid={`button-${testId}`}
      >
        {children}
      </button>
    );
  }
}));

vi.mock('@/components/ui/input', () => ({
  Input: React.forwardRef<HTMLInputElement, {
    id?: string;
    value?: string | number;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    required?: boolean;
    type?: string;
    min?: string;
    max?: string;
  }>(({ id, value, onChange, placeholder, required, type, min, max }, ref) => (
    <input
      ref={ref}
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      type={type}
      min={min}
      max={max}
      data-testid={`input-${id}`}
    />
  ))
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor} data-testid={`label-${htmlFor}`}>{children}</label>
  )
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: {
    value?: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <div data-testid="select" data-value={value}>
      <button onClick={() => onValueChange?.('Medium')} data-testid="select-trigger">
        {value || 'Select...'}
      </button>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <div data-testid={`select-item-${value}`} data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-trigger">{children}</div>
  ),
  SelectValue: () => <div data-testid="select-value">Select Value</div>
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: React.forwardRef<HTMLTextAreaElement, {
    id?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
  }>(({ id, value, onChange, placeholder }, ref) => (
    <textarea
      ref={ref}
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      data-testid={`textarea-${id}`}
    />
  ))
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon">ArrowLeft</div>,
  Sparkles: () => <div data-testid="sparkles-icon">Sparkles</div>
}));

describe('QuizCreator', () => {
  const mockOnQuizCreated = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders quiz creator form correctly', () => {
    render(
      <QuizCreator 
        onQuizCreated={mockOnQuizCreated} 
        onCancel={mockOnCancel} 
      />
    );

    expect(screen.getByText('Create Custom Quiz')).toBeInTheDocument();
    expect(screen.getByText('Design a personalized quiz tailored to your needs')).toBeInTheDocument();
    expect(screen.getByText('Quiz Configuration')).toBeInTheDocument();
  });

  test('renders all form fields', () => {
    render(
      <QuizCreator 
        onQuizCreated={mockOnQuizCreated} 
        onCancel={mockOnCancel} 
      />
    );

    expect(screen.getByTestId('input-title')).toBeInTheDocument();
    expect(screen.getByTestId('input-subject')).toBeInTheDocument();
    expect(screen.getByTestId('input-topic')).toBeInTheDocument();
    expect(screen.getByTestId('select')).toBeInTheDocument();
    expect(screen.getByTestId('input-questions')).toBeInTheDocument();
    expect(screen.getByTestId('input-duration')).toBeInTheDocument();
    expect(screen.getByTestId('input-marks')).toBeInTheDocument();
    expect(screen.getByTestId('textarea-description')).toBeInTheDocument();
  });

  test('calls onCancel when back button is clicked', () => {
    render(
      <QuizCreator 
        onQuizCreated={mockOnQuizCreated} 
        onCancel={mockOnCancel} 
      />
    );

    const backButton = screen.getByTestId('button-back');
    fireEvent.click(backButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  test('updates form data when input fields change', () => {
    render(
      <QuizCreator 
        onQuizCreated={mockOnQuizCreated} 
        onCancel={mockOnCancel} 
      />
    );

    const titleInput = screen.getByTestId('input-title');
    const subjectInput = screen.getByTestId('input-subject');
    const topicInput = screen.getByTestId('input-topic');

    fireEvent.change(titleInput, { target: { value: 'Test Quiz' } });
    fireEvent.change(subjectInput, { target: { value: 'Mathematics' } });
    fireEvent.change(topicInput, { target: { value: 'Algebra' } });

    expect(titleInput).toHaveValue('Test Quiz');
    expect(subjectInput).toHaveValue('Mathematics');
    expect(topicInput).toHaveValue('Algebra');
  });

  test('shows error when required fields are missing', async () => {
    render(
      <QuizCreator 
        onQuizCreated={mockOnQuizCreated} 
        onCancel={mockOnCancel} 
      />
    );

    // Submit the form without filling required fields
    const form = screen.getByTestId('card-content').querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Please fill in all required fields');
    });
  });

  test('creates quiz successfully with valid data', async () => {
    render(
      <QuizCreator 
        onQuizCreated={mockOnQuizCreated} 
        onCancel={mockOnCancel} 
      />
    );

    // Fill in required fields
    const titleInput = screen.getByTestId('input-title');
    const subjectInput = screen.getByTestId('input-subject');
    const topicInput = screen.getByTestId('input-topic');

    fireEvent.change(titleInput, { target: { value: 'Test Quiz' } });
    fireEvent.change(subjectInput, { target: { value: 'Mathematics' } });
    fireEvent.change(topicInput, { target: { value: 'Algebra' } });

    // Click the submit button
    const submitButton = screen.getByTestId('button-generate-quiz');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnQuizCreated).toHaveBeenCalledWith({
        title: 'Test Quiz',
        subject: 'Mathematics',
        topic: 'Algebra',
        difficulty: 'Medium',
        totalQuestions: 10,
        duration: 15,
        marks: 50
      });
      expect(toast.success).toHaveBeenCalledWith('Quiz created successfully!');
    }, { timeout: 10000 });
  });

  test('updates numeric fields correctly', () => {
    render(
      <QuizCreator 
        onQuizCreated={mockOnQuizCreated} 
        onCancel={mockOnCancel} 
      />
    );

    const questionsInput = screen.getByTestId('input-questions');
    const durationInput = screen.getByTestId('input-duration');
    const marksInput = screen.getByTestId('input-marks');

    fireEvent.change(questionsInput, { target: { value: '20' } });
    fireEvent.change(durationInput, { target: { value: '30' } });
    fireEvent.change(marksInput, { target: { value: '100' } });

    expect(questionsInput).toHaveValue(20);
    expect(durationInput).toHaveValue(30);
    expect(marksInput).toHaveValue(100);
  });

  test('updates description field correctly', () => {
    render(
      <QuizCreator 
        onQuizCreated={mockOnQuizCreated} 
        onCancel={mockOnCancel} 
      />
    );

    const descriptionTextarea = screen.getByTestId('textarea-description');
    fireEvent.change(descriptionTextarea, { 
      target: { value: 'This is a test quiz description' } 
    });

    expect(descriptionTextarea).toHaveValue('This is a test quiz description');
  });

  test('disables create button while generating', async () => {
    render(
      <QuizCreator 
        onQuizCreated={mockOnQuizCreated} 
        onCancel={mockOnCancel} 
      />
    );

    // Fill in required fields
    const titleInput = screen.getByTestId('input-title');
    const subjectInput = screen.getByTestId('input-subject');
    const topicInput = screen.getByTestId('input-topic');

    fireEvent.change(titleInput, { target: { value: 'Test Quiz' } });
    fireEvent.change(subjectInput, { target: { value: 'Mathematics' } });
    fireEvent.change(topicInput, { target: { value: 'Algebra' } });

    // Click the submit button
    const submitButton = screen.getByTestId('button-generate-quiz');
    fireEvent.click(submitButton);

    // Button should be disabled while generating and have a different test ID
    await waitFor(() => {
      const createButton = screen.getByTestId('button-generating-quiz...');
      expect(createButton).toBeDisabled();
    });
  });

  test('handles form submission with all fields filled', async () => {
    render(
      <QuizCreator 
        onQuizCreated={mockOnQuizCreated} 
        onCancel={mockOnCancel} 
      />
    );

    // Fill all fields
    fireEvent.change(screen.getByTestId('input-title'), { target: { value: 'Advanced Quiz' } });
    fireEvent.change(screen.getByTestId('input-subject'), { target: { value: 'Physics' } });
    fireEvent.change(screen.getByTestId('input-topic'), { target: { value: 'Mechanics' } });
    fireEvent.change(screen.getByTestId('input-questions'), { target: { value: '15' } });
    fireEvent.change(screen.getByTestId('input-duration'), { target: { value: '45' } });
    fireEvent.change(screen.getByTestId('input-marks'), { target: { value: '75' } });
    fireEvent.change(screen.getByTestId('textarea-description'), { 
      target: { value: 'Advanced physics quiz on mechanics' } 
    });

    // Click the submit button
    const submitButton = screen.getByTestId('button-generate-quiz');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnQuizCreated).toHaveBeenCalledWith({
        title: 'Advanced Quiz',
        subject: 'Physics',
        topic: 'Mechanics',
        difficulty: 'Medium',
        totalQuestions: 15,
        duration: 45,
        marks: 75
      });
    }, { timeout: 10000 });
  });

  test('renders form labels correctly', () => {
    render(
      <QuizCreator 
        onQuizCreated={mockOnQuizCreated} 
        onCancel={mockOnCancel} 
      />
    );

    expect(screen.getByTestId('label-title')).toBeInTheDocument();
    expect(screen.getByTestId('label-subject')).toBeInTheDocument();
    expect(screen.getByTestId('label-topic')).toBeInTheDocument();
    expect(screen.getByText('Difficulty Level')).toBeInTheDocument();
    expect(screen.getByText('Number of Questions')).toBeInTheDocument();
    expect(screen.getByText('Duration (minutes)')).toBeInTheDocument();
  });

  test('shows loading state while creating quiz', async () => {
    render(
      <QuizCreator 
        onQuizCreated={mockOnQuizCreated} 
        onCancel={mockOnCancel} 
      />
    );

    // Fill required fields
    fireEvent.change(screen.getByTestId('input-title'), { target: { value: 'Test Quiz' } });
    fireEvent.change(screen.getByTestId('input-subject'), { target: { value: 'Mathematics' } });
    fireEvent.change(screen.getByTestId('input-topic'), { target: { value: 'Algebra' } });

    // Click the submit button
    const submitButton = screen.getByTestId('button-generate-quiz');
    fireEvent.click(submitButton);

    expect(screen.getByText('Generating Quiz...')).toBeInTheDocument();
  });
});
