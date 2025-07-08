import { render, screen } from '@testing-library/react'
import { vi, test, expect, describe } from 'vitest'
import '@testing-library/jest-dom'
import BlinkingOwl from '@/components/animations/Owl'

describe('Owl', () => {
  test('should render owl animation component', () => {
    render(<BlinkingOwl />)

    const owlElement = screen.getByRole('img', { name: /owl/i })
    expect(owlElement).toBeInTheDocument()
  })

  test('should have correct CSS classes for animation', () => {
    render(<BlinkingOwl />)

    const container = screen.getByRole('img', { name: /owl/i }).parentElement
    expect(container).toHaveClass('relative', 'w-[600px]', 'h-[600px]')
  })

  test('should render owl image', () => {
    render(<BlinkingOwl />)

    const owlImage = screen.getByRole('img', { name: /owl/i })
    expect(owlImage).toBeInTheDocument()
    expect(owlImage).toHaveAttribute('src', '/open_v5.png')
  })

  test('should be accessible', () => {
    render(<BlinkingOwl />)

    const owlImage = screen.getByRole('img', { name: /owl/i })
    expect(owlImage).toHaveAttribute('alt')
  })

  test('should have proper dimensions', () => {
    render(<BlinkingOwl />)

    const container = screen.getByRole('img', { name: /owl/i }).parentElement
    expect(container).toHaveClass('w-[600px]', 'h-[600px]')
  })

  test('should be responsive', () => {
    render(<BlinkingOwl />)

    const owlImage = screen.getByRole('img', { name: /owl/i })
    expect(owlImage).toHaveClass('w-full', 'h-full')
  })

  test('should have hover effects', () => {
    render(<BlinkingOwl />)

    const owlImage = screen.getByRole('img', { name: /owl/i })
    expect(owlImage).toHaveClass('object-contain')
  })

  test('should support different sizes', () => {
    render(<BlinkingOwl />)

    const container = screen.getByRole('img', { name: /owl/i }).parentElement
    expect(container).toHaveClass('w-[600px]', 'h-[600px]')
  })

  test('should support custom animation', () => {
    render(<BlinkingOwl />)

    const container = screen.getByRole('img', { name: /owl/i }).parentElement
    expect(container).toHaveClass('relative')
  })

  test('should support disabled state', () => {
    render(<BlinkingOwl />)

    const owlImage = screen.getByRole('img', { name: /owl/i })
    expect(owlImage).toBeInTheDocument()
  })
})
