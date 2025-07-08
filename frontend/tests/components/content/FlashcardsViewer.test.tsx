import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FlashcardsViewer } from '@/components/content/FlashcardsViewer';

// Mock Audio API
global.Audio = vi.fn(() => ({
  play: vi.fn().mockResolvedValue(undefined),
}));

const mockFlashcards = [
  {
    front: 'What is React?',
    back: 'A JavaScript library for building user interfaces',
  },
  {
    front: 'What is JSX?',
    back: 'A syntax extension for JavaScript that looks similar to XML',
  },
  {
    front: 'What are React hooks?',
    back: 'Functions that let you use state and other React features in functional components',
  },
];

describe('FlashcardsViewer', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders flashcards viewer correctly', () => {
    render(
      <FlashcardsViewer
        flashcards={mockFlashcards}
        topic="React Basics"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('React Basics')).toBeInTheDocument();
    expect(screen.getByText('Card 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('What is React?')).toBeInTheDocument();
    expect(screen.getByText('TAP TO REVEAL')).toBeInTheDocument();
  });

  it('shows empty state when no flashcards provided', () => {
    render(
      <FlashcardsViewer
        flashcards={[]}
        topic="Empty Topic"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('No flashcards found')).toBeInTheDocument();
    expect(screen.getByText('This content might be corrupted or empty')).toBeInTheDocument();
    expect(screen.getByText('Go Back')).toBeInTheDocument();
  });

  it('calls onClose when Go Back button is clicked in empty state', () => {
    render(
      <FlashcardsViewer
        flashcards={[]}
        topic="Empty Topic"
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('Go Back'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('flips card when clicked', () => {
    render(
      <FlashcardsViewer
        flashcards={mockFlashcards}
        topic="React Basics"
        onClose={mockOnClose}
      />
    );

    // Initially should show the front
    expect(screen.getByText('What is React?')).toBeInTheDocument();

    // Click to flip the card
    const card = document.querySelector('.cursor-pointer');
    fireEvent.click(card!);

    // Should now show the back
    expect(screen.getByText('A JavaScript library for building user interfaces')).toBeInTheDocument();
  });

  it('navigates to next card correctly', () => {
    render(
      <FlashcardsViewer
        flashcards={mockFlashcards}
        topic="React Basics"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('What is React?')).toBeInTheDocument();

    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    expect(screen.getByText('Card 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('What is JSX?')).toBeInTheDocument();
  });

  it('navigates to previous card correctly', () => {
    render(
      <FlashcardsViewer
        flashcards={mockFlashcards}
        topic="React Basics"
        onClose={mockOnClose}
      />
    );

    // Navigate to second card first
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Card 2 of 3')).toBeInTheDocument();

    // Then navigate back
    const previousButton = screen.getByText('Previous');
    fireEvent.click(previousButton);

    expect(screen.getByText('Card 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('What is React?')).toBeInTheDocument();
  });

  it('disables previous button on first card', () => {
    render(
      <FlashcardsViewer
        flashcards={mockFlashcards}
        topic="React Basics"
        onClose={mockOnClose}
      />
    );

    const previousButton = screen.getByText('Previous');
    expect(previousButton).toBeDisabled();
  });

  it('disables next button on last card', () => {
    render(
      <FlashcardsViewer
        flashcards={mockFlashcards}
        topic="React Basics"
        onClose={mockOnClose}
      />
    );

    // Navigate to last card
    fireEvent.click(screen.getByText('Next')); // Card 2
    fireEvent.click(screen.getByText('Next')); // Card 3

    const nextButton = screen.getByText('Next');
    expect(nextButton).toBeDisabled();
  });

  it('updates progress correctly', () => {
    render(
      <FlashcardsViewer
        flashcards={mockFlashcards}
        topic="React Basics"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('33%')).toBeInTheDocument(); // 1/3 * 100 = 33%

    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('67%')).toBeInTheDocument(); // 2/3 * 100 = 67%

    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('100%')).toBeInTheDocument(); // 3/3 * 100 = 100%
  });

  it('tracks completed cards when flipped', () => {
    render(
      <FlashcardsViewer
        flashcards={mockFlashcards}
        topic="React Basics"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('0/3 completed')).toBeInTheDocument();

    // Flip the first card
    const card = document.querySelector('.cursor-pointer');
    fireEvent.click(card!);

    expect(screen.getByText('1/3 completed')).toBeInTheDocument();
  });

  it('resets all cards when reset button is clicked', () => {
    render(
      <FlashcardsViewer
        flashcards={mockFlashcards}
        topic="React Basics"
        onClose={mockOnClose}
      />
    );

    // Navigate to second card and flip it
    fireEvent.click(screen.getByText('Next'));
    const card = document.querySelector('.cursor-pointer');
    fireEvent.click(card!);

    expect(screen.getByText('Card 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('1/3 completed')).toBeInTheDocument();

    // Reset
    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);

    expect(screen.getByText('Card 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('0/3 completed')).toBeInTheDocument();
    expect(screen.getByText('What is React?')).toBeInTheDocument();
  });

  it('calls onClose when Back button is clicked', () => {
    render(
      <FlashcardsViewer
        flashcards={mockFlashcards}
        topic="React Basics"
        onClose={mockOnClose}
      />
    );

    const backButton = screen.getByText('Back');
    fireEvent.click(backButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('navigates using dot indicators', () => {
    render(
      <FlashcardsViewer
        flashcards={mockFlashcards}
        topic="React Basics"
        onClose={mockOnClose}
      />
    );

    const dots = document.querySelectorAll('.w-2.h-2.rounded-full');
    expect(dots).toHaveLength(3);

    // Click on the third dot
    fireEvent.click(dots[2]);

    expect(screen.getByText('Card 3 of 3')).toBeInTheDocument();
    expect(screen.getByText('What are React hooks?')).toBeInTheDocument();
  });

  it('handles keyboard navigation - space to flip', () => {
    render(
      <FlashcardsViewer
        flashcards={mockFlashcards}
        topic="React Basics"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('What is React?')).toBeInTheDocument();

    // Press space to flip
    fireEvent.keyDown(window, { code: 'Space' });

    expect(screen.getByText('A JavaScript library for building user interfaces')).toBeInTheDocument();
  });

  it('handles keyboard navigation - arrow keys', () => {
    render(
      <FlashcardsViewer
        flashcards={mockFlashcards}
        topic="React Basics"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Card 1 of 3')).toBeInTheDocument();

    // Press right arrow to go next
    fireEvent.keyDown(window, { code: 'ArrowRight' });

    expect(screen.getByText('Card 2 of 3')).toBeInTheDocument();

    // Press left arrow to go back
    fireEvent.keyDown(window, { code: 'ArrowLeft' });

    expect(screen.getByText('Card 1 of 3')).toBeInTheDocument();
  });

  it('shows correct badge color for current and completed cards', () => {
    render(
      <FlashcardsViewer
        flashcards={mockFlashcards}
        topic="React Basics"
        onClose={mockOnClose}
      />
    );

    const dots = document.querySelectorAll('.w-2.h-2.rounded-full');
    
    // First dot should be purple (current)
    expect(dots[0]).toHaveClass('bg-purple-500');
    
    // Others should be gray (not visited)
    expect(dots[1]).toHaveClass('bg-gray-300');
    expect(dots[2]).toHaveClass('bg-gray-300');

    // Flip current card to complete it
    const card = document.querySelector('.cursor-pointer');
    fireEvent.click(card!);

    // Navigate to next card
    fireEvent.click(screen.getByText('Next'));

    const updatedDots = document.querySelectorAll('.w-2.h-2.rounded-full');
    
    // First dot should be green (completed)
    expect(updatedDots[0]).toHaveClass('bg-green-500');
    
    // Second dot should be purple (current)
    expect(updatedDots[1]).toHaveClass('bg-purple-500');
  });

  it('shows keyboard shortcuts help text', () => {
    render(
      <FlashcardsViewer
        flashcards={mockFlashcards}
        topic="React Basics"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Keyboard shortcuts: Space (flip) • ← → (navigate) • R (reset)')).toBeInTheDocument();
    expect(screen.getByText('Space bar to flip • Arrow keys to navigate')).toBeInTheDocument();
  });

  it('resets flip state when navigating between cards', () => {
    render(
      <FlashcardsViewer
        flashcards={mockFlashcards}
        topic="React Basics"
        onClose={mockOnClose}
      />
    );

    // Flip the first card
    const card = document.querySelector('.cursor-pointer');
    fireEvent.click(card!);
    expect(screen.getByText('A JavaScript library for building user interfaces')).toBeInTheDocument();

    // Navigate to next card
    fireEvent.click(screen.getByText('Next'));

    // Should show front of second card (not flipped)
    expect(screen.getByText('What is JSX?')).toBeInTheDocument();
  });

  it('shows different instruction text on front and back of cards', () => {
    render(
      <FlashcardsViewer
        flashcards={mockFlashcards}
        topic="React Basics"
        onClose={mockOnClose}
      />
    );

    // Front should show "TAP TO REVEAL"
    expect(screen.getByText('TAP TO REVEAL')).toBeInTheDocument();

    // Flip the card
    const card = document.querySelector('.cursor-pointer');
    fireEvent.click(card!);

    // Back should show navigation instructions
    expect(screen.getByText('NAVIGATION')).toBeInTheDocument();
    expect(screen.getByText('← → Arrow keys • Space to flip back')).toBeInTheDocument();
  });
});
