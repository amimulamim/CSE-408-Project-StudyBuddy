import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, test, expect, describe } from 'vitest'
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card'

// Mock Radix UI HoverCard
vi.mock('@radix-ui/react-hover-card', () => ({
  Root: ({ children, defaultOpen }: any) => (
    <div data-testid="hover-card-root" data-open={defaultOpen}>
      {children}
    </div>
  ),
  Trigger: ({ children, asChild }: any) => {
    if (asChild) {
      return React.cloneElement(children, {
        'data-state': 'closed'
      })
    }
    return (
      <button data-state="closed">
        {children}
      </button>
    )
  },
  Content: ({ children, className }: any) => (
    <div className={className} data-testid="hover-card-content">
      {children}
    </div>
  ),
  Portal: ({ children }: any) => children,
}))

describe('HoverCard', () => {
  test('renders hover card trigger', () => {
    render(
      <HoverCard>
        <HoverCardTrigger>Hover me</HoverCardTrigger>
        <HoverCardContent>
          <p>Hover content</p>
        </HoverCardContent>
      </HoverCard>
    )

    expect(screen.getByText('Hover me')).toBeInTheDocument()
  })

  test('renders content when defaultOpen is true', () => {
    render(
      <HoverCard defaultOpen>
        <HoverCardTrigger>Hover me</HoverCardTrigger>
        <HoverCardContent>
          <p>Hover content</p>
        </HoverCardContent>
      </HoverCard>
    )

    expect(screen.getByText('Hover content')).toBeInTheDocument()
  })

  test('applies custom className to content', () => {
    render(
      <HoverCard defaultOpen>
        <HoverCardTrigger>Hover me</HoverCardTrigger>
        <HoverCardContent className="custom-content">
          <p>Hover content</p>
        </HoverCardContent>
      </HoverCard>
    )

    const content = screen.getByText('Hover content').closest('div')
    expect(content).toHaveClass('custom-content')
  })
})