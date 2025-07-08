import { render, screen, act } from '@testing-library/react'
import { vi, test, expect, describe, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom'
import { QuizTimer } from '@/components/quiz/QuizTimer'

// Mock Audio to prevent undefined in test environment
class MockAudio {
  play() {
    return Promise.resolve()
  }
}
// @ts-ignore
global.Audio = MockAudio

describe('QuizTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  test('displays initial time correctly', () => {
    render(<QuizTimer duration={5} onTimeUp={vi.fn()} />)
    expect(screen.getByText('05:00')).toBeInTheDocument()
  })

  test('counts down correctly', () => {
    render(<QuizTimer duration={5} onTimeUp={vi.fn()} />)
    act(() => {
      vi.advanceTimersByTime(60000)
    })
    expect(screen.getByText('04:00')).toBeInTheDocument()
  })

  test('calls onTimeUp after interval when duration is zero', () => {
    const callback = vi.fn()
    render(<QuizTimer duration={0} onTimeUp={callback} />)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(callback).toHaveBeenCalled()
  })

  test('applies warning styles when time is low', () => {
    render(<QuizTimer duration={1} onTimeUp={vi.fn()} />)
    // 1 minute = 60s; after 50s (10s left) should hit orange warning
    act(() => {
      vi.advanceTimersByTime(50000)
    })
    const container = screen
      .getByText(/TIME REMAINING/)
      .closest('div[class*="bg-"]')
    expect(container).toHaveClass('bg-orange-500')
  })

  test('applies normal styles when time is sufficient', () => {
    render(<QuizTimer duration={5} onTimeUp={vi.fn()} />)
    const container = screen
      .getByText(/TIME REMAINING/)
      .closest('div[class*="bg-"]')
    expect(container).toHaveClass('bg-blue-600')
  })
})
