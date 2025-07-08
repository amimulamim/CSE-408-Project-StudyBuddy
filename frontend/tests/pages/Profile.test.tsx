import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, beforeEach, test, expect, describe } from 'vitest'

// Hoisted mock functions
const mockNavigate = vi.hoisted(() => vi.fn())
const mockToastError = vi.hoisted(() => vi.fn())
const mockMakeRequest = vi.hoisted(() => vi.fn())

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: mockToastError,
    success: vi.fn()
  }
}))

// Mock useUserRole hook - return simple structure since Profile component now manages its own state
vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({
    userProfile: null,
    loading: false,
    refetchUserProfile: vi.fn()
  })
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ArrowLeft: ({ className }: any) => <div className={className} data-testid="arrow-left-icon">←</div>,
  Loader2: ({ className }: any) => <div className={className} data-testid="loader-icon">⟳</div>,
  TrendingUp: ({ className }: any) => <div className={className} data-testid="trending-up-icon">↗</div>,
  BarChart3: ({ className }: any) => <div className={className} data-testid="bar-chart-icon">📊</div>,
  PieChart: ({ className }: any) => <div className={className} data-testid="pie-chart-icon">📈</div>,
  Trophy: ({ className }: any) => <div className={className} data-testid="trophy-icon">🏆</div>,
  BookOpen: ({ className }: any) => <div className={className} data-testid="book-open-icon">📖</div>,
  Target: ({ className }: any) => <div className={className} data-testid="target-icon">🎯</div>,
  Clock: ({ className }: any) => <div className={className} data-testid="clock-icon">🕐</div>,
  Brain: ({ className }: any) => <div className={className} data-testid="brain-icon">🧠</div>,
  Sparkles: ({ className }: any) => <div className={className} data-testid="sparkles-icon">✨</div>,
  Calendar: ({ className }: any) => <div className={className} data-testid="calendar-icon">📅</div>
}))

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, className }: any) => (
    <button 
      onClick={onClick} 
      data-variant={variant}
      className={className}
      data-testid="button"
    >
      {children}
    </button>
  )
}))

// Mock ProfileCard component
vi.mock('@/components/profile/ProfileCard', () => ({
  ProfileCard: ({ userProfile, onProfileUpdate }: any) => (
    <div data-testid="profile-card">
      <div data-testid="profile-name">{userProfile.name}</div>
      <div data-testid="profile-email">{userProfile.email}</div>
      <button 
        data-testid="update-profile-button" 
        onClick={() => onProfileUpdate({ name: 'Updated Name' })}
      >
        Update Profile
      </button>
    </div>
  )
}))

// Mock analytics chart components that depend on chart.js
vi.mock('@/components/analytics/QuizPerformanceChart', () => ({
  QuizPerformanceChart: ({ data }: any) => (
    <div data-testid="quiz-performance-chart">Quiz Performance Chart</div>
  )
}))

vi.mock('@/components/analytics/ContentAnalyticsChart', () => ({
  ContentAnalyticsChart: ({ data }: any) => (
    <div data-testid="content-analytics-chart">Content Analytics Chart</div>
  )
}))

vi.mock('@/components/analytics/ScoreDistributionChart', () => ({
  ScoreDistributionChart: ({ data }: any) => (
    <div data-testid="score-distribution-chart">Score Distribution Chart</div>
  )
}))

vi.mock('@/components/analytics/DifficultyAnalysisChart', () => ({
  DifficultyAnalysisChart: ({ data }: any) => (
    <div data-testid="difficulty-analysis-chart">Difficulty Analysis Chart</div>
  )
}))

vi.mock('@/components/analytics/ProgressTimelineChart', () => ({
  ProgressTimelineChart: ({ data }: any) => (
    <div data-testid="progress-timeline-chart">Progress Timeline Chart</div>
  )
}))

vi.mock('@/components/analytics/TopicMasteryChart', () => ({
  TopicMasteryChart: ({ data }: any) => (
    <div data-testid="topic-mastery-chart">Topic Mastery Chart</div>
  )
}))

// Mock UI components that might be used in the updated Profile component
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className} data-testid="card-content">{children}</div>,
  CardDescription: ({ children, className }: any) => <div className={className} data-testid="card-description">{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className} data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <div className={className} data-testid="card-title">{children}</div>
}))

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue, className }: any) => <div className={className} data-testid="tabs" data-default-value={defaultValue}>{children}</div>,
  TabsContent: ({ children, value, className }: any) => <div className={className} data-testid="tabs-content" data-value={value}>{children}</div>,
  TabsList: ({ children, className }: any) => <div className={className} data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value, className }: any) => <button className={className} data-testid="tabs-trigger" data-value={value}>{children}</button>
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: any) => (
    <button 
      data-testid="select" 
      type="button"
      onClick={() => onValueChange?.('test')}
    >
      {children}
    </button>
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-testid="select-item" data-value={value}>{children}</div>,
  SelectTrigger: ({ children, className }: any) => <div className={className} data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: any) => <div data-testid="select-value">{placeholder}</div>
}))

vi.mock('@/components/ui/loading-overlay', () => ({
  LoadingOverlay: ({ message }: any) => (
    <div data-testid="loading-overlay">{message || 'Loading...'}</div>
  )
}))

// Mock API call function
vi.mock('@/lib/apiCall', () => ({
  makeRequest: mockMakeRequest
}))

// Import component after mocking
import Profile from '@/pages/Profile'

const mockUserProfile = {
  uid: 'user123',
  email: 'john.doe@example.com',
  name: 'John Doe',
  bio: 'Software developer',
  institution: 'Tech University',
  role: 'student',
  is_admin: false,
  avatar: 'https://example.com/avatar.jpg',
  current_plan: 'free',
  location: 'New York, USA',
  study_domain: 'Computer Science',
  interests: ['Programming', 'AI']
}

describe('Profile Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default successful API responses
    mockMakeRequest.mockImplementation((url: string, method: string) => {
      if (url.includes('/user/profile')) {
        return Promise.resolve({
          status: 'success',
          data: mockUserProfile
        })
      }
      if (url.includes('/quiz/quiz-marks')) {
        return Promise.resolve({
          status: 'success',
          data: [
            {
              quiz_id: 'quiz1',
              score: 8,
              total: 10,
              difficulty: 'medium',
              topic: 'JavaScript',
              domain: 'Programming',
              duration: 300,
              createdAt: new Date().toISOString()
            }
          ]
        })
      }
      if (url.includes('/content/user')) {
        return Promise.resolve({
          status: 'success',
          data: { 
            contents: [
              {
                id: 'content1',
                title: 'Test Content',
                type: 'article',
                createdAt: new Date().toISOString()
              }
            ] 
          }
        })
      }
      return Promise.resolve({ status: 'success', data: {} })
    })
  })

  describe('Component Rendering', () => {
    test('renders without crashing', async () => {
      render(<Profile />)
      
      // Wait for the component to finish loading
      await waitFor(() => {
        expect(screen.queryByTestId('loading-overlay')).not.toBeInTheDocument()
      })
    })

    test('shows loading state initially', async () => {
      // Make the API calls hang to capture loading state
      let resolveProfile: any
      const profilePromise = new Promise(resolve => {
        resolveProfile = resolve
      })
      
      mockMakeRequest.mockImplementation((url: string, method: string) => {
        if (url.includes('/user/profile')) {
          return profilePromise
        }
        return Promise.resolve({ status: 'success', data: {} })
      })
      
      render(<Profile />)
      
      // The component should show loading initially
      expect(screen.getByTestId('loading-overlay')).toBeInTheDocument()
      
      // Resolve the profile to clean up
      resolveProfile({
        status: 'success',
        data: mockUserProfile
      })
    })

    test('renders main content after loading', async () => {
      render(<Profile />)
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-overlay')).not.toBeInTheDocument()
      })

      // Should render the main tabs structure
      expect(screen.getByTestId('tabs')).toBeInTheDocument()
    })
  })

  describe('API Integration', () => {
    test('fetches user profile on mount', async () => {
      render(<Profile />)
      
      await waitFor(() => {
        expect(mockMakeRequest).toHaveBeenCalledWith(expect.stringContaining('/user/profile'), 'GET')
      })
    })

    test('fetches analytics data on mount', async () => {
      render(<Profile />)
      
      await waitFor(() => {
        expect(mockMakeRequest).toHaveBeenCalledWith(expect.stringContaining('/quiz/quiz-marks'), 'GET')
      })
    })

    test('handles API errors gracefully', async () => {
      mockMakeRequest.mockRejectedValue(new Error('API Error'))
      
      render(<Profile />)
      
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled()
      })
    })
  })

  describe('Profile Content', () => {
    test('displays profile card when user data is loaded', async () => {
      render(<Profile />)
      
      await waitFor(() => {
        expect(screen.getByTestId('profile-card')).toBeInTheDocument()
      })
    })

    test('handles profile updates', async () => {
      render(<Profile />)
      
      await waitFor(() => {
        expect(screen.getByTestId('profile-card')).toBeInTheDocument()
      })

      const updateButton = screen.getByTestId('update-profile-button')
      fireEvent.click(updateButton)

      // Should trigger a new API call to fetch updated profile
      await waitFor(() => {
        expect(mockMakeRequest).toHaveBeenCalledWith(expect.stringContaining('/user/profile'), 'GET')
      })
    })
  })

  describe('Analytics Section', () => {
    test('renders analytics charts', async () => {
      render(<Profile />)
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-overlay')).not.toBeInTheDocument()
      })

      // Check that analytics chart components are rendered
      expect(screen.getByTestId('quiz-performance-chart')).toBeInTheDocument()
      expect(screen.getByTestId('content-analytics-chart')).toBeInTheDocument()
      expect(screen.getByTestId('score-distribution-chart')).toBeInTheDocument()
    })

    test('handles analytics loading state', async () => {
      // Delay analytics response
      let resolveAnalytics: any
      const analyticsPromise = new Promise(resolve => {
        resolveAnalytics = resolve
      })
      
      mockMakeRequest.mockImplementation((url: string, method: string) => {
        if (url.includes('/user/profile')) {
          return Promise.resolve({
            status: 'success',
            data: mockUserProfile
          })
        }
        if (url.includes('/quiz/quiz-marks')) {
          return analyticsPromise
        }
        return Promise.resolve({ status: 'success', data: {} })
      })

      render(<Profile />)
      
      // Should show loading initially
      expect(screen.getByTestId('loading-overlay')).toBeInTheDocument()
      
      // Resolve analytics after a short delay
      setTimeout(() => resolveAnalytics({ status: 'success', data: [] }), 100)
    })
  })

  describe('Error Handling', () => {
    test('shows error toast when profile fetch fails', async () => {
      mockMakeRequest.mockImplementation((url: string, method: string) => {
        if (url.includes('/user/profile')) {
          return Promise.reject(new Error('Profile fetch failed'))
        }
        return Promise.resolve({})
      })

      render(<Profile />)
      
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled()
      })
    })

    test('shows error toast when analytics fetch fails', async () => {
      mockMakeRequest.mockImplementation((url: string, method: string) => {
        if (url.includes('/user/profile')) {
          return Promise.resolve({
            status: 'success',
            data: mockUserProfile
          })
        }
        if (url.includes('/quiz/quiz-marks')) {
          return Promise.reject(new Error('Analytics fetch failed'))
        }
        return Promise.resolve({ status: 'success', data: {} })
      })

      render(<Profile />)
      
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled()
      })
    })
  })

  describe('Component Integration', () => {
    test('renders all required UI components', async () => {
      render(<Profile />)
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-overlay')).not.toBeInTheDocument()
      })

      // Check that main UI components are rendered
      expect(screen.getByTestId('tabs')).toBeInTheDocument()
      expect(screen.getByTestId('profile-card')).toBeInTheDocument()
    })

    test('handles tab navigation', async () => {
      render(<Profile />)
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-overlay')).not.toBeInTheDocument()
      })

      // Check that tabs are rendered
      expect(screen.getByTestId('tabs-list')).toBeInTheDocument()
    })
  })
})