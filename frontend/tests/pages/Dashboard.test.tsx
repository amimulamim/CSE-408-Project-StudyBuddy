import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import Dashboard from '@/pages/Dashboard'

// Mock DOM APIs for Avatar component
Object.defineProperty(HTMLImageElement.prototype, 'addEventListener', {
  value: vi.fn(),
  writable: true,
})

Object.defineProperty(HTMLImageElement.prototype, 'removeEventListener', {
  value: vi.fn(),
  writable: true,
})

Object.defineProperty(HTMLImageElement.prototype, 'src', {
  set: vi.fn(),
  get: vi.fn(() => ''),
  configurable: true,
})

// Mock Firebase auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signOut: vi.fn(),
}))

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock useUserRole hook
vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: vi.fn(),
}))

// Mock billing functions
vi.mock('@/lib/billing', () => ({
  getSubscriptionStatus: vi.fn(),
  getStatusColor: vi.fn(() => 'text-green-600'),
  getStatusLabel: vi.fn(() => 'Active'),
}))

// Mock auth state
vi.mock('@/lib/authState', () => ({
  clearAuthCache: vi.fn(),
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}))

// Mock components
vi.mock('@/components/notifications/NotificationButton', () => ({
  NotificationButton: () => <button>Notifications</button>,
}))

vi.mock('@/components/chatbot/ChatbotFAB', () => ({
  ChatbotFAB: () => <div data-testid="chatbot-fab">ChatbotFAB</div>,
}))

vi.mock('@/components/quiz/QuizDashboard', () => ({
  QuizDashboard: () => <div data-testid="quiz-dashboard">QuizDashboard</div>,
}))

// Mock Avatar components to avoid DOM issues
vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: any) => <div className={className} data-testid="avatar">{children}</div>,
  AvatarImage: ({ src, alt }: any) => <div data-testid="avatar-image" data-src={src} data-alt={alt} />,
  AvatarFallback: ({ children, className }: any) => <div className={className} data-testid="avatar-fallback">{children}</div>,
}))

const mockUserProfile = {
  name: 'John Doe',
  email: 'john@example.com',
  avatar: 'https://example.com/avatar.jpg',
}

const mockSubscription = {
  plan_id: 'premium',
  status: 'active',
}

const renderDashboard = () => {
  return render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

test('renders loading state when loading', async () => {
  const { useUserRole } = await import('@/hooks/useUserRole')
  
  vi.mocked(useUserRole).mockReturnValue({
    userProfile: null,
    loading: true,
    refetchUserProfile: vi.fn(),
  })

  renderDashboard()

  expect(screen.getByText('Loading Your Dashboard...')).toBeInTheDocument()
})

test('renders dashboard with user profile', async () => {
  const { useUserRole } = await import('@/hooks/useUserRole')
  const { getSubscriptionStatus } = await import('@/lib/billing')
  
  vi.mocked(useUserRole).mockReturnValue({
    userProfile: mockUserProfile,
    loading: false,
    refetchUserProfile: vi.fn(),
  })
  
  vi.mocked(getSubscriptionStatus).mockResolvedValue(mockSubscription)

  renderDashboard()

  await waitFor(() => {
    expect(screen.getByText(/Good (morning|afternoon|evening), John!/)).toBeInTheDocument()
  })
  
  expect(screen.getByText('Ready to learn something new today?')).toBeInTheDocument()
})

test('displays user initials when no avatar', async () => {
  const { useUserRole } = await import('@/hooks/useUserRole')
  const { getSubscriptionStatus } = await import('@/lib/billing')
  
  vi.mocked(useUserRole).mockReturnValue({
    userProfile: { ...mockUserProfile, avatar: null },
    loading: false,
    refetchUserProfile: vi.fn(),
  })
  
  vi.mocked(getSubscriptionStatus).mockResolvedValue(mockSubscription)

  renderDashboard()

  await waitFor(() => {
    expect(screen.getByText('JD')).toBeInTheDocument()
  })
})

test('renders quick action cards', async () => {
  const { useUserRole } = await import('@/hooks/useUserRole')
  const { getSubscriptionStatus } = await import('@/lib/billing')
  
  vi.mocked(useUserRole).mockReturnValue({
    userProfile: mockUserProfile,
    loading: false,
    refetchUserProfile: vi.fn(),
  })
  
  vi.mocked(getSubscriptionStatus).mockResolvedValue(mockSubscription)

  renderDashboard()

  await waitFor(() => {
    expect(screen.getByText('AI Chat')).toBeInTheDocument()
    expect(screen.getByText('Quiz Center')).toBeInTheDocument()
    expect(screen.getByText('Billing')).toBeInTheDocument()
    expect(screen.getByText('Content Library')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })
})

test('navigates to chat when AI Chat card is clicked', async () => {
  const { useUserRole } = await import('@/hooks/useUserRole')
  const { getSubscriptionStatus } = await import('@/lib/billing')
  
  vi.mocked(useUserRole).mockReturnValue({
    userProfile: mockUserProfile,
    loading: false,
    refetchUserProfile: vi.fn(),
  })
  
  vi.mocked(getSubscriptionStatus).mockResolvedValue(mockSubscription)

  renderDashboard()

  await waitFor(() => {
    const chatCard = screen.getByText('AI Chat').closest('[role="button"], button, div')
    expect(chatCard).toBeInTheDocument()
    fireEvent.click(chatCard!)
  })

  expect(mockNavigate).toHaveBeenCalledWith('/chatbot')
})

test('navigates to billing when Billing card is clicked', async () => {
  const { useUserRole } = await import('@/hooks/useUserRole')
  const { getSubscriptionStatus } = await import('@/lib/billing')
  
  vi.mocked(useUserRole).mockReturnValue({
    userProfile: mockUserProfile,
    loading: false,
    refetchUserProfile: vi.fn(),
  })
  
  vi.mocked(getSubscriptionStatus).mockResolvedValue(mockSubscription)

  renderDashboard()

  await waitFor(() => {
    const billingCard = screen.getByText('Billing').closest('[role="button"], button, div')
    expect(billingCard).toBeInTheDocument()
    fireEvent.click(billingCard!)
  })

  expect(mockNavigate).toHaveBeenCalledWith('/dashboard/billing')
})

test('handles logout correctly', async () => {
  const { useUserRole } = await import('@/hooks/useUserRole')
  const { getSubscriptionStatus } = await import('@/lib/billing')
  const { signOut } = await import('firebase/auth')
  const { clearAuthCache } = await import('@/lib/authState')
  
  vi.mocked(useUserRole).mockReturnValue({
    userProfile: mockUserProfile,
    loading: false,
    refetchUserProfile: vi.fn(),
  })
  
  vi.mocked(getSubscriptionStatus).mockResolvedValue(mockSubscription)
  vi.mocked(signOut).mockResolvedValue(undefined)

  renderDashboard()

  await waitFor(() => {
    const logoutButton = screen.getByText('Sign out')
    fireEvent.click(logoutButton)
  })

  expect(signOut).toHaveBeenCalled()
  expect(clearAuthCache).toHaveBeenCalled()
  expect(mockNavigate).toHaveBeenCalledWith('/')
})

test('displays subscription status correctly', async () => {
  const { useUserRole } = await import('@/hooks/useUserRole')
  const { getSubscriptionStatus } = await import('@/lib/billing')
  
  vi.mocked(useUserRole).mockReturnValue({
    userProfile: mockUserProfile,
    loading: false,
    refetchUserProfile: vi.fn(),
  })
  
  vi.mocked(getSubscriptionStatus).mockResolvedValue(mockSubscription)

  renderDashboard()

  await waitFor(() => {
    expect(screen.getByText('Premium')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })
})

test('displays free plan when no subscription', async () => {
  const { useUserRole } = await import('@/hooks/useUserRole')
  const { getSubscriptionStatus } = await import('@/lib/billing')
  
  vi.mocked(useUserRole).mockReturnValue({
    userProfile: mockUserProfile,
    loading: false,
    refetchUserProfile: vi.fn(),
  })
  
  vi.mocked(getSubscriptionStatus).mockResolvedValue({ plan_id: 'free', status: 'active' })

  renderDashboard()

  await waitFor(() => {
    expect(screen.getByText('Free')).toBeInTheDocument()
  })
})

test('scrolls to quiz section when quiz card is clicked', async () => {
  const { useUserRole } = await import('@/hooks/useUserRole')
  const { getSubscriptionStatus } = await import('@/lib/billing')
  
  vi.mocked(useUserRole).mockReturnValue({
    userProfile: mockUserProfile,
    loading: false,
    refetchUserProfile: vi.fn(),
  })
  
  vi.mocked(getSubscriptionStatus).mockResolvedValue(mockSubscription)

  // Mock scrollIntoView
  const mockScrollIntoView = vi.fn()
  const mockElement = { scrollIntoView: mockScrollIntoView }
  vi.spyOn(document, 'getElementById').mockReturnValue(mockElement as any)

  renderDashboard()

  await waitFor(() => {
    const quizCard = screen.getByText('Quiz Center').closest('[role="button"], button, div')
    expect(quizCard).toBeInTheDocument()
    fireEvent.click(quizCard!)
  })

  expect(document.getElementById).toHaveBeenCalledWith('quiz-section')
  expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })
})

test('shows recent activity section', async () => {
  const { useUserRole } = await import('@/hooks/useUserRole')
  const { getSubscriptionStatus } = await import('@/lib/billing')
  
  vi.mocked(useUserRole).mockReturnValue({
    userProfile: mockUserProfile,
    loading: false,
    refetchUserProfile: vi.fn(),
  })
  
  vi.mocked(getSubscriptionStatus).mockResolvedValue(mockSubscription)

  renderDashboard()

  await waitFor(() => {
    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
    expect(screen.getByText('No recent activity yet. Start by chatting with AI or generating content!')).toBeInTheDocument()
  })
})

test('renders quiz dashboard component', async () => {
  const { useUserRole } = await import('@/hooks/useUserRole')
  const { getSubscriptionStatus } = await import('@/lib/billing')
  
  vi.mocked(useUserRole).mockReturnValue({
    userProfile: mockUserProfile,
    loading: false,
    refetchUserProfile: vi.fn(),
  })
  
  vi.mocked(getSubscriptionStatus).mockResolvedValue(mockSubscription)

  renderDashboard()

  await waitFor(() => {
    expect(screen.getByTestId('quiz-dashboard')).toBeInTheDocument()
  })
})

test('renders chatbot FAB', async () => {
  const { useUserRole } = await import('@/hooks/useUserRole')
  const { getSubscriptionStatus } = await import('@/lib/billing')
  
  vi.mocked(useUserRole).mockReturnValue({
    userProfile: mockUserProfile,
    loading: false,
    refetchUserProfile: vi.fn(),
  })
  
  vi.mocked(getSubscriptionStatus).mockResolvedValue(mockSubscription)

  renderDashboard()

  await waitFor(() => {
    expect(screen.getByTestId('chatbot-fab')).toBeInTheDocument()
  })
})

test('redirects to home when no user profile', async () => {
  const { useUserRole } = await import('@/hooks/useUserRole')
  const { toast } = await import('sonner')
  
  vi.mocked(useUserRole).mockReturnValue({
    userProfile: null,
    loading: false,
    refetchUserProfile: vi.fn(),
  })

  renderDashboard()

  await waitFor(() => {
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith('User Profile not found.')
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})

test('handles subscription loading state', async () => {
  const { useUserRole } = await import('@/hooks/useUserRole')
  const { getSubscriptionStatus } = await import('@/lib/billing')
  
  vi.mocked(useUserRole).mockReturnValue({
    userProfile: mockUserProfile,
    loading: false,
    refetchUserProfile: vi.fn(),
  })
  
  // Mock slow subscription loading
  vi.mocked(getSubscriptionStatus).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockSubscription), 1000)))

  const { container } = renderDashboard()

  // Should show loading state initially
  await waitFor(() => {
    expect(screen.getByText(/Good (morning|afternoon|evening), John!/)).toBeInTheDocument()
  })

  // Loading skeleton should be present
  const loadingElements = container.querySelectorAll('.animate-pulse')
  expect(loadingElements.length).toBeGreaterThan(0)
})