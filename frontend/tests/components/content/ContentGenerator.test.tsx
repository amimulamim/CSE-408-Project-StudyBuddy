import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContentGenerator } from '@/components/content/ContentGenerator';
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

const mockMakeRequest = vi.mocked(makeRequest);
const mockToast = vi.mocked(toast);

const mockCollections = [
  {
    collection_name: 'physics-notes',
    full_collection_name: 'Physics Study Notes',
    created_at: '2023-01-01T00:00:00Z',
  },
  {
    collection_name: 'math-formulas',
    full_collection_name: 'Mathematics Formulas',
    created_at: '2023-01-02T00:00:00Z',
  },
];

describe('ContentGenerator', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

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

  it('renders content generator interface', async () => {
    mockMakeRequest.mockResolvedValue({ data: mockCollections });

    render(<ContentGenerator onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    expect(screen.getByRole('heading', { name: 'Generate Content' })).toBeInTheDocument();
    expect(screen.getByText('Create flashcards or slides')).toBeInTheDocument();
    expect(screen.getByText('Content Generator')).toBeInTheDocument();
    expect(screen.getByText('Fill in the details to generate educational content')).toBeInTheDocument();
  });

  it('loads collections on mount', async () => {
    mockMakeRequest.mockResolvedValue({ data: mockCollections });

    render(<ContentGenerator onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/document/collections',
        'GET'
      );
    });
  });

  it('displays form fields correctly', async () => {
    mockMakeRequest.mockResolvedValue({ data: mockCollections });

    render(<ContentGenerator onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    expect(screen.getByText('Content Type *')).toBeInTheDocument();
    expect(screen.getByText('Collection')).toBeInTheDocument();
    expect(screen.getByText('Topic *')).toBeInTheDocument();
    expect(screen.getByText('Difficulty')).toBeInTheDocument();
    expect(screen.getByText('Length')).toBeInTheDocument();
    expect(screen.getByText('Tone')).toBeInTheDocument();
  });

  it('allows selecting content type', async () => {
    mockMakeRequest.mockResolvedValue({ data: mockCollections });

    render(<ContentGenerator onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const contentTypeSelect = screen.getByText('Select content type');
    fireEvent.click(contentTypeSelect);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Flashcards' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Slides' })).toBeInTheDocument();
    });

    const flashcardsOption = screen.getByRole('option', { name: 'Flashcards' });
    fireEvent.click(flashcardsOption);
    // The select should now have the selected value (though we can't easily test the internal state)
  });

  it('allows entering topic', async () => {
    mockMakeRequest.mockResolvedValue({ data: mockCollections });

    render(<ContentGenerator onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const topicInput = screen.getByPlaceholderText('Enter the topic you want to learn about');
    fireEvent.change(topicInput, { target: { value: 'Quantum Physics' } });

    expect(topicInput).toHaveValue('Quantum Physics');
  });

  it('allows selecting difficulty level', async () => {
    mockMakeRequest.mockResolvedValue({ data: mockCollections });

    render(<ContentGenerator onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    // Difficulty should have default value of 'medium'
    const difficultySelect = screen.getAllByText('Medium')[0]; // First "Medium" is for difficulty
    fireEvent.click(difficultySelect);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Easy' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Hard' })).toBeInTheDocument();
    });
  });

  it('allows selecting length', async () => {
    mockMakeRequest.mockResolvedValue({ data: mockCollections });

    render(<ContentGenerator onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    // Length should have default value of 'medium'
    const lengthSelect = screen.getAllByText('Medium')[1]; // Second "Medium" is for length
    fireEvent.click(lengthSelect);

    expect(screen.getByText('Short')).toBeInTheDocument();
    expect(screen.getByText('Long')).toBeInTheDocument();
  });

  it('allows selecting tone', async () => {
    mockMakeRequest.mockResolvedValue({ data: mockCollections });

    render(<ContentGenerator onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    // Tone should have default value of 'instructive'
    const toneSelect = screen.getAllByText('Instructive')[0]; // First "Instructive" is the select trigger
    fireEvent.click(toneSelect);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Engaging' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Formal' })).toBeInTheDocument();
    });
  });

  it('populates collections dropdown', async () => {
    mockMakeRequest.mockResolvedValue({ data: mockCollections });

    render(<ContentGenerator onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    await waitFor(() => {
      const collectionSelect = screen.getByText('physics-notes');
      fireEvent.click(collectionSelect);

      expect(screen.getByText('Default Collection')).toBeInTheDocument();
      expect(screen.getByText('physics-notes')).toBeInTheDocument();
      expect(screen.getByText('math-formulas')).toBeInTheDocument();
    });
  });

  it('handles empty collections gracefully', async () => {
    mockMakeRequest.mockResolvedValue({ data: [] });

    render(<ContentGenerator onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    await waitFor(() => {
      expect(screen.getByText('No document collections found. Upload documents to create collections.')).toBeInTheDocument();
    });
  });

  it('handles collections API error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockMakeRequest.mockRejectedValue(new Error('Network error'));

    render(<ContentGenerator onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to load collections');
    });

    consoleSpy.mockRestore();
  });

  it.skip('refreshes collections when refresh button is clicked', async () => {
    mockMakeRequest.mockResolvedValue({ data: mockCollections });

    render(<ContentGenerator onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('physics-notes')).toBeInTheDocument();
    });

    const refreshButton = screen.getByTitle('Refresh collections');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });

  it('shows loading state when refreshing collections', async () => {
    let resolvePromise: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    
    mockMakeRequest.mockReturnValue(pendingPromise);

    render(<ContentGenerator onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const refreshButton = screen.getByTitle('Refresh collections');
    expect(refreshButton.querySelector('.animate-spin')).toBeInTheDocument();

    // Resolve the promise
    resolvePromise!({ data: mockCollections });
  });

  it.skip('validates form before submission', async () => {
    mockMakeRequest.mockResolvedValue({ data: mockCollections });

    render(<ContentGenerator onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const submitButton = screen.getByRole('button', { name: /generate content/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Please fill in all required fields');
    });

    expect(mockMakeRequest).toHaveBeenCalledTimes(1); // Only for collections, not for generation
  });

  it.skip('submits form with correct data when valid', async () => {
    // Create a more controlled mock that resolves step by step
    const collectionsPromise = Promise.resolve({ data: mockCollections });
    const generationPromise = Promise.resolve({ status: 'success' });
    
    mockMakeRequest
      .mockReturnValueOnce(collectionsPromise) // Collections fetch
      .mockReturnValueOnce(generationPromise); // Content generation

    render(<ContentGenerator onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    // Explicitly wait for the collections promise to resolve
    await collectionsPromise;

    // Wait for the UI to update after collections are loaded
    await waitFor(() => {
      expect(screen.getByText('physics-notes')).toBeInTheDocument();
    });

    // Wait for collections loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Add a longer delay to ensure React has completed all state updates
    await new Promise(resolve => setTimeout(resolve, 300));

    // Explicitly select the collection using its combobox trigger
    const comboboxes = screen.getAllByRole('combobox');
    // the second combobox corresponds to the collection select
    const collectionTrigger = comboboxes[1];
    fireEvent.click(collectionTrigger);
    
    // Wait for the physics-notes option to appear and select it
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'physics-notes' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('option', { name: 'physics-notes' }));

    // Add another small delay after collection selection
    await new Promise(resolve => setTimeout(resolve, 100));

    // Now proceed with form filling
    const contentTypeSelect = screen.getByText('Select content type');
    fireEvent.click(contentTypeSelect);
    
    await waitFor(() => {
      const flashcardsOption = screen.getByRole('option', { name: 'Flashcards' });
      fireEvent.click(flashcardsOption);
    });

    const topicInput = screen.getByPlaceholderText('Enter the topic you want to learn about');
    fireEvent.change(topicInput, { target: { value: 'Quantum Physics' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /generate content/i });
    fireEvent.click(submitButton);

    // Wait for the generation promise to be called
    await generationPromise;

    // Verify the content generation call
    expect(mockMakeRequest).toHaveBeenCalledTimes(2);
    
    const contentGenerationCall = mockMakeRequest.mock.calls[1];
    expect(contentGenerationCall[0]).toBe('http://localhost:8000/api/v1/content/generate');
    expect(contentGenerationCall[1]).toBe('POST');
    
    const requestData = contentGenerationCall[2] as any;
    
    // Log the actual data for debugging
    console.log('Actual request data:', JSON.stringify(requestData, null, 2));
    
    // Check the basic form fields first
    expect(requestData.contentType).toBe('flashcards');
    expect(requestData.contentTopic).toBe('Quantum Physics');
    expect(requestData.difficulty).toBe('medium');
    expect(requestData.length).toBe('medium');
    expect(requestData.tone).toBe('instructive');
    
    // For collection_name, be more flexible - accept either the expected value or 'default' as fallback
    // The important thing is that it's not empty
    expect(requestData.collection_name).not.toBe('');
    // Since we explicitly selected physics-notes, it should be that value
    expect(requestData.collection_name).toBe('physics-notes');
  });

  it.skip('shows success message and calls onSuccess after successful generation', async () => {
    mockMakeRequest
      .mockResolvedValueOnce({ data: mockCollections })
      .mockResolvedValueOnce({ status: 'success' });

    render(<ContentGenerator onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    await waitFor(() => {
      expect(screen.getByText('physics-notes')).toBeInTheDocument();
    });

    // Fill and submit form
    const contentTypeSelect = screen.getByText('Select content type');
    fireEvent.click(contentTypeSelect);
    await waitFor(() => { const flashcardsOption = screen.getByRole('option', { name: 'Flashcards' }); fireEvent.click(flashcardsOption); });

    const topicInput = screen.getByPlaceholderText('Enter the topic you want to learn about');
    fireEvent.change(topicInput, { target: { value: 'Test Topic' } });

    fireEvent.click(screen.getByRole('button', { name: /generate content/i }));

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Content generated successfully!');
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('handles generation API error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockMakeRequest
      .mockResolvedValueOnce({ data: mockCollections })
      .mockRejectedValueOnce(new Error('Generation failed'));

    render(<ContentGenerator onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    await waitFor(() => {
      expect(screen.getByText('physics-notes')).toBeInTheDocument();
    });

    // Fill and submit form
    const contentTypeSelect = screen.getByText('Select content type');
    fireEvent.click(contentTypeSelect);
    await waitFor(() => { const flashcardsOption = screen.getByRole('option', { name: 'Flashcards' }); fireEvent.click(flashcardsOption); });

    const topicInput = screen.getByPlaceholderText('Enter the topic you want to learn about');
    fireEvent.change(topicInput, { target: { value: 'Test Topic' } });

    fireEvent.click(screen.getByRole('button', { name: /generate content/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to generate content');
    });

    consoleSpy.mockRestore();
  });

  it.skip('handles API response with error status', async () => {
    mockMakeRequest
      .mockResolvedValueOnce({ data: mockCollections })
      .mockResolvedValueOnce({ status: 'error', msg: 'Custom error message' });

    render(<ContentGenerator onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    await waitFor(() => {
      expect(screen.getByText('physics-notes')).toBeInTheDocument();
    });

    // Fill and submit form
    const contentTypeSelect = screen.getByText('Select content type');
    fireEvent.click(contentTypeSelect);
    await waitFor(() => { const flashcardsOption = screen.getByRole('option', { name: 'Flashcards' }); fireEvent.click(flashcardsOption); });

    const topicInput = screen.getByPlaceholderText('Enter the topic you want to learn about');
    fireEvent.change(topicInput, { target: { value: 'Test Topic' } });

    fireEvent.click(screen.getByRole('button', { name: /generate content/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Custom error message');
    });
  });

  it('shows loading state during generation', async () => {
    let resolvePromise: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    
    mockMakeRequest
      .mockResolvedValueOnce({ data: mockCollections })
      .mockReturnValueOnce(pendingPromise);

    render(<ContentGenerator onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    await waitFor(() => {
      expect(screen.getByText('physics-notes')).toBeInTheDocument();
    });

    // Fill and submit form
    const contentTypeSelect = screen.getByText('Select content type');
    fireEvent.click(contentTypeSelect);
    await waitFor(() => { const flashcardsOption = screen.getByRole('option', { name: 'Flashcards' }); fireEvent.click(flashcardsOption); });

    const topicInput = screen.getByPlaceholderText('Enter the topic you want to learn about');
    fireEvent.change(topicInput, { target: { value: 'Test Topic' } });

    fireEvent.click(screen.getByRole('button', { name: /generate content/i }));

    expect(screen.getByText('Generating...')).toBeInTheDocument();
    
    const submitButton = screen.getByText('Generating...');
    expect(submitButton).toBeDisabled();

    // Resolve the promise
    resolvePromise!({ status: 'success' });
  });

  it('calls onClose when back button is clicked', async () => {
    mockMakeRequest.mockResolvedValue({ data: mockCollections });

    render(<ContentGenerator onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const backButton = screen.getByText('Back');
    fireEvent.click(backButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button is clicked', async () => {
    mockMakeRequest.mockResolvedValue({ data: mockCollections });

    render(<ContentGenerator onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('disables buttons during loading', async () => {
    let resolvePromise: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    
    mockMakeRequest
      .mockResolvedValueOnce({ data: mockCollections })
      .mockReturnValueOnce(pendingPromise);

    render(<ContentGenerator onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    await waitFor(() => {
      expect(screen.getByText('physics-notes')).toBeInTheDocument();
    });

    // Fill and submit form
    const contentTypeSelect = screen.getByText('Select content type');
    fireEvent.click(contentTypeSelect);
    await waitFor(() => { const flashcardsOption = screen.getByRole('option', { name: 'Flashcards' }); fireEvent.click(flashcardsOption); });

    const topicInput = screen.getByPlaceholderText('Enter the topic you want to learn about');
    fireEvent.change(topicInput, { target: { value: 'Test Topic' } });

    fireEvent.click(screen.getByRole('button', { name: /generate content/i }));

    expect(screen.getByText('Back')).toBeDisabled();
    expect(screen.getByText('Cancel')).toBeDisabled();

    // Resolve the promise
    resolvePromise!({ status: 'success' });
  });
});
