import React from 'react'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, beforeEach, test, expect, describe } from 'vitest'
import type { SubscriptionStatus } from '@/lib/billingTypes'

// Set global flag for billing tests to use production URL
;(global as any).__BILLING_TEST__ = true

// Mock billing lib
vi.mock('@/lib/billing', () => ({
  getSubscriptionStatus: vi.fn(),
  cancelSubscription: vi.fn(),
  createCheckoutSession: vi.fn(),
  formatPrice: vi.fn(),
  formatInterval: vi.fn(),
  getStatusColor: vi.fn(),
  getStatusLabel: vi.fn(),
}))

// Mock sonner toast - move mockToast inside the factory
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}))

// Mock icons
vi.mock('lucide-react', () => ({
  Loader2: ({ className }: any) => <div className={className} data-testid="loader">Loading...</div>,
  Crown: ({ className }: any) => <div className={className} data-testid="crown">👑</div>,
  Check: ({ className }: any) => <div className={className} data-testid="check">✓</div>,
  X: ({ className }: any) => <div className={className} data-testid="x">✗</div>,
}))

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, variant, disabled }: any) => (
    <button 
      onClick={onClick} 
      className={className} 
      data-variant={variant}
      disabled={disabled}
      data-testid="button"
    >
      {children}
    </button>
  )
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: any) => <div data-testid="card-description">{children}</div>,
  CardFooter: ({ children }: any) => <div data-testid="card-footer">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <div data-testid="card-title">{children}</div>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => (
    <span className={className} data-testid="badge">{children}</span>
  )
}))

// Import after mocking
import { BillingSubscription } from '@/components/billing/BillingSubscription'
import { 
  getSubscriptionStatus,
  cancelSubscription,
  createCheckoutSession,
  formatPrice,
  formatInterval,
  getStatusColor,
  getStatusLabel
} from '@/lib/billing'
import { toast } from 'sonner'

// Cast mocked functions for type safety
const mockGetSubscriptionStatus = getSubscriptionStatus as ReturnType<typeof vi.fn>
const mockCancelSubscription = cancelSubscription as ReturnType<typeof vi.fn>
const mockCreateCheckoutSession = createCheckoutSession as ReturnType<typeof vi.fn>
const mockFormatPrice = formatPrice as ReturnType<typeof vi.fn>
const mockFormatInterval = formatInterval as ReturnType<typeof vi.fn>
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

// Mock window.location
const mockLocation = {
  origin: 'https://test.com',
  href: 'https://test.com'
}
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
})

// Mock window.confirm
const mockConfirm = vi.fn()
Object.defineProperty(window, 'confirm', {
  value: mockConfirm,
  writable: true
})

describe('BillingSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFormatPrice.mockReturnValue('৳1,000')
    mockFormatInterval.mockReturnValue('month')
    mockGetStatusColor.mockReturnValue('text-green-600')
    mockGetStatusLabel.mockReturnValue('Active')
    mockConfirm.mockReturnValue(true)
  })

  describe('Loading State', () => {
    test('shows loading spinner initially', () => {
      mockGetSubscriptionStatus.mockImplementation(() => new Promise(() => {}))

      render(<BillingSubscription />)

      // Use getAllByTestId in case there are multiple loaders initially
      const loaders = screen.getAllByTestId('loader')
      expect(loaders.length).toBeGreaterThan(0)
      expect(loaders[0]).toHaveClass('animate-spin')
    })
  })

  describe('With Active Subscription', () => {
    beforeEach(() => {
      mockGetSubscriptionStatus.mockResolvedValue(mockSubscription)
    })

    test('renders current subscription details', async () => {
      render(<BillingSubscription />)

      await waitFor(() => {
        expect(screen.getByText('Current Subscription')).toBeInTheDocument()
      })

      expect(screen.getByText('premium_monthly')).toBeInTheDocument()
      expect(screen.getAllByText('Active').length).toBeGreaterThan(0)
      expect(screen.getByText('1/1/2024')).toBeInTheDocument()
      expect(screen.getByText('2/1/2024')).toBeInTheDocument()
    })

    test('shows cancel subscription button for active subscription', async () => {
      render(<BillingSubscription />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel subscription/i })).toBeInTheDocument()
      })
    })

    test('displays upgrade plan section', async () => {
      render(<BillingSubscription />)

      await waitFor(() => {
        expect(screen.getByText('Upgrade Your Plan')).toBeInTheDocument()
      })
    })

    test('shows current plan button as disabled', async () => {
      render(<BillingSubscription />)

      await waitFor(() => {
        const currentPlanButton = screen.getByRole('button', { name: 'Current Plan' })
        expect(currentPlanButton).toBeDisabled()
      })
    })
  })

  describe('Without Subscription (Free Plan)', () => {
    beforeEach(() => {
      mockGetSubscriptionStatus.mockRejectedValue(new Error('No subscription'))
    })

    test('shows choose plan section', async () => {
      render(<BillingSubscription />)

      await waitFor(() => {
        expect(screen.getByText('Choose Your Plan')).toBeInTheDocument()
      })
    })

    test('displays free plan card', async () => {
      render(<BillingSubscription />)

      await waitFor(() => {
        expect(screen.getByText('Free Plan')).toBeInTheDocument()
      })

      // Find the Free Plan card specifically to avoid conflicts
      const freeCard = screen.getByText('Free Plan').closest('[data-testid="card"]') as HTMLElement
      expect(freeCard).toBeInTheDocument()
      
      expect(within(freeCard).getByText('Basic AI content generation (5 per day)')).toBeInTheDocument()
      expect(within(freeCard).getByText('Basic quiz features')).toBeInTheDocument()
    })

    test('shows subscribe now buttons', async () => {
      render(<BillingSubscription />)

      await waitFor(() => {
        const subscribeButtons = screen.getAllByRole('button', { name: 'Subscribe Now' })
        expect(subscribeButtons).toHaveLength(2) // Monthly and Yearly
      })
    })
  })

  describe('Plan Cards', () => {
    beforeEach(() => {
      mockGetSubscriptionStatus.mockRejectedValue(new Error('No subscription'))
    })

    test('renders available plans correctly', async () => {
      render(<BillingSubscription />)

      await waitFor(() => {
        expect(screen.getByText('Premium Monthly')).toBeInTheDocument()
        expect(screen.getByText('Premium Yearly')).toBeInTheDocument()
      })

      expect(mockFormatPrice).toHaveBeenCalledWith(100000, 'BDT')
      expect(mockFormatPrice).toHaveBeenCalledWith(1000000, 'BDT')
    })

    test('shows save badge on yearly plan', async () => {
      render(<BillingSubscription />)

      await waitFor(() => {
        expect(screen.getByText('Save 17%')).toBeInTheDocument()
      })
    })

    test('displays plan features correctly', async () => {
      render(<BillingSubscription />)

      await waitFor(() => {
        expect(screen.getByText('Premium Monthly')).toBeInTheDocument()
      })

      // Use getAllByText for features that appear in multiple cards
      expect(screen.getAllByText('Unlimited AI-generated content').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Advanced quiz features').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Priority support').length).toBeGreaterThan(0)
    })

    test('shows check icons for plan features', async () => {
      render(<BillingSubscription />)

      await waitFor(() => {
        const checkIcons = screen.getAllByTestId('check')
        expect(checkIcons.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Subscription Actions', () => {
    beforeEach(() => {
      mockGetSubscriptionStatus.mockRejectedValue(new Error('No subscription'))
    })

    test('handles subscription creation successfully', async () => {
      mockCreateCheckoutSession.mockResolvedValue({ checkout_url: 'https://payment.com/checkout' })

      render(<BillingSubscription />)

      await waitFor(() => screen.getAllByRole('button', { name: 'Subscribe Now' })[0])

      const subscribeButton = screen.getAllByRole('button', { name: 'Subscribe Now' })[0]
      fireEvent.click(subscribeButton)

      await waitFor(() => {
        expect(mockCreateCheckoutSession).toHaveBeenCalledWith({
          plan_id: 'premium_monthly',
          frontend_base_url: 'https://test.com'
        })
      })

      expect(mockLocation.href).toBe('https://payment.com/checkout')
    })

    test('handles subscription creation error', async () => {
      mockCreateCheckoutSession.mockRejectedValue(new Error('Payment failed'))

      render(<BillingSubscription />)

      await waitFor(() => screen.getAllByRole('button', { name: 'Subscribe Now' })[0])

      const subscribeButton = screen.getAllByRole('button', { name: 'Subscribe Now' })[0]
      fireEvent.click(subscribeButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to create checkout session',
          expect.objectContaining({
            description: 'Payment failed'
          })
        )
      })
    })

    test('handles missing checkout URL', async () => {
      mockCreateCheckoutSession.mockResolvedValue({}) // No checkout_url

      render(<BillingSubscription />)

      await waitFor(() => screen.getAllByRole('button', { name: 'Subscribe Now' })[0])

      const subscribeButton = screen.getAllByRole('button', { name: 'Subscribe Now' })[0]
      fireEvent.click(subscribeButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to create checkout session',
          expect.objectContaining({
            description: 'No checkout URL received'
          })
        )
      })
    })

    test('shows processing state during subscription', async () => {
      mockCreateCheckoutSession.mockImplementation(() => new Promise(() => {}))

      render(<BillingSubscription />)

      await waitFor(() => screen.getAllByRole('button', { name: 'Subscribe Now' })[0])

      const subscribeButton = screen.getAllByRole('button', { name: 'Subscribe Now' })[0]
      fireEvent.click(subscribeButton)

      await waitFor(() => {
        // Use getAllByText since both buttons show "Processing..." when one is clicked
        expect(screen.getAllByText('Processing...').length).toBeGreaterThan(0)
        // Use getAllByTestId since both buttons show loaders when processing
        expect(screen.getAllByTestId('loader').length).toBeGreaterThan(0)
      })
    })
  })

  describe('Subscription Cancellation', () => {
    beforeEach(() => {
      mockGetSubscriptionStatus.mockResolvedValue(mockSubscription)
    })

    test('handles subscription cancellation successfully', async () => {
      mockCancelSubscription.mockResolvedValue({})

      render(<BillingSubscription />)

      await waitFor(() => screen.getByRole('button', { name: /cancel subscription/i }))

      const cancelButton = screen.getByRole('button', { name: /cancel subscription/i })
      fireEvent.click(cancelButton)

      expect(mockConfirm).toHaveBeenCalledWith(
        'Are you sure you want to cancel your subscription? This action cannot be undone.'
      )

      await waitFor(() => {
        expect(mockCancelSubscription).toHaveBeenCalled()
        expect(toast.success).toHaveBeenCalledWith(
          'Subscription cancelled successfully',
          expect.objectContaining({
            description: 'Your subscription has been cancelled. You will not be charged again.'
          })
        )
      })
    })

    test('handles cancellation when user rejects confirmation', async () => {
      mockConfirm.mockReturnValue(false)

      render(<BillingSubscription />)

      await waitFor(() => screen.getByRole('button', { name: /cancel subscription/i }))

      const cancelButton = screen.getByRole('button', { name: /cancel subscription/i })
      fireEvent.click(cancelButton)

      expect(mockCancelSubscription).not.toHaveBeenCalled()
    })

    test('handles cancellation error', async () => {
      mockCancelSubscription.mockRejectedValue(new Error('Cancellation failed'))

      render(<BillingSubscription />)

      await waitFor(() => screen.getByRole('button', { name: /cancel subscription/i }))

      const cancelButton = screen.getByRole('button', { name: /cancel subscription/i })
      fireEvent.click(cancelButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to cancel subscription',
          expect.objectContaining({
            description: 'Cancellation failed'
          })
        )
      })
    })

    test('shows processing state during cancellation', async () => {
      mockCancelSubscription.mockImplementation(() => new Promise(() => {}))

      render(<BillingSubscription />)

      await waitFor(() => screen.getByRole('button', { name: /cancel subscription/i }))

      const cancelButton = screen.getByRole('button', { name: /cancel subscription/i })
      fireEvent.click(cancelButton)

      await waitFor(() => {
        // This should be unique since it's a cancel button, not subscribe buttons
        expect(screen.getByText('Cancelling...')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    test('handles subscription status load error gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockGetSubscriptionStatus.mockRejectedValue(new Error('API Error'))

      render(<BillingSubscription />)

      await waitFor(() => {
        expect(screen.getByText('Choose Your Plan')).toBeInTheDocument()
      })

      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })

    test('does not show error toast for 404 errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      // Create a custom error object with status property
      const error = Object.assign(new Error('Not found'), { status: 404 })
      mockGetSubscriptionStatus.mockRejectedValue(error)

      render(<BillingSubscription />)

      await waitFor(() => {
        expect(screen.getByText('Choose Your Plan')).toBeInTheDocument()
      })

      expect(toast.error).not.toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })

    test('shows error toast for non-404 errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      // Create a custom error object with status property
      const error = Object.assign(new Error('Server error'), { status: 500 })
      mockGetSubscriptionStatus.mockRejectedValue(error)

      render(<BillingSubscription />)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to load subscription status',
          expect.objectContaining({
            description: 'Server error'
          })
        )
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Ref Integration', () => {
    test('exposes refresh method via ref', async () => {
      const ref = React.createRef<{ refreshSubscriptionStatus: () => void }>()
      mockGetSubscriptionStatus.mockResolvedValue(mockSubscription)

      render(<BillingSubscription ref={ref} />)

      await waitFor(() => {
        expect(ref.current).toBeDefined()
        expect(typeof ref.current?.refreshSubscriptionStatus).toBe('function')
      })

      // Test calling the refresh method
      vi.clearAllMocks()
      ref.current?.refreshSubscriptionStatus()

      expect(mockGetSubscriptionStatus).toHaveBeenCalledTimes(1)
    })
  })

  describe('Button States', () => {
    test('disables buttons during processing', async () => {
      mockGetSubscriptionStatus.mockRejectedValue(new Error('No subscription'))
      mockCreateCheckoutSession.mockImplementation(() => new Promise(() => {}))

      render(<BillingSubscription />)

      await waitFor(() => screen.getAllByRole('button', { name: 'Subscribe Now' })[0])

      const subscribeButton = screen.getAllByRole('button', { name: 'Subscribe Now' })[0]
      fireEvent.click(subscribeButton)

      await waitFor(() => {
        const allButtons = screen.getAllByTestId('button')
        allButtons.forEach(button => {
          expect(button).toBeDisabled()
        })
        // Check that processing text appears (but don't care how many times)
        expect(screen.getAllByText('Processing...').length).toBeGreaterThan(0)
      })
    })

    test('shows correct button text for different states', async () => {
      // Test with existing subscription
      mockGetSubscriptionStatus.mockResolvedValue(mockSubscription)

      render(<BillingSubscription />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Current Plan' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Switch Plan' })).toBeInTheDocument()
      })
    })
  })

  describe('Plan Features Display', () => {
    beforeEach(() => {
      mockGetSubscriptionStatus.mockRejectedValue(new Error('No subscription'))
    })

    test('displays all monthly plan features', async () => {
      render(<BillingSubscription />)

      await waitFor(() => {
        expect(screen.getByText('Premium Monthly')).toBeInTheDocument()
      })

      // Find the Premium Monthly card specifically
      const monthlyCard = screen.getByText('Premium Monthly').closest('[data-testid="card"]') as HTMLElement
      expect(monthlyCard).toBeInTheDocument()

      // Check features within the monthly card only
      expect(within(monthlyCard).getByText('Unlimited AI-generated content')).toBeInTheDocument()
      expect(within(monthlyCard).getByText('Advanced quiz features')).toBeInTheDocument()
      expect(within(monthlyCard).getByText('Priority support')).toBeInTheDocument()
      expect(within(monthlyCard).getByText('Export to PDF')).toBeInTheDocument()
      expect(within(monthlyCard).getByText('Advanced analytics')).toBeInTheDocument()
    })

    test('displays all yearly plan features', async () => {
      render(<BillingSubscription />)

      await waitFor(() => {
        expect(screen.getByText('Premium Yearly')).toBeInTheDocument()
      })

      // Find the Premium Yearly card specifically
      const yearlyCard = screen.getByText('Premium Yearly').closest('[data-testid="card"]') as HTMLElement
      expect(yearlyCard).toBeInTheDocument()

      // Check features within the yearly card only
      expect(within(yearlyCard).getByText('All Monthly features')).toBeInTheDocument()
      expect(within(yearlyCard).getByText('2 months free')).toBeInTheDocument()
      expect(within(yearlyCard).getByText('Priority customer support')).toBeInTheDocument()
      expect(within(yearlyCard).getByText('Early access to new features')).toBeInTheDocument()
      expect(within(yearlyCard).getByText('Advanced collaboration tools')).toBeInTheDocument()
    })

    test('displays free plan limitations', async () => {
      render(<BillingSubscription />)

      await waitFor(() => {
        expect(screen.getByText('Free Plan')).toBeInTheDocument()
      })

      // Find the Free Plan card specifically
      const freeCard = screen.getByText('Free Plan').closest('[data-testid="card"]') as HTMLElement
      expect(freeCard).toBeInTheDocument()

      // Check features within the free card only
      expect(within(freeCard).getByText('Basic AI content generation (5 per day)')).toBeInTheDocument()
      expect(within(freeCard).getByText('Basic quiz features')).toBeInTheDocument()

      // Check for X icons indicating limitations within the free card
      const xIcons = within(freeCard).getAllByTestId('x')
      expect(xIcons.length).toBeGreaterThan(0)

      // Verify specific limitations in free plan
      expect(within(freeCard).getByText('Advanced features')).toBeInTheDocument()
      expect(within(freeCard).getByText('Priority support')).toBeInTheDocument()
    })
  })
})