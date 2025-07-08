import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, test, expect, describe } from 'vitest'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

describe('Popover', () => {
  test('renders popover trigger', () => {
    render(
      <Popover>
        <PopoverTrigger>Open popover</PopoverTrigger>
        <PopoverContent>
          <p>Popover content</p>
        </PopoverContent>
      </Popover>
    )

    expect(screen.getByText('Open popover')).toBeInTheDocument()
  })

  test('shows content when trigger is clicked', () => {
    render(
      <Popover>
        <PopoverTrigger>Open popover</PopoverTrigger>
        <PopoverContent>
          <p>Popover content</p>
        </PopoverContent>
      </Popover>
    )

    fireEvent.click(screen.getByText('Open popover'))
    expect(screen.getByText('Popover content')).toBeInTheDocument()
  })

  test('applies custom className to content', () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open popover</PopoverTrigger>
        <PopoverContent className="custom-content">
          <p>Popover content</p>
        </PopoverContent>
      </Popover>
    )

    const content = screen.getByText('Popover content').closest('div')
    expect(content).toHaveClass('custom-content')
  })
})