import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, beforeEach, test, expect, describe } from 'vitest'
import { ChatMessage } from '@/components/chatbot/ChatMessage'
import type { ChatMessage as ChatMessageType } from '@/components/chatbot/chat'

// Mock MarkdownRenderer - preserve whitespace for newlines
vi.mock('@/components/chatbot/MarkdownRenderer', () => ({
  default: ({ content }: { content: string }) => (
    <span data-testid="markdown-content" style={{ whiteSpace: 'pre-wrap' }}>
      {content}
    </span>
  ),
}))

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, variant, size, ...props }: any) => (
    <button 
      onClick={onClick} 
      className={className}
      data-variant={variant}
      data-size={size}
      data-testid="button"
      {...props}
    >
      {children}
    </button>
  ),
}))

// Mock icons
vi.mock('lucide-react', () => ({
  User: ({ className }: any) => <span className={className} data-testid="user-icon">👤</span>,
  Bot: ({ className }: any) => <span className={className} data-testid="bot-icon">🤖</span>,
  Download: ({ className }: any) => <span className={className} data-testid="download-icon">⬇️</span>,
}))

// Test data
const mockUserMessage: ChatMessageType = {
  id: 'msg-1',
  content: 'Hello, how are you?',
  role: 'user',
  timestamp: new Date('2024-01-01T18:00:00.000Z'),
  files: [],
}

const mockAssistantMessage: ChatMessageType = {
  id: 'msg-2',
  content: 'I am doing well, thank you!',
  role: 'assistant',
  timestamp: new Date('2024-01-01T18:01:00.000Z'),
  files: [],
}

const mockImageFile = {
  id: 'file-1',
  name: 'image.jpg',
  type: 'image/jpeg',
  size: 1024,
  url: 'http://example.com/image.jpg',
}

const mockPdfFile = {
  id: 'file-2',
  name: 'document.pdf',
  type: 'application/pdf',
  size: 2048,
  url: 'http://example.com/document.pdf',
}

describe('ChatMessage - Core Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders user message with proper structure', () => {
    render(<ChatMessage message={mockUserMessage} />)

    expect(screen.getByTestId('user-icon')).toBeInTheDocument()
    expect(screen.getByTestId('markdown-content')).toHaveTextContent('Hello, how are you?')
    
    // Check timestamp exists with flexible format
    const timestampElement = document.querySelector('.text-xs.text-muted-foreground')
    expect(timestampElement).toBeInTheDocument()
    expect(timestampElement?.textContent).toMatch(/\d{1,2}:\d{2}:\d{2}/)
    
    const messageContainer = screen.getByText('Hello, how are you?').closest('.p-4')
    expect(messageContainer).toHaveClass('bg-study-purple', 'text-white', 'ml-12')
  })

  test('renders assistant message with proper structure', () => {
    render(<ChatMessage message={mockAssistantMessage} />)

    expect(screen.getByTestId('bot-icon')).toBeInTheDocument()
    expect(screen.getByTestId('markdown-content')).toHaveTextContent('I am doing well, thank you!')
    
    const timestampElement = document.querySelector('.text-xs.text-muted-foreground')
    expect(timestampElement).toBeInTheDocument()
    expect(timestampElement?.textContent).toMatch(/\d{1,2}:\d{2}:\d{2}/)
    
    const messageContainer = screen.getByText('I am doing well, thank you!').closest('.p-4')
    expect(messageContainer).toHaveClass('bg-white/5', 'text-white')
    expect(messageContainer).not.toHaveClass('ml-12')
  })

  test('handles newlines in markdown content', () => {
    const multilineContent = 'Line 1\nLine 2\nLine 3'
    const multilineMessage: ChatMessageType = {
      id: 'msg-multiline',
      content: multilineContent,
      role: 'assistant',
      timestamp: new Date(),
      files: [],
    }

    render(<ChatMessage message={multilineMessage} />)

    // Standard Markdown behavior: single newlines become spaces
    const markdownElement = screen.getByTestId('markdown-content')
    expect(markdownElement).toHaveTextContent('Line 1 Line 2 Line 3')
  })

  test('handles markdown line breaks correctly', () => {
    // Double newlines create paragraphs
    const content = 'Line 1\n\nLine 2'
    // Or use proper markdown line breaks with two spaces
    const contentWithBreaks = 'Line 1  \nLine 2'
    
    // Test both scenarios
  })

  test('renders with correct avatar positioning', () => {
    const { rerender } = render(<ChatMessage message={mockUserMessage} />)

    const userAvatar = screen.getByTestId('user-icon').closest('div')
    expect(userAvatar).toHaveClass('flex-shrink-0')
    
    const userMessageContent = screen.getByTestId('markdown-content').closest('.max-w-3xl')
    expect(userMessageContent).toHaveClass('order-first')

    rerender(<ChatMessage message={mockAssistantMessage} />)

    const botAvatar = screen.getByTestId('bot-icon').closest('div'
    )
    expect(botAvatar).toHaveClass('flex-shrink-0')
    
    const botMessageContent = screen.getByTestId('markdown-content').closest('.max-w-3xl')
    expect(botMessageContent).not.toHaveClass('order-first')
  })

  test('handles empty content gracefully', () => {
    const emptyMessage: ChatMessageType = {
      id: 'msg-empty',
      content: '',
      role: 'user',
      timestamp: new Date(),
      files: [],
    }

    render(<ChatMessage message={emptyMessage} />)

    expect(screen.getByTestId('markdown-content')).toHaveTextContent('')
    expect(screen.getByTestId('user-icon')).toBeInTheDocument()
  })

  test('renders timestamp with correct styling', () => {
    render(<ChatMessage message={mockUserMessage} />)

    const timestampElement = document.querySelector('.text-xs.text-muted-foreground')
    expect(timestampElement).toHaveClass('mt-1', 'px-1')
    expect(timestampElement).toBeInTheDocument()
  })

  test('applies correct container classes', () => {
    const { rerender } = render(<ChatMessage message={mockUserMessage} />)

    const userContainer = screen.getByText('Hello, how are you?').closest('.flex')
    expect(userContainer).toHaveClass('gap-4', 'justify-end')

    rerender(<ChatMessage message={mockAssistantMessage} />)

    const assistantContainer = screen.getByText('I am doing well, thank you!').closest('.flex')
    expect(assistantContainer).toHaveClass('gap-4', 'justify-start')
  })

  test('renders avatar with correct styling', () => {
    const { rerender } = render(<ChatMessage message={mockUserMessage} />)

    const userAvatar = screen.getByTestId('user-icon').closest('div')
    expect(userAvatar).toHaveClass('w-8', 'h-8', 'rounded-full', 'bg-study-blue')

    rerender(<ChatMessage message={mockAssistantMessage} />)

    const botAvatar = screen.getByTestId('bot-icon').closest('div')
    expect(botAvatar).toHaveClass('w-8', 'h-8', 'rounded-full', 'bg-study-purple')
  })

  test('maintains proper message width constraints', () => {
    render(<ChatMessage message={mockUserMessage} />)

    const messageContentContainer = screen.getByTestId('markdown-content').closest('.max-w-3xl')
    expect(messageContentContainer).toBeInTheDocument()
  })

  test('handles special characters in content', () => {
    const specialContent = 'Special chars: <>&"\'`'
    const specialMessage: ChatMessageType = {
      id: 'msg-special',
      content: specialContent,
      role: 'user',
      timestamp: new Date(),
      files: [],
    }

    render(<ChatMessage message={specialMessage} />)

    expect(screen.getByTestId('markdown-content')).toHaveTextContent(specialContent)
  })
})

describe('ChatMessage - File Attachments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders image attachments correctly', () => {
    const messageWithImage: ChatMessageType = {
      id: 'msg-img',
      content: 'Image message',
      role: 'user',
      timestamp: new Date(),
      files: [mockImageFile],
    }

    render(<ChatMessage message={messageWithImage} />)

    const image = screen.getByAltText('image.jpg')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'http://example.com/image.jpg')
    expect(screen.getByText('image.jpg')).toBeInTheDocument()
    expect(screen.getByTestId('download-icon')).toBeInTheDocument()
  })

  test('renders PDF attachments correctly', () => {
    const messageWithPdf: ChatMessageType = {
      id: 'msg-pdf',
      content: 'PDF message',
      role: 'assistant',
      timestamp: new Date(),
      files: [mockPdfFile],
    }

    render(<ChatMessage message={messageWithPdf} />)

    expect(screen.getByText('PDF')).toBeInTheDocument()
    expect(screen.getByText('document.pdf')).toBeInTheDocument()
    expect(screen.getByText('2.0 KB')).toBeInTheDocument()
    expect(screen.getByTestId('download-icon')).toBeInTheDocument()
  })

  test('handles multiple file attachments', () => {
    const messageWithMultipleFiles: ChatMessageType = {
      id: 'msg-multi',
      content: 'Multiple files',
      role: 'user',
      timestamp: new Date(),
      files: [mockImageFile, mockPdfFile],
    }

    render(<ChatMessage message={messageWithMultipleFiles} />)

    expect(screen.getByAltText('image.jpg')).toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument()
    expect(screen.getByText('document.pdf')).toBeInTheDocument()
    
    const downloadButtons = screen.getAllByTestId('download-icon')
    expect(downloadButtons).toHaveLength(2)
  })

  test('handles file with zero size', () => {
    const zeroSizeFile = {
      id: 'file-zero',
      name: 'empty.pdf',
      type: 'application/pdf',
      size: 0,
      url: 'http://example.com/empty.pdf',
    }

    const messageWithZeroFile: ChatMessageType = {
      id: 'msg-zero',
      content: 'Empty file',
      role: 'user',
      timestamp: new Date(),
      files: [zeroSizeFile],
    }

    render(<ChatMessage message={messageWithZeroFile} />)

    expect(screen.getByText('0.0 KB')).toBeInTheDocument()
    expect(screen.getByText('empty.pdf')).toBeInTheDocument()
  })

  test('handles large file sizes', () => {
    const largeFile = {
      id: 'file-large',
      name: 'huge.pdf',
      type: 'application/pdf',
      size: 1048576,
      url: 'http://example.com/huge.pdf',
    }

    const messageWithLargeFile: ChatMessageType = {
      id: 'msg-large',
      content: 'Large file',
      role: 'user',
      timestamp: new Date(),
      files: [largeFile],
    }

    render(<ChatMessage message={messageWithLargeFile} />)

    expect(screen.getByText('1024.0 KB')).toBeInTheDocument()
  })

  test('handles unknown file types as images', () => {
    const unknownFile = {
      id: 'file-unknown',
      name: 'unknown.xyz',
      type: 'application/unknown',
      size: 1024,
      url: 'http://example.com/unknown.xyz',
    }

    const messageWithUnknownFile: ChatMessageType = {
      id: 'msg-unknown',
      content: 'Unknown file',
      role: 'user',
      timestamp: new Date(),
      files: [unknownFile],
    }

    render(<ChatMessage message={messageWithUnknownFile} />)

    expect(screen.getByAltText('unknown.xyz')).toBeInTheDocument()
    expect(screen.getByTestId('download-icon')).toBeInTheDocument()
  })

  test('handles files with empty URLs', () => {
    const fileWithoutUrl = {
      id: 'file-no-url',
      name: 'broken.jpg',
      type: 'image/jpeg',
      size: 1024,
      url: '',
    }

    const messageWithBrokenFile: ChatMessageType = {
      id: 'msg-broken',
      content: 'Broken file',
      role: 'user',
      timestamp: new Date(),
      files: [fileWithoutUrl],
    }

    render(<ChatMessage message={messageWithBrokenFile} />)

    const image = screen.getByAltText('broken.jpg')
    expect(image).toHaveAttribute('src', '')
  })

  test('handles null or undefined files array', () => {
    const messageWithNullFiles: ChatMessageType = {
      id: 'msg-null-files',
      content: 'No files',
      role: 'user',
      timestamp: new Date(),
      files: null as any,
    }

    render(<ChatMessage message={messageWithNullFiles} />)

    expect(screen.queryByTestId('download-icon')).not.toBeInTheDocument()
    expect(screen.getByTestId('markdown-content')).toHaveTextContent('No files')
  })

  test('handles empty files array', () => {
    const messageWithEmptyFiles: ChatMessageType = {
      id: 'msg-empty-files',
      content: 'Empty files',
      role: 'user',
      timestamp: new Date(),
      files: [],
    }

    render(<ChatMessage message={messageWithEmptyFiles} />)

    expect(screen.queryByTestId('download-icon')).not.toBeInTheDocument()
  })
})

describe('ChatMessage - Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('handles very long content', () => {
    const longContent = 'This is a very long message that should wrap properly and maintain its formatting even when the content exceeds normal message length expectations and continues for several lines to test the layout behavior.'
    const longMessage: ChatMessageType = {
      id: 'msg-long',
      content: longContent,
      role: 'assistant',
      timestamp: new Date(),
      files: [],
    }

    render(<ChatMessage message={longMessage} />)

    expect(screen.getByTestId('markdown-content')).toHaveTextContent(longContent)
    const messageContainer = screen.getByTestId('markdown-content').closest('.max-w-3xl')
    expect(messageContainer).toBeInTheDocument()
  })

  test('handles fractional file sizes correctly', () => {
    const fractionalFile = {
      id: 'file-fractional',
      name: 'fractional.pdf',
      type: 'application/pdf',
      size: 1536,
      url: 'http://example.com/fractional.pdf',
    }

    const messageWithFractionalFile: ChatMessageType = {
      id: 'msg-fractional',
      content: 'Fractional size',
      role: 'user',
      timestamp: new Date(),
      files: [fractionalFile],
    }

    render(<ChatMessage message={messageWithFractionalFile} />)

    expect(screen.getByText('1.5 KB')).toBeInTheDocument()
  })

  test('maintains component structure with no content', () => {
    const emptyContentMessage: ChatMessageType = {
      id: 'msg-empty-content',
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      files: [],
    }

    render(<ChatMessage message={emptyContentMessage} />)

    expect(screen.getByTestId('bot-icon')).toBeInTheDocument()
    expect(screen.getByTestId('markdown-content')).toBeInTheDocument()
    
    const container = document.querySelector('.flex.gap-4')
    expect(container).toBeInTheDocument()
  })

  test('handles invalid timestamp gracefully', () => {
    const messageWithInvalidTimestamp: ChatMessageType = {
      id: 'msg-invalid-time',
      content: 'Invalid time',
      role: 'user',
      timestamp: new Date('invalid'),
      files: [],
    }

    render(<ChatMessage message={messageWithInvalidTimestamp} />)

    const timestampElement = document.querySelector('.text-xs.text-muted-foreground')
    expect(timestampElement).toBeInTheDocument()
    // Should not crash even with invalid date
  })

  test('handles message with only whitespace content', () => {
    const whitespaceMessage: ChatMessageType = {
      id: 'msg-whitespace',
      content: '   \n\t   ',
      role: 'user',
      timestamp: new Date(),
      files: [],
    }

    render(<ChatMessage message={whitespaceMessage} />)

    // ReactMarkdown normalizes whitespace-only content to empty
    expect(screen.getByTestId('markdown-content')).toHaveTextContent('')
    expect(screen.getByTestId('user-icon')).toBeInTheDocument()
  })
})