import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import '@testing-library/jest-dom'
import { vi, beforeEach, test, expect, describe } from 'vitest'
import Billing from '@/pages/Billing'

// Hoisted mock functions
const mockUseUserRole = vi.hoisted(() => vi.fn())
const mockGetSubscriptionStatus = vi.hoisted(() => vi.fn())
const mockCreateCheckoutSession = vi.hoisted(() => vi.fn())
const mockCancelSubscription = vi.hoisted(() => vi.fn())

// Mock useUserRole hook
vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: mockUseUserRole,
}))

vi.mock(import("@/lib/billing"), async (importOriginal) => {
    const actual = await importOriginal()
    return {
      ...actual,
      getSubscriptionStatus: mockGetSubscriptionStatus,
      createCheckoutSession: mockCreateCheckoutSession,
      cancelSubscription: mockCancelSubscription,
    }
})

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, className }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className}
      data-variant={variant}
      data-testid="button"
    >
      {children}
    </button>
  ),
}))

const mockUserProfile = {
  uid: 'test-uid-123',
  email: 'john@example.com',
  name: 'John Doe',
  role: 'user',
  is_admin: false,
  current_plan: 'free',
}

const mockSubscription = {
  id: 'sub_123456789',
  user_id: 'test-uid-123',
  plan_id: 'premium',
  status: 'active',
  start_date: '2024-01-01T00:00:00Z',
  end_date: '2025-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const renderBilling = () => {
  return render(
    <BrowserRouter>
      <Billing />
    </BrowserRouter>
  )
}

describe('Billing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders billing page with subscription details', async () => {
    mockUseUserRole.mockReturnValue({
      userProfile: mockUserProfile,
      loading: false,
      refetching: false,
      error: null,
      refetchUserProfile: vi.fn(),
    })

    mockGetSubscriptionStatus.mockResolvedValue(mockSubscription)

    renderBilling()

    await waitFor(() => {
      expect(screen.getByText('Billing & Subscription')).toBeInTheDocument()
    })
  })

})