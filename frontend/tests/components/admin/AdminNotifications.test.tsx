import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, test, expect, describe, beforeEach } from 'vitest'
import '@testing-library/jest-dom'
import { AdminNotifications } from '@/components/admin/AdminNotifications'

// Mock dependencies
vi.mock('@/lib/apiCall', () => ({
  makeRequest: vi.fn()
}))

vi.mock('sonner', () => ({
  toast: vi.fn()
}))

const mockMakeRequest = vi.fn()
const mockToast = vi.fn()

describe('AdminNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMakeRequest.mockClear()
    mockToast.mockClear()
  })

  test('renders default state with search instruction', () => {
    render(<AdminNotifications />)

    expect(screen.getByText('Notification Management')).toBeInTheDocument()
    expect(screen.getByText('Search and select a user to view their notifications.')).toBeInTheDocument()
    expect(screen.getByText('Search user to view notifications...')).toBeInTheDocument()
  })

  test('renders notification management interface', () => {
    render(<AdminNotifications />)
    
    // Check for main heading
    expect(screen.getByText('Notification Management')).toBeInTheDocument()
    
    // Check for subtitle
    expect(screen.getByText('Send and manage user notifications')).toBeInTheDocument()
    
    // Check for user selection button
    expect(screen.getByText('Search user to view notifications...')).toBeInTheDocument()
  })

  test('displays user search button', () => {
    render(<AdminNotifications />)
    
    const searchButton = screen.getByText('Search user to view notifications...')
    expect(searchButton).toBeInTheDocument()
    expect(searchButton).toHaveAttribute('role', 'combobox')
  })

  test('shows default instruction text in table', () => {
    render(<AdminNotifications />)
    
    expect(screen.getByText('Search and select a user to view their notifications.')).toBeInTheDocument()
  })

  test('renders send notification button', () => {
    render(<AdminNotifications />)
    
    expect(screen.getByText('Send Notification')).toBeInTheDocument()
  })

  test('displays table headers', () => {
    render(<AdminNotifications />)
    
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Message')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Created')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
  })
})
