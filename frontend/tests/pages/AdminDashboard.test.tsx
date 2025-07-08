import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import '@testing-library/jest-dom'
import { vi, beforeEach, test, expect, describe } from 'vitest'
import AdminDashboard from '@/pages/AdminDashboard'
import { LogOut } from 'lucide-react'

// Hoisted mock functions
const mockUseUserRole = vi.hoisted(() => vi.fn())
const mockNavigate = vi.hoisted(() => vi.fn())

// Mock useUserRole hook
vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: mockUseUserRole,
}))

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock UI components
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div data-testid="tabs" data-value={value}>
      <div onClick={() => onValueChange && onValueChange('overview')}>
        {children}
      </div>
    </div>
  ),
  TabsList: ({ children, className }: any) => (
    <div className={className} data-testid="tabs-list">{children}</div>
  ),
  TabsTrigger: ({ children, value, onClick }: any) => (
    <button data-testid={`tab-${value}`} onClick={onClick}>{children}</button>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
}))

// Mock admin components
vi.mock('@/components/admin/AdminStatistics', () => ({
  AdminStatistics: () => <div data-testid="admin-statistics">Admin Statistics</div>,
}))

vi.mock('@/components/admin/AdminUserManagement', () => ({
  AdminUserManagement: () => <div data-testid="admin-user-management">User Management</div>,
}))

vi.mock('@/components/admin/AdminContentManagement', () => ({
  AdminContentManagement: () => <div data-testid="admin-content-management">Content Management</div>,
}))

vi.mock('@/components/admin/AdminChatHistory', () => ({
  AdminChatHistory: () => <div data-testid="admin-chat-history">Chat History</div>,
}))

vi.mock('@/components/admin/AdminQuizResults', () => ({
  AdminQuizResults: () => <div data-testid="admin-quiz-results">Quiz Results</div>,
}))

vi.mock('@/components/admin/AdminNotifications', () => ({
  AdminNotifications: () => <div data-testid="admin-notifications">Notifications</div>,
}))

vi.mock('@/components/admin/AdminLogs', () => ({
  AdminLogs: () => <div data-testid="admin-logs">System Logs</div>,
}))

// Mock icons
vi.mock('lucide-react', () => ({
  BarChart3: ({ className }: any) => <span className={className} data-testid="barchart-icon">📊</span>,
  Users: ({ className }: any) => <span className={className} data-testid="users-icon">👥</span>,
  User: ({ className }: any) => <span className={className} data-testid="user-icon">👤</span>,
  LogOut: ({ className }: any) => <span className={className} data-testid="logout-icon">🚪</span>,
  FileText: ({ className }: any) => <span className={className} data-testid="filetext-icon">📄</span>,
  MessageSquare: ({ className }: any) => <span className={className} data-testid="message-icon">💬</span>,
  Bell: ({ className }: any) => <span className={className} data-testid="bell-icon">🔔</span>,
  Settings: ({ className }: any) => <span className={className} data-testid="settings-icon">⚙️</span>,
}))

const mockAdminProfile = {
  uid: 'admin-uid-123',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'admin',
  is_admin: true,
  current_plan: 'premium',
}

const renderAdminDashboard = () => {
  return render(
    <BrowserRouter>
      <AdminDashboard />
    </BrowserRouter>
  )
}

// Mock Firebase auth
vi.mock('firebase/auth', () => ({
  signOut: vi.fn(),
}))

// Mock Firebase auth module
vi.mock('@/lib/firebase', () => ({
  auth: {},
}))

// Mock auth state
vi.mock('@/lib/authState', () => ({
  clearAuthCache: vi.fn(),
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders loading state when loading', () => {
    mockUseUserRole.mockReturnValue({
      userProfile: null,
      loading: true,
      refetching: false,
      error: null,
      refetchUserProfile: vi.fn(),
    })

    renderAdminDashboard()

    expect(screen.getByText('Loading admin dashboard...')).toBeInTheDocument()
  })

  test('renders admin dashboard for admin users', () => {
    mockUseUserRole.mockReturnValue({
      userProfile: mockAdminProfile,
      loading: false,
      refetching: false,
      error: null,
      refetchUserProfile: vi.fn(),
    })

    renderAdminDashboard()

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
    expect(screen.getByTestId('tabs')).toBeInTheDocument()
  })

  test('renders all tab triggers', () => {
    mockUseUserRole.mockReturnValue({
      userProfile: mockAdminProfile,
      loading: false,
      refetching: false,
      error: null,
      refetchUserProfile: vi.fn(),
    })

    renderAdminDashboard()

    expect(screen.getByTestId('tab-overview')).toBeInTheDocument()
    expect(screen.getByTestId('tab-users')).toBeInTheDocument()
    expect(screen.getByTestId('tab-content')).toBeInTheDocument()
    expect(screen.getByTestId('tab-chats')).toBeInTheDocument()
    expect(screen.getByTestId('tab-quizzes')).toBeInTheDocument()
    expect(screen.getByTestId('tab-notifications')).toBeInTheDocument()
    expect(screen.getByTestId('tab-logs')).toBeInTheDocument()
  })

  test('renders tab content components', () => {
    mockUseUserRole.mockReturnValue({
      userProfile: mockAdminProfile,
      loading: false,
      refetching: false,
      error: null,
      refetchUserProfile: vi.fn(),
    })

    renderAdminDashboard()

    expect(screen.getByTestId('admin-statistics')).toBeInTheDocument()
    expect(screen.getByTestId('admin-user-management')).toBeInTheDocument()
    expect(screen.getByTestId('admin-content-management')).toBeInTheDocument()
    expect(screen.getByTestId('admin-chat-history')).toBeInTheDocument()
    expect(screen.getByTestId('admin-quiz-results')).toBeInTheDocument()
    expect(screen.getByTestId('admin-notifications')).toBeInTheDocument()
    expect(screen.getByTestId('admin-logs')).toBeInTheDocument()
  })

  test('shows access denied for non-admin users', () => {
    mockUseUserRole.mockReturnValue({
      userProfile: { ...mockAdminProfile, is_admin: false },
      loading: false,
      refetching: false,
      error: null,
      refetchUserProfile: vi.fn(),
    })

    renderAdminDashboard()

    expect(screen.getByText('Access Denied')).toBeInTheDocument()
    expect(screen.getByText("You don't have admin privileges.")).toBeInTheDocument()
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument()
  })

  test('navigates to dashboard when go to dashboard button is clicked', () => {
    mockUseUserRole.mockReturnValue({
      userProfile: { ...mockAdminProfile, is_admin: false },
      loading: false,
      refetching: false,
      error: null,
      refetchUserProfile: vi.fn(),
    })

    renderAdminDashboard()

    const goToDashboardBtn = screen.getByText('Go to Dashboard')
    fireEvent.click(goToDashboardBtn)

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })
})