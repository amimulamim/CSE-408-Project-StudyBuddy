import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import '@testing-library/jest-dom'
import { vi, beforeEach, test, expect, describe } from 'vitest'
import Index from '@/pages/Index'

// Hoisted mock functions
const mockOnAuthStateChanged = vi.hoisted(() => vi.fn())
const mockFetchUserProfileData = vi.hoisted(() => vi.fn())
const mockNavigate = vi.hoisted(() => vi.fn())

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
    section: ({ children, className, ...props }: any) => <section className={className} {...props}>{children}</section>,
    h2: ({ children, className, ...props }: any) => <h2 className={className} {...props}>{children}</h2>,
    p: ({ children, className, ...props }: any) => <p className={className} {...props}>{children}</p>,
  },
}))

// Mock Firebase auth
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: mockOnAuthStateChanged,
}))

// Mock Firebase auth module
vi.mock('@/lib/firebase', () => ({
  auth: {},
}))

// Mock userProfile module  
vi.mock('@/lib/userProfile', () => ({
  fetchUserProfileData: mockFetchUserProfileData,
}))

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock landing page components
vi.mock('@/components/landing/Navbar', () => ({
  Navbar: ({ onSignIn, onSignUp }: any) => (
    <nav data-testid="navbar">
      <button onClick={onSignIn} data-testid="sign-in-btn">Sign In</button>
      <button onClick={onSignUp} data-testid="sign-up-btn">Sign Up</button>
    </nav>
  ),
}))

vi.mock('@/components/landing/Hero', () => ({
  Hero: ({ onSignUp }: any) => (
    <section data-testid="hero">
      <h1>Hero Section</h1>
      <button onClick={onSignUp} data-testid="hero-signup-btn">Get Started</button>
    </section>
  ),
}))

vi.mock('@/components/landing/Features', () => ({
  Features: () => <section data-testid="features">Features Section</section>,
}))

vi.mock('@/components/landing/Testimonials', () => ({
  Testimonials: () => <section data-testid="testimonials">Testimonials Section</section>,
}))

vi.mock('@/components/landing/Footer', () => ({
  Footer: () => <footer data-testid="footer">Footer Section</footer>,
}))

// Mock auth components
vi.mock('@/components/auth/AuthModal', () => ({
  AuthModal: ({ isOpen, onClose, mode, onChangeMode }: any) => (
    isOpen ? (
      <div data-testid="auth-modal" data-mode={mode}>
        <button onClick={onClose} data-testid="close-modal">Close</button>
        <button onClick={() => onChangeMode('signIn')} data-testid="switch-signin">Sign In</button>
        <button onClick={() => onChangeMode('signUp')} data-testid="switch-signup">Sign Up</button>
      </div>
    ) : null
  ),
}))

vi.mock('@/components/auth/AuthRedirectHandler', () => ({
  AuthRedirectHandler: () => <div data-testid="auth-redirect">Redirecting...</div>,
}))

// Mock animations
vi.mock('@/components/animations/GradientBackground', () => ({
  GradientBackground: ({ children, className }: any) => (
    <div className={className} data-testid="gradient-background">{children}</div>
  ),
}))

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}))

const renderIndex = () => {
  return render(
    <BrowserRouter>
      <Index />
    </BrowserRouter>
  )
}

describe('Index Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock Firebase onAuthStateChanged to not trigger auth
    mockOnAuthStateChanged.mockImplementation((auth: any, callback: (user: any) => void) => {
      // Simulate no user logged in
      callback(null)
      return vi.fn() // unsubscribe function
    })
  })

  test('renders all landing page sections', () => {
    renderIndex()

    expect(screen.getByTestId('navbar')).toBeInTheDocument()
    expect(screen.getByTestId('hero')).toBeInTheDocument()
    expect(screen.getByTestId('features')).toBeInTheDocument()
    expect(screen.getByTestId('testimonials')).toBeInTheDocument()
    expect(screen.getByTestId('footer')).toBeInTheDocument()
  })

  test('renders CTA section', () => {
    renderIndex()

    expect(screen.getByText('Ready to Study Smarter?')).toBeInTheDocument()
    expect(screen.getByText('Join thousands of students achieving better results.')).toBeInTheDocument()
    expect(screen.getByText('Get Started Free')).toBeInTheDocument()
  })

  test('opens sign in modal when navbar sign in button is clicked', () => {
    renderIndex()

    const signInBtn = screen.getByTestId('sign-in-btn')
    fireEvent.click(signInBtn)

    expect(screen.getByTestId('auth-modal')).toBeInTheDocument()
    expect(screen.getByTestId('auth-modal')).toHaveAttribute('data-mode', 'signIn')
  })

  test('opens sign up modal when navbar sign up button is clicked', () => {
    renderIndex()

    const signUpBtn = screen.getByTestId('sign-up-btn')
    fireEvent.click(signUpBtn)

    expect(screen.getByTestId('auth-modal')).toBeInTheDocument()
    expect(screen.getByTestId('auth-modal')).toHaveAttribute('data-mode', 'signUp')
  })

  test('opens sign up modal when hero CTA button is clicked', () => {
    renderIndex()

    const heroSignUpBtn = screen.getByTestId('hero-signup-btn')
    fireEvent.click(heroSignUpBtn)

    expect(screen.getByTestId('auth-modal')).toBeInTheDocument()
    expect(screen.getByTestId('auth-modal')).toHaveAttribute('data-mode', 'signUp')
  })

  test('opens sign up modal when CTA section button is clicked', () => {
    renderIndex()

    const ctaBtn = screen.getByText('Get Started Free')
    fireEvent.click(ctaBtn)

    expect(screen.getByTestId('auth-modal')).toBeInTheDocument()
    expect(screen.getByTestId('auth-modal')).toHaveAttribute('data-mode', 'signUp')
  })

  test('closes modal when close button is clicked', () => {
    renderIndex()

    // Open modal first
    const signInBtn = screen.getByTestId('sign-in-btn')
    fireEvent.click(signInBtn)
    expect(screen.getByTestId('auth-modal')).toBeInTheDocument()

    // Close modal
    const closeBtn = screen.getByTestId('close-modal')
    fireEvent.click(closeBtn)
    expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument()
  })

  test('switches between sign in and sign up modes', () => {
    renderIndex()

    // Open sign in modal
    const signInBtn = screen.getByTestId('sign-in-btn')
    fireEvent.click(signInBtn)
    expect(screen.getByTestId('auth-modal')).toHaveAttribute('data-mode', 'signIn')

    // Switch to sign up
    const switchSignUpBtn = screen.getByTestId('switch-signup')
    fireEvent.click(switchSignUpBtn)
    expect(screen.getByTestId('auth-modal')).toHaveAttribute('data-mode', 'signUp')

    // Switch back to sign in
    const switchSignInBtn = screen.getByTestId('switch-signin')
    fireEvent.click(switchSignInBtn)
    expect(screen.getByTestId('auth-modal')).toHaveAttribute('data-mode', 'signIn')
  })

  test('shows onboarding modal when user is authenticated but onboarding not done', async () => {
    // Mock user is authenticated but onboarding not done
    mockOnAuthStateChanged.mockImplementation((auth: any, callback: (user: any) => void) => {
      callback({ uid: 'test-uid' })
      return vi.fn()
    })
    
    mockFetchUserProfileData.mockResolvedValue(false)

    renderIndex()

    await waitFor(() => {
      expect(screen.getByTestId('auth-modal')).toBeInTheDocument()
      expect(screen.getByTestId('auth-modal')).toHaveAttribute('data-mode', 'onboarding')
    })
  })

  test('shows redirect handler when user is authenticated and onboarding is done', async () => {
    // Mock user is authenticated and onboarding is done
    mockOnAuthStateChanged.mockImplementation((auth: any, callback: (user: any) => void) => {
      callback({ uid: 'test-uid' })
      return vi.fn()
    })
    
    mockFetchUserProfileData.mockResolvedValue(true)

    renderIndex()

    await waitFor(() => {
      expect(screen.getByTestId('auth-redirect')).toBeInTheDocument()
    })
  })

  test('renders gradient background', () => {
    renderIndex()

    expect(screen.getByTestId('gradient-background')).toBeInTheDocument()
  })
})