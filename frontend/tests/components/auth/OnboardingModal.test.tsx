import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingModal } from '@/components/auth/OnboardingModal';
import { updateUserField } from '@/lib/userProfile';
import { signIn, updateUserProfile } from '@/components/auth/api';
import { auth } from '@/lib/firebase';
import { toast } from 'sonner';
import { clearAuthCache } from '@/lib/authState';

// Mock dependencies
vi.mock('@/lib/userProfile');
vi.mock('@/components/auth/api');

// Mock Firebase Auth with a verified user
vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: {
      emailVerified: true,
      displayName: 'Test User',
      photoURL: 'https://example.com/avatar.jpg',
      reload: vi.fn(() => Promise.resolve()),
    },
  },
}));
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock('@/lib/authState', () => ({
  clearAuthCache: vi.fn(),
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));
vi.mock('firebase/auth', () => ({
  signOut: vi.fn(() => Promise.resolve()),
  User: vi.fn(),
}));
vi.mock('@/components/auth/PendingEmailVerification', () => ({
  PendingEmailVerification: () => <div data-testid="pending-email-verification">Pending Email Verification</div>,
}));
vi.mock('@/components/auth/AuthRedirectHandler', () => ({
  AuthRedirectHandler: ({ onRedirectComplete }: { onRedirectComplete: () => void }) => {
    return <div data-testid="auth-redirect-handler" onClick={onRedirectComplete}>Auth Redirect Handler</div>;
  },
}));

const mockUpdateUserField = vi.mocked(updateUserField);
const mockSignIn = vi.mocked(signIn);
const mockUpdateUserProfile = vi.mocked(updateUserProfile);
const mockToast = vi.mocked(toast);
const mockClearAuthCache = vi.mocked(clearAuthCache);

describe('OnboardingModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Firebase auth user
    (auth as any).currentUser = {
      displayName: 'Test User',
      photoURL: 'https://example.com/avatar.jpg',
      emailVerified: true,
      reload: vi.fn(() => Promise.resolve()),
    };

    // Mock successful API responses
    mockSignIn.mockResolvedValue({ status: 'success' });
    mockUpdateUserProfile.mockResolvedValue({ status: 'success' });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders onboarding modal when open', async () => {
    render(<OnboardingModal isOpen={true} onClose={mockOnClose} />);

    // Wait for email verification to complete and onboarding content to appear
    await waitFor(() => {
      expect(screen.getByText('Select your role')).toBeInTheDocument();
    });
    
    expect(screen.getByText("Let us know how you'll be using StuddyBuddy")).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<OnboardingModal isOpen={false} onClose={mockOnClose} />);

    expect(screen.queryByText('Select your role')).not.toBeInTheDocument();
  });

  it('displays role selection step correctly', async () => {
    render(<OnboardingModal isOpen={true} onClose={mockOnClose} />);

    // Wait for onboarding content to appear
    await waitFor(() => {
      expect(screen.getByText('Student')).toBeInTheDocument();
    });
    
    expect(screen.getByText('I want to learn and study with assistance')).toBeInTheDocument();
    expect(screen.getByText('Content Moderator')).toBeInTheDocument();
    expect(screen.getByText('I want to create and manage learning content')).toBeInTheDocument();
  });

  it('allows selecting a role and enables continue button', async () => {
    render(<OnboardingModal isOpen={true} onClose={mockOnClose} />);

    // Wait for onboarding content to appear
    await waitFor(() => {
      expect(screen.getByText('Continue')).toBeInTheDocument();
    });

    const continueButton = screen.getByText('Continue');
    expect(continueButton).toBeDisabled();

    const studentRadio = screen.getByRole('radio', { name: /student/i });
    fireEvent.click(studentRadio);

    expect(continueButton).toBeEnabled();
  });

  it('navigates to domain selection step', async () => {
    render(<OnboardingModal isOpen={true} onClose={mockOnClose} />);

    // Wait for onboarding content to appear first
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /student/i })).toBeInTheDocument();
    });

    // Select role
    const studentRadio = screen.getByRole('radio', { name: /student/i });
    fireEvent.click(studentRadio);

    // Click continue
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(screen.getByText('Choose your domain')).toBeInTheDocument();
      expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    });
  });

  it('displays domain options correctly', async () => {
    render(<OnboardingModal isOpen={true} onClose={mockOnClose} />);

    // Wait for onboarding content to appear first
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /student/i })).toBeInTheDocument();
    });

    // Navigate to domain step
    fireEvent.click(screen.getByRole('radio', { name: /student/i }));
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('Physics')).toBeInTheDocument();
      expect(screen.getByText('Computer Science')).toBeInTheDocument();
      expect(screen.getByText('Mathematics')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your domain')).toBeInTheDocument();
    });
  });

  it('allows selecting a domain and custom domain input', async () => {
    render(<OnboardingModal isOpen={true} onClose={mockOnClose} />);

    // Wait for onboarding content to appear first
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /student/i })).toBeInTheDocument();
    });

    // Navigate to domain step
    fireEvent.click(screen.getByRole('radio', { name: /student/i }));
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      const physicsButton = screen.getByText('Physics');
      fireEvent.click(physicsButton);

      expect(screen.getByText('Continue')).toBeEnabled();
    });

    // Test custom domain
    const customDomainInput = screen.getByPlaceholderText('Enter your domain');
    fireEvent.change(customDomainInput, { target: { value: 'Custom Domain' } });

    expect(screen.getByText('Continue')).toBeEnabled();
  });

  it('navigates to interests selection step', async () => {
    render(<OnboardingModal isOpen={true} onClose={mockOnClose} />);

    // Wait for onboarding content to appear first
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /student/i })).toBeInTheDocument();
    });

    // Navigate through steps
    fireEvent.click(screen.getByRole('radio', { name: /student/i }));
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      fireEvent.click(screen.getByText('Physics'));
      fireEvent.click(screen.getByText('Continue'));
    });

    await waitFor(() => {
      expect(screen.getByText('Pick your interests')).toBeInTheDocument();
      expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
    });
  });

  it('displays interests based on selected domain', async () => {
    render(<OnboardingModal isOpen={true} onClose={mockOnClose} />);

    // Wait for onboarding content to appear first
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /student/i })).toBeInTheDocument();
    });

    // Navigate to interests step with Physics domain
    fireEvent.click(screen.getByRole('radio', { name: /student/i }));
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      fireEvent.click(screen.getByText('Physics'));
      fireEvent.click(screen.getByText('Continue'));
    });

    await waitFor(() => {
      expect(screen.getByText('Mechanics')).toBeInTheDocument();
      expect(screen.getByText('Quantum Physics')).toBeInTheDocument();
      expect(screen.getByText('Thermodynamics')).toBeInTheDocument();
    });
  });

  it('allows selecting interests and adding custom interests', async () => {
    render(<OnboardingModal isOpen={true} onClose={mockOnClose} />);

    // Wait for onboarding content to appear first
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /student/i })).toBeInTheDocument();
    });

    // Navigate to interests step
    fireEvent.click(screen.getByRole('radio', { name: /student/i }));
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      fireEvent.click(screen.getByText('Physics'));
      fireEvent.click(screen.getByText('Continue'));
    });

    await waitFor(() => {
      // Select some interests
      fireEvent.click(screen.getByLabelText('Mechanics'));
      fireEvent.click(screen.getByLabelText('Quantum Physics'));

      // Add custom interest
      const customInterestInput = screen.getByPlaceholderText('Enter custom interest');
      fireEvent.change(customInterestInput, { target: { value: 'Relativity' } });
      fireEvent.click(screen.getByText('Add'));

      expect(screen.getByText('Complete')).toBeEnabled();
    });
  });

  it('adds custom interest by pressing Enter key', async () => {
    render(<OnboardingModal isOpen={true} onClose={mockOnClose} />);

    // Wait for onboarding content to appear first
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /student/i })).toBeInTheDocument();
    });

    // Navigate to interests step
    fireEvent.click(screen.getByRole('radio', { name: /student/i }));
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      fireEvent.click(screen.getByText('Physics'));
      fireEvent.click(screen.getByText('Continue'));
    });

    await waitFor(() => {
      const customInterestInput = screen.getByPlaceholderText('Enter custom interest');
      fireEvent.change(customInterestInput, { target: { value: 'Relativity' } });
      fireEvent.keyDown(customInterestInput, { key: 'Enter' });

      expect(screen.getByText('Relativity')).toBeInTheDocument();
    });
  });

  it('removes interests when clicking the remove button', async () => {
    render(<OnboardingModal isOpen={true} onClose={mockOnClose} />);

    // Wait for onboarding content to appear first
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /student/i })).toBeInTheDocument();
    });

    // Navigate to interests step and select interests
    fireEvent.click(screen.getByRole('radio', { name: /student/i }));
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      fireEvent.click(screen.getByText('Physics'));
      fireEvent.click(screen.getByText('Continue'));
    });

    await waitFor(() => {
      fireEvent.click(screen.getByLabelText('Mechanics'));

      // Interest should appear in selected list
      expect(screen.getByText('Selected interests:')).toBeInTheDocument();
      
      // Find and click the remove button (×)
      const removeButton = screen.getByText('×');
      fireEvent.click(removeButton);

      // Interest should be removed (but the label might still exist in the checkbox list)
      expect(screen.queryByText('Selected interests:')).not.toBeInTheDocument();
    });
  });

  it('completes onboarding successfully', async () => {
    render(<OnboardingModal isOpen={true} onClose={mockOnClose} />);

    // Wait for onboarding content to appear first
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /student/i })).toBeInTheDocument();
    });

    // Complete all steps
    fireEvent.click(screen.getByRole('radio', { name: /student/i }));
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      fireEvent.click(screen.getByText('Physics'));
      fireEvent.click(screen.getByText('Continue'));
    });

    await waitFor(() => {
      fireEvent.click(screen.getByLabelText('Mechanics'));
      fireEvent.click(screen.getByText('Complete'));
    });

    await waitFor(() => {
      expect(mockUpdateUserField).toHaveBeenCalledWith('onboardingDone', true);
      expect(mockUpdateUserProfile).toHaveBeenCalledWith({
        interests: 'Mechanics',
        study_domain: 'Physics',
        name: 'Test User',
        avatar: 'https://example.com/avatar.jpg',
      });
      expect(mockToast.success).toHaveBeenCalledWith('Onboarding completed successfully!');
    });
  });

  it('shows completion screen after successful onboarding', async () => {
    render(<OnboardingModal isOpen={true} onClose={mockOnClose} />);
    // Wait for onboarding content to appear
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /student/i })).toBeInTheDocument();
    });

    // Complete onboarding
    fireEvent.click(screen.getByRole('radio', { name: /student/i }));
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      fireEvent.click(screen.getByText('Physics'));
      fireEvent.click(screen.getByText('Continue'));
    });

    await waitFor(() => {
      fireEvent.click(screen.getByLabelText('Mechanics'));
      fireEvent.click(screen.getByText('Complete'));
    });

    // The component transitions directly to AuthRedirectHandler after successful completion
    await waitFor(() => {
      expect(screen.getByTestId('auth-redirect-handler')).toBeInTheDocument();
    });
  });

  it('handles onboarding completion error', async () => {
    mockUpdateUserProfile.mockRejectedValue(new Error('Network error'));

    render(<OnboardingModal isOpen={true} onClose={mockOnClose} />);
    // Wait for onboarding content to appear
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /student/i })).toBeInTheDocument();
    });

    // Complete steps
    fireEvent.click(screen.getByRole('radio', { name: /student/i }));
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      fireEvent.click(screen.getByText('Physics'));
      fireEvent.click(screen.getByText('Continue'));
    });

    await waitFor(() => {
      fireEvent.click(screen.getByLabelText('Mechanics'));
      fireEvent.click(screen.getByText('Complete'));
    });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Error saving preferences: Network error');
    });
  });

  it('navigates back through steps correctly', async () => {
    render(<OnboardingModal isOpen={true} onClose={mockOnClose} />);
    // Wait for onboarding content to appear
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /student/i })).toBeInTheDocument();
    });

    // Navigate forward
    fireEvent.click(screen.getByRole('radio', { name: /student/i }));
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('Choose your domain')).toBeInTheDocument();
    });

    // Navigate back
    fireEvent.click(screen.getByText('Back'));

    await waitFor(() => {
      expect(screen.getByText('Select your role')).toBeInTheDocument();
    });
  });

  it('disables back button on first step', async () => {
    render(<OnboardingModal isOpen={true} onClose={mockOnClose} />);
    // Wait for onboarding content to appear
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /student/i })).toBeInTheDocument();
    });

    const backButton = screen.getByText('Back');
    expect(backButton).toBeDisabled();
  });

  it('shows progress indicator correctly', async () => {
    render(<OnboardingModal isOpen={true} onClose={mockOnClose} />);
    // Wait for onboarding content to appear
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /student/i })).toBeInTheDocument();
    });

    // Check initial progress
    const progressBars = document.querySelectorAll('.h-1.w-16.rounded-full');
    expect(progressBars[0]).toHaveClass('bg-study-purple');
    expect(progressBars[1]).toHaveClass('bg-muted');
    expect(progressBars[2]).toHaveClass('bg-muted');

    // Navigate to step 2
    fireEvent.click(screen.getByRole('radio', { name: /student/i }));
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      const updatedProgressBars = document.querySelectorAll('.h-1.w-16.rounded-full');
      expect(updatedProgressBars[0]).toHaveClass('bg-study-purple');
      expect(updatedProgressBars[1]).toHaveClass('bg-study-purple');
      expect(updatedProgressBars[2]).toHaveClass('bg-muted');
    });
  });

  it('handles default interests for unsupported domains', async () => {
    render(<OnboardingModal isOpen={true} onClose={mockOnClose} />);
    // Wait for onboarding content to appear
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /student/i })).toBeInTheDocument();
    });

    // Navigate to domain step and select a domain not in interestOptions
    fireEvent.click(screen.getByRole('radio', { name: /student/i }));
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      fireEvent.click(screen.getByText('Arts')); // Domain not in interestOptions
      fireEvent.click(screen.getByText('Continue'));
    });

    await waitFor(() => {
      // Should show default interests
      expect(screen.getByText('Theory')).toBeInTheDocument();
      expect(screen.getByText('Applications')).toBeInTheDocument();
      expect(screen.getByText('Research')).toBeInTheDocument();
    });
  });

  it('renders AuthRedirectHandler after successful completion', async () => {
    render(<OnboardingModal isOpen={true} onClose={mockOnClose} />);
    // Wait for onboarding content to appear
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /student/i })).toBeInTheDocument();
    });

    // Complete onboarding
    fireEvent.click(screen.getByRole('radio', { name: /student/i }));
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      fireEvent.click(screen.getByText('Physics'));
      fireEvent.click(screen.getByText('Continue'));
    });

    await waitFor(() => {
      fireEvent.click(screen.getByLabelText('Mechanics'));
      fireEvent.click(screen.getByText('Complete'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-redirect-handler')).toBeInTheDocument();
    });
  });
});
