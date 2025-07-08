// Replace header and imports
// import React from 'react'
// import { vi } from 'vitest'
// import '@testing-library/jest-dom'
// import { render, screen, fireEvent } from '@testing-library/react'
// import { BrowserRouter } from 'react-router-dom'
// import { ContentList } from '@/components/content/ContentList'

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ContentList } from '@/components/content/ContentList'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const renderWithRouter = (ui: React.ReactElement) =>
  render(<BrowserRouter>{ui}</BrowserRouter>)

describe('ContentList', () => {
  const contents = [
    { contentId: 'content-1', topic: 'Mathematics', type: 'flashcards' as const, createdAt: '2023-01-01T10:00:00Z' },
    { contentId: 'content-2', topic: 'Physics',    type: 'slides'     as const, createdAt: '2023-01-02T10:00:00Z' }
  ]

  it('should render loading skeleton when loading', () => {
    const { container } = renderWithRouter(<ContentList contents={[]} loading={true} />)
    // Expect 6 skeleton cards
    const skeletons = container.getElementsByClassName('animate-pulse')
    expect(skeletons).toHaveLength(6)
  })

  it('should render content items when not loading', () => {
    renderWithRouter(<ContentList contents={contents} loading={false} />)
    expect(screen.getByText('Mathematics')).toBeInTheDocument()
    expect(screen.getByText('Physics')).toBeInTheDocument()
  })

  it('should display correct badges for content types', () => {
    renderWithRouter(<ContentList contents={contents} loading={false} />)
    expect(screen.getByText('flashcards')).toBeInTheDocument()
    expect(screen.getByText('slides')).toBeInTheDocument()
  })

  it('should display formatted creation dates', () => {
    renderWithRouter(<ContentList contents={contents} loading={false} />)
    expect(screen.getByText('1/1/2023')).toBeInTheDocument()
    expect(screen.getByText('1/2/2023')).toBeInTheDocument()
  })

  it('should navigate to flashcards view when clicking on flashcard content', () => {
    renderWithRouter(<ContentList contents={contents} loading={false} />)
    const mathCard = screen.getByText('Mathematics').closest('.cursor-pointer')
    fireEvent.click(mathCard!) 
    expect(mockNavigate).toHaveBeenCalledWith('/content/flashcards/content-1')
  })

  it('should navigate to slides view when clicking on slides content', () => {
    renderWithRouter(<ContentList contents={contents} loading={false} />)
    const physicsCard = screen.getByText('Physics').closest('.cursor-pointer')
    fireEvent.click(physicsCard!) 
    expect(mockNavigate).toHaveBeenCalledWith('/content/slides/content-2')
  })

  it('should show empty state when no contents and not loading', () => {
    renderWithRouter(<ContentList contents={[]} loading={false} />)
    expect(screen.getByText('No content found')).toBeInTheDocument()
    expect(screen.getByText('Generate your first piece of educational content to get started')).toBeInTheDocument()
  })

  it('should handle long topic names gracefully', () => {
    const longTopic = [{ contentId: 'id', topic: 'Very long topic name', type: 'flashcards' as const, createdAt: '2023-01-01T10:00:00Z' }]
    renderWithRouter(<ContentList contents={longTopic} loading={false} />)
    expect(screen.getByText(/Very long topic name/)).toBeInTheDocument()
  })

  it('should handle multiple content items of the same type', () => {
    const sameType = [
      { contentId: '1', topic: 'A', type: 'flashcards' as const, createdAt: '2023-01-01T10:00:00Z' },
      { contentId: '2', topic: 'B', type: 'flashcards' as const, createdAt: '2023-01-02T10:00:00Z' }
    ]
    renderWithRouter(<ContentList contents={sameType} loading={false} />)
    expect(screen.getAllByText('flashcards')).toHaveLength(2)
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  it('should display creation time in readable format', () => {
    const recent = [{ contentId: 'r', topic: 'Recent', type: 'slides' as const, createdAt: new Date().toISOString() }]
    renderWithRouter(<ContentList contents={recent} loading={false} />)
    expect(screen.getByText('Recent')).toBeInTheDocument()
  })

  it('should handle empty topic name', () => {
    const emptyTopic = [{ contentId: 'e', topic: '', type: 'flashcards' as const, createdAt: '2023-01-01T10:00:00Z' }]
    renderWithRouter(<ContentList contents={emptyTopic} loading={false} />)
    expect(screen.getByRole('heading', { level: 3 })).toBeEmptyDOMElement()
  })

  it('should show hover effects on content cards', () => {
    renderWithRouter(<ContentList contents={contents} loading={false} />)
    const card = screen.getByText('Mathematics').closest('.cursor-pointer')
    expect(card).toHaveClass('cursor-pointer')
  })
})
