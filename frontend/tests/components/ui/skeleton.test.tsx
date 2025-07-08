import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, test, expect, describe } from 'vitest'
import { Skeleton } from '@/components/ui/skeleton'

describe('Skeleton', () => {
  test('renders skeleton element', () => {
    render(<Skeleton data-testid="skeleton" />)
    
    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toBeInTheDocument()
  })

  test('applies default classes', () => {
    render(<Skeleton data-testid="skeleton" />)
    
    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveClass('animate-pulse')
    expect(skeleton).toHaveClass('rounded-md')
    expect(skeleton).toHaveClass('bg-muted')
  })

  test('applies custom className', () => {
    render(<Skeleton className="custom-skeleton h-4 w-full" data-testid="skeleton" />)
    
    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveClass('custom-skeleton')
    expect(skeleton).toHaveClass('h-4')
    expect(skeleton).toHaveClass('w-full')
  })

  test('renders multiple skeletons', () => {
    render(
      <div>
        <Skeleton className="h-4 w-full mb-2" data-testid="skeleton-1" />
        <Skeleton className="h-4 w-3/4 mb-2" data-testid="skeleton-2" />
        <Skeleton className="h-4 w-1/2" data-testid="skeleton-3" />
      </div>
    )

    expect(screen.getByTestId('skeleton-1')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-2')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-3')).toBeInTheDocument()
  })
})