import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { Hero } from '@/components/landing/Hero'

describe('Hero', () => {
  const mockOnSignUp = vi.fn()

  beforeEach(() => {
    mockOnSignUp.mockClear()
  })

  it('renders main heading and description', () => {
    render(<Hero onSignUp={mockOnSignUp} />)
    expect(
      screen.getByRole('heading', { name: /Study Smarter with Your Personal AI Study Buddy/i })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Generate custom quizzes, get instant answers to your questions/i)
    ).toBeInTheDocument()
  })

  it('calls onSignUp when Get Started Free button clicked', () => {
    render(<Hero onSignUp={mockOnSignUp} />)
    const button = screen.getByRole('button', { name: /Get Started Free/i })
    fireEvent.click(button)
    expect(mockOnSignUp).toHaveBeenCalledTimes(1)
  })
})
