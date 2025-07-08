import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { test, expect, describe } from 'vitest'

import { PendingEmailVerification } from '@/components/auth/PendingEmailVerification'

describe('PendingEmailVerification', () => {
  test('renders verification message', () => {
    render(<PendingEmailVerification />)

    expect(screen.getByText('Verify Your Email')).toBeInTheDocument()
    expect(screen.getByText('Please check your email for a verification link to complete your registration.')).toBeInTheDocument()
    expect(screen.getByText('If you haven\'t received the email, please check your spam folder')).toBeInTheDocument()
  })

  test('has correct heading structure', () => {
    render(<PendingEmailVerification />)

    const heading = screen.getByRole('heading', { level: 3 })
    expect(heading).toHaveTextContent('Verify Your Email')
    expect(heading).toHaveClass('text-2xl', 'font-bold')
  })

  test('has centered layout', () => {
    const { container } = render(<PendingEmailVerification />)

    const mainDiv = container.firstChild as HTMLElement
    expect(mainDiv).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center', 'h-screen')
  })

  test('has proper text styling', () => {
    render(<PendingEmailVerification />)

    const paragraphs = screen.getAllByText(/please check your/i)
    paragraphs.forEach(paragraph => {
      expect(paragraph).toHaveClass('text-lg', 'mb-4')
    })
  })

  test('contains all required information', () => {
    render(<PendingEmailVerification />)

    // Check that all essential information is present
    expect(screen.getByText(/verify your email/i)).toBeInTheDocument()
    expect(screen.getByText(/check your email for a verification link/i)).toBeInTheDocument()
    expect(screen.getByText(/complete your registration/i)).toBeInTheDocument()
    expect(screen.getByText(/spam folder/i)).toBeInTheDocument()
  })

  test('renders without crashing', () => {
    expect(() => render(<PendingEmailVerification />)).not.toThrow()
  })
})