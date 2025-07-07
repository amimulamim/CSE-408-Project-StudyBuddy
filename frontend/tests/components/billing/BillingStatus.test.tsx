import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, beforeEach, test, expect, describe } from 'vitest'
import type { SubscriptionStatus } from '@/lib/billingTypes'

// Mock billing lib
vi.mock('@/lib/billing', () => ({
  getSubscriptionStatus: vi.fn(),
  getStatusColor: vi.fn(),
  getStatusLabel: vi.fn(),
}))

// Mock icons
vi.mock('lucide-react', () => ({
  Crown: ({ className }: any) => <div className={className} data-testid="crown-icon">👑</div>,
  Calendar: ({ className }: any) => <div className={className} data-testid="calendar-icon">📅</div>,
  CreditCard: ({ className }: any) => <div className={className} data-testid="credit-card-icon">💳</div>,
  Clock: ({ className }: any) => <div className={className} data-testid="clock-icon">🕐</div>,
}))

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className} data-testid="card-content">{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className} data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <div className={className} data-testid="card-title">{children}</div>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, variant }: any) => (
    <span className={className} data-testid="badge" data-variant={variant}>
      {children}
    </span>
  )
}))

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />
}))

// Import after mocking
import { BillingStatus } from '@/components/billing/BillingStatus'
import { getSubscriptionStatus, getStatusColor, getStatusLabel } from '@/lib/billing'

// Cast mocked functions for type safety
const mockGetSubscriptionStatus = getSubscriptionStatus as ReturnType<typeof vi.fn>
const mockGetStatusColor = getStatusColor as ReturnType<typeof vi.fn>
const mockGetStatusLabel = getStatusLabel as ReturnType<typeof vi.fn>

const mockSubscription: SubscriptionStatus = {
  id: 'sub_123',
  user_id: 'user_456',
  plan_id: 'premium_monthly',
  status: 'active',
  start_date: '2024-01-01T00:00:00Z',
  end_date: '2024-02-01T00:00:00Z',
  cancel_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

describe('BillingStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetStatusColor.mockReturnValue('text-green-600')
    mockGetStatusLabel.mockReturnValue('Active')
  })

  describe('Loading State', () => {
    test('shows loading state initially', () => {
      mockGetSubscriptionStatus.mockImplementation(() => new Promise(() => {}))

      render(<BillingStatus />)

      expect(screen.getByTestId('card')).toBeInTheDocument()
      const loadingElement = screen.getByTestId('card-content').querySelector('.animate-pulse')
      expect(loadingElement).toBeInTheDocument()
    })

    test('shows compact loading state', () => {
      mockGetSubscriptionStatus.mockImplementation(() => new Promise(() => {}))

      render(<BillingStatus compact />)

      const loadingElement = document.querySelector('.animate-pulse')
      expect(loadingElement).toBeInTheDocument()
    })
  })

  describe('With Subscription', () => {
    beforeEach(() => {
      mockGetSubscriptionStatus.mockResolvedValue(mockSubscription)
    })

    test('renders subscription details with title', async () => {
      render(<BillingStatus />)

      await waitFor(() => {
        expect(screen.getByText('Billing Status')).toBeInTheDocument()
      })

      expect(screen.getByTestId('credit-card-icon')).toBeInTheDocument()
      expect(screen.getByText('Premium Monthly')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByTestId('crown-icon')).toBeInTheDocument()
    })

    test('renders subscription details without title', async () => {
      render(<BillingStatus showTitle={false} />)

      await waitFor(() => {
        expect(screen.getByText('Premium Monthly')).toBeInTheDocument()
      })

      expect(screen.queryByText('Billing Status')).not.toBeInTheDocument()
      expect(screen.queryByTestId('card-header')).not.toBeInTheDocument()
    })

    test('renders compact view', async () => {
      render(<BillingStatus compact />)

      await waitFor(() => {
        expect(screen.getByText('Premium Monthly')).toBeInTheDocument()
      })

      expect(screen.getByTestId('crown-icon')).toBeInTheDocument()
      expect(screen.getByTestId('badge')).toBeInTheDocument()
      expect(screen.queryByTestId('card')).not.toBeInTheDocument()
    })

    test('displays start date correctly', async () => {
      render(<BillingStatus />)

      await waitFor(() => {
        expect(screen.getByText('Started')).toBeInTheDocument()
      })

      expect(screen.getByText('1/1/2024')).toBeInTheDocument()
      expect(screen.getByTestId('calendar-icon')).toBeInTheDocument()
    })

    test('displays end date when available', async () => {
      render(<BillingStatus />)

      await waitFor(() => {
        expect(screen.getByText('Renews')).toBeInTheDocument()
      })

      expect(screen.getByText('2/1/2024')).toBeInTheDocument()
    })

    test('displays cancel date when subscription is cancelled', async () => {
      const cancelledSubscription = {
        ...mockSubscription,
        status: 'cancelled' as const,
        cancel_at: '2024-01-15T00:00:00Z'
      }
      mockGetSubscriptionStatus.mockResolvedValue(cancelledSubscription)
      mockGetStatusLabel.mockReturnValue('Cancelled')

      render(<BillingStatus />)

      await waitFor(() => {
        expect(screen.getByText('Cancels At')).toBeInTheDocument()
      })

      expect(screen.getByText('1/15/2024')).toBeInTheDocument()
      
      // Find the section that contains "Cancels At" and verify its clock icon
      const cancelsAtSection = screen.getByText('Cancels At').closest('.flex')
      expect(cancelsAtSection).toBeInTheDocument()
      
      const clockIconInCancelsSection = cancelsAtSection?.querySelector('[data-testid="clock-icon"]')
      expect(clockIconInCancelsSection).toHaveClass('text-orange-500')
    })

    test('shows "Ended" for inactive subscriptions', async () => {
      const inactiveSubscription = {
        ...mockSubscription,
        status: 'cancelled' as const
      }
      mockGetSubscriptionStatus.mockResolvedValue(inactiveSubscription)

      render(<BillingStatus />)

      await waitFor(() => {
        expect(screen.getByText('Ended')).toBeInTheDocument()
      })
    })

    test('formats plan name correctly', async () => {
      const subscriptionWithUnderscores = {
        ...mockSubscription,
        plan_id: 'premium_yearly'
      }
      mockGetSubscriptionStatus.mockResolvedValue(subscriptionWithUnderscores)

      render(<BillingStatus />)

      await waitFor(() => {
        expect(screen.getByText('Premium Yearly')).toBeInTheDocument()
      })
    })

    test('applies status colors correctly', async () => {
      mockGetStatusColor.mockReturnValue('text-blue-600')

      render(<BillingStatus />)

      await waitFor(() => {
        const badge = screen.getByTestId('badge')
        expect(badge).toHaveClass('text-blue-600')
      })
    })
  })

  describe('Without Subscription (Free Plan)', () => {
    beforeEach(() => {
      mockGetSubscriptionStatus.mockRejectedValue(new Error('No subscription'))
    })

    test('renders free plan message', async () => {
      render(<BillingStatus />)

      await waitFor(() => {
        expect(screen.getByText('Free Plan')).toBeInTheDocument()
      })

      expect(screen.getByText('Upgrade to unlock premium features')).toBeInTheDocument()
      expect(screen.getByTestId('crown-icon')).toHaveClass('text-gray-400')
    })

    test('renders compact free plan view', async () => {
      render(<BillingStatus compact />)

      await waitFor(() => {
        expect(screen.getByTestId('badge')).toBeInTheDocument()
      })

      const badge = screen.getByTestId('badge')
      expect(badge).toHaveAttribute('data-variant', 'secondary')
      expect(badge).toHaveTextContent('Free Plan')
    })

    test('shows free plan icon styling', async () => {
      render(<BillingStatus />)

      await waitFor(() => {
        const iconContainer = document.querySelector('.bg-gray-100.rounded-full')
        expect(iconContainer).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    test('handles API errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockGetSubscriptionStatus.mockRejectedValue(new Error('API Error'))

      render(<BillingStatus />)

      await waitFor(() => {
        expect(screen.getByText('Free Plan')).toBeInTheDocument()
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load subscription status:', expect.any(Error))
      consoleErrorSpy.mockRestore()
    })

    test('handles network errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockGetSubscriptionStatus.mockRejectedValue(new Error('Network Error'))

      render(<BillingStatus />)

      await waitFor(() => {
        expect(screen.getByText('Free Plan')).toBeInTheDocument()
      })

      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Props Handling', () => {
    beforeEach(() => {
      mockGetSubscriptionStatus.mockResolvedValue(mockSubscription)
    })

    test('respects showTitle prop', async () => {
      const { rerender } = render(<BillingStatus showTitle={true} />)

      await waitFor(() => {
        expect(screen.getByText('Billing Status')).toBeInTheDocument()
      })

      rerender(<BillingStatus showTitle={false} />)

      expect(screen.queryByText('Billing Status')).not.toBeInTheDocument()
    })

    test('respects compact prop', async () => {
      const { rerender } = render(<BillingStatus compact={false} />)

      await waitFor(() => {
        expect(screen.getByTestId('card')).toBeInTheDocument()
      })

      rerender(<BillingStatus compact={true} />)

      expect(screen.queryByTestId('card')).not.toBeInTheDocument()
    })

    test('has correct default prop values', async () => {
      render(<BillingStatus />)

      await waitFor(() => {
        expect(screen.getByText('Billing Status')).toBeInTheDocument()
        expect(screen.getByTestId('card')).toBeInTheDocument()
      })
    })
  })

  describe('Date Formatting', () => {
    test('formats dates correctly', async () => {
      const subscriptionWithSpecificDates = {
        ...mockSubscription,
        start_date: '2024-12-25T00:00:00Z',
        end_date: '2025-01-25T00:00:00Z'
      }
      mockGetSubscriptionStatus.mockResolvedValue(subscriptionWithSpecificDates)

      render(<BillingStatus />)

      await waitFor(() => {
        expect(screen.getByText('12/25/2024')).toBeInTheDocument()
        expect(screen.getByText('1/25/2025')).toBeInTheDocument()
      })
    })

    test('handles edge case dates', async () => {
      const subscriptionWithEdgeDates = {
        ...mockSubscription,
        start_date: '2024-02-29T00:00:00Z', // Leap year
        end_date: '2024-03-01T00:00:00Z'
      }
      mockGetSubscriptionStatus.mockResolvedValue(subscriptionWithEdgeDates)

      render(<BillingStatus />)

      await waitFor(() => {
        expect(screen.getByText('2/29/2024')).toBeInTheDocument()
        expect(screen.getByText('3/1/2024')).toBeInTheDocument()
      })
    })
  })

  describe('Component Integration', () => {
    test('calls billing functions correctly', async () => {
      mockGetSubscriptionStatus.mockResolvedValue(mockSubscription)

      render(<BillingStatus />)

      await waitFor(() => {
        expect(mockGetSubscriptionStatus).toHaveBeenCalledTimes(1)
        expect(mockGetStatusColor).toHaveBeenCalledWith('active')
        expect(mockGetStatusLabel).toHaveBeenCalledWith('active')
      })
    })

    test('loads subscription status on mount', () => {
      mockGetSubscriptionStatus.mockResolvedValue(mockSubscription)

      render(<BillingStatus />)

      expect(mockGetSubscriptionStatus).toHaveBeenCalledTimes(1)
    })
  })
})