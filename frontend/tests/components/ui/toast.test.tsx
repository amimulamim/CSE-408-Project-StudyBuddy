import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, test, expect, describe } from 'vitest'
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'
import { useToast } from '@/components/ui/use-toast'

// Mock the useToast hook
vi.mock('@/components/ui/use-toast', () => ({
  useToast: vi.fn(),
}))

describe('Toast', () => {
  test('renders toast with title and description', () => {
    render(
      <ToastProvider>
        <Toast>
          <ToastTitle>Success</ToastTitle>
          <ToastDescription>Your changes have been saved.</ToastDescription>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    )

    expect(screen.getByText('Success')).toBeInTheDocument()
    expect(screen.getByText('Your changes have been saved.')).toBeInTheDocument()
  })

  test('renders toast with action and close button', () => {
    const handleAction = vi.fn()
    const handleClose = vi.fn()

    render(
      <ToastProvider>
        <Toast>
          <ToastTitle>Error</ToastTitle>
          <ToastDescription>Something went wrong.</ToastDescription>
          <ToastAction altText="Try again" onClick={handleAction}>
            Try again
          </ToastAction>
          <ToastClose onClick={handleClose} />
        </Toast>
        <ToastViewport />
      </ToastProvider>
    )

    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument()
    expect(screen.getByText('Try again')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Try again'))
    expect(handleAction).toHaveBeenCalledTimes(1)
  })

  test('applies variant classes', () => {
    const { rerender } = render(
      <ToastProvider>
        <Toast variant="default" data-testid="toast">
          <ToastTitle>Default Toast</ToastTitle>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    )

    expect(screen.getByTestId('toast')).toHaveClass('border', 'bg-background')

    rerender(
      <ToastProvider>
        <Toast variant="destructive" data-testid="toast">
          <ToastTitle>Destructive Toast</ToastTitle>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    )

    expect(screen.getByTestId('toast')).toHaveClass('destructive')
  })

  test('applies custom className', () => {
    render(
      <ToastProvider>
        <Toast className="custom-toast" data-testid="toast">
          <ToastTitle className="custom-title">Title</ToastTitle>
          <ToastDescription className="custom-description">Description</ToastDescription>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    )

    expect(screen.getByTestId('toast')).toHaveClass('custom-toast')
    expect(screen.getByText('Title')).toHaveClass('custom-title')
    expect(screen.getByText('Description')).toHaveClass('custom-description')
  })

  test('renders toast viewport', () => {
    render(
      <ToastProvider>
        <ToastViewport data-testid="toast-viewport" />
      </ToastProvider>
    )

    expect(screen.getByTestId('toast-viewport')).toBeInTheDocument()
  })
})